<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

/**
 * Status-Maschine der Auftragspositionen (KONZEPT 4.2). Technische Namen, Übersetzungen und Übergänge an einer Stelle;
 * die Migration und die Administration lesen von hier bzw. aus der Status-Maschine.
 */
final class PositionState
{
    public const MACHINE = 'ld_ordo_position.state';
    public const ENTITY = 'ld_ordo_position';
    public const FIELD = 'stateId';

    public const NEW = 'new';
    public const AWAITING_INFO = 'awaiting_info';
    public const AWAITING_ARTWORK = 'awaiting_artwork';
    public const ARTWORK_CHECK = 'artwork_check';
    public const ARTWORK_REJECTED = 'artwork_rejected';
    public const AWAITING_APPROVAL = 'awaiting_approval';
    public const AWAITING_PAYMENT = 'awaiting_payment';
    public const RELEASED = 'released';
    public const SUPPLIER_ORDERED = 'supplier_ordered';
    public const IN_PRODUCTION = 'in_production';
    public const READY_TO_SHIP = 'ready_to_ship';
    public const SHIPPED = 'shipped';
    public const DELIVERED = 'delivered';
    public const ON_HOLD = 'on_hold';
    public const CANCELLED = 'cancelled';

    /** technischer Name => [de, en] */
    public const STATES = [
        self::NEW => ['Neu', 'New'],
        self::AWAITING_INFO => ['Warten auf Infos', 'Awaiting information'],
        self::AWAITING_ARTWORK => ['Daten fehlen', 'Artwork missing'],
        self::ARTWORK_CHECK => ['In Datenprüfung', 'Artwork check'],
        self::ARTWORK_REJECTED => ['Daten fehlerhaft', 'Artwork rejected'],
        self::AWAITING_APPROVAL => ['Warten auf Freigabe', 'Awaiting approval'],
        self::AWAITING_PAYMENT => ['Warten auf Zahlung', 'Awaiting payment'],
        self::RELEASED => ['Freigegeben', 'Released'],
        self::SUPPLIER_ORDERED => ['Beim Lieferanten bestellt', 'Ordered from supplier'],
        self::IN_PRODUCTION => ['In Produktion', 'In production'],
        self::READY_TO_SHIP => ['Versandbereit', 'Ready to ship'],
        self::SHIPPED => ['Versendet', 'Shipped'],
        self::DELIVERED => ['Zugestellt', 'Delivered'],
        self::ON_HOLD => ['Angehalten', 'On hold'],
        self::CANCELLED => ['Storniert', 'Cancelled'],
    ];

    /** Vor dem Freigabe-Tor: hier darf zwischen allen Vorstufen gewechselt werden. */
    public const BEFORE_RELEASE = [
        self::NEW, self::AWAITING_INFO, self::AWAITING_ARTWORK, self::ARTWORK_CHECK,
        self::ARTWORK_REJECTED, self::AWAITING_APPROVAL, self::AWAITING_PAYMENT, self::ON_HOLD,
    ];

    /** Wartet auf den Kunden („Auftrag verzögert sich“) oder ist angehalten. */
    public const BLOCKING = [
        self::AWAITING_INFO, self::AWAITING_ARTWORK, self::ARTWORK_REJECTED,
        self::AWAITING_APPROVAL, self::AWAITING_PAYMENT, self::ON_HOLD,
    ];

    public const FINISHED = [self::SHIPPED, self::DELIVERED, self::CANCELLED];

    /** Aktion => Zielstatus */
    public const ACTIONS = [
        'request_info' => self::AWAITING_INFO,
        'request_artwork' => self::AWAITING_ARTWORK,
        'check_artwork' => self::ARTWORK_CHECK,
        'reject_artwork' => self::ARTWORK_REJECTED,
        'request_approval' => self::AWAITING_APPROVAL,
        'request_payment' => self::AWAITING_PAYMENT,
        'release' => self::RELEASED,
        'order_supplier' => self::SUPPLIER_ORDERED,
        'start_production' => self::IN_PRODUCTION,
        'ready' => self::READY_TO_SHIP,
        'ship' => self::SHIPPED,
        'deliver' => self::DELIVERED,
        'hold' => self::ON_HOLD,
        'cancel' => self::CANCELLED,
    ];

    /**
     * Alle erlaubten Übergänge als [Aktion, von, nach].
     *
     * @return list<array{0: string, 1: string, 2: string}>
     */
    public static function transitions(): array
    {
        $result = [];
        $add = static function (string $action, array $from) use (&$result): void {
            $to = self::ACTIONS[$action];
            foreach ($from as $state) {
                if ($state !== $to) {
                    $result[] = [$action, $state, $to];
                }
            }
        };

        // Vorstufen untereinander und Freigabe
        foreach (['request_info', 'request_artwork', 'check_artwork', 'reject_artwork', 'request_approval', 'request_payment', 'release'] as $action) {
            $add($action, self::BEFORE_RELEASE);
        }
        // Nach der Freigabe: extern oder intern
        $add('order_supplier', [self::RELEASED, self::IN_PRODUCTION]);
        $add('start_production', [self::RELEASED, self::SUPPLIER_ORDERED]);
        $add('ready', [self::IN_PRODUCTION, self::SUPPLIER_ORDERED]);
        // Lieferanten versenden direkt an den Kunden
        $add('ship', [self::READY_TO_SHIP, self::SUPPLIER_ORDERED]);
        $add('deliver', [self::SHIPPED]);
        // Anhalten und Stornieren bis zum Versand
        $add('hold', [self::NEW, self::AWAITING_INFO, self::AWAITING_ARTWORK, self::ARTWORK_CHECK, self::ARTWORK_REJECTED,
            self::AWAITING_APPROVAL, self::AWAITING_PAYMENT, self::RELEASED, self::SUPPLIER_ORDERED, self::IN_PRODUCTION, self::READY_TO_SHIP]);
        $add('cancel', array_values(array_diff(array_keys(self::STATES), self::FINISHED)));

        return $result;
    }
}
