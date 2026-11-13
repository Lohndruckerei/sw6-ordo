import { BLOCKING, OPEN, FINISHED, designState } from '../../constants';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * Leitstand: alle Aufträge mit dem Status ihrer Positionen (KONZEPT 4/7).
 * Filter: Braucht Aktion (wartet auf Kunde oder angehalten), Offen, Abgeschlossen.
 */
export default {
    template: `
<sw-page class="lo-order-list" :class="loDesignClass">
    <template #search-bar>
        <sw-search-bar initial-search-type="ld_ordo_order" :placeholder="$tc('ld-ordo.list.placeholderSearch')" :initial-search="term" @search="onSearch" />
    </template>
    <template #smart-bar-header>
        <h2>{{ $tc('ld-ordo.list.title') }} <span v-if="total !== null" class="lo-muted">({{ total }})</span></h2>
    </template>
    <template #smart-bar-actions>
        <lo-design-switch />
    </template>
    <template #content>
        <div class="lo-content">
            <lo-info-card name="list" :title="$tc('ld-ordo.list.info.title')">{{ $tc('ld-ordo.list.info.text') }}</lo-info-card>

            <div class="lo-filters" role="group">
                <button
                    v-for="item in filterItems"
                    :key="item.name"
                    type="button"
                    class="lo-filter"
                    :class="{ 'is--active': filter === item.name }"
                    :aria-pressed="filter === item.name ? 'true' : 'false'"
                    :title="item.help"
                    @click="setFilter(item.name)"
                >
                    {{ item.label }}
                    <b v-if="counts[item.name] !== undefined">{{ counts[item.name] }}</b>
                </button>
            </div>

            <sw-entity-listing
                v-if="items && items.length"
                :items="items"
                :repository="repository"
                :columns="columns"
                :is-loading="isLoading"
                :show-selection="false"
                :allow-inline-edit="false"
                :allow-column-edit="false"
                :full-page="false"
                detail-route="ld.ordo.detail"
                @page-change="onPageChange"
            >
                <template #column-order.orderNumber="{ item }">
                    <router-link :to="{ name: 'ld.ordo.detail', params: { id: item.id } }">{{ item.order?.orderNumber }}</router-link>
                </template>
                <template #column-order.orderDateTime="{ item }">{{ formatDate(item.order?.orderDateTime) }}</template>
                <template #column-customer="{ item }">{{ customerName(item) }}</template>
                <template #column-positions="{ item }">
                    <span class="lo-order-list__states">
                        <lo-status v-for="group in stateGroups(item)" :key="group.key" :state="group.kind" :label="group.count + ' × ' + group.label" />
                    </span>
                </template>
                <template #column-order.amountNet="{ item }">
                    <span class="lo-num">{{ currency(item.order?.amountNet) }}</span>
                </template>
                <template #actions="{ item }">
                    <sw-context-menu-item @click="$router.push({ name: 'ld.ordo.detail', params: { id: item.id } })">
                        {{ $tc('ld-ordo.list.open') }}
                    </sw-context-menu-item>
                </template>
            </sw-entity-listing>

            <sw-empty-state
                v-else-if="!isLoading"
                :title="$tc('ld-ordo.list.emptyTitle')"
                :subline="$tc('ld-ordo.list.emptySubline')"
                icon="regular-tasks"
                :absolute="false"
            />
        </div>
    </template>
</sw-page>`,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('lo-design'), Mixin.getByName('listing')],

    metaInfo() {
        return { title: this.$createTitle() };
    },

    data() {
        return { items: null, total: null, isLoading: true, filter: 'action', counts: {}, sortBy: 'createdAt', sortDirection: 'DESC' };
    },

    computed: {
        repository() {
            return this.repositoryFactory.create('ld_ordo_order');
        },
        filterItems() {
            return ['action', 'open', 'finished', 'all'].map((name) => ({
                name,
                label: this.$tc(`ld-ordo.list.filter.${name}`),
                help: this.$tc(`ld-ordo.list.filter.${name}Help`),
            }));
        },
        columns() {
            return [
                { property: 'order.orderNumber', label: this.$tc('ld-ordo.list.columnNumber'), primary: true, allowResize: true },
                { property: 'order.orderDateTime', label: this.$tc('ld-ordo.list.columnDate'), allowResize: true },
                { property: 'customer', label: this.$tc('ld-ordo.list.columnCustomer'), sortable: false, allowResize: true },
                { property: 'positions', label: this.$tc('ld-ordo.list.columnPositions'), sortable: false, allowResize: true },
                { property: 'order.amountNet', label: this.$tc('ld-ordo.list.columnAmount'), align: 'right', allowResize: true },
            ];
        },
    },

    methods: {
        stateFilter(name) {
            const states = { action: BLOCKING, open: OPEN, finished: FINISHED }[name];
            return states ? [Criteria.equalsAny('positions.stateMachineState.technicalName', states)] : [];
        },

        baseCriteria(name) {
            const criteria = new Criteria(this.page, this.limit);
            this.stateFilter(name).forEach((filter) => criteria.addFilter(filter));
            if (name === 'finished') {
                // abgeschlossen = keine offene Position mehr
                criteria.addFilter(Criteria.not('AND', [Criteria.equalsAny('positions.stateMachineState.technicalName', OPEN)]));
            }
            return criteria;
        },

        async getList() {
            this.isLoading = true;
            const criteria = this.baseCriteria(this.filter);
            criteria.setTerm(this.term);
            criteria.addAssociation('order.orderCustomer');
            criteria.getAssociation('positions').addAssociation('stateMachineState');
            criteria.addSorting(Criteria.sort('order.orderDateTime', 'DESC'));
            try {
                const result = await this.repository.search(criteria);
                this.items = result;
                this.total = result.total;
            } finally {
                this.isLoading = false;
            }
            this.loadCounts();
        },

        async loadCounts() {
            const counts = {};
            await Promise.all(this.filterItems.map(async ({ name }) => {
                const criteria = this.baseCriteria(name);
                criteria.setLimit(1);
                criteria.setTotalCountMode(1);
                counts[name] = (await this.repository.searchIds(criteria)).total;
            }));
            this.counts = counts;
        },

        setFilter(name) {
            this.filter = name;
            this.page = 1;
            this.getList();
        },

        stateGroups(item) {
            const groups = {};
            (item.positions || []).forEach((position) => {
                const state = position.stateMachineState;
                if (!state) {
                    return;
                }
                groups[state.technicalName] ??= { key: state.technicalName, label: state.translated?.name || state.technicalName, count: 0 };
                groups[state.technicalName].count += 1;
            });
            return Object.values(groups).map((group) => ({ ...group, kind: designState(group.key) }));
        },

        customerName(item) {
            const customer = item.order?.orderCustomer;
            if (!customer) {
                return '–';
            }
            return customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        },

        formatDate(value) {
            return value ? Shopware.Utils.format.date(value) : '–';
        },

        currency(value) {
            return value === undefined || value === null ? '–' : Shopware.Utils.format.currency(value, 'EUR');
        },
    },
};
