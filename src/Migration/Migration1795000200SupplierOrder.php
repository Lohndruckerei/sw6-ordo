<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

/**
 * Auftragsverteilung (Fahrplan Schritt 5): gespeicherte Lieferantenbestellungen und Herkunft der Zuteilung je Position.
 * Lieferanten nur per ID ohne Fremdschlüssel (LieferLotse ist optional); Name und Nummer als Schnappschuss.
 */
class Migration1795000200SupplierOrder extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1795000200;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(<<<'SQL'
CREATE TABLE IF NOT EXISTS `ld_ordo_supplier_order` (
    `id` BINARY(16) NOT NULL,
    `ordo_order_id` BINARY(16) NOT NULL,
    `supplier_id` BINARY(16) NOT NULL,
    `supplier_number` VARCHAR(64) NULL,
    `supplier_name` VARCHAR(255) NULL,
    `number` VARCHAR(128) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `partial` TINYINT(1) NOT NULL DEFAULT 0,
    `delivery_date` DATE NULL,
    `interface_name` VARCHAR(255) NULL,
    `transport` VARCHAR(64) NULL,
    `result_message` LONGTEXT NULL,
    `line_item_ids` JSON NULL,
    `payload` JSON NULL,
    `sent_at` DATETIME(3) NULL,
    `user_name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    KEY `idx.ld_ordo_supplier_order.supplier` (`supplier_id`),
    CONSTRAINT `json.ld_ordo_supplier_order.line_item_ids` CHECK (JSON_VALID(`line_item_ids`)),
    CONSTRAINT `json.ld_ordo_supplier_order.payload` CHECK (JSON_VALID(`payload`)),
    CONSTRAINT `fk.ld_ordo_supplier_order.ordo_order` FOREIGN KEY (`ordo_order_id`)
        REFERENCES `ld_ordo_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL);

        $columns = array_column($connection->fetchAllAssociative('SHOW COLUMNS FROM `ld_ordo_position`'), 'Field');
        if (!\in_array('assignment_source', $columns, true)) {
            $connection->executeStatement('ALTER TABLE `ld_ordo_position` ADD COLUMN `assignment_source` VARCHAR(16) NULL AFTER `supplier_id`');
        }
        if (!\in_array('supplier_order_id', $columns, true)) {
            $connection->executeStatement(<<<'SQL'
ALTER TABLE `ld_ordo_position`
    ADD COLUMN `supplier_order_id` BINARY(16) NULL AFTER `assignment_source`,
    ADD CONSTRAINT `fk.ld_ordo_position.supplier_order` FOREIGN KEY (`supplier_order_id`)
        REFERENCES `ld_ordo_supplier_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
SQL);
        }

        $this->grantSupplierRead($connection);
    }

    /**
     * Bearbeiter (ld_ordo.editor) wählen in der Akte auch Lieferanten außerhalb der Vorschläge → Leserecht ergänzen,
     * auch in schon vorhandenen Rollen.
     */
    private function grantSupplierRead(Connection $connection): void
    {
        $connection->executeStatement(<<<'SQL'
UPDATE `acl_role` SET `privileges` = JSON_ARRAY_APPEND(`privileges`, '$', 'ld_supplier:read')
WHERE JSON_CONTAINS(`privileges`, '"ld_ordo.editor"') AND NOT JSON_CONTAINS(`privileges`, '"ld_supplier:read"')
SQL);
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
