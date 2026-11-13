<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Subscriber;

use Lohndruckerei\Ordo\Service\OrderFileService;
use Psr\Log\LoggerInterface;
use Shopware\Core\Checkout\Cart\Event\CheckoutOrderPlacedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Auftragsannahme: Zu jeder neuen Bestellung entsteht die Auftragsakte mit Positionen im Status „Neu“.
 * Ein Fehler hier darf die Bestellung des Kunden nie verhindern – er wird nur protokolliert;
 * fehlende Akten legt `bin/console ordo:order:sync` nachträglich an.
 */
class OrderPlacedSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly OrderFileService $orderFileService,
        private readonly LoggerInterface $logger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [CheckoutOrderPlacedEvent::class => 'onOrderPlaced'];
    }

    public function onOrderPlaced(CheckoutOrderPlacedEvent $event): void
    {
        try {
            $this->orderFileService->ensure($event->getOrderId(), $event->getContext());
        } catch (\Throwable $e) {
            $this->logger->error('Ordo: Auftragsakte konnte nicht angelegt werden', [
                'orderId' => $event->getOrderId(),
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
