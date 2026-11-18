<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Service;

use Shopware\Core\Framework\Api\Context\AdminApiSource;
use Shopware\Core\Framework\Context;

/**
 * Rechte von Ordo (KONZEPT 7) – serverseitige Prüfung und Rollenvorschläge.
 *
 * Die Rechte-Schlüssel und ihre Entity-Rechte müssen mit der Administration übereinstimmen
 * (src/Resources/app/administration/src/module/ld-ordo/acl/index.js).
 */
final class OrdoAcl
{
    public const VIEWER = 'ld_ordo.viewer';
    public const EDITOR = 'ld_ordo.editor';
    public const CHEF = 'ld_ordo.chef';
    public const SERVICE = 'ld_ordo.service';
    public const ARTWORK = 'ld_ordo.artwork';
    public const PRODUCTION = 'ld_ordo.production';
    public const SHIPPING = 'ld_ordo.shipping';
    public const PURCHASE = 'ld_ordo.purchase';
    public const ADMIN = 'ld_ordo.admin';
    public const MENSURA_PURCHASE = 'ld_mensura.purchase';

    /** Arbeitsbereich => Recht. Chef und Kundenservice dürfen in jedem Status handeln. */
    public const AREA_PRIVILEGES = [
        'artwork' => self::ARTWORK,
        'production' => self::PRODUCTION,
        'shipping' => self::SHIPPING,
    ];

    /** Entity-Rechte je Schlüssel (wie die Administration sie beim Speichern einer Rolle einträgt). */
    public const PRIVILEGES = [
        self::VIEWER => [
            'ld_ordo_order:read', 'ld_ordo_position:read', 'ld_ordo_event:read', 'order:read', 'order_customer:read',
            'order_line_item:read', 'currency:read', 'state_machine:read', 'state_machine_state:read', 'state_machine_transition:read',
        ],
        self::EDITOR => [
            'ld_ordo_order:create', 'ld_ordo_order:update', 'ld_ordo_position:create', 'ld_ordo_position:update',
            'ld_ordo_event:create', 'state_machine_history:create', 'ld_supplier:read',
        ],
        self::CHEF => [],
        self::SERVICE => [],
        self::ARTWORK => ['ld_ordo_position:update', 'ld_ordo_event:create', 'state_machine_history:create'],
        self::PRODUCTION => ['ld_ordo_position:update', 'ld_ordo_event:create', 'state_machine_history:create'],
        self::SHIPPING => ['ld_ordo_position:update', 'ld_ordo_event:create', 'state_machine_history:create'],
        self::PURCHASE => [],
        self::ADMIN => [],
    ];

    /** Rollenvorschläge: Name => [Beschreibung, Schlüssel]. Werden nur angelegt, wenn der Name noch fehlt. */
    public const ROLES = [
        'Ordo – Chef' => ['Leitstand mit allen Arbeitsbereichen, Kennzahlen und EK/Marge (EK nur mit Mensura).',
            [self::VIEWER, self::EDITOR, self::CHEF, self::SERVICE, self::ARTWORK, self::PRODUCTION, self::SHIPPING, self::PURCHASE, self::MENSURA_PURCHASE, self::ADMIN]],
        'Ordo – Kundenservice' => ['Alle Aufträge bearbeiten, Status jeder Station ändern, Notizen.',
            [self::VIEWER, self::EDITOR, self::SERVICE]],
        'Ordo – Datenprüfung' => ['Warteschlange Datenprüfung: prüfen, freigeben, zurückweisen, weiterleiten.',
            [self::VIEWER, self::ARTWORK]],
        'Ordo – Produktion' => ['Warteschlange Produktion: Arbeit starten, abschließen, weiterleiten.',
            [self::VIEWER, self::PRODUCTION]],
        'Ordo – Versand' => ['Warteschlange Versand: versandbereite Positionen versenden, weiterleiten.',
            [self::VIEWER, self::SHIPPING]],
    ];

    /**
     * Darf der Benutzer eine Position im Status $state weiterschalten? Automatik und Konsole immer;
     * Leitstand-Bearbeiter (Chef, Kundenservice) immer; sonst nur der Bereich, in dem die Position liegt.
     */
    public static function mayHandle(?string $state, Context $context): bool
    {
        $source = $context->getSource();
        if (!$source instanceof AdminApiSource || $source->isAdmin() || $source->isAllowed(self::EDITOR)) {
            return true;
        }
        foreach (self::AREA_PRIVILEGES as $area => $privilege) {
            if ($source->isAllowed($privilege) && \in_array($state, PositionState::AREAS[$area], true)) {
                return true;
            }
        }

        return false;
    }

    /** EK/Marge: eigenes Recht und das Mensura-Recht (INTEGRATION.md). Nie in die Store-API. */
    public static function canSeePurchase(Context $context): bool
    {
        $source = $context->getSource();
        if (!$source instanceof AdminApiSource) {
            return false;
        }

        return $source->isAdmin() || ($source->isAllowed(self::PURCHASE) && $source->isAllowed(self::MENSURA_PURCHASE));
    }

    /**
     * Alle Privilegien einer Rolle aus ihren Schlüsseln.
     *
     * @param list<string> $keys
     *
     * @return list<string>
     */
    public static function expand(array $keys): array
    {
        $result = $keys;
        foreach ($keys as $key) {
            array_push($result, ...(self::PRIVILEGES[$key] ?? []));
        }

        return array_values(array_unique($result));
    }
}
