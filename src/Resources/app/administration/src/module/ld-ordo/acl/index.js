/**
 * Rechte von Ordo. Die Rollen (Chef, Kundenservice, Datenprüfung, Produktion, Versand) werden in
 * Einstellungen → Benutzer & Rechte → Rollen aus diesen Rechten zusammengestellt (docs/KONZEPT.md, Rollen).
 * Weitere Rechte (je Arbeitsbereich, EK/Marge) kommen mit den jeweiligen Schritten.
 */
Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: null,
    key: 'ld_ordo',
    roles: {
        viewer: {
            privileges: [],
            dependencies: [],
        },
    },
});
