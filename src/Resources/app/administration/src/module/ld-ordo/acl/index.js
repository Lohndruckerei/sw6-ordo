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
            ],
            dependencies: ['ld_ordo.viewer'],
        },
    },
});
