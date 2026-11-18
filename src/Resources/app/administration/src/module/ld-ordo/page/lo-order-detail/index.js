const { Mixin } = Shopware;

/**
 * Auftragsakte in der Shopware-Administration (mit Menü); Inhalt in lo-order-file.
 */
export default {
    template: `
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
</sw-page>`,

    inject: ['acl'],

    mixins: [Mixin.getByName('lo-design')],

    props: {
        ordoOrderId: { type: String, required: true },
    },

    metaInfo() {
        return { title: this.$createTitle() };
    },

    data() {
        return { order: null };
    },
};
