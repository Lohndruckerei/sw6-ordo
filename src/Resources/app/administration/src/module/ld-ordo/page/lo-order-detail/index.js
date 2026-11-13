const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Auftragsakte: Positionen mit Status und Statuswechsel, Notizen und Protokoll (KONZEPT 4, 5, 7).
 * Statuswechsel laufen über /_action/ld-ordo/…, damit jeder Wechsel mit Benutzer und Grund protokolliert wird.
 */
export default {
    template: `
<sw-page class="lo-order-detail" :class="loDesignClass">
    <template #smart-bar-header>
        <h2>{{ $tc('ld-ordo.detail.title', { number: order?.orderNumber || '…' }) }}</h2>
    </template>
    <template #smart-bar-actions>
        <mt-button
            v-if="order && acl.can('order.viewer')"
            variant="secondary"
            @click="$router.push({ name: 'sw.order.detail', params: { id: order.id } })"
        >
            {{ $tc('ld-ordo.detail.openOrder') }}
        </mt-button>
    </template>
    <template #content>
        <sw-card-view>
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
                                            v-for="transition in transitions[position.id] || []"
                                            :key="transition.action"
                                            :variant="transition.action === 'cancel' ? 'danger' : undefined"
                                            @click="openTransition(position, transition)"
                                        >
                                            {{ $tc('ld-ordo.actions.' + transition.action) }}
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
        </sw-card-view>

        <sw-modal
            v-if="pending"
            :title="$tc('ld-ordo.actions.' + pending.transition.action)"
            variant="small"
            @modal-close="pending = null"
        >
            <p>{{ $tc('ld-ordo.detail.confirmText', { position: pending.position.orderLineItem?.label, state: stateName(pending.transition.to) }) }}</p>
            <mt-textarea
                v-model="reason"
                :label="$tc(pending.transition.action === 'hold' ? 'ld-ordo.detail.reasonRequired' : 'ld-ordo.detail.reasonLabel')"
                :help-text="$tc('ld-ordo.detail.reasonHelp')"
                :placeholder="$tc('ld-ordo.detail.reasonPlaceholder')"
                :required="pending.transition.action === 'hold'"
            />
            <template #modal-footer>
                <mt-button variant="secondary" size="small" @click="pending = null">{{ $tc('global.default.cancel') }}</mt-button>
                <mt-button
                    :variant="pending.transition.action === 'cancel' ? 'critical' : 'primary'"
                    size="small"
                    :disabled="isSaving || (pending.transition.action === 'hold' && !reason.trim())"
                    @click="runTransition"
                >
                    {{ $tc('ld-ordo.actions.' + pending.transition.action) }}
                </mt-button>
            </template>
        </sw-modal>
    </template>
</sw-page>`,

    inject: ['repositoryFactory', 'acl'],

    mixins: [Mixin.getByName('lo-design'), Mixin.getByName('notification')],

    props: {
        ordoOrderId: { type: String, required: true },
    },

    metaInfo() {
        return { title: this.$createTitle() };
    },

    data() {
        return { file: null, transitions: {}, states: {}, isLoading: true, isSaving: false, pending: null, reason: '', noteText: '' };
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
            return this.acl.can('ld_ordo.editor');
        },
        canNote() {
            return this.acl.can('ld_ordo.editor');
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
                await this.loadTransitions();
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

        openTransition(position, transition) {
            this.reason = '';
            this.pending = { position, transition };
        },

        async runTransition() {
            const { position, transition } = this.pending;
            this.isSaving = true;
            try {
                await this.httpClient.post(
                    `/_action/ld-ordo/position/${position.id}/transition/${transition.action}`,
                    { reason: this.reason },
                    { headers: this.headers },
                );
                this.pending = null;
                await this.load();
            } catch (error) {
                this.createNotificationError({ message: error?.response?.data?.errors?.[0]?.detail || this.$tc('ld-ordo.detail.errorTransition') });
            } finally {
                this.isSaving = false;
            }
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
