<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Position;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;

/**
 * @extends EntityCollection<OrdoPositionEntity>
 */
class OrdoPositionCollection extends EntityCollection
{
    protected function getExpectedClass(): string
    {
        return OrdoPositionEntity::class;
    }
}
