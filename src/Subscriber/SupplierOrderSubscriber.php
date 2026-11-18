<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Subscriber;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Lohndruckerei\LieferLotse\Event\SupplierOrderRequestedEvent;
use Lohndruckerei\Ordo\Event\PositionStateChangedEvent;
use Lohndruckerei\Ordo\Service\PositionState;
use Lohndruckerei\Ordo\Service\SupplierOrderManager;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Uuid\Uuid;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Freigabe-Tor gegenüber LieferLotse (E16): Veto, solange eine Position der Lieferantenbestellung bei Ordo nicht
 * freigegeben ist – gilt auch für Bestellungen, die jemand direkt in LieferLotse auslöst.
 * Und: automatisches Senden nach der Freigabe, wenn eingeschaltet (Standard aus).
 * Der Klassenname des LieferLotse-Events ist nur ein String; ohne LieferLotse wird der Listener nie aufgerufen.
 */
class SupplierOrderSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly Connection $connection,
        private readonly SupplierOrderManager $manager,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            SupplierOrderRequestedEvent::class => 'onRequested',
            PositionStateChangedEvent::class => 'onStateChanged',
        ];
    }

    public function onRequested(SupplierOrderRequestedEvent $event): void
    {
        $lineItemIds = array_map(static fn ($item): string => $item->getOrderLineItemId(), $event->getSupplierOrder()->getItems());
        if ($lineItemIds === []) {
            return;
        }
        $rows = $this->connection->fetchAllAssociative(
            'SELECT s.technical_name, li.label FROM ld_ordo_position p
             JOIN state_machine_state s ON s.id = p.state_id
             JOIN order_line_item li ON li.id = p.order_line_item_id AND li.version_id = p.order_line_item_version_id
             WHERE p.order_line_item_id IN (:ids)',
            ['ids' => Uuid::fromHexToBytesList($lineItemIds)],
            ['ids' => ArrayParameterType::BINARY]
        );
        $blocked = array_filter($rows, static fn (array $row): bool => $row['technical_name'] !== PositionState::RELEASED);
        if ($blocked !== []) {
            $event->veto(\sprintf(
                'Freigabe-Tor in Ordo geschlossen (%s). Erst Druckdaten und Zahlung freigeben.',
                implode(', ', array_map(static fn (array $row): string => $row['label'] . ': ' . $row['technical_name'], $blocked))
            ));
        }
    }

    public function onStateChanged(PositionStateChangedEvent $event): void
    {
        if ($event->to === PositionState::RELEASED) {
            // als Automatik, unabhängig vom Arbeitsbereich dessen, der freigegeben hat
            $this->manager->autoSend($event->positionId, Context::createDefaultContext());
        }
    }
}
