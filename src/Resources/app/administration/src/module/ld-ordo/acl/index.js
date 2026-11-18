/**
 * Rechte von Ordo. Rollen (Chef, Kundenservice, Datenprüfung, Produktion, Versand) werden in
 * Einstellungen → Benutzer & Rechte → Rollen aus diesen Rechten zusammengestellt (docs/KONZEPT.md, Abschnitt 7).
 * Weitere Rechte (je Arbeitsplatz, EK/Marge) kommen mit den jeweiligen Schritten.
 */
Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: null,
    key: 'ld_ordo',
    roles: {
        viewer: {
            privileges: [
                'ld_ordo_order:read',
                'ld_ordo_position:read',
                'ld_ordo_event:read',
                'order:read',
                'order_customer:read',
                'order_line_item:read',
                'currency:read',
                'state_machine:read',
                'state_machine_state:read',
                'state_machine_transition:read',
            ],
            dependencies: [],
        },
        editor: {
            privileges: [
                'ld_ordo_order:create',
                'ld_ordo_order:update',
                'ld_ordo_position:create',
                'ld_ordo_position:update',
                'ld_ordo_event:create',
                'state_machine_history:create',
                // Lieferantenauswahl in der Akte (LieferLotse, falls installiert)
                'ld_supplier:read',
            ],
            dependencies: ['ld_ordo.viewer'],
        },
    },
});

/**
 * Arbeitsbereiche und Sonderrechte (Fahrplan Schritt 4). Muss mit Service/OrdoAcl.php übereinstimmen.
 * Chef und Kundenservice handeln in jedem Status (über ld_ordo.editor), Datenprüfung, Produktion und Versand
 * nur in ihrer Warteschlange – serverseitig geprüft. ld_ordo.purchase zeigt EK/Marge nur zusammen mit ld_mensura.purchase.
 */
const WORK = ['ld_ordo_position:update', 'ld_ordo_event:create', 'state_machine_history:create'];

Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'additional_permissions',
    parent: null,
    key: 'ld_ordo',
    roles: {
        chef: { privileges: [], dependencies: ['ld_ordo.viewer', 'ld_ordo.editor'] },
        service: { privileges: [], dependencies: ['ld_ordo.viewer', 'ld_ordo.editor'] },
        artwork: { privileges: WORK, dependencies: ['ld_ordo.viewer'] },
        production: { privileges: WORK, dependencies: ['ld_ordo.viewer'] },
        shipping: { privileges: WORK, dependencies: ['ld_ordo.viewer'] },
        purchase: { privileges: [], dependencies: ['ld_ordo.viewer', 'ld_mensura.purchase'] },
        admin: { privileges: [], dependencies: ['ld_ordo.viewer'] },
    },
});
