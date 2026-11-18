import{D as s}from"./ld-ordo-Skt1jikp.js";const r={template:`
<div class="lo-design-switch" role="group" :aria-label="$tc('lo-design.switchLabel')">
    <span class="lo-design-switch__label">{{ $tc('lo-design.switchLabel') }}</span>
    <button
        v-for="design in designs"
        :key="design.key"
        v-tooltip.bottom="{ message: design.title, appearance: 'light' }"
        type="button"
        class="lo-design-switch__option"
        :class="{ 'is--active': design.key === current }"
        :aria-pressed="design.key === current ? 'true' : 'false'"
        @click="select(design.key)"
    >
        {{ design.key.toUpperCase() }}
    </button>
    <button
        v-tooltip.bottom="{ message: $tc('lo-design.marker.toggleTitle'), appearance: 'light' }"
        type="button"
        class="lo-design-switch__option lo-design-switch__marker"
        :class="{ 'is--active': markerActive }"
        :aria-pressed="markerActive ? 'true' : 'false'"
        @click="toggleMarker"
    >
        {{ $tc('lo-design.marker.toggle') }}
    </button>
</div>`,data(){var e;return{markerActive:((e=window.ldAdminMarker)==null?void 0:e.active)??!1,markerOff:null}},computed:{store(){return Shopware.Store.get("loDesign")},current(){return this.store.design},designs(){return s.map(e=>{const t=e===this.store.defaultDesign;return{key:e,title:this.$tc(`lo-design.designs.${e}`)+(t?` (${this.$tc("lo-design.default")})`:"")}})}},created(){var e;this.store.ensureLoaded(),this.markerOff=((e=window.ldAdminMarker)==null?void 0:e.onChange(t=>{this.markerActive=t}))??null},unmounted(){var e;(e=this.markerOff)==null||e.call(this)},methods:{toggleMarker(){var e;(e=window.ldAdminMarker)==null||e.toggle()},async select(e){if(e!==this.current)try{await this.store.setDesign(e)}catch{}}}};export{r as default};
