<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Plugin;
use Shopware\Core\Framework\Plugin\Context\UninstallContext;

/**
 * Ordo – Auftragsmanagement und Leitstand der Lohndruckerei.
 *
 * Konzept: docs/KONZEPT.md · Schnittstellen: docs/INTEGRATION.md · Entwicklung: docs/ENTWICKLUNG.md
 */
class LdOrdo extends Plugin
{
    /**
     * Tabellen des Plugins, abhängige zuerst. Mit jeder neuen Migration ergänzen.
     */
    public const TABLES = ['ld_ordo_event', 'ld_ordo_position', 'ld_ordo_order'];

    public const STATE_MACHINE = 'ld_ordo_position.state';

    /**
     * Ohne „Daten behalten“ werden alle Tabellen und die Status-Maschine der Positionen entfernt.
     * Die Shopware-Bestellungen bleiben unverändert.
     */
    public function uninstall(UninstallContext $uninstallContext): void
    {
        parent::uninstall($uninstallContext);

        if ($uninstallContext->keepUserData()) {
            return;
        }

        /** @var Connection $connection */
        $connection = $this->container->get(Connection::class);

        foreach (self::TABLES as $table) {
            $connection->executeStatement('DROP TABLE IF EXISTS `' . $table . '`');
        }

        // Status-Maschine der Positionen samt Verlauf entfernen
        $machineId = $connection->fetchOne('SELECT id FROM state_machine WHERE technical_name = ?', [self::STATE_MACHINE]);
        if ($machineId !== false) {
            $connection->executeStatement('DELETE FROM state_machine_history WHERE state_machine_id = ?', [$machineId]);
            $connection->executeStatement('DELETE FROM state_machine_transition WHERE state_machine_id = ?', [$machineId]);
            $connection->executeStatement('UPDATE state_machine SET initial_state_id = NULL WHERE id = ?', [$machineId]);
            $connection->executeStatement('DELETE FROM state_machine_state WHERE state_machine_id = ?', [$machineId]);
            $connection->executeStatement('DELETE FROM state_machine WHERE id = ?', [$machineId]);
        }
    }
}
