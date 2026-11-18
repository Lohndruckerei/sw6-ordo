<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

use Lohndruckerei\LieferLotse\Service\Order\SupplierOrder;
use Lohndruckerei\LieferLotse\Service\Order\SupplierOrderBuilder;
use Lohndruckerei\LieferLotse\Service\Order\SupplierOrderService;
use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderEntity;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionEntity;
use Lohndruckerei\Ordo\Core\Ordo\SupplierOrder\OrdoSupplierOrderCollection;
use Lohndruckerei\Ordo\Core\Ordo\SupplierOrder\OrdoSupplierOrderDefinition as SupplierOrderDefinition;
use Shopware\Core\Framework\Api\Context\AdminApiSource;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\SystemConfig\SystemConfigService;

/**
 * Lieferantenbestellungen (KONZEPT E16/E17): je Bestellung und Lieferant bündeln, über LieferLotse bauen und senden,
 * Inhalt und Ergebnis in ld_ordo_supplier_order speichern, Positionen auf „Beim Lieferanten bestellt“ schalten.
 * Gesendet wird nur, was freigegeben ist (Freigabe-Tor). Ohne LieferLotse ist das Senden nicht verfügbar.
 */
class SupplierOrderManager
{
    public const CONFIG_AUTO_SEND = 'LdOrdo.config.autoSendSupplierOrders';

    /** Offen für eine Lieferantenbestellung: zugeteilt und noch nicht bestellt bzw. in Arbeit. */
    private const OPEN = [...PositionState::BEFORE_RELEASE, PositionState::RELEASED];

    /**
     * @param EntityRepository<OrdoSupplierOrderCollection> $supplierOrderRepository
     */
    public function __construct(
        private readonly EntityRepository $ordoOrderRepository,
        private readonly EntityRepository $supplierOrderRepository,
        private readonly EntityRepository $positionRepository,
        private readonly OrderFileService $orderFileService,
        private readonly AssignmentService $assignmentService,
        private readonly SystemConfigService $systemConfig,
        private readonly ?SupplierOrderBuilder $builder = null,
        private readonly ?SupplierOrderService $sender = null,
    ) {
    }

    public function isAvailable(): bool
    {
        return $this->builder !== null && $this->sender !== null;
    }

    /**
     * Gruppen je Lieferant für die Akte: offene Positionen, ob alle freigegeben sind, bisherige Lieferantenbestellungen.
     *
     * @return array{available: bool, autoSend: bool, groups: list<array<string, mixed>>, orders: list<array<string, mixed>>}
     */
    public function plan(string $ordoOrderId, Context $context): array
    {
        $file = $this->file($ordoOrderId, $context);
        $groups = [];
        foreach ($file->getPositions() ?? [] as $position) {
            $state = $position->getStateMachineState()?->getTechnicalName();
            if ($position->getTarget() !== AssignmentService::TARGET_SUPPLIER || $position->getSupplierId() === null
                || !\in_array($state, self::OPEN, true)) {
                continue;
            }
            $groups[$position->getSupplierId()][] = [
                'positionId' => $position->getId(),
                'label' => $position->getOrderLineItem()?->getLabel(),
                'quantity' => $position->getOrderLineItem()?->getQuantity(),
                'state' => $state,
                'released' => $state === PositionState::RELEASED,
            ];
        }

        $suppliers = $this->assignmentService->suppliers(array_keys($groups));
        $result = [];
        foreach ($groups as $supplierId => $positions) {
            $released = \count(array_filter($positions, static fn (array $p): bool => $p['released']));
            $result[] = [
                'supplierId' => $supplierId,
                'supplierName' => $suppliers[$supplierId]['name'] ?? null,
                'supplierNumber' => $suppliers[$supplierId]['number'] ?? null,
                'positions' => $positions,
                'released' => $released,
                'complete' => $released === \count($positions),
            ];
        }

        $orders = [];
        foreach ($file->getSupplierOrders() ?? [] as $order) {
            $orders[] = [
                'id' => $order->getId(),
                'number' => $order->getNumber(),
                'supplierName' => $order->getSupplierName(),
                'status' => $order->getStatus(),
                'partial' => $order->isPartial(),
                'deliveryDate' => $order->getDeliveryDate()?->format('Y-m-d'),
                'interfaceName' => $order->getInterfaceName(),
                'transport' => $order->getTransport(),
                'resultMessage' => $order->getResultMessage(),
                'positions' => \count($order->getLineItemIds()),
                'sentAt' => $order->getSentAt()?->format(\DATE_ATOM),
                'createdAt' => $order->getCreatedAt()?->format(\DATE_ATOM),
                'userName' => $order->getUserName(),
                'payload' => $order->getPayload(),
            ];
        }
        usort($orders, static fn (array $a, array $b): int => strcmp((string) $b['createdAt'], (string) $a['createdAt']));

        return [
            'available' => $this->isAvailable(),
            'autoSend' => (bool) $this->systemConfig->get(self::CONFIG_AUTO_SEND),
            'groups' => $result,
            'orders' => $orders,
        ];
    }

    /**
     * Vorschau ohne Senden: Inhalt, wie LieferLotse ihn bauen würde, und die Schnittstelle.
     *
     * @param list<string>|null $positionIds
     *
     * @return array<string, mixed>
     */
    public function preview(string $ordoOrderId, string $supplierId, ?array $positionIds, Context $context): array
    {
        [$supplierOrder] = $this->build($ordoOrderId, $supplierId, $positionIds, false, $context);
        $interface = $this->sender?->findOrderInterface($supplierOrder);

        return [
            'number' => $supplierOrder->getNumber(),
            'interfaceName' => $interface?->getName(),
            'transport' => $interface?->getTransport(),
            'data' => $supplierOrder->toTemplateData(),
        ];
    }

    /**
     * Baut und sendet die Lieferantenbestellung. Ohne Auswahl müssen alle offenen Positionen des Lieferanten
     * freigegeben sein (E17); mit Auswahl ist es eine Teilbestellung der freigegebenen Positionen.
     *
     * @param list<string>|null $positionIds
     *
     * @return array{id: string, number: string, success: bool, message: string}
     */
    public function send(string $ordoOrderId, string $supplierId, ?array $positionIds, Context $context): array
    {
        [$supplierOrder, $positions, $partial] = $this->build($ordoOrderId, $supplierId, $positionIds, true, $context);
        $interface = $this->sender->findOrderInterface($supplierOrder);
        $result = $this->sender->send($supplierOrder, $context);

        $id = Uuid::randomHex();
        $user = $this->userName($context);
        $data = $supplierOrder->toTemplateData();
        $context->scope(Context::SYSTEM_SCOPE, function (Context $c) use ($id, $ordoOrderId, $supplierOrder, $interface, $result, $positions, $partial, $data, $user): void {
            $this->supplierOrderRepository->create([[
                'id' => $id,
                'ordoOrderId' => $ordoOrderId,
                'supplierId' => $supplierOrder->getSupplier()->getId(),
                'supplierNumber' => $supplierOrder->getSupplier()->getSupplierNumber(),
                'supplierName' => $supplierOrder->getSupplier()->getName(),
                'number' => $supplierOrder->getNumber(),
                'status' => $result->success ? SupplierOrderDefinition::STATUS_SENT : SupplierOrderDefinition::STATUS_FAILED,
                'partial' => $partial,
                'deliveryDate' => $supplierOrder->getDeliveryDate()?->format('Y-m-d'),
                'interfaceName' => $interface?->getName(),
                'transport' => $interface?->getTransport(),
                'resultMessage' => $result->message,
                'lineItemIds' => array_map(static fn (OrdoPositionEntity $p): string => $p->getOrderLineItemId(), $positions),
                'payload' => $data,
                'sentAt' => $result->success ? new \DateTimeImmutable() : null,
                'userName' => $user,
            ]], $c);
        });

        $this->orderFileService->log($ordoOrderId, $result->success ? 'supplier_order_sent' : 'supplier_order_failed', $result->message, [
            'number' => $supplierOrder->getNumber(),
            'supplier' => $supplierOrder->getSupplier()->getName(),
            'positions' => \count($positions),
            'partial' => $partial,
        ], $context);

        if ($result->success) {
            $reason = \sprintf('Lieferantenbestellung %s gesendet', $supplierOrder->getNumber());
            foreach ($positions as $position) {
                $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->positionRepository->update([[
                    'id' => $position->getId(),
                    'supplierOrderId' => $id,
                ]], $c));
                $this->orderFileService->transition($position->getId(), 'order_supplier', $reason, $context);
            }
        }

        return ['id' => $id, 'number' => $supplierOrder->getNumber(), 'success' => $result->success, 'message' => $result->message];
    }

    /**
     * Einstellung „automatisch senden“ (Standard aus): nach einer Freigabe senden, sobald alle Positionen
     * dieses Lieferanten freigegeben sind. Fehler landen im Protokoll, nie beim Kunden.
     */
    public function autoSend(string $positionId, Context $context): void
    {
        if (!$this->isAvailable() || !$this->systemConfig->get(self::CONFIG_AUTO_SEND)) {
            return;
        }
        $position = $this->orderFileService->position($positionId, $context);
        if ($position->getTarget() !== AssignmentService::TARGET_SUPPLIER || $position->getSupplierId() === null) {
            return;
        }
        foreach ($this->plan($position->getOrdoOrderId(), $context)['groups'] as $group) {
            if ($group['supplierId'] === $position->getSupplierId() && $group['complete']) {
                try {
                    $this->send($position->getOrdoOrderId(), $group['supplierId'], null, $context);
                } catch (\DomainException $e) {
                    $this->orderFileService->log($position->getOrdoOrderId(), 'supplier_order_failed', $e->getMessage(), ['automatic' => true], $context);
                }
            }
        }
    }

    /**
     * @param list<string>|null $positionIds
     *
     * @return array{0: SupplierOrder, 1: list<OrdoPositionEntity>, 2: bool}
     */
    private function build(string $ordoOrderId, string $supplierId, ?array $positionIds, bool $forSending, Context $context): array
    {
        if (!$this->isAvailable()) {
            throw new \DomainException('LieferLotse ist nicht installiert oder nicht aktiv – Lieferantenbestellungen sind nicht möglich.');
        }
        $file = $this->file($ordoOrderId, $context);
        $open = [];
        foreach ($file->getPositions() ?? [] as $position) {
            if ($position->getTarget() === AssignmentService::TARGET_SUPPLIER && $position->getSupplierId() === $supplierId
                && \in_array($position->getStateMachineState()?->getTechnicalName(), self::OPEN, true)) {
                $open[$position->getId()] = $position;
            }
        }
        if ($open === []) {
            throw new \DomainException('Für diesen Lieferanten gibt es keine offenen Positionen.');
        }

        $selected = $positionIds === null ? $open : array_intersect_key($open, array_flip($positionIds));
        if ($selected === []) {
            throw new \DomainException('Bitte mindestens eine Position auswählen.');
        }
        $notReleased = array_filter($selected, static fn (OrdoPositionEntity $p): bool => $p->getStateMachineState()?->getTechnicalName() !== PositionState::RELEASED);
        if ($forSending && $notReleased !== []) {
            throw new \DomainException(\sprintf(
                'Noch nicht freigegeben: %s. Erst freigeben oder nur die freigegebenen Positionen als Teilbestellung senden.',
                implode(', ', array_map(static fn (OrdoPositionEntity $p): string => (string) $p->getOrderLineItem()?->getLabel(), $notReleased))
            ));
        }
        $partial = \count($selected) < \count($open);

        $order = $this->builder->loadOrder($file->getOrderId(), $context);
        $lineItemIds = array_values(array_map(static fn (OrdoPositionEntity $p): string => $p->getOrderLineItemId(), $selected));
        try {
            $supplierOrder = $this->builder->build($order, $supplierId, $context, $lineItemIds);
        } catch (\InvalidArgumentException $e) {
            throw new \DomainException('LieferLotse konnte die Bestellung nicht bauen: ' . $e->getMessage(), 0, $e);
        }

        // Folgebestellungen beim selben Lieferanten bekommen einen Zähler: 10006-COMDATEK-2
        $sent = ($file->getSupplierOrders() ?? new OrdoSupplierOrderCollection())->filter(
            static fn ($o): bool => $o->getSupplierId() === $supplierId && $o->getStatus() === SupplierOrderDefinition::STATUS_SENT
        )->count();
        if ($sent > 0) {
            $supplierOrder->setNumber($supplierOrder->getNumber() . '-' . ($sent + 1));
        }

        return [$supplierOrder, array_values($selected), $partial];
    }

    private function file(string $ordoOrderId, Context $context): OrdoOrderEntity
    {
        $criteria = new Criteria([$ordoOrderId]);
        $criteria->addAssociation('supplierOrders');
        $criteria->getAssociation('positions')->addAssociation('stateMachineState')->addAssociation('orderLineItem');
        $file = $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->ordoOrderRepository->search($criteria, $c)->first());
        if (!$file instanceof OrdoOrderEntity) {
            throw new \DomainException('Auftragsakte nicht gefunden.');
        }

        return $file;
    }

    private function userName(Context $context): ?string
    {
        $source = $context->getSource();

        return $source instanceof AdminApiSource && $source->getUserId() !== null ? $this->orderFileService->userName($context) : null;
    }
}
