import { MOVE_PREFIX } from '../../constants';

const { Mixin } = Shopware;

/**
 * Bestätigung eines Statuswechsels (Auftragsakte, Arbeitsplatz).
 * Mit `action` wird genau dieser Wechsel bestätigt; ohne `action` wählt man das Ziel zum Weiterleiten
 * (Station überspringen oder zurückschieben, Grund Pflicht). Jeder Wechsel landet mit Grund im Protokoll.
 */
export default {
    template: `
<sw-modal :title="title" variant="small" @modal-close="$emit('close')">
    <template v-if="isForward">
        <p>{{ $tc('ld-ordo.transition.forwardText', { position: label }) }}</p>
        <mt-select
            v-model="target"
            :label="$tc('ld-ordo.transition.target')"
            :help-text="$tc('ld-ordo.transition.targetHelp')"
            :options="targetOptions"
            required
        />
    </template>
    <p v-else>{{ $tc('ld-ordo.detail.confirmText', { position: label, state: stateName(current?.to) }) }}</p>
    <mt-textarea
        v-model="reason"
        :label="$tc(reasonRequired ? 'ld-ordo.detail.reasonRequired' : 'ld-ordo.detail.reasonLabel')"
        :help-text="$tc('ld-ordo.detail.reasonHelp')"
        :placeholder="$tc(isForward ? 'ld-ordo.transition.reasonPlaceholder' : 'ld-ordo.detail.reasonPlaceholder')"
        :required="reasonRequired"
    />
    <template #modal-footer>
        <mt-button variant="secondary" size="small" @click="$emit('close')">{{ $tc('global.default.cancel') }}</mt-button>
        <mt-button
            :variant="current?.action === 'cancel' ? 'critical' : 'primary'"
            size="small"
            :disabled="!canSubmit"
            @click="submit"
        >
            {{ buttonLabel }}
        </mt-button>
    </template>
</sw-modal>`,

    mixins: [Mixin.getByName('notification')],

    emits: ['close', 'done'],

    props: {
        position: { type: Object, required: true },
        transitions: { type: Array, default: () => [] },
        action: { type: String, default: null },
        stateNames: { type: Object, default: () => ({}) },
    },

    data() {
        return { target: null, reason: '', isSaving: false };
    },

    computed: {
        isForward() {
            return !this.action;
        },
        label() {
            return this.position.orderLineItem?.label || '';
        },
        targetOptions() {
            return this.transitions
                .filter((transition) => transition.action.startsWith(MOVE_PREFIX))
                .map((transition) => ({ value: transition.action, label: this.stateName(transition.to) }));
        },
        current() {
            const action = this.action || this.target;
            return this.transitions.find((transition) => transition.action === action) || null;
        },
        reasonRequired() {
            return this.isForward || this.action === 'hold';
        },
        title() {
            return this.isForward ? this.$tc('ld-ordo.transition.forward') : this.$tc(`ld-ordo.actions.${this.action}`);
        },
        buttonLabel() {
            return this.isForward ? this.$tc('ld-ordo.transition.forwardButton') : this.$tc(`ld-ordo.actions.${this.action}`);
        },
        canSubmit() {
            return !this.isSaving && !!this.current && (!this.reasonRequired || this.reason.trim() !== '');
        },
    },

    methods: {
        stateName(technicalName) {
            return this.stateNames[technicalName] || technicalName || '–';
        },

        async submit() {
            const httpClient = Shopware.Application.getContainer('init').httpClient;
            const headers = { Authorization: `Bearer ${Shopware.Service('loginService').getToken()}` };
            this.isSaving = true;
            try {
                await httpClient.post(
                    `/_action/ld-ordo/position/${this.position.id}/transition/${this.current.action}`,
                    { reason: this.reason },
                    { headers },
                );
                this.$emit('done');
            } catch (error) {
                this.createNotificationError({ message: error?.response?.data?.errors?.[0]?.detail || this.$tc('ld-ordo.detail.errorTransition') });
            } finally {
                this.isSaving = false;
            }
        },
    },
};
