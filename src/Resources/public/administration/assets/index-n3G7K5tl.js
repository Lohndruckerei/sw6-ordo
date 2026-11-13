import{M as s}from"./constants-JREQHd52.js";const{Mixin:d}=Shopware,{Criteria:a}=Shopware.Data,c={template:`
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
        <lo-transition-modal
            v-if="pending"
            :position="pending.position"
            :transitions="transitions[pending.position.id] || []"
            :action="pending.action"
            :state-names="states"
            @close="pending = null"
            @done="onTransitionDone"
        />
</div>`,inject:["repositoryFactory","acl"],mixins:[d.getByName("notification")],emits:["loaded"],props:{ordoOrderId:{type:String,required:!0}},data(){return{file:null,transitions:{},states:{},isLoading:!0,isSaving:!1,pending:null,noteText:""}},computed:{repository(){return this.repositoryFactory.create("ld_ordo_order")},order(){var t;return((t=this.file)==null?void 0:t.order)||null},positions(){var t;return[...((t=this.file)==null?void 0:t.positions)||[]].sort((i,e)=>{var o,n;return(((o=i.orderLineItem)==null?void 0:o.position)??0)-(((n=e.orderLineItem)==null?void 0:n.position)??0)})},events(){var t;return[...((t=this.file)==null?void 0:t.events)||[]].sort((i,e)=>i.createdAt<e.createdAt?1:-1)},canEdit(){return["ld_ordo.editor","ld_ordo.artwork","ld_ordo.production","ld_ordo.shipping"].some(t=>this.acl.can(t))},canNote(){return this.canEdit},customerName(){var i;const t=(i=this.order)==null?void 0:i.orderCustomer;return t?t.company||`${t.firstName||""} ${t.lastName||""}`.trim():"–"},httpClient(){return Shopware.Application.getContainer("init").httpClient},headers(){return{Authorization:`Bearer ${Shopware.Service("loginService").getToken()}`}}},watch:{ordoOrderId(){this.load()}},created(){this.load(),this.loadStateNames()},methods:{async load(){this.isLoading=!0;const t=new a(1,1);t.setIds([this.ordoOrderId]),t.addAssociation("order.orderCustomer"),t.getAssociation("positions").addAssociation("stateMachineState").addAssociation("orderLineItem"),t.getAssociation("events").setLimit(200);try{this.file=(await this.repository.search(t)).first(),this.$emit("loaded",this.file),await this.loadTransitions()}finally{this.isLoading=!1}},async loadTransitions(){var i;const t={};await Promise.all((((i=this.file)==null?void 0:i.positions)||[]).map(async e=>{const{data:o}=await this.httpClient.get(`/_action/ld-ordo/position/${e.id}/transitions`,{headers:this.headers});t[e.id]=o.transitions})),this.transitions=t},async loadStateNames(){const t=new a(1,50);t.addFilter(a.equals("stateMachine.technicalName","ld_ordo_position.state"));const i=await this.repositoryFactory.create("state_machine_state").search(t);this.states=Object.fromEntries(i.map(e=>{var o;return[e.technicalName,((o=e.translated)==null?void 0:o.name)||e.technicalName]}))},stateName(t){return this.states[t]||t||"–"},menuTransitions(t){return(this.transitions[t.id]||[]).filter(i=>!i.action.startsWith(s))},canForward(t){return(this.transitions[t.id]||[]).some(i=>i.action.startsWith(s))},openTransition(t,i){this.pending={position:t,action:i.action}},openForward(t){this.pending={position:t,action:null}},async onTransitionDone(){this.pending=null,await this.load()},async saveNote(){var t,i,e,o;this.isSaving=!0;try{await this.httpClient.post(`/_action/ld-ordo/order/${this.ordoOrderId}/note`,{text:this.noteText},{headers:this.headers}),this.noteText="",await this.load()}catch(n){this.createNotificationError({message:((o=(e=(i=(t=n==null?void 0:n.response)==null?void 0:t.data)==null?void 0:i.errors)==null?void 0:e[0])==null?void 0:o.detail)||this.$tc("ld-ordo.detail.errorNote")})}finally{this.isSaving=!1}},positionLabel(t){var i,e,o,n;return((n=(o=(e=(i=this.file)==null?void 0:i.positions)==null?void 0:e.find(r=>r.id===t))==null?void 0:o.orderLineItem)==null?void 0:n.label)||""},eventText(t){const i=t.payload||{};return t.type==="state_changed"?this.$tc("ld-ordo.events.state_changed",{position:this.positionLabel(t.positionId),from:this.stateName(i.from),to:this.stateName(i.to)}):this.$tc(`ld-ordo.events.${t.type}`,{count:i.positions??0})},formatDate(t){return t?Shopware.Utils.format.date(t,{hour:void 0,minute:void 0}):"–"},formatDateTime(t){return t?Shopware.Utils.format.date(t):""},currency(t){return t==null?"–":Shopware.Utils.format.currency(t,"EUR")}}};export{c as default};
