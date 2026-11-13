import{d as m,O as l,F as c,B as d}from"./constants-BhMS1TEN.js";const{Mixin:n}=Shopware,{Criteria:o}=Shopware.Data,p={template:`
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
</sw-page>`,inject:["repositoryFactory"],mixins:[n.getByName("lo-design"),n.getByName("listing")],metaInfo(){return{title:this.$createTitle()}},data(){return{items:null,total:null,isLoading:!0,filter:"action",counts:{},sortBy:"createdAt",sortDirection:"DESC"}},computed:{repository(){return this.repositoryFactory.create("ld_ordo_order")},filterItems(){return["action","open","finished","all"].map(t=>({name:t,label:this.$tc(`ld-ordo.list.filter.${t}`),help:this.$tc(`ld-ordo.list.filter.${t}Help`)}))},columns(){return[{property:"order.orderNumber",label:this.$tc("ld-ordo.list.columnNumber"),primary:!0,allowResize:!0},{property:"order.orderDateTime",label:this.$tc("ld-ordo.list.columnDate"),allowResize:!0},{property:"customer",label:this.$tc("ld-ordo.list.columnCustomer"),sortable:!1,allowResize:!0},{property:"positions",label:this.$tc("ld-ordo.list.columnPositions"),sortable:!1,allowResize:!0},{property:"order.amountNet",label:this.$tc("ld-ordo.list.columnAmount"),align:"right",allowResize:!0}]}},methods:{stateFilter(t){const e={action:d,open:l,finished:c}[t];return e?[o.equalsAny("positions.stateMachineState.technicalName",e)]:[]},baseCriteria(t){const e=new o(this.page,this.limit);return this.stateFilter(t).forEach(i=>e.addFilter(i)),t==="finished"&&e.addFilter(o.not("AND",[o.equalsAny("positions.stateMachineState.technicalName",l)])),e},async getList(){this.isLoading=!0;const t=this.baseCriteria(this.filter);t.setTerm(this.term),t.addAssociation("order.orderCustomer"),t.getAssociation("positions").addAssociation("stateMachineState"),t.addSorting(o.sort("order.orderDateTime","DESC"));try{const e=await this.repository.search(t);this.items=e,this.total=e.total}finally{this.isLoading=!1}this.loadCounts()},async loadCounts(){const t={};await Promise.all(this.filterItems.map(async({name:e})=>{const i=this.baseCriteria(e);i.setLimit(1),i.setTotalCountMode(1),t[e]=(await this.repository.searchIds(i)).total})),this.counts=t},setFilter(t){this.filter=t,this.page=1,this.getList()},stateGroups(t){const e={};return(t.positions||[]).forEach(i=>{var s,a;const r=i.stateMachineState;r&&(e[a=r.technicalName]??(e[a]={key:r.technicalName,label:((s=r.translated)==null?void 0:s.name)||r.technicalName,count:0}),e[r.technicalName].count+=1)}),Object.values(e).map(i=>({...i,kind:m(i.key)}))},customerName(t){var i;const e=(i=t.order)==null?void 0:i.orderCustomer;return e?e.company||`${e.firstName||""} ${e.lastName||""}`.trim():"–"},formatDate(t){return t?Shopware.Utils.format.date(t):"–"},currency(t){return t==null?"–":Shopware.Utils.format.currency(t,"EUR")}}};export{p as default};
