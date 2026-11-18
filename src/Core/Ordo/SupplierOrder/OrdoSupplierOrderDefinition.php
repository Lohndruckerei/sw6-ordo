<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\SupplierOrder;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderDefinition;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\BoolField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\DateField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\DateTimeField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\PrimaryKey;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\Required;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\JsonField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ListField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\LongTextField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ManyToOneAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\OneToManyAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\StringField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;

/**
 * Gespeicherte Lieferantenbestellung (KONZEPT 9, E16/E17). LieferLotse baut und sendet, Ordo speichert Inhalt und Ergebnis.
 * Status: sent, failed, cancelled. Lieferant nur per ID (lose Kopplung), Name/Nummer als Schnappschuss.
 */
class OrdoSupplierOrderDefinition extends EntityDefinition
{
    public const ENTITY_NAME = 'ld_ordo_supplier_order';

    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public function getEntityName(): string
    {
        return self::ENTITY_NAME;
    }

    public function getEntityClass(): string
    {
        return OrdoSupplierOrderEntity::class;
    }

    public function getCollectionClass(): string
    {
        return OrdoSupplierOrderCollection::class;
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
            (new IdField('supplier_id', 'supplierId'))->addFlags(new Required()),
            new StringField('supplier_number', 'supplierNumber', 64),
            new StringField('supplier_name', 'supplierName'),
            (new StringField('number', 'number', 128))->addFlags(new Required()),
            (new StringField('status', 'status', 16))->addFlags(new Required()),
            new BoolField('partial', 'partial'),
            new DateField('delivery_date', 'deliveryDate'),
            new StringField('interface_name', 'interfaceName'),
            new StringField('transport', 'transport', 64),
            new LongTextField('result_message', 'resultMessage'),
            new ListField('line_item_ids', 'lineItemIds', IdField::class),
            new JsonField('payload', 'payload'),
            new DateTimeField('sent_at', 'sentAt'),
            new StringField('user_name', 'userName'),
            new ManyToOneAssociationField('ordoOrder', 'ordo_order_id', OrdoOrderDefinition::class, 'id', false),
            new OneToManyAssociationField('positions', OrdoPositionDefinition::class, 'supplier_order_id'),
        ]);
    }
}
