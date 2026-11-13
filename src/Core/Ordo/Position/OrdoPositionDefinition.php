<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Position;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderDefinition;
use Lohndruckerei\Ordo\Service\PositionState;
use Shopware\Core\Checkout\Order\Aggregate\OrderLineItem\OrderLineItemDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\PrimaryKey;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\Required;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ManyToOneAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ReferenceVersionField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\StateMachineStateField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\StringField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;
use Shopware\Core\System\StateMachine\Aggregation\StateMachineState\StateMachineStateDefinition;

/**
 * Position der Auftragsakte mit eigenem Status (Status-Maschine ld_ordo_position.state).
 * supplierId verweist lose auf LieferLotse (ld_supplier), ohne Fremdschlüssel.
 */
class OrdoPositionDefinition extends EntityDefinition
{
    public const ENTITY_NAME = 'ld_ordo_position';

    public const TARGET_INTERNAL = 'internal';
    public const TARGET_SUPPLIER = 'supplier';

    public function getEntityName(): string
    {
        return self::ENTITY_NAME;
    }

    public function getEntityClass(): string
    {
        return OrdoPositionEntity::class;
    }

    public function getCollectionClass(): string
    {
        return OrdoPositionCollection::class;
    }

    protected function getParentDefinitionClass(): ?string
    {
        return OrdoOrderDefinition::class;
    }

    protected function defineFields(): FieldCollection
    {
        return new FieldCollection([
            (new IdField('id', 'id'))->addFlags(new PrimaryKey(), new Required()),
            (new FkField('ordo_order_id', 'ordoOrderId', OrdoOrderDefinition::class))->addFlags(new Required()),
            (new FkField('order_line_item_id', 'orderLineItemId', OrderLineItemDefinition::class))->addFlags(new Required()),
            (new ReferenceVersionField(OrderLineItemDefinition::class))->addFlags(new Required()),
            (new StateMachineStateField('state_id', 'stateId', PositionState::MACHINE))->addFlags(new Required()),
            new StringField('target', 'target', 16),
            new IdField('supplier_id', 'supplierId'),
            new StringField('hold_reason', 'holdReason', 500),
            new ManyToOneAssociationField('ordoOrder', 'ordo_order_id', OrdoOrderDefinition::class, 'id', false),
            new ManyToOneAssociationField('orderLineItem', 'order_line_item_id', OrderLineItemDefinition::class, 'id', false),
            new ManyToOneAssociationField('stateMachineState', 'state_id', StateMachineStateDefinition::class, 'id', true),
        ]);
    }
}
