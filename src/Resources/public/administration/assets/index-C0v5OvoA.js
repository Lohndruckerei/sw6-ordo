import{C as l}from"./ld-ordo-BNiMn4b1.js";const i={template:`
<span
    class="lo-chip"
    :style="{ '--lo-t': 'var(--lo-' + color + ')' }"
    :title="title"
>
    <mt-icon
        v-if="icon"
        class="lo-chip__icon"
        :name="icon"
        size="12px"
    />
    <span class="lo-chip__label">{{ label }}</span>
</span>`,props:{label:{type:String,required:!0},color:{type:String,required:!1,default:"c1",validator:e=>l.includes(e)},icon:{type:String,required:!1,default:null},title:{type:String,required:!1,default:null}}};export{i as default};
