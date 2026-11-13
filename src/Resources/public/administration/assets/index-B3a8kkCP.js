const{Mixin:d}=Shopware,{Criteria:s}=Shopware.Data,l={template:`
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
</sw-page>`,inject:["repositoryFactory","acl"],mixins:[d.getByName("lo-design"),d.getByName("notification")],props:{ordoOrderId:{type:String,required:!0}},metaInfo(){return{title:this.$createTitle()}},data(){return{file:null,transitions:{},states:{},isLoading:!0,isSaving:!1,pending:null,reason:"",noteText:""}},computed:{repository(){return this.repositoryFactory.create("ld_ordo_order")},order(){var t;return((t=this.file)==null?void 0:t.order)||null},positions(){var t;return[...((t=this.file)==null?void 0:t.positions)||[]].sort((e,i)=>{var o,a;return(((o=e.orderLineItem)==null?void 0:o.position)??0)-(((a=i.orderLineItem)==null?void 0:a.position)??0)})},events(){var t;return[...((t=this.file)==null?void 0:t.events)||[]].sort((e,i)=>e.createdAt<i.createdAt?1:-1)},canEdit(){return this.acl.can("ld_ordo.editor")},canNote(){return this.acl.can("ld_ordo.editor")},customerName(){var e;const t=(e=this.order)==null?void 0:e.orderCustomer;return t?t.company||`${t.firstName||""} ${t.lastName||""}`.trim():"–"},httpClient(){return Shopware.Application.getContainer("init").httpClient},headers(){return{Authorization:`Bearer ${Shopware.Service("loginService").getToken()}`}}},watch:{ordoOrderId(){this.load()}},created(){this.load(),this.loadStateNames()},methods:{async load(){this.isLoading=!0;const t=new s(1,1);t.setIds([this.ordoOrderId]),t.addAssociation("order.orderCustomer"),t.getAssociation("positions").addAssociation("stateMachineState").addAssociation("orderLineItem"),t.getAssociation("events").setLimit(200);try{this.file=(await this.repository.search(t)).first(),await this.loadTransitions()}finally{this.isLoading=!1}},async loadTransitions(){var e;const t={};await Promise.all((((e=this.file)==null?void 0:e.positions)||[]).map(async i=>{const{data:o}=await this.httpClient.get(`/_action/ld-ordo/position/${i.id}/transitions`,{headers:this.headers});t[i.id]=o.transitions})),this.transitions=t},async loadStateNames(){const t=new s(1,50);t.addFilter(s.equals("stateMachine.technicalName","ld_ordo_position.state"));const e=await this.repositoryFactory.create("state_machine_state").search(t);this.states=Object.fromEntries(e.map(i=>{var o;return[i.technicalName,((o=i.translated)==null?void 0:o.name)||i.technicalName]}))},stateName(t){return this.states[t]||t||"–"},openTransition(t,e){this.reason="",this.pending={position:t,transition:e}},async runTransition(){var i,o,a,n;const{position:t,transition:e}=this.pending;this.isSaving=!0;try{await this.httpClient.post(`/_action/ld-ordo/position/${t.id}/transition/${e.action}`,{reason:this.reason},{headers:this.headers}),this.pending=null,await this.load()}catch(r){this.createNotificationError({message:((n=(a=(o=(i=r==null?void 0:r.response)==null?void 0:i.data)==null?void 0:o.errors)==null?void 0:a[0])==null?void 0:n.detail)||this.$tc("ld-ordo.detail.errorTransition")})}finally{this.isSaving=!1}},async saveNote(){var t,e,i,o;this.isSaving=!0;try{await this.httpClient.post(`/_action/ld-ordo/order/${this.ordoOrderId}/note`,{text:this.noteText},{headers:this.headers}),this.noteText="",await this.load()}catch(a){this.createNotificationError({message:((o=(i=(e=(t=a==null?void 0:a.response)==null?void 0:t.data)==null?void 0:e.errors)==null?void 0:i[0])==null?void 0:o.detail)||this.$tc("ld-ordo.detail.errorNote")})}finally{this.isSaving=!1}},positionLabel(t){var e,i,o,a;return((a=(o=(i=(e=this.file)==null?void 0:e.positions)==null?void 0:i.find(n=>n.id===t))==null?void 0:o.orderLineItem)==null?void 0:a.label)||""},eventText(t){const e=t.payload||{};return t.type==="state_changed"?this.$tc("ld-ordo.events.state_changed",{position:this.positionLabel(t.positionId),from:this.stateName(e.from),to:this.stateName(e.to)}):this.$tc(`ld-ordo.events.${t.type}`,{count:e.positions??0})},formatDate(t){return t?Shopware.Utils.format.date(t,{hour:void 0,minute:void 0}):"–"},formatDateTime(t){return t?Shopware.Utils.format.date(t):""},currency(t){return t==null?"–":Shopware.Utils.format.currency(t,"EUR")}}};export{l as default};
