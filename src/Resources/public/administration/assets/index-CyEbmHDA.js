const{Mixin:e}=Shopware,r={template:`
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
            <lo-order-file :ordo-order-id="ordoOrderId" @loaded="order = $event?.order || null" />
        </sw-card-view>
    </template>
</sw-page>`,inject:["acl"],mixins:[e.getByName("lo-design")],props:{ordoOrderId:{type:String,required:!0}},metaInfo(){return{title:this.$createTitle()}},data(){return{order:null}}};export{r as default};
