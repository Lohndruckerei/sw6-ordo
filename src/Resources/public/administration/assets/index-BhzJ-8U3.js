const{Mixin:l}=Shopware,a={template:`
<mt-card :title="$tc('ld-ordo.supplierOrders.title')" position-identifier="lo-supplier-orders" class="lo-supplier-orders">
    <sw-skeleton v-if="!plan" />
    <template v-else>
        <mt-banner v-if="!plan.available" variant="attention">{{ $tc('ld-ordo.supplierOrders.unavailable') }}</mt-banner>
        <mt-banner v-else-if="plan.autoSend" variant="info">{{ $tc('ld-ordo.supplierOrders.autoSendOn') }}</mt-banner>

        <div v-for="group in plan.groups" :key="group.supplierId" class="lo-supplier-orders__group">
            <div class="lo-supplier-orders__head">
                <div>
                    <strong>{{ group.supplierName || group.supplierId }}</strong>
                    <span class="lo-muted"> · {{ $tc('ld-ordo.supplierOrders.released', { released: group.released, total: group.positions.length }) }}</span>
                </div>
                <div v-if="canSend && plan.available" class="lo-supplier-orders__buttons">
                    <mt-button variant="secondary" :disabled="isBusy" @click="preview(group)">{{ $tc('ld-ordo.supplierOrders.preview') }}</mt-button>
                    <mt-button
                        v-if="!group.complete && group.released > 0"
                        variant="secondary"
                        :disabled="isBusy"
                        @click="confirm(group, true)"
                    >
                        {{ $tc('ld-ordo.supplierOrders.sendPartial') }}
                    </mt-button>
                    <mt-button
                        variant="primary"
                        :disabled="isBusy || !group.complete"
                        :title="group.complete ? '' : $tc('ld-ordo.supplierOrders.notComplete')"
                        @click="confirm(group, false)"
                    >
                        {{ $tc('ld-ordo.supplierOrders.send') }}
                    </mt-button>
                </div>
            </div>
            <ul class="lo-supplier-orders__positions">
                <li v-for="position in group.positions" :key="position.positionId">
                    <lo-status :state="position.released ? 'ok' : 'warn'" :label="stateName(position.state)" />
                    {{ position.quantity }} × {{ position.label }}
                </li>
            </ul>
        </div>
        <p v-if="!plan.groups.length" class="lo-muted">{{ $tc('ld-ordo.supplierOrders.nothingOpen') }}</p>

        <table v-if="plan.orders.length" class="lo-order-detail__positions lo-supplier-orders__sent">
            <thead>
                <tr>
                    <th>{{ $tc('ld-ordo.supplierOrders.columnNumber') }}</th>
                    <th>{{ $tc('ld-ordo.supplierOrders.columnStatus') }}</th>
                    <th>{{ $tc('ld-ordo.supplierOrders.columnInterface') }}</th>
                    <th>{{ $tc('ld-ordo.supplierOrders.columnDelivery') }}</th>
                    <th>{{ $tc('ld-ordo.supplierOrders.columnWhen') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="order in plan.orders" :key="order.id">
                    <td>
                        <strong>{{ order.number }}</strong>
                        <div class="lo-muted">{{ order.supplierName }} · {{ $tc('ld-ordo.supplierOrders.positions', order.positions, { count: order.positions }) }}<template v-if="order.partial"> · {{ $tc('ld-ordo.supplierOrders.partial') }}</template></div>
                    </td>
                    <td>
                        <lo-status :state="order.status === 'sent' ? 'ok' : 'err'" :label="$tc('ld-ordo.supplierOrders.status.' + order.status)" />
                        <div class="lo-muted">{{ order.resultMessage }}</div>
                    </td>
                    <td>{{ order.interfaceName || '–' }}</td>
                    <td>{{ formatDate(order.deliveryDate) }}</td>
                    <td>{{ formatDateTime(order.sentAt || order.createdAt) }}<div class="lo-muted">{{ order.userName || $tc('ld-ordo.detail.automatic') }}</div></td>
                </tr>
            </tbody>
        </table>
    </template>

    <sw-modal v-if="pending" :title="pending.mode === 'preview' ? $tc('ld-ordo.supplierOrders.preview') : $tc('ld-ordo.supplierOrders.send')" @modal-close="pending = null">
        <sw-skeleton v-if="!pending.preview" />
        <template v-else>
            <p v-if="pending.mode === 'send'">{{ $tc(pending.partial ? 'ld-ordo.supplierOrders.confirmPartial' : 'ld-ordo.supplierOrders.confirm', { supplier: pending.group.supplierName }) }}</p>
            <dl class="lo-order-detail__facts">
                <dt>{{ $tc('ld-ordo.supplierOrders.columnNumber') }}</dt><dd>{{ pending.preview.number }}</dd>
                <dt>{{ $tc('ld-ordo.supplierOrders.columnInterface') }}</dt><dd>{{ pending.preview.interfaceName || $tc('ld-ordo.supplierOrders.noInterface') }}</dd>
                <dt>{{ $tc('ld-ordo.supplierOrders.columnDelivery') }}</dt><dd>{{ formatDate(pending.preview.data?.deliveryDate) }}</dd>
                <dt>{{ $tc('ld-ordo.supplierOrders.address') }}</dt><dd>{{ address(pending.preview.data?.shippingAddress) }}</dd>
            </dl>
            <table class="lo-order-detail__positions">
                <thead><tr>
                    <th>{{ $tc('ld-ordo.detail.columnPosition') }}</th>
                    <th>{{ $tc('ld-ordo.supplierOrders.supplierNumber') }}</th>
                    <th class="lo-num">{{ $tc('ld-ordo.detail.columnQuantity') }}</th>
                </tr></thead>
                <tbody>
                    <tr v-for="item in pending.preview.data?.items || []" :key="item.orderLineItemId">
                        <td>{{ item.label }}<div v-for="option in item.options || []" :key="option" class="lo-muted">{{ option }}</div></td>
                        <td>{{ item.supplierProductNumber || '–' }}</td>
                        <td class="lo-num">{{ item.quantity }}</td>
                    </tr>
                </tbody>
            </table>
        </template>
        <template #modal-footer>
            <mt-button variant="secondary" size="small" @click="pending = null">{{ $tc(pending.mode === 'send' ? 'global.default.cancel' : 'global.default.close') }}</mt-button>
            <mt-button v-if="pending.mode === 'send'" variant="primary" size="small" :disabled="isBusy || !pending.preview" @click="send">
                {{ $tc('ld-ordo.supplierOrders.sendNow') }}
            </mt-button>
        </template>
    </sw-modal>
</mt-card>`,inject:["acl"],mixins:[l.getByName("notification")],emits:["changed"],props:{ordoOrderId:{type:String,required:!0},stateNames:{type:Object,default:()=>({})}},data(){return{plan:null,pending:null,isBusy:!1}},computed:{canSend(){return this.acl.can("ld_ordo.editor")},httpClient(){return Shopware.Application.getContainer("init").httpClient},headers(){return{Authorization:`Bearer ${Shopware.Service("loginService").getToken()}`}}},watch:{ordoOrderId(){this.load()}},created(){this.load()},methods:{async load(){const{data:e}=await this.httpClient.get(`/_action/ld-ordo/order/${this.ordoOrderId}/supplier-orders`,{headers:this.headers});this.plan=e},releasedIds(e){return e.positions.filter(r=>r.released).map(r=>r.positionId)},url(e,r){return`/_action/ld-ordo/order/${this.ordoOrderId}/supplier/${e.supplierId}/${r}`},async loadPreview(e,r){var d,s,i,o;try{const{data:t}=await this.httpClient.post(this.url(e,"preview"),{positionIds:r},{headers:this.headers});this.pending={...this.pending,preview:t}}catch(t){this.pending=null,this.createNotificationError({message:((o=(i=(s=(d=t==null?void 0:t.response)==null?void 0:d.data)==null?void 0:s.errors)==null?void 0:i[0])==null?void 0:o.detail)||this.$tc("ld-ordo.supplierOrders.error")})}},preview(e){this.pending={mode:"preview",group:e,preview:null},this.loadPreview(e,null)},confirm(e,r){const d=r?this.releasedIds(e):null;this.pending={mode:"send",group:e,partial:r,positionIds:d,preview:null},this.loadPreview(e,d)},async send(){var d,s,i,o;const{group:e,positionIds:r}=this.pending;this.isBusy=!0;try{const{data:t}=await this.httpClient.post(this.url(e,"send"),{positionIds:r},{headers:this.headers});t.success?this.createNotificationSuccess({message:this.$tc("ld-ordo.supplierOrders.sent",{number:t.number,message:t.message})}):this.createNotificationError({message:this.$tc("ld-ordo.supplierOrders.failed",{number:t.number,message:t.message})}),this.pending=null,await this.load(),this.$emit("changed")}catch(t){this.createNotificationError({message:((o=(i=(s=(d=t==null?void 0:t.response)==null?void 0:d.data)==null?void 0:s.errors)==null?void 0:i[0])==null?void 0:o.detail)||this.$tc("ld-ordo.supplierOrders.error")})}finally{this.isBusy=!1}},stateName(e){return this.stateNames[e]||e},address(e){return e?[e.company,e.name,e.street,`${e.zipcode||""} ${e.city||""}`.trim(),e.country].filter(Boolean).join(", "):"–"},formatDate(e){return e?Shopware.Utils.format.date(e,{hour:void 0,minute:void 0}):"–"},formatDateTime(e){return e?Shopware.Utils.format.date(e):"–"}}};export{a as default};
