<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderCollection;
use Lohndruckerei\Ordo\Event\PositionStateChangedEvent;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionCollection;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionEntity;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Checkout\Order\OrderCollection;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\Api\Context\AdminApiSource;
use Shopware\Core\Framework\Api\Exception\MissingPrivilegeException;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\StateMachine\StateMachineRegistry;
use Shopware\Core\System\StateMachine\Transition;
use Shopware\Core\System\User\UserCollection;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

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
        private readonly AssignmentService $assignmentService,
        private readonly EventDispatcherInterface $dispatcher,
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
            $this->assign($ordoOrderId, $context);

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

        $this->assign($ordoOrderId, $context);

        return $ordoOrderId;
    }

    /**
     * Automatische Zuteilung offener Positionen (E18) mit Protokoll.
     */
    public function assign(string $ordoOrderId, Context $context): void
    {
        foreach ($this->assignmentService->assignOpen($ordoOrderId, $context) as $assigned) {
            $this->log($ordoOrderId, 'assigned', null, [
                'target' => AssignmentService::TARGET_SUPPLIER,
                'supplierId' => $assigned['supplierId'],
                'supplier' => $assigned['supplier'],
                'source' => $assigned['source'],
            ], $context, $assigned['positionId']);
        }
    }

    /**
     * Zuteilung von Hand ändern (Ziel und Lieferant), nur bis zur Bestellung beim Lieferanten. Protokolliert alt und neu.
     */
    public function setAssignment(string $positionId, ?string $target, ?string $supplierId, ?string $reason, Context $context): void
    {
        $position = $this->position($positionId, $context);
        if (!\in_array($position->getStateMachineState()?->getTechnicalName(), AssignmentService::CHANGEABLE, true)) {
            throw new \DomainException('Die Position ist bereits bestellt oder in Arbeit. Bitte zuerst über „Weiterleiten“ zurückholen.');
        }
        if ($target !== null && !\in_array($target, AssignmentService::TARGETS, true)) {
            throw new \DomainException('Unbekanntes Ziel.');
        }
        if ($target !== AssignmentService::TARGET_SUPPLIER) {
            $supplierId = null;
        } elseif ($supplierId === null || !$this->assignmentService->supplierExists($supplierId)) {
            throw new \DomainException('Bitte einen Lieferanten auswählen, z. B. den Vorschlag aus Mensura.');
        }

        $context->scope(Context::SYSTEM_SCOPE, function (Context $context) use ($positionId, $target, $supplierId): void {
            $this->positionRepository->update([[
                'id' => $positionId,
                'target' => $target,
                'supplierId' => $supplierId,
                'assignmentSource' => AssignmentService::SOURCE_MANUAL,
            ]], $context);
        });

        $names = $this->assignmentService->suppliers(array_values(array_filter([$position->getSupplierId(), $supplierId])));
        $this->log($position->getOrdoOrderId(), 'assigned', $reason !== null && trim($reason) !== '' ? trim($reason) : null, [
            'target' => $target,
            'supplierId' => $supplierId,
            'supplier' => $supplierId !== null ? ($names[$supplierId]['name'] ?? null) : null,
            'previousTarget' => $position->getTarget(),
            'previousSupplier' => $position->getSupplierId() !== null ? ($names[$position->getSupplierId()]['name'] ?? null) : null,
            'source' => AssignmentService::SOURCE_MANUAL,
        ], $context, $positionId);
    }

    /**
     * Führt einen Statuswechsel aus und protokolliert ihn. Wirft eine Exception, wenn der Übergang nicht erlaubt ist.
     */
    public function transition(string $positionId, string $action, ?string $reason, Context $context): OrdoPositionEntity
    {
        $before = $this->position($positionId, $context);
        $from = $before->getStateMachineState()?->getTechnicalName();
        if (!OrdoAcl::mayHandle($from, $context)) {
            // Arbeitsbereiche: Produktion, Datenprüfung und Versand handeln nur in ihrer eigenen Warteschlange
            throw new MissingPrivilegeException([OrdoAcl::EDITOR]);
        }

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

        $this->dispatcher->dispatch(new PositionStateChangedEvent($positionId, $after->getOrdoOrderId(), $from, $to, $context));

        return $after;
    }

    /**
     * @return list<array{action: string, to: string}>
     */
    public function availableTransitions(string $positionId, Context $context): array
    {
        $result = [];
        if (!OrdoAcl::mayHandle($this->position($positionId, $context)->getStateMachineState()?->getTechnicalName(), $context)) {
            return $result;
        }
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

    public function position(string $positionId, Context $context): OrdoPositionEntity
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
    public function userName(Context $context): ?string
    {
        return $this->user($context)['name'];
    }

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
