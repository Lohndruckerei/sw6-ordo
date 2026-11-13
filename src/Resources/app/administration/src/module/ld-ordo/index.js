import './acl';
import './ordo.scss';

Shopware.Component.register('lo-info-card', () => import('./component/lo-info-card'));
Shopware.Component.register('lo-position-state', () => import('./component/lo-position-state'));
Shopware.Component.register('lo-order-list', () => import('./page/lo-order-list'));
Shopware.Component.register('lo-order-detail', () => import('./page/lo-order-detail'));

const COLOR = '#0B6E79';

/**
 * Eigener Hauptmenüpunkt „Ordo“ (Leitstand).
 *
 * Shopware lässt Plugin-Module (type: 'plugin') nicht auf die erste Menüebene; deshalb type 'core'
 * wie bei Mensura. Weitere Arbeitsplätze (Kundenservice, Datenprüfung, Produktion, Versand, Chef) folgen
 * laut docs/KONZEPT.md (Fahrplan Schritt 4: Vollbild-Arbeitsplatz).
 */
Shopware.Module.register('ld-ordo', {
    type: 'core',
    name: 'ld-ordo',
    title: 'ld-ordo.general.mainMenuItem',
    description: 'ld-ordo.general.description',
    color: COLOR,
    icon: 'regular-tasks',

    routes: {
        list: {
            component: 'lo-order-list',
            path: 'list',
            meta: { privilege: 'ld_ordo.viewer' },
        },
        detail: {
            component: 'lo-order-detail',
            path: 'detail/:id',
            props: { default: (route) => ({ ordoOrderId: route.params.id }) },
            meta: { parentPath: 'ld.ordo.list', privilege: 'ld_ordo.viewer' },
        },
    },

    navigation: [
        {
            id: 'ld-ordo',
            label: 'ld-ordo.general.mainMenuItem',
            color: COLOR,
            icon: 'regular-tasks',
            path: 'ld.ordo.list',
            privilege: 'ld_ordo.viewer',
            position: 15,
        },
    ],
});
