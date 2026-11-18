<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\SupplierOrder;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;

/**
 * @extends EntityCollection<OrdoSupplierOrderEntity>
 */
class OrdoSupplierOrderCollection extends EntityCollection
{
    protected function getExpectedClass(): string
    {
        return OrdoSupplierOrderEntity::class;
    }
}
