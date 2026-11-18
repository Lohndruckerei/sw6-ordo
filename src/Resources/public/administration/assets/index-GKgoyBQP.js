const{Mixin:o}=Shopware,a={template:`
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
</sw-modal>`,mixins:[o.getByName("notification")],emits:["close","done"],props:{position:{type:Object,required:!0},assignment:{type:Object,required:!0}},data(){return{choice:this.assignment.target==="internal"?"internal":this.assignment.supplierId?`supplier:${this.assignment.supplierId}`:null,otherSupplierId:null,reason:"",isSaving:!1}},computed:{hasLieferLotse(){return Shopware.EntityDefinition.has("ld_supplier")},options(){const t=(this.assignment.candidates||[]).map(e=>({value:`supplier:${e.supplierId}`,label:[e.name||e.supplierId,e.mensura?this.$tc("ld-ordo.assignment.suggestedMensura"):null,e.priority?this.$tc("ld-ordo.assignment.priority",{priority:e.priority}):null,e.active?null:this.$tc("ld-ordo.assignment.inactive")].filter(Boolean).join(" · ")}));return this.assignment.supplierId&&!t.some(e=>e.value===`supplier:${this.assignment.supplierId}`)&&t.unshift({value:`supplier:${this.assignment.supplierId}`,label:this.assignment.supplierName||this.assignment.supplierId}),this.hasLieferLotse&&t.push({value:"other",label:this.$tc("ld-ordo.assignment.other")}),t.push({value:"internal",label:this.$tc("ld-ordo.assignment.internal")}),t},payload(){return this.choice==="internal"?{target:"internal"}:this.choice==="other"?this.otherSupplierId?{target:"supplier",supplierId:this.otherSupplierId}:null:this.choice?{target:"supplier",supplierId:this.choice.slice(9)}:null},canSubmit(){return!this.isSaving&&this.payload!==null}},methods:{async submit(){var s,l,r,n;const t=Shopware.Application.getContainer("init").httpClient,e={Authorization:`Bearer ${Shopware.Service("loginService").getToken()}`};this.isSaving=!0;try{await t.post(`/_action/ld-ordo/position/${this.position.id}/assign`,{...this.payload,reason:this.reason},{headers:e}),this.$emit("done")}catch(i){this.createNotificationError({message:((n=(r=(l=(s=i==null?void 0:i.response)==null?void 0:s.data)==null?void 0:l.errors)==null?void 0:r[0])==null?void 0:n.detail)||this.$tc("ld-ordo.assignment.error")})}finally{this.isSaving=!1}}}};export{a as default};
