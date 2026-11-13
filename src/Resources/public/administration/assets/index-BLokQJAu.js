import{S as s,a}from"./ld-ordo-DCdGyUzQ.js";const n={template:`
<span
    class="lo-status"
    :class="'lo-status--' + state"
>
    <mt-icon
        class="lo-status__icon"
        :name="icon"
        size="11px"
    />
    <span>{{ label }}</span>
</span>`,props:{state:{type:String,required:!0,validator:t=>a.includes(t)},label:{type:String,required:!0}},computed:{icon(){return s[this.state]}}};export{n as default};
