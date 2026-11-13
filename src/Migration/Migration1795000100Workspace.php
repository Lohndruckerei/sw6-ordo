<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Migration;

use Doctrine\DBAL\Connection;
use Lohndruckerei\Ordo\Service\OrdoAcl;
use Lohndruckerei\Ordo\Service\PositionState;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Migration\MigrationStep;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\Migration\Traits\StateMachineMigration;
use Shopware\Core\Migration\Traits\StateMachineMigrationTrait;

/**
 * Arbeitsplatz (Fahrplan Schritt 4): Übergänge zum Weiterleiten (`move_<status>`) und Rollenvorschläge.
 * Bestehende Übergänge und Rollen bleiben unverändert; Rollen werden nur angelegt, wenn der Name fehlt.
 */
class Migration1795000100Workspace extends MigrationStep
{
    use StateMachineMigrationTrait;

    public function getCreationTimestamp(): int
    {
        return 1795000100;
    }

    public function update(Connection $connection): void
    {
        $states = [];
        foreach (PositionState::STATES as $name => [$de, $en]) {
            $states[] = StateMachineMigration::state($name, $de, $en);
        }
        $this->import(new StateMachineMigration(
            PositionState::MACHINE,
            'Ordo – Auftragsposition',
            'Ordo – order position',
            $states,
            array_map(static fn (array $t): array => StateMachineMigration::transition($t[0], $t[1], $t[2]), PositionState::transitions()),
            PositionState::NEW
        ), $connection);

        $now = (new \DateTimeImmutable())->format(Defaults::STORAGE_DATE_TIME_FORMAT);
        foreach (OrdoAcl::ROLES as $name => [$description, $keys]) {
            $exists = $connection->fetchOne('SELECT 1 FROM acl_role WHERE name = ? AND deleted_at IS NULL', [$name]);
            if ($exists !== false) {
                continue;
            }
            $connection->insert('acl_role', [
                'id' => Uuid::randomBytes(),
                'name' => $name,
                'description' => $description,
                'privileges' => json_encode(OrdoAcl::expand($keys), \JSON_THROW_ON_ERROR),
                'created_at' => $now,
            ]);
        }
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
