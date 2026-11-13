<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Event;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\PrimaryKey;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\Required;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\JsonField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\LongTextField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ManyToOneAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\StringField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;

/**
 * Protokoll der Auftragsakte: jede Statusänderung, Notiz und spätere Mail/Aktion.
 * user_name wird mitgespeichert, damit das Protokoll lesbar bleibt, auch wenn der Benutzer gelöscht wird.
 */
class OrdoEventDefinition extends EntityDefinition
{
    public const ENTITY_NAME = 'ld_ordo_event';

    public function getEntityName(): string
    {
        return self::ENTITY_NAME;
    }

    public function getEntityClass(): string
    {
        return OrdoEventEntity::class;
    }

    public function getCollectionClass(): string
    {
        return OrdoEventCollection::class;
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
            new IdField('position_id', 'positionId'),
            (new StringField('type', 'type', 64))->addFlags(new Required()),
            new LongTextField('message', 'message'),
            new JsonField('payload', 'payload'),
            new IdField('user_id', 'userId'),
            new StringField('user_name', 'userName'),
            new ManyToOneAssociationField('ordoOrder', 'ordo_order_id', OrdoOrderDefinition::class, 'id', false),
        ]);
    }
}
