<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Event;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;

/**
 * @extends EntityCollection<OrdoEventEntity>
 */
class OrdoEventCollection extends EntityCollection
{
    protected function getExpectedClass(): string
    {
        return OrdoEventEntity::class;
    }
}
