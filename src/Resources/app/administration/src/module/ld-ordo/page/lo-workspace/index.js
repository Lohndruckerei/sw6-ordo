import { AREAS, COMPLETE, designState } from '../../constants';
import { isOrdoOnly } from '../../workspace-guard';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Vollbild-Arbeitsplatz (KONZEPT 7, Fahrplan Schritt 4): eigene Route ohne Shopware-Menü, auch als eigenes Fenster.
 * Reiter je erlaubtem Arbeitsbereich; je Bereich eine Warteschlange der Positionen (älteste Bestellung zuerst),
 * „Abschließen“ schaltet zum nächsten Schritt, „Weiterleiten“ an jede Station (überspringen, zurückschieben).
 * Termin und Ampel folgen mit den Terminen (Fahrplan Schritt 7).
 */
export default {
    template: `
<div class="lo-workspace" :class="loDesignClass">
    <header class="lo-workspace__bar">
        <span class="lo-workspace__brand">
            <mt-icon name="regular-tasks" size="20px" />
            {{ $tc('ld-ordo.workspace.title') }}
        </span>
        <lo-tabs
            v-if="areaItems.length > 1"
            class="lo-workspace__tabs"
            :items="areaItems"
            :active="activeArea"
            :aria-label="$tc('ld-ordo.workspace.areasLabel')"
            @select="selectArea"
        />
        <span class="lo-workspace__spacer"></span>
        <span class="lo-workspace__user">{{ userName }}</span>
        <mt-button v-if="!ordoOnly" variant="secondary" size="small" @click="toAdministration">
            {{ $tc('ld-ordo.workspace.toAdministration') }}
        </mt-button>
        <mt-button variant="secondary" size="small" @click="logout">{{ $tc('ld-ordo.workspace.logout') }}</mt-button>
    </header>

    <main class="lo-workspace__main">
        <template v-if="ordoOrderId">
            <mt-button class="lo-workspace__back" variant="secondary" @click="closeOrder">
                <mt-icon name="regular-chevron-left-xs" size="12px" />
                {{ $tc('ld-ordo.workspace.back') }}
            </mt-button>
            <h1 class="lo-workspace__heading">{{ $tc('ld-ordo.detail.title', { number: openOrder?.orderNumber || '…' }) }}</h1>
            <lo-order-file :ordo-order-id="ordoOrderId" @loaded="openOrder = $event?.order || null" />
        </template>

        <mt-empty-state
            v-else-if="!activeArea"
            :title="$tc('ld-ordo.workspace.noAreaTitle')"
            :description="$tc('ld-ordo.workspace.noAreaText')"
            icon="regular-lock"
        />

        <template v-else>
            <h1 class="lo-workspace__heading">{{ $tc('ld-ordo.workspace.areas.' + activeArea + '.title') }}</h1>
            <lo-info-card :name="'workspace-' + activeArea" :title="$tc('ld-ordo.workspace.areas.' + activeArea + '.title')">
                {{ $tc('ld-ordo.workspace.areas.' + activeArea + '.info') }}
            </lo-info-card>

            <div class="lo-filters" role="group" :aria-label="$tc('ld-ordo.workspace.filterLabel')">
                <button
                    v-for="item in filterItems"
                    :key="item.name"
                    type="button"
                    class="lo-filter"
                    :class="{ 'is--active': stateFilter === item.name }"
                    :aria-pressed="stateFilter === item.name ? 'true' : 'false'"
                    @click="setStateFilter(item.name)"
                >
                    {{ item.label }} <b>{{ item.count }}</b>
                </button>
            </div>

            <table v-if="positions.length" class="lo-workspace__queue">
                <thead>
                    <tr>
                        <th>{{ $tc('ld-ordo.workspace.columnOrder') }}</th>
                        <th>{{ $tc('ld-ordo.detail.columnPosition') }}</th>
                        <th class="lo-num">{{ $tc('ld-ordo.detail.columnQuantity') }}</th>
                        <th>{{ $tc('ld-ordo.detail.columnState') }}</th>
                        <th>{{ $tc('ld-ordo.workspace.columnActions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="position in positions" :key="position.id">
                        <td>
                            <a href="#" class="lo-workspace__order" @click.prevent="openFile(position)">{{ order(position)?.orderNumber }}</a>
                            <div class="lo-muted">{{ customerName(position) }} · {{ formatDate(order(position)?.orderDateTime) }}</div>
                        </td>
                        <td>
                            <strong>{{ position.orderLineItem?.label }}</strong>
                            <div v-if="position.orderLineItem?.payload?.productNumber" class="lo-muted">{{ position.orderLineItem.payload.productNumber }}</div>
                        </td>
                        <td class="lo-num">{{ position.orderLineItem?.quantity }}</td>
                        <td>
                            <lo-position-state :state="position.stateMachineState" />
                            <div v-if="position.holdReason" class="lo-muted">{{ position.holdReason }}</div>
                        </td>
                        <td class="lo-workspace__actions">
                            <mt-button
                                v-if="completeAction(position) && canWork"
                                variant="primary"
                                size="large"
                                @click="openTransition(position, completeAction(position))"
                            >
                                {{ $tc('ld-ordo.actions.' + completeAction(position)) }}
                            </mt-button>
                            <mt-button v-if="canWork" variant="secondary" size="large" @click="openTransition(position, null)">
                                {{ $tc('ld-ordo.transition.forward') }}…
                            </mt-button>
                            <mt-button variant="secondary" size="large" @click="openFile(position)">
                                {{ $tc('ld-ordo.workspace.openFile') }}
                            </mt-button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <sw-pagination
                v-if="total > limit"
                :page="page"
                :limit="limit"
                :total="total"
                :steps="[limit]"
                @page-change="onPageChange"
            />

            <mt-empty-state
                v-if="!isLoading && !positions.length"
                :title="$tc('ld-ordo.workspace.emptyTitle')"
                :description="$tc('ld-ordo.workspace.emptyText')"
                icon="regular-checkmark"
            />
        </template>
    </main>

    <lo-transition-modal
        v-if="pending && pending.transitions"
        :position="pending.position"
        :transitions="pending.transitions"
        :action="pending.action"
        :state-names="stateNames"
        @close="pending = null"
        @done="onTransitionDone"
    />
</div>`,

    inject: ['repositoryFactory', 'acl', 'loginService'],

    mixins: [Mixin.getByName('lo-design'), Mixin.getByName('notification')],

    props: {
        area: { type: String, default: null },
        ordoOrderId: { type: String, default: null },
    },

    metaInfo() {
        return { title: this.$tc('ld-ordo.workspace.title') };
    },

    data() {
        return {
            positions: [],
            total: 0,
            page: 1,
            limit: 25,
            counts: {},
            stateFilter: 'all',
            stateNames: {},
            isLoading: false,
            pending: null,
            openOrder: null,
        };
    },

    computed: {
        repository() {
            return this.repositoryFactory.create('ld_ordo_position');
        },
        allowedAreas() {
            const areas = Object.keys(AREAS).filter((name) => this.acl.can(AREAS[name].privilege));
            // Leitstand-Berechtigte ohne eigenen Bereich arbeiten in der Kundenservice-Sicht
            return areas.length || !this.acl.can('ld_ordo.viewer') ? areas : ['service'];
        },
        activeArea() {
            return this.allowedAreas.includes(this.area) ? this.area : (this.allowedAreas[0] || null);
        },
        areaItems() {
            return this.allowedAreas.map((name) => ({
                name,
                label: this.$tc(`ld-ordo.workspace.areas.${name}.tab`),
                icon: AREAS[name].icon,
            }));
        },
        areaStates() {
            return this.activeArea ? AREAS[this.activeArea].states : [];
        },
        filterItems() {
            const total = Object.values(this.counts).reduce((sum, count) => sum + count, 0);
            return [
                { name: 'all', label: this.$tc('ld-ordo.workspace.filterAll'), count: total },
                ...this.areaStates
                    .filter((state) => this.activeArea !== 'chef' || this.counts[state])
                    .map((state) => ({ name: state, label: this.stateNames[state] || state, count: this.counts[state] || 0 })),
            ];
        },
        canWork() {
            return ['ld_ordo.editor', 'ld_ordo.artwork', 'ld_ordo.production', 'ld_ordo.shipping'].some((key) => this.acl.can(key));
        },
        ordoOnly() {
            return isOrdoOnly();
        },
        userName() {
            const user = Shopware.Store.get('session').currentUser;
            return user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username) : '';
        },
        httpClient() {
            return Shopware.Application.getContainer('init').httpClient;
        },
    },

    watch: {
        activeArea() {
            this.stateFilter = 'all';
            this.page = 1;
            this.load();
        },
    },

    created() {
        this.loadStateNames();
        this.load();
    },

    methods: {
        criteria(states) {
            const criteria = new Criteria(this.page, this.limit);
            criteria.addFilter(Criteria.equalsAny('stateMachineState.technicalName', states));
            if (this.activeArea === 'production') {
                // Produktion: freigegebene Positionen nur, wenn sie intern gefertigt werden (Zuteilung, KONZEPT E18)
                criteria.addFilter(Criteria.multi('OR', [
                    Criteria.not('AND', [Criteria.equals('stateMachineState.technicalName', 'released')]),
                    Criteria.equals('target', 'internal'),
                ]));
            }
            return criteria;
        },

        async load() {
            if (!this.activeArea || this.ordoOrderId) {
                return;
            }
            this.isLoading = true;
            const states = this.stateFilter === 'all' ? this.areaStates : [this.stateFilter];
            const criteria = this.criteria(states);
            criteria.addAssociation('stateMachineState').addAssociation('orderLineItem');
            criteria.addAssociation('ordoOrder.order.orderCustomer');
            criteria.addSorting(Criteria.sort('ordoOrder.order.orderDateTime', 'ASC'));
            criteria.addSorting(Criteria.sort('orderLineItem.position', 'ASC'));
            criteria.setTotalCountMode(1);
            try {
                const result = await this.repository.search(criteria);
                this.positions = [...result];
                this.total = result.total;
            } finally {
                this.isLoading = false;
            }
            this.loadCounts();
        },

        async loadCounts() {
            const criteria = this.criteria(this.areaStates);
            criteria.setLimit(1);
            criteria.addAggregation(Criteria.terms('states', 'stateMachineState.technicalName', null, null, null));
            const result = await this.repository.search(criteria);
            const buckets = result.aggregations?.states?.buckets || [];
            this.counts = Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.count]));
        },

        async loadStateNames() {
            const criteria = new Criteria(1, 50);
            criteria.addFilter(Criteria.equals('stateMachine.technicalName', 'ld_ordo_position.state'));
            const states = await this.repositoryFactory.create('state_machine_state').search(criteria);
            this.stateNames = Object.fromEntries(states.map((state) => [state.technicalName, state.translated?.name || state.technicalName]));
        },

        setStateFilter(name) {
            this.stateFilter = name;
            this.page = 1;
            this.load();
        },

        onPageChange({ page }) {
            this.page = page;
            this.load();
        },

        selectArea(name) {
            this.$router.push({ name: 'ld.ordo.workspace', params: { area: name } });
        },

        openFile(position) {
            this.$router.push({ name: 'ld.ordo.workspaceOrder', params: { area: this.activeArea, id: position.ordoOrderId } });
        },

        closeOrder() {
            this.$router.push({ name: 'ld.ordo.workspace', params: { area: this.activeArea } }).then(() => this.load());
        },

        completeAction(position) {
            const action = COMPLETE[position.stateMachineState?.technicalName] || null;
            // In Produktion geben nur bei interner Fertigung; Lieferanten-Positionen gehen über die Akte an den Lieferanten
            return action === 'start_production' && position.target !== 'internal' ? null : action;
        },

        async openTransition(position, action) {
            this.pending = { position, action, transitions: null };
            try {
                const headers = { Authorization: `Bearer ${this.loginService.getToken()}` };
                const { data } = await this.httpClient.get(`/_action/ld-ordo/position/${position.id}/transitions`, { headers });
                if (action && !data.transitions.some((transition) => transition.action === action)) {
                    this.createNotificationError({ message: this.$tc('ld-ordo.detail.errorTransition') });
                    this.pending = null;
                    return;
                }
                this.pending = { ...this.pending, transitions: data.transitions };
            } catch {
                this.pending = null;
                this.createNotificationError({ message: this.$tc('ld-ordo.detail.errorTransition') });
            }
        },

        onTransitionDone() {
            this.pending = null;
            this.load();
        },

        order(position) {
            return position.ordoOrder?.order || null;
        },

        customerName(position) {
            const customer = this.order(position)?.orderCustomer;
            return customer ? (customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()) : '–';
        },

        designState,

        formatDate(value) {
            return value ? Shopware.Utils.format.date(value, { hour: undefined, minute: undefined }) : '–';
        },

        toAdministration() {
            this.$router.push({ name: 'ld.ordo.list' });
        },

        logout() {
            this.loginService.logout();
            this.$router.push({ name: 'sw.login.index' });
        },
    },
};
