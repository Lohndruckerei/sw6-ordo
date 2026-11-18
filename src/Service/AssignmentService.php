<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Lohndruckerei\LieferLotse\Service\Resolver\SupplierResolver;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionCollection;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionEntity;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Uuid\Uuid;

/**
 * Zuteilung je Position (KONZEPT E18): Lieferant aus dem Mensura-Schnappschuss, sonst der LieferLotse-Kandidat mit
 * höchster Priorität; ohne Kandidat bleibt das Ziel offen. Mensura und LieferLotse sind optional (lose Kopplung):
 * Mensura nur über seine Tabelle, LieferLotse nur, wenn der Service vorhanden ist.
 */
class AssignmentService
{
    public const TARGET_SUPPLIER = 'supplier';
    public const TARGET_INTERNAL = 'internal';
    public const TARGETS = [self::TARGET_SUPPLIER, self::TARGET_INTERNAL];

    public const SOURCE_MENSURA = 'mensura';
    public const SOURCE_LIEFERLOTSE = 'lieferlotse';
    public const SOURCE_MANUAL = 'manual';

    /** Zuteilung änderbar bis zur Bestellung beim Lieferanten bzw. zum Produktionsstart. */
    public const CHANGEABLE = [...PositionState::BEFORE_RELEASE, PositionState::RELEASED];

    /** @var array<string, bool> */
    private array $tables = [];

    /**
     * @param EntityRepository<OrdoPositionCollection> $positionRepository
     */
    public function __construct(
        private readonly Connection $connection,
        private readonly EntityRepository $positionRepository,
        private readonly EntityRepository $orderRepository,
        private readonly ?SupplierResolver $supplierResolver = null,
    ) {
    }

    /**
     * Teilt alle noch nicht zugeteilten Positionen einer Akte zu. Gibt die Zuteilungen fürs Protokoll zurück.
     *
     * @return list<array{positionId: string, label: string, supplierId: string, supplier: ?string, source: string}>
     */
    public function assignOpen(string $ordoOrderId, Context $context): array
    {
        $positions = $this->positions($ordoOrderId, $context)->filter(
            static fn (OrdoPositionEntity $p): bool => $p->getAssignmentSource() === null && $p->getTarget() === null
        );
        if ($positions->count() === 0) {
            return [];
        }

        $lineItemIds = array_values($positions->map(static fn (OrdoPositionEntity $p): string => $p->getOrderLineItemId()));
        $mensura = $this->mensuraSuggestions($lineItemIds);
        $lieferlotse = $this->lieferLotseSuggestions($positions->first()?->getOrderLineItem()?->getOrderId(), $context);

        $updates = [];
        $result = [];
        foreach ($positions as $position) {
            $lineItemId = $position->getOrderLineItemId();
            [$supplierId, $source] = isset($mensura[$lineItemId]['supplierId'])
                ? [$mensura[$lineItemId]['supplierId'], self::SOURCE_MENSURA]
                : [$lieferlotse[$lineItemId] ?? null, self::SOURCE_LIEFERLOTSE];
            if ($supplierId === null) {
                continue;
            }
            $updates[] = ['id' => $position->getId(), 'target' => self::TARGET_SUPPLIER, 'supplierId' => $supplierId, 'assignmentSource' => $source];
            $result[] = [
                'positionId' => $position->getId(),
                'label' => (string) $position->getOrderLineItem()?->getLabel(),
                'supplierId' => $supplierId,
                'supplier' => $this->suppliers([$supplierId])[$supplierId]['name'] ?? null,
                'source' => $source,
            ];
        }

        if ($updates !== []) {
            $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->positionRepository->update($updates, $c));
        }

        return $result;
    }

    /**
     * Kandidaten je Position für die Auswahl in der Akte: Mensura-Vorschlag und alle LieferLotse-Zuordnungen.
     * EK (Mensura) nur, wenn $withPurchase.
     *
     * @return array<string, array<string, mixed>>
     */
    public function candidates(string $ordoOrderId, bool $withPurchase, Context $context): array
    {
        $positions = $this->positions($ordoOrderId, $context);
        $lineItemIds = array_values($positions->map(static fn (OrdoPositionEntity $p): string => $p->getOrderLineItemId()));
        $mensura = $this->mensuraSuggestions($lineItemIds);

        $assignments = [];
        $orderId = $positions->first()?->getOrderLineItem()?->getOrderId();
        if ($this->supplierResolver !== null && $orderId !== null) {
            $order = $this->loadOrder($orderId, $context);
            foreach ($order !== null ? $this->supplierResolver->resolveOrder($order, $context) : [] as $lineItemId => $candidates) {
                foreach ($candidates->getAssignments() as $assignment) {
                    $assignments[$lineItemId][$assignment->getSupplierId()] = $assignment->getPriority();
                }
            }
        }

        $supplierIds = [];
        foreach ($positions as $position) {
            $supplierIds[] = $mensura[$position->getOrderLineItemId()]['supplierId'] ?? null;
            $supplierIds[] = $position->getSupplierId();
            array_push($supplierIds, ...array_keys($assignments[$position->getOrderLineItemId()] ?? []));
        }
        $suppliers = $this->suppliers(array_values(array_filter(array_unique($supplierIds))));

        $result = [];
        foreach ($positions as $position) {
            $lineItemId = $position->getOrderLineItemId();
            $suggested = $mensura[$lineItemId]['supplierId'] ?? null;
            $ids = array_unique(array_filter([$suggested, ...array_keys($assignments[$lineItemId] ?? [])]));
            $list = [];
            foreach ($ids as $supplierId) {
                $list[] = [
                    'supplierId' => $supplierId,
                    'name' => $suppliers[$supplierId]['name'] ?? null,
                    'number' => $suppliers[$supplierId]['number'] ?? null,
                    'active' => $suppliers[$supplierId]['active'] ?? false,
                    'priority' => $assignments[$lineItemId][$supplierId] ?? null,
                    'mensura' => $supplierId === $suggested,
                ];
            }
            $current = $position->getSupplierId();
            $result[$position->getId()] = [
                'target' => $position->getTarget(),
                'source' => $position->getAssignmentSource(),
                'supplierId' => $current,
                'supplierName' => $current !== null ? ($suppliers[$current]['name'] ?? null) : null,
                'changeable' => \in_array($position->getStateMachineState()?->getTechnicalName(), self::CHANGEABLE, true),
                'suggested' => $suggested,
                'purchaseTotal' => $withPurchase ? ($mensura[$lineItemId]['purchaseTotal'] ?? null) : null,
                'candidates' => $list,
            ];
        }

        return $result;
    }

    /**
     * Lieferanten (LieferLotse) als ID => {name, number, active}; leer, wenn LieferLotse fehlt.
     *
     * @param list<string> $supplierIds
     *
     * @return array<string, array{name: string, number: string, active: bool}>
     */
    public function suppliers(array $supplierIds): array
    {
        if ($supplierIds === [] || !$this->tableExists('ld_supplier')) {
            return [];
        }
        $rows = $this->connection->fetchAllAssociative(
            'SELECT LOWER(HEX(id)) AS id, name, supplier_number, active FROM ld_supplier WHERE id IN (:ids)',
            ['ids' => Uuid::fromHexToBytesList($supplierIds)],
            ['ids' => ArrayParameterType::BINARY]
        );
        $result = [];
        foreach ($rows as $row) {
            $result[$row['id']] = ['name' => (string) $row['name'], 'number' => (string) $row['supplier_number'], 'active' => (bool) $row['active']];
        }

        return $result;
    }

    public function supplierExists(string $supplierId): bool
    {
        return isset($this->suppliers([$supplierId])[$supplierId]);
    }

    /**
     * Mensura-Schnappschuss: Lieferantenvorschlag und EK je Bestellposition.
     *
     * @param list<string> $lineItemIds
     *
     * @return array<string, array{supplierId: ?string, purchaseTotal: ?float}>
     */
    private function mensuraSuggestions(array $lineItemIds): array
    {
        if ($lineItemIds === [] || !$this->tableExists('ld_mensura_order_line_item')) {
            return [];
        }
        $rows = $this->connection->fetchAllAssociative(
            'SELECT LOWER(HEX(order_line_item_id)) AS line_item_id, LOWER(HEX(supplier_id)) AS supplier_id, purchase_total
             FROM ld_mensura_order_line_item WHERE order_line_item_id IN (:ids)',
            ['ids' => Uuid::fromHexToBytesList($lineItemIds)],
            ['ids' => ArrayParameterType::BINARY]
        );
        $result = [];
        foreach ($rows as $row) {
            $result[$row['line_item_id']] = [
                'supplierId' => $row['supplier_id'] ?: null,
                'purchaseTotal' => $row['purchase_total'] !== null ? (float) $row['purchase_total'] : null,
            ];
        }

        return $result;
    }

    /**
     * @return array<string, string> Bestellpositions-ID => bevorzugter Lieferant
     */
    private function lieferLotseSuggestions(?string $orderId, Context $context): array
    {
        if ($this->supplierResolver === null || $orderId === null) {
            return [];
        }
        $order = $this->loadOrder($orderId, $context);
        $result = [];
        foreach ($order !== null ? $this->supplierResolver->resolveOrder($order, $context) : [] as $lineItemId => $candidates) {
            $preferred = $candidates->getPreferred();
            if ($preferred !== null) {
                $result[$lineItemId] = $preferred->getSupplierId();
            }
        }

        return $result;
    }

    private function loadOrder(string $orderId, Context $context): ?OrderEntity
    {
        $order = $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->orderRepository->search(
            (new Criteria([$orderId]))->addAssociation('lineItems'),
            $c
        )->first());

        return $order instanceof OrderEntity ? $order : null;
    }

    private function positions(string $ordoOrderId, Context $context): OrdoPositionCollection
    {
        $criteria = (new Criteria())->addFilter(new EqualsFilter('ordoOrderId', $ordoOrderId))
            ->addAssociation('orderLineItem')
            ->addAssociation('stateMachineState');

        /** @var OrdoPositionCollection $positions */
        $positions = $context->scope(Context::SYSTEM_SCOPE, fn (Context $c) => $this->positionRepository->search($criteria, $c)->getEntities());

        return $positions;
    }

    private function tableExists(string $table): bool
    {
        return $this->tables[$table] ??= $this->connection->fetchOne('SHOW TABLES LIKE ?', [$table]) !== false;
    }
}
