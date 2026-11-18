/**
 * Positionsstatus (gleich wie PHP Service/PositionState). Darstellung nach DESIGN.md: nie nur Farbe.
 */
export const BLOCKING = ['awaiting_info', 'awaiting_artwork', 'artwork_rejected', 'awaiting_approval', 'awaiting_payment', 'on_hold'];
export const FINISHED = ['shipped', 'delivered', 'cancelled'];
export const ALL_STATES = [
    'new', 'awaiting_info', 'awaiting_artwork', 'artwork_check', 'artwork_rejected', 'awaiting_approval', 'awaiting_payment',
    'released', 'supplier_ordered', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'on_hold', 'cancelled',
];
export const OPEN = ALL_STATES.filter((state) => !FINISHED.includes(state));

/** Status des Design-Bausteins lo-status je Positionsstatus. */
export function designState(technicalName) {
    if (technicalName === 'on_hold') {
        return 'err';
    }
    if (technicalName === 'cancelled') {
        return 'off';
    }
    return BLOCKING.includes(technicalName) ? 'warn' : 'ok';
}

/** Arbeitsbereiche (gleich wie PHP PositionState::AREAS); chef sieht alle offenen Positionen. */
export const AREAS = {
    chef: { privilege: 'ld_ordo.chef', icon: 'regular-chart-line', states: OPEN },
    service: { privilege: 'ld_ordo.service', icon: 'regular-headset', states: ['new', 'awaiting_info', 'awaiting_payment', 'released', 'supplier_ordered', 'on_hold'] },
    artwork: { privilege: 'ld_ordo.artwork', icon: 'regular-file-search', states: ['awaiting_artwork', 'artwork_check', 'artwork_rejected', 'awaiting_approval'] },
    production: { privilege: 'ld_ordo.production', icon: 'regular-cog', states: ['released', 'in_production'] },
    shipping: { privilege: 'ld_ordo.shipping', icon: 'regular-truck', states: ['ready_to_ship'] },
};

/** „Abschließen“ je Status (PositionState::COMPLETE). */
export const COMPLETE = { artwork_check: 'release', released: 'start_production', in_production: 'ready', ready_to_ship: 'ship' };

export const MOVE_PREFIX = 'move_';
