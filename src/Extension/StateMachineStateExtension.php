<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Extension;

use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityExtension;
use Shopware\Core\Framework\DataAbstractionLayer\Field\OneToManyAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;

/**
 * Rückverweis für ldOrdoPositions (nur lesend, ohne Kaskade – Ordo-Daten werden nie über diese Seite geschrieben).
 */
class StateMachineStateExtension extends EntityExtension
{
    public function getEntityName(): string
    {
        return 'state_machine_state';
    }

    public function extendFields(FieldCollection $collection): void
    {
        $collection->add(new OneToManyAssociationField('ldOrdoPositions', OrdoPositionDefinition::class, 'state_id'));
    }
}
