<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Order;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;

/**
 * @extends EntityCollection<OrdoOrderEntity>
 */
class OrdoOrderCollection extends EntityCollection
{
    protected function getExpectedClass(): string
    {
        return OrdoOrderEntity::class;
    }
}
