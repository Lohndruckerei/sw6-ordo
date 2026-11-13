import { designState } from '../../constants';

/**
 * Positionsstatus als Design-Baustein lo-status; Name aus der Status-Maschine (übersetzt).
 */
export default {
    template: `<lo-status v-if="state" :state="kind" :label="label" />`,

    props: {
        state: { type: Object, required: false, default: null },
    },

    computed: {
        kind() {
            return designState(this.state?.technicalName);
        },
        label() {
            return this.state?.translated?.name || this.state?.name || this.state?.technicalName;
        },
    },
};
