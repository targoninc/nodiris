import {ValueTypes} from "./value-types.mjs";

export class GlobalSection {
    /**
     *
     * @param name {string}
     * @param fields {InputField[]}
     */
    constructor(name, fields = []) {
        this.name = name;
        this.fields = fields;
    }

    set(key, value) {
        const field = this.fields.find(field => field.name === key);
        field.value = value;
        if (field.type === ValueTypes.function && field.value.includes("Date.now()")) {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            this.updateInterval = setInterval(() => {
                field.propagateValue();
                window.nodeEditor.rerender();
            }, 100);
        } else if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        field.propagateValue();
    }

    get(key) {
        return this.fields.find(field => field.name === key).value;
    }

    addField(field) {
        this.fields.push(field);
    }

    removeFieldByName(name) {
        this.fields = this.fields.filter(field => field.name !== name);
    }

    getFieldByName(name) {
        return this.fields.find(field => field.name === name);
    }
}