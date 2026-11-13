<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Extension;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityExtension;
use Shopware\Core\Framework\DataAbstractionLayer\Field\OneToManyAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;

/**
 * Rückverweis für ldOrdoOrders (nur lesend, ohne Kaskade – Ordo-Daten werden nie über diese Seite geschrieben).
 */
class OrderExtension extends EntityExtension
{
    public function getEntityName(): string
    {
        return 'order';
    }

    public function extendFields(FieldCollection $collection): void
    {
        $collection->add(new OneToManyAssociationField('ldOrdoOrders', OrdoOrderDefinition::class, 'order_id'));
    }
}
