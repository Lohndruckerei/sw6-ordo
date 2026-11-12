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
    public const TABLES = [];

    /**
     * Ohne „Daten behalten“ werden alle Tabellen des Plugins entfernt.
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
    }
}
