<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Order;

use Lohndruckerei\Ordo\Core\Ordo\Event\OrdoEventDefinition;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionDefinition;
use Shopware\Core\Checkout\Order\OrderDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\CascadeDelete;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\PrimaryKey;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\Required;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\LongTextField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ManyToOneAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\OneToManyAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ReferenceVersionField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;

/**
 * Auftragsakte: genau eine je Shopware-Bestellung.
 */
class OrdoOrderDefinition extends EntityDefinition
{
    public const ENTITY_NAME = 'ld_ordo_order';

    public function getEntityName(): string
    {
        return self::ENTITY_NAME;
    }

    public function getEntityClass(): string
    {
        return OrdoOrderEntity::class;
    }

    public function getCollectionClass(): string
    {
        return OrdoOrderCollection::class;
    }

    protected function defineFields(): FieldCollection
    {
        return new FieldCollection([
            (new IdField('id', 'id'))->addFlags(new PrimaryKey(), new Required()),
            (new FkField('order_id', 'orderId', OrderDefinition::class))->addFlags(new Required()),
            (new ReferenceVersionField(OrderDefinition::class))->addFlags(new Required()),
            new LongTextField('note', 'note'),
            new ManyToOneAssociationField('order', 'order_id', OrderDefinition::class, 'id', false),
            (new OneToManyAssociationField('positions', OrdoPositionDefinition::class, 'ordo_order_id'))->addFlags(new CascadeDelete()),
            (new OneToManyAssociationField('events', OrdoEventDefinition::class, 'ordo_order_id'))->addFlags(new CascadeDelete()),
        ]);
    }
}
