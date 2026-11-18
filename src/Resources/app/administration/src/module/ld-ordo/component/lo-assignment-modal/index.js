const { Mixin } = Shopware;

/**
 * Zuteilung einer Position ändern (KONZEPT E18): Lieferant aus den Vorschlägen (Mensura, LieferLotse),
 * ein anderer Lieferant oder interne Produktion. Wird mit Grund protokolliert.
 */
export default {
    template: `
<sw-modal :title="$tc('ld-ordo.assignment.title')" variant="small" @modal-close="$emit('close')">
    <p>{{ $tc('ld-ordo.assignment.text', { position: position.orderLineItem?.label || '' }) }}</p>
    <mt-select
        v-model="choice"
        :label="$tc('ld-ordo.assignment.target')"
        :help-text="$tc('ld-ordo.assignment.targetHelp')"
        :options="options"
        required
    />
    <sw-entity-single-select
        v-if="choice === 'other'"
        v-model:value="otherSupplierId"
        entity="ld_supplier"
        label-property="name"
        :label="$tc('ld-ordo.assignment.otherSupplier')"
        :help-text="$tc('ld-ordo.assignment.otherSupplierHelp')"
        required
    />
    <mt-textarea
        v-model="reason"
        :label="$tc('ld-ordo.detail.reasonLabel')"
        :help-text="$tc('ld-ordo.detail.reasonHelp')"
        :placeholder="$tc('ld-ordo.assignment.reasonPlaceholder')"
    />
    <template #modal-footer>
        <mt-button variant="secondary" size="small" @click="$emit('close')">{{ $tc('global.default.cancel') }}</mt-button>
        <mt-button variant="primary" size="small" :disabled="!canSubmit" @click="submit">{{ $tc('ld-ordo.assignment.save') }}</mt-button>
    </template>
</sw-modal>`,

    mixins: [Mixin.getByName('notification')],

    emits: ['close', 'done'],

    props: {
        position: { type: Object, required: true },
        assignment: { type: Object, required: true },
    },

    data() {
        const current = this.assignment.target === 'internal'
            ? 'internal'
            : (this.assignment.supplierId ? `supplier:${this.assignment.supplierId}` : null);
        return { choice: current, otherSupplierId: null, reason: '', isSaving: false };
    },

    computed: {
        hasLieferLotse() {
            return Shopware.EntityDefinition.has('ld_supplier');
        },
        options() {
            const options = (this.assignment.candidates || []).map((candidate) => ({
                value: `supplier:${candidate.supplierId}`,
                label: [
                    candidate.name || candidate.supplierId,
                    candidate.mensura ? this.$tc('ld-ordo.assignment.suggestedMensura') : null,
                    candidate.priority ? this.$tc('ld-ordo.assignment.priority', { priority: candidate.priority }) : null,
                    candidate.active ? null : this.$tc('ld-ordo.assignment.inactive'),
                ].filter(Boolean).join(' · '),
            }));
            // aktueller Lieferant, falls er nicht unter den Vorschlägen ist (früher von Hand gewählt)
            if (this.assignment.supplierId && !options.some((option) => option.value === `supplier:${this.assignment.supplierId}`)) {
                options.unshift({ value: `supplier:${this.assignment.supplierId}`, label: this.assignment.supplierName || this.assignment.supplierId });
            }
            if (this.hasLieferLotse) {
                options.push({ value: 'other', label: this.$tc('ld-ordo.assignment.other') });
            }
            options.push({ value: 'internal', label: this.$tc('ld-ordo.assignment.internal') });
            return options;
        },
        payload() {
            if (this.choice === 'internal') {
                return { target: 'internal' };
            }
            if (this.choice === 'other') {
                return this.otherSupplierId ? { target: 'supplier', supplierId: this.otherSupplierId } : null;
            }
            return this.choice ? { target: 'supplier', supplierId: this.choice.slice('supplier:'.length) } : null;
        },
        canSubmit() {
            return !this.isSaving && this.payload !== null;
        },
    },

    methods: {
        async submit() {
            const httpClient = Shopware.Application.getContainer('init').httpClient;
            const headers = { Authorization: `Bearer ${Shopware.Service('loginService').getToken()}` };
            this.isSaving = true;
            try {
                await httpClient.post(`/_action/ld-ordo/position/${this.position.id}/assign`, { ...this.payload, reason: this.reason }, { headers });
                this.$emit('done');
            } catch (error) {
                this.createNotificationError({ message: error?.response?.data?.errors?.[0]?.detail || this.$tc('ld-ordo.assignment.error') });
            } finally {
                this.isSaving = false;
            }
        },
    },
};
