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
