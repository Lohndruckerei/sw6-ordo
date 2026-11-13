<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderCollection;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionCollection;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionEntity;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Checkout\Order\OrderCollection;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\Api\Context\AdminApiSource;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\StateMachine\StateMachineRegistry;
use Shopware\Core\System\StateMachine\Transition;
use Shopware\Core\System\User\UserCollection;

/**
 * Legt Auftragsakten an, führt Statuswechsel der Positionen aus und schreibt das Protokoll.
 * Alle Statuswechsel laufen hier durch, damit jeder Wechsel mit Benutzer und Grund protokolliert wird.
 */
class OrderFileService
{
    /** Positionsarten, die einen Workflow bekommen (keine Rabatte, Gutscheine, Container). */
    public const LINE_ITEM_TYPES = [LineItem::PRODUCT_LINE_ITEM_TYPE, LineItem::CUSTOM_LINE_ITEM_TYPE];

    /**
     * @param EntityRepository<OrderCollection> $orderRepository
     * @param EntityRepository<OrdoOrderCollection> $ordoOrderRepository
     * @param EntityRepository<OrdoPositionCollection> $positionRepository
     * @param EntityRepository<\Lohndruckerei\Ordo\Core\Ordo\Event\OrdoEventCollection> $eventRepository
     * @param EntityRepository<UserCollection> $userRepository
     */
    public function __construct(
        private readonly EntityRepository $orderRepository,
        private readonly EntityRepository $ordoOrderRepository,
        private readonly EntityRepository $positionRepository,
        private readonly EntityRepository $eventRepository,
        private readonly EntityRepository $userRepository,
        private readonly StateMachineRegistry $stateMachineRegistry,
    ) {
    }

    /**
     * Legt die Akte an, falls sie fehlt, und ergänzt fehlende Positionen. Gibt die ID der Akte zurück.
     */
    public function ensure(string $orderId, Context $context, string $reason = 'order_placed'): ?string
    {
        $criteria = (new Criteria([$orderId]))->addAssociation('lineItems');
        $order = $this->orderRepository->search($criteria, $context)->first();
        if (!$order instanceof OrderEntity) {
            return null;
        }

        $existing = $this->ordoOrderRepository->search(
            (new Criteria())->addFilter(new EqualsFilter('orderId', $orderId))->addAssociation('positions'),
            $context
        )->first();

        $ordoOrderId = $existing?->getId() ?? Uuid::randomHex();
        $known = [];
        foreach ($existing?->getPositions() ?? [] as $position) {
            $known[$position->getOrderLineItemId()] = true;
        }

        $initialStateId = (string) $this->stateMachineRegistry->getStateMachine(PositionState::MACHINE, $context)->getInitialStateId();
        $positions = [];
        foreach ($order->getLineItems() ?? [] as $lineItem) {
            if (isset($known[$lineItem->getId()]) || !\in_array($lineItem->getType(), self::LINE_ITEM_TYPES, true)) {
                continue;
            }
            $positions[] = [
                'id' => Uuid::randomHex(),
                'orderLineItemId' => $lineItem->getId(),
                'orderLineItemVersionId' => $lineItem->getVersionId(),
                'stateId' => $initialStateId,
            ];
        }

        if ($existing !== null && $positions === []) {
            return $ordoOrderId;
        }

        $user = $this->user($context);
        $event = [
            'id' => Uuid::randomHex(),
            'type' => $existing === null ? 'created' : 'positions_added',
            'payload' => ['reason' => $reason, 'positions' => \count($positions)],
            'userId' => $user['id'],
            'userName' => $user['name'],
        ];

        $context->scope(Context::SYSTEM_SCOPE, function (Context $context) use ($existing, $ordoOrderId, $order, $positions, $event): void {
            $this->ordoOrderRepository->upsert([[
                'id' => $ordoOrderId,
                'orderId' => $order->getId(),
                'orderVersionId' => $order->getVersionId(),
                'positions' => $positions,
                'events' => [$event],
            ]], $context);
        });

        return $ordoOrderId;
    }

    /**
     * Führt einen Statuswechsel aus und protokolliert ihn. Wirft eine Exception, wenn der Übergang nicht erlaubt ist.
     */
    public function transition(string $positionId, string $action, ?string $reason, Context $context): OrdoPositionEntity
    {
        $before = $this->position($positionId, $context);
        $from = $before->getStateMachineState()?->getTechnicalName();

        $this->stateMachineRegistry->transition(
            new Transition(PositionState::ENTITY, $positionId, $action, PositionState::FIELD),
            $context
        );

        $after = $this->position($positionId, $context);
        $to = $after->getStateMachineState()?->getTechnicalName();
        $reason = $reason !== null ? trim($reason) : null;

        $context->scope(Context::SYSTEM_SCOPE, function (Context $context) use ($positionId, $to, $reason): void {
            $this->positionRepository->update([[
                'id' => $positionId,
                'holdReason' => $to === PositionState::ON_HOLD ? ($reason ?: null) : null,
            ]], $context);
        });

        $this->log($after->getOrdoOrderId(), 'state_changed', $reason ?: null, [
            'action' => $action,
            'from' => $from,
            'to' => $to,
        ], $context, $positionId);

        return $after;
    }

    /**
     * @return list<array{action: string, to: string}>
     */
    public function availableTransitions(string $positionId, Context $context): array
    {
        $result = [];
        foreach ($this->stateMachineRegistry->getAvailableTransitions(PositionState::ENTITY, $positionId, PositionState::FIELD, $context) as $transition) {
            $result[] = [
                'action' => $transition->getActionName(),
                'to' => $transition->getToStateMachineState()?->getTechnicalName() ?? '',
            ];
        }

        return $result;
    }

    /**
     * @param array<string, mixed>|null $payload
     */
    public function log(string $ordoOrderId, string $type, ?string $message, ?array $payload, Context $context, ?string $positionId = null): void
    {
        $user = $this->user($context);
        $context->scope(Context::SYSTEM_SCOPE, function (Context $context) use ($ordoOrderId, $type, $message, $payload, $positionId, $user): void {
            $this->eventRepository->create([[
                'id' => Uuid::randomHex(),
                'ordoOrderId' => $ordoOrderId,
                'positionId' => $positionId,
                'type' => $type,
                'message' => $message,
                'payload' => $payload,
                'userId' => $user['id'],
                'userName' => $user['name'],
            ]], $context);
        });
    }

    private function position(string $positionId, Context $context): OrdoPositionEntity
    {
        $criteria = (new Criteria([$positionId]))->addAssociation('stateMachineState');
        $position = $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->positionRepository->search($criteria, $c)->first());
        if (!$position instanceof OrdoPositionEntity) {
            throw new \InvalidArgumentException(\sprintf('Position %s nicht gefunden.', $positionId));
        }

        return $position;
    }

    /**
     * Benutzer aus dem Admin-Kontext; ohne Benutzer (Automatik, Shop, Konsole) bleibt die ID leer.
     *
     * @return array{id: ?string, name: ?string}
     */
    private function user(Context $context): array
    {
        $source = $context->getSource();
        $userId = $source instanceof AdminApiSource ? $source->getUserId() : null;
        if ($userId === null) {
            return ['id' => null, 'name' => null];
        }

        $user = $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->userRepository->search(new Criteria([$userId]), $c)->first());
        $name = $user ? trim($user->getFirstName() . ' ' . $user->getLastName()) : null;

        return ['id' => $userId, 'name' => $name ?: $user?->getUsername()];
    }
}
