<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Migration;

use Doctrine\DBAL\Connection;
use Lohndruckerei\Ordo\Service\PositionState;
use Shopware\Core\Framework\Migration\MigrationStep;
use Shopware\Core\Migration\Traits\StateMachineMigration;
use Shopware\Core\Migration\Traits\StateMachineMigrationTrait;

/**
 * Auftragsakte (ld_ordo_order), Positionen mit Status-Maschine (ld_ordo_position) und Protokoll (ld_ordo_event).
 */
class Migration1795000000Workflow extends MigrationStep
{
    use StateMachineMigrationTrait;

    public function getCreationTimestamp(): int
    {
        return 1795000000;
    }

    public function update(Connection $connection): void
    {
        $states = [];
        foreach (PositionState::STATES as $name => [$de, $en]) {
            $states[] = StateMachineMigration::state($name, $de, $en);
        }
        $transitions = array_map(
            static fn (array $t): array => StateMachineMigration::transition($t[0], $t[1], $t[2]),
            PositionState::transitions()
        );
        $this->import(new StateMachineMigration(
            PositionState::MACHINE,
            'Ordo – Auftragsposition',
            'Ordo – order position',
            $states,
            $transitions,
            PositionState::NEW
        ), $connection);

        $connection->executeStatement(<<<'SQL'
CREATE TABLE IF NOT EXISTS `ld_ordo_order` (
    `id` BINARY(16) NOT NULL,
    `order_id` BINARY(16) NOT NULL,
    `order_version_id` BINARY(16) NOT NULL,
    `note` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq.ld_ordo_order.order` (`order_id`, `order_version_id`),
    CONSTRAINT `fk.ld_ordo_order.order` FOREIGN KEY (`order_id`, `order_version_id`)
        REFERENCES `order` (`id`, `version_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL);

        $connection->executeStatement(<<<'SQL'
CREATE TABLE IF NOT EXISTS `ld_ordo_position` (
    `id` BINARY(16) NOT NULL,
    `ordo_order_id` BINARY(16) NOT NULL,
    `order_line_item_id` BINARY(16) NOT NULL,
    `order_line_item_version_id` BINARY(16) NOT NULL,
    `state_id` BINARY(16) NOT NULL,
    `target` VARCHAR(16) NULL,
    `supplier_id` BINARY(16) NULL,
    `hold_reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq.ld_ordo_position.line_item` (`order_line_item_id`, `order_line_item_version_id`),
    KEY `idx.ld_ordo_position.supplier` (`supplier_id`),
    CONSTRAINT `fk.ld_ordo_position.ordo_order` FOREIGN KEY (`ordo_order_id`)
        REFERENCES `ld_ordo_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk.ld_ordo_position.line_item` FOREIGN KEY (`order_line_item_id`, `order_line_item_version_id`)
        REFERENCES `order_line_item` (`id`, `version_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk.ld_ordo_position.state` FOREIGN KEY (`state_id`)
        REFERENCES `state_machine_state` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL);

        $connection->executeStatement(<<<'SQL'
CREATE TABLE IF NOT EXISTS `ld_ordo_event` (
    `id` BINARY(16) NOT NULL,
    `ordo_order_id` BINARY(16) NOT NULL,
    `position_id` BINARY(16) NULL,
    `type` VARCHAR(64) NOT NULL,
    `message` LONGTEXT NULL,
    `payload` JSON NULL,
    `user_id` BINARY(16) NULL,
    `user_name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    KEY `idx.ld_ordo_event.created` (`ordo_order_id`, `created_at`),
    CONSTRAINT `json.ld_ordo_event.payload` CHECK (JSON_VALID(`payload`)),
    CONSTRAINT `fk.ld_ordo_event.ordo_order` FOREIGN KEY (`ordo_order_id`)
        REFERENCES `ld_ordo_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL);
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
