import{d as c,C as d,A as s}from"./constants-JREQHd52.js";import{i as p}from"./ld-ordo-BibNSJek.js";const{Mixin:l}=Shopware,{Criteria:i}=Shopware.Data,u={template:`
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
</div>`,inject:["repositoryFactory","acl","loginService"],mixins:[l.getByName("lo-design"),l.getByName("notification")],props:{area:{type:String,default:null},ordoOrderId:{type:String,default:null}},metaInfo(){return{title:this.$tc("ld-ordo.workspace.title")}},data(){return{positions:[],total:0,page:1,limit:25,counts:{},stateFilter:"all",stateNames:{},isLoading:!1,pending:null,openOrder:null}},computed:{repository(){return this.repositoryFactory.create("ld_ordo_position")},allowedAreas(){const t=Object.keys(s).filter(e=>this.acl.can(s[e].privilege));return t.length||!this.acl.can("ld_ordo.viewer")?t:["service"]},activeArea(){return this.allowedAreas.includes(this.area)?this.area:this.allowedAreas[0]||null},areaItems(){return this.allowedAreas.map(t=>({name:t,label:this.$tc(`ld-ordo.workspace.areas.${t}.tab`),icon:s[t].icon}))},areaStates(){return this.activeArea?s[this.activeArea].states:[]},filterItems(){const t=Object.values(this.counts).reduce((e,o)=>e+o,0);return[{name:"all",label:this.$tc("ld-ordo.workspace.filterAll"),count:t},...this.areaStates.filter(e=>this.activeArea!=="chef"||this.counts[e]).map(e=>({name:e,label:this.stateNames[e]||e,count:this.counts[e]||0}))]},canWork(){return["ld_ordo.editor","ld_ordo.artwork","ld_ordo.production","ld_ordo.shipping"].some(t=>this.acl.can(t))},ordoOnly(){return p()},userName(){const t=Shopware.Store.get("session").currentUser;return t?`${t.firstName||""} ${t.lastName||""}`.trim()||t.username:""},httpClient(){return Shopware.Application.getContainer("init").httpClient}},watch:{activeArea(){this.stateFilter="all",this.page=1,this.load()}},created(){this.loadStateNames(),this.load()},methods:{criteria(t){const e=new i(this.page,this.limit);return e.addFilter(i.equalsAny("stateMachineState.technicalName",t)),e},async load(){if(!this.activeArea||this.ordoOrderId)return;this.isLoading=!0;const t=this.stateFilter==="all"?this.areaStates:[this.stateFilter],e=this.criteria(t);e.addAssociation("stateMachineState").addAssociation("orderLineItem"),e.addAssociation("ordoOrder.order.orderCustomer"),e.addSorting(i.sort("ordoOrder.order.orderDateTime","ASC")),e.addSorting(i.sort("orderLineItem.position","ASC")),e.setTotalCountMode(1);try{const o=await this.repository.search(e);this.positions=[...o],this.total=o.total}finally{this.isLoading=!1}this.loadCounts()},async loadCounts(){var a,r;const t=this.criteria(this.areaStates);t.setLimit(1),t.addAggregation(i.terms("states","stateMachineState.technicalName",null,null,null));const o=((r=(a=(await this.repository.search(t)).aggregations)==null?void 0:a.states)==null?void 0:r.buckets)||[];this.counts=Object.fromEntries(o.map(n=>[n.key,n.count]))},async loadStateNames(){const t=new i(1,50);t.addFilter(i.equals("stateMachine.technicalName","ld_ordo_position.state"));const e=await this.repositoryFactory.create("state_machine_state").search(t);this.stateNames=Object.fromEntries(e.map(o=>{var a;return[o.technicalName,((a=o.translated)==null?void 0:a.name)||o.technicalName]}))},setStateFilter(t){this.stateFilter=t,this.page=1,this.load()},onPageChange({page:t}){this.page=t,this.load()},selectArea(t){this.$router.push({name:"ld.ordo.workspace",params:{area:t}})},openFile(t){this.$router.push({name:"ld.ordo.workspaceOrder",params:{area:this.activeArea,id:t.ordoOrderId}})},closeOrder(){this.$router.push({name:"ld.ordo.workspace",params:{area:this.activeArea}}).then(()=>this.load())},completeAction(t){var e;return d[(e=t.stateMachineState)==null?void 0:e.technicalName]||null},async openTransition(t,e){this.pending={position:t,action:e,transitions:null};try{const o={Authorization:`Bearer ${this.loginService.getToken()}`},{data:a}=await this.httpClient.get(`/_action/ld-ordo/position/${t.id}/transitions`,{headers:o});if(e&&!a.transitions.some(r=>r.action===e)){this.createNotificationError({message:this.$tc("ld-ordo.detail.errorTransition")}),this.pending=null;return}this.pending={...this.pending,transitions:a.transitions}}catch{this.pending=null,this.createNotificationError({message:this.$tc("ld-ordo.detail.errorTransition")})}},onTransitionDone(){this.pending=null,this.load()},order(t){var e;return((e=t.ordoOrder)==null?void 0:e.order)||null},customerName(t){var o;const e=(o=this.order(t))==null?void 0:o.orderCustomer;return e?e.company||`${e.firstName||""} ${e.lastName||""}`.trim():"–"},designState:c,formatDate(t){return t?Shopware.Utils.format.date(t,{hour:void 0,minute:void 0}):"–"},toAdministration(){this.$router.push({name:"ld.ordo.list"})},logout(){this.loginService.logout(),this.$router.push({name:"sw.login.index"})}}};export{u as default};
