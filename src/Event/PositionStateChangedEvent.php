<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Event;

use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\Event;

/**
 * Nach einem abgeschlossenen und protokollierten Statuswechsel einer Position (anders als state_enter, das mitten im
 * Wechsel kommt). Für Automatiken wie „Lieferantenbestellung automatisch senden“.
 */
class PositionStateChangedEvent extends Event
{
    public function __construct(
        public readonly string $positionId,
        public readonly string $ordoOrderId,
        public readonly ?string $from,
        public readonly ?string $to,
        public readonly Context $context,
    ) {
    }
}
