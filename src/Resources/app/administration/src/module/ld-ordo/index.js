import './acl';

Shopware.Component.register('lo-overview', () => import('./page/lo-overview'));

const COLOR = '#0B6E79';

/**
 * Eigener Hauptmenüpunkt „Ordo“ (Leitstand).
 *
 * Shopware lässt Plugin-Module (type: 'plugin') nicht auf die erste Menüebene; deshalb type 'core'
 * wie bei Mensura. Arbeitsbereiche (Kundenservice, Datenprüfung, Produktion, Versand, Chef) folgen
 * laut docs/KONZEPT.md als Unterpunkte bzw. als Vollbild-Arbeitsplatz.
 */
Shopware.Module.register('ld-ordo', {
    type: 'core',
    name: 'ld-ordo',
    title: 'ld-ordo.general.mainMenuItem',
    description: 'ld-ordo.general.description',
    color: COLOR,
    icon: 'regular-tasks',

    routes: {
        overview: {
            component: 'lo-overview',
            path: 'overview',
            meta: { privilege: 'ld_ordo.viewer' },
        },
    },

    navigation: [
        {
            id: 'ld-ordo',
            label: 'ld-ordo.general.mainMenuItem',
            color: COLOR,
            icon: 'regular-tasks',
            path: 'ld.ordo.overview',
            privilege: 'ld_ordo.viewer',
            position: 15,
        },
    ],
});
