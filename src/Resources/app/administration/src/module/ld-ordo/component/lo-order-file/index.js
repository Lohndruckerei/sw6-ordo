import { MOVE_PREFIX } from '../../constants';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Inhalt der Auftragsakte: Positionen mit Status und Statuswechsel, Notizen und Protokoll (KONZEPT 4, 5, 7).
 * Genutzt von der Admin-Seite (lo-order-detail) und vom Vollbild-Arbeitsplatz (lo-workspace).
 * Statuswechsel laufen über /_action/ld-ordo/…, damit jeder Wechsel mit Benutzer und Grund protokolliert wird.
 */
export default {
    template: `
<div class="lo-order-file">
    <sw-skeleton v-if="isLoading && !file" />
    <template v-else-if="file">
        <lo-info-card name="detail" :title="$tc('ld-ordo.detail.info.title')">{{ $tc('ld-ordo.detail.info.text') }}</lo-info-card>

        <mt-card :title="$tc('ld-ordo.detail.summary')" position-identifier="lo-order-summary">
            <dl class="lo-order-detail__facts">
                <dt>{{ $tc('ld-ordo.list.columnCustomer') }}</dt><dd>{{ customerName }}</dd>
                <dt>{{ $tc('ld-ordo.list.columnDate') }}</dt><dd>{{ formatDate(order?.orderDateTime) }}</dd>
                <dt>{{ $tc('ld-ordo.list.columnAmount') }}</dt><dd>{{ currency(order?.amountNet) }}</dd>
            </dl>
        </mt-card>

        <mt-card :title="$tc('ld-ordo.detail.positions')" position-identifier="lo-order-positions">
            <table class="lo-order-detail__positions">
                <thead>
                    <tr>
                        <th>{{ $tc('ld-ordo.detail.columnPosition') }}</th>
                        <th class="lo-num">{{ $tc('ld-ordo.detail.columnQuantity') }}</th>
                        <th>{{ $tc('ld-ordo.detail.columnState') }}</th>
                        <th>{{ $tc('ld-ordo.assignment.column') }}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="position in positions" :key="position.id">
                        <td>
                            <strong>{{ position.orderLineItem?.label }}</strong>
                            <div v-if="position.orderLineItem?.payload?.productNumber" class="lo-muted">{{ position.orderLineItem.payload.productNumber }}</div>
                        </td>
                        <td class="lo-num">{{ position.orderLineItem?.quantity }}</td>
                        <td>
                            <lo-position-state :state="position.stateMachineState" />
                            <div v-if="position.holdReason" class="lo-muted">{{ position.holdReason }}</div>
                        </td>
                        <td>
                            <template v-if="assignments[position.id]">
                                <lo-status v-if="!assignments[position.id].target" state="warn" :label="$tc('ld-ordo.assignment.open')" />
                                <strong v-else>{{ targetLabel(assignments[position.id]) }}</strong>
                                <div class="lo-muted">
                                    {{ sourceLabel(assignments[position.id]) }}
                                    <template v-if="assignments[position.id].purchaseTotal !== null && assignments[position.id].purchaseTotal !== undefined">
                                        · {{ $tc('ld-ordo.assignment.purchase', { value: currency(assignments[position.id].purchaseTotal) }) }}
                                    </template>
                                </div>
                                <mt-button
                                    v-if="canAssign && assignments[position.id].changeable"
                                    size="x-small"
                                    variant="secondary"
                                    @click="assigning = position"
                                >
                                    {{ $tc('ld-ordo.assignment.change') }}
                                </mt-button>
                            </template>
                        </td>
                        <td class="lo-order-detail__action">
                            <sw-context-button
                                :disabled="!canEdit || !(transitions[position.id] || []).length"
                                v-tooltip="{ message: canEdit ? $tc('ld-ordo.detail.noTransitions') : $tc('sw-privileges.tooltip.warning'), disabled: canEdit && (transitions[position.id] || []).length > 0 }"
                            >
                                <template #button>
                                    <mt-button size="small" variant="secondary" :disabled="!canEdit || !(transitions[position.id] || []).length">
                                        {{ $tc('ld-ordo.detail.changeState') }}
                                        <mt-icon name="regular-chevron-down-xs" size="12px" />
                                    </mt-button>
                                </template>
                                <sw-context-menu-item
                                    v-for="transition in menuTransitions(position)"
                                    :key="transition.action"
                                    :variant="transition.action === 'cancel' ? 'danger' : undefined"
                                    @click="openTransition(position, transition)"
                                >
                                    {{ $tc('ld-ordo.actions.' + transition.action) }}
                                </sw-context-menu-item>
                                <sw-context-menu-item v-if="canForward(position)" @click="openForward(position)">
                                    {{ $tc('ld-ordo.transition.forward') }}…
                                </sw-context-menu-item>
                            </sw-context-button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </mt-card>

        <mt-card :title="$tc('ld-ordo.detail.protocol')" position-identifier="lo-order-protocol">
            <div v-if="canNote" class="lo-order-detail__note">
                <mt-textarea
                    v-model="noteText"
                    :label="$tc('ld-ordo.detail.noteLabel')"
                    :help-text="$tc('ld-ordo.detail.noteHelp')"
                    :placeholder="$tc('ld-ordo.detail.notePlaceholder')"
                />
                <mt-button variant="secondary" :disabled="!noteText.trim() || isSaving" @click="saveNote">
                    {{ $tc('ld-ordo.detail.noteSave') }}
                </mt-button>
            </div>
            <ol class="lo-order-detail__events">
                <li v-for="event in events" :key="event.id">
                    <span class="lo-muted">{{ formatDateTime(event.createdAt) }} · {{ event.userName || $tc('ld-ordo.detail.automatic') }}</span>
                    <div>{{ eventText(event) }}</div>
                    <div v-if="event.message" class="lo-order-detail__message">{{ event.message }}</div>
                </li>
            </ol>
        </mt-card>
    </template>
        <lo-assignment-modal
            v-if="assigning"
            :position="assigning"
            :assignment="assignments[assigning.id]"
            @close="assigning = null"
            @done="onAssigned"
        />
        <lo-transition-modal
            v-if="pending"
            :position="pending.position"
            :transitions="transitions[pending.position.id] || []"
            :action="pending.action"
            :state-names="states"
            @close="pending = null"
            @done="onTransitionDone"
        />
</div>`,

    inject: ['repositoryFactory', 'acl'],

    mixins: [Mixin.getByName('notification')],

    emits: ['loaded'],

    props: {
        ordoOrderId: { type: String, required: true },
    },

    data() {
        return { file: null, transitions: {}, states: {}, isLoading: true, isSaving: false, pending: null, noteText: '', assignments: {}, assigning: null };
    },

    computed: {
        repository() {
            return this.repositoryFactory.create('ld_ordo_order');
        },
        order() {
            return this.file?.order || null;
        },
        positions() {
            return [...(this.file?.positions || [])].sort((a, b) => (a.orderLineItem?.position ?? 0) - (b.orderLineItem?.position ?? 0));
        },
        events() {
            return [...(this.file?.events || [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        },
        canEdit() {
            // Arbeitsbereiche (Datenprüfung, Produktion, Versand) dürfen in ihrer Warteschlange schalten; der Server prüft
            return ['ld_ordo.editor', 'ld_ordo.artwork', 'ld_ordo.production', 'ld_ordo.shipping'].some((key) => this.acl.can(key));
        },
        canAssign() {
            return this.acl.can('ld_ordo.editor');
        },
        canNote() {
            return this.canEdit;
        },
        customerName() {
            const customer = this.order?.orderCustomer;
            return customer ? (customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()) : '–';
        },
        httpClient() {
            return Shopware.Application.getContainer('init').httpClient;
        },
        headers() {
            return { Authorization: `Bearer ${Shopware.Service('loginService').getToken()}` };
        },
    },

    watch: {
        ordoOrderId() {
            this.load();
        },
    },

    created() {
        this.load();
        this.loadStateNames();
    },

    methods: {
        async load() {
            this.isLoading = true;
            const criteria = new Criteria(1, 1);
            criteria.setIds([this.ordoOrderId]);
            criteria.addAssociation('order.orderCustomer');
            criteria.getAssociation('positions').addAssociation('stateMachineState').addAssociation('orderLineItem');
            criteria.getAssociation('events').setLimit(200);
            try {
                this.file = (await this.repository.search(criteria)).first();
                this.$emit('loaded', this.file);
                await Promise.all([this.loadTransitions(), this.loadAssignments()]);
            } finally {
                this.isLoading = false;
            }
        },

        async loadTransitions() {
            const result = {};
            await Promise.all((this.file?.positions || []).map(async (position) => {
                const { data } = await this.httpClient.get(`/_action/ld-ordo/position/${position.id}/transitions`, { headers: this.headers });
                result[position.id] = data.transitions;
            }));
            this.transitions = result;
        },

        async loadStateNames() {
            const criteria = new Criteria(1, 50);
            criteria.addFilter(Criteria.equals('stateMachine.technicalName', 'ld_ordo_position.state'));
            const states = await this.repositoryFactory.create('state_machine_state').search(criteria);
            this.states = Object.fromEntries(states.map((state) => [state.technicalName, state.translated?.name || state.technicalName]));
        },

        stateName(technicalName) {
            return this.states[technicalName] || technicalName || '–';
        },

        async loadAssignments() {
            const { data } = await this.httpClient.get(`/_action/ld-ordo/order/${this.ordoOrderId}/supplier-candidates`, { headers: this.headers });
            this.assignments = data.positions || {};
        },

        targetLabel(assignment) {
            if (assignment.target === 'internal') {
                return this.$tc('ld-ordo.assignment.internal');
            }
            return assignment.supplierName || this.$tc('ld-ordo.assignment.unknownSupplier');
        },

        sourceLabel(assignment) {
            return assignment.source ? this.$tc(`ld-ordo.assignment.source.${assignment.source}`) : this.$tc('ld-ordo.assignment.noCandidate');
        },

        async onAssigned() {
            this.assigning = null;
            await this.load();
        },

        menuTransitions(position) {
            return (this.transitions[position.id] || []).filter((transition) => !transition.action.startsWith(MOVE_PREFIX));
        },

        canForward(position) {
            return (this.transitions[position.id] || []).some((transition) => transition.action.startsWith(MOVE_PREFIX));
        },

        openTransition(position, transition) {
            this.pending = { position, action: transition.action };
        },

        openForward(position) {
            this.pending = { position, action: null };
        },

        async onTransitionDone() {
            this.pending = null;
            await this.load();
        },

        async saveNote() {
            this.isSaving = true;
            try {
                await this.httpClient.post(`/_action/ld-ordo/order/${this.ordoOrderId}/note`, { text: this.noteText }, { headers: this.headers });
                this.noteText = '';
                await this.load();
            } catch (error) {
                this.createNotificationError({ message: error?.response?.data?.errors?.[0]?.detail || this.$tc('ld-ordo.detail.errorNote') });
            } finally {
                this.isSaving = false;
            }
        },

        positionLabel(positionId) {
            return this.file?.positions?.find((position) => position.id === positionId)?.orderLineItem?.label || '';
        },

        eventText(event) {
            const payload = event.payload || {};
            if (event.type === 'state_changed') {
                return this.$tc('ld-ordo.events.state_changed', {
                    position: this.positionLabel(event.positionId),
                    from: this.stateName(payload.from),
                    to: this.stateName(payload.to),
                });
            }
            if (event.type === 'assigned') {
                const target = payload.target === 'internal'
                    ? this.$tc('ld-ordo.assignment.internal')
                    : (payload.supplier || this.$tc('ld-ordo.assignment.unknownSupplier'));
                return this.$tc('ld-ordo.events.assigned', {
                    position: this.positionLabel(event.positionId),
                    target: payload.target ? target : this.$tc('ld-ordo.assignment.open'),
                    source: payload.source ? this.$tc(`ld-ordo.assignment.source.${payload.source}`) : '',
                });
            }
            return this.$tc(`ld-ordo.events.${event.type}`, { count: payload.positions ?? 0 });
        },

        formatDate(value) {
            return value ? Shopware.Utils.format.date(value, { hour: undefined, minute: undefined }) : '–';
        },

        formatDateTime(value) {
            return value ? Shopware.Utils.format.date(value) : '';
        },

        currency(value) {
            return value === undefined || value === null ? '–' : Shopware.Utils.format.currency(value, 'EUR');
        },
    },
};
