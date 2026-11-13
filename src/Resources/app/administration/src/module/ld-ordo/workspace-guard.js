/**
 * Mitarbeiter mit ausschließlich Ordo-Rechten sehen keine anderen Shopware-Bereiche (KONZEPT 7):
 * Jede Admin-Route außer dem Arbeitsplatz und der Anmeldung führt sie zum Vollbild-Arbeitsplatz.
 * Das ist Bedienführung; die Daten schützt der Server über die Rechte.
 */

/** Rechte, die ein Ordo-Mitarbeiter zusätzlich haben darf (Voraussetzung für ld_ordo.purchase). */
const ALLOWED_FOREIGN = ['ld_mensura.purchase', 'ld_mensura.viewer'];
const OPEN_ROUTES = /^(ld\.ordo\.workspace|sw\.login\.|sw\.inactivity\.login|sw\.privilege\.error)/;

export function isOrdoOnly() {
    const acl = Shopware.Service('acl');
    if (!acl || acl.isAdmin()) {
        return false;
    }
    // Rechte-Schlüssel (Bereich.Rolle), keine Entity-Rechte (entity:read)
    const keys = (acl.privileges || []).filter((privilege) => !privilege.includes(':'));
    return keys.some((key) => key.startsWith('ld_ordo.'))
        && keys.every((key) => key.startsWith('ld_ordo.') || ALLOWED_FOREIGN.includes(key));
}

function target(to) {
    if (!to?.name || OPEN_ROUTES.test(String(to.name)) || !isOrdoOnly()) {
        return true;
    }
    return { name: 'ld.ordo.workspace' };
}

function routerInstance() {
    const root = Shopware.Application.getApplicationRoot?.();
    return root ? (root.config?.globalProperties?.$router || null) : null;
}

function check(router) {
    const redirect = target(router.currentRoute.value);
    if (redirect !== true) {
        router.replace(redirect);
    }
}

export function installWorkspaceGuard(attempt = 0) {
    const router = routerInstance();
    if (!router) {
        if (attempt < 400) {
            window.setTimeout(() => installWorkspaceGuard(attempt + 1), 50);
        }
        return;
    }
    router.beforeEach((to) => target(to));
    check(router);
    // Nach der Anmeldung kommen die Rechte erst mit dem Benutzer – dann die aktuelle Seite erneut prüfen
    Shopware.Store.get('session').$subscribe(() => check(router));
}
