import{M as n}from"./constants-JREQHd52.js";const{Mixin:l}=Shopware,c={template:`
<sw-modal :title="title" variant="small" @modal-close="$emit('close')">
    <template v-if="isForward">
        <p>{{ $tc('ld-ordo.transition.forwardText', { position: label }) }}</p>
        <mt-select
            v-model="target"
            :label="$tc('ld-ordo.transition.target')"
            :help-text="$tc('ld-ordo.transition.targetHelp')"
            :options="targetOptions"
            required
        />
    </template>
    <p v-else>{{ $tc('ld-ordo.detail.confirmText', { position: label, state: stateName(current?.to) }) }}</p>
    <mt-textarea
        v-model="reason"
        :label="$tc(reasonRequired ? 'ld-ordo.detail.reasonRequired' : 'ld-ordo.detail.reasonLabel')"
        :help-text="$tc('ld-ordo.detail.reasonHelp')"
        :placeholder="$tc(isForward ? 'ld-ordo.transition.reasonPlaceholder' : 'ld-ordo.detail.reasonPlaceholder')"
        :required="reasonRequired"
    />
    <template #modal-footer>
        <mt-button variant="secondary" size="small" @click="$emit('close')">{{ $tc('global.default.cancel') }}</mt-button>
        <mt-button
            :variant="current?.action === 'cancel' ? 'critical' : 'primary'"
            size="small"
            :disabled="!canSubmit"
            @click="submit"
        >
            {{ buttonLabel }}
        </mt-button>
    </template>
</sw-modal>`,mixins:[l.getByName("notification")],emits:["close","done"],props:{position:{type:Object,required:!0},transitions:{type:Array,default:()=>[]},action:{type:String,default:null},stateNames:{type:Object,default:()=>({})}},data(){return{target:null,reason:"",isSaving:!1}},computed:{isForward(){return!this.action},label(){var t;return((t=this.position.orderLineItem)==null?void 0:t.label)||""},targetOptions(){return this.transitions.filter(t=>t.action.startsWith(n)).map(t=>({value:t.action,label:this.stateName(t.to)}))},current(){const t=this.action||this.target;return this.transitions.find(e=>e.action===t)||null},reasonRequired(){return this.isForward||this.action==="hold"},title(){return this.isForward?this.$tc("ld-ordo.transition.forward"):this.$tc(`ld-ordo.actions.${this.action}`)},buttonLabel(){return this.isForward?this.$tc("ld-ordo.transition.forwardButton"):this.$tc(`ld-ordo.actions.${this.action}`)},canSubmit(){return!this.isSaving&&!!this.current&&(!this.reasonRequired||this.reason.trim()!=="")}},methods:{stateName(t){return this.stateNames[t]||t||"–"},async submit(){var o,a,r,s;const t=Shopware.Application.getContainer("init").httpClient,e={Authorization:`Bearer ${Shopware.Service("loginService").getToken()}`};this.isSaving=!0;try{await t.post(`/_action/ld-ordo/position/${this.position.id}/transition/${this.current.action}`,{reason:this.reason},{headers:e}),this.$emit("done")}catch(i){this.createNotificationError({message:((s=(r=(a=(o=i==null?void 0:i.response)==null?void 0:o.data)==null?void 0:a.errors)==null?void 0:r[0])==null?void 0:s.detail)||this.$tc("ld-ordo.detail.errorTransition")})}finally{this.isSaving=!1}}}};export{c as default};
