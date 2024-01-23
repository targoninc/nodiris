import {ValueTypes} from "./value-types.mjs";
import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

export class NodeField {
    constructor(name, type, defaultValue, required = false, shown = true) {
        this.name = name;
        if (!Object.values(ValueTypes).includes(type)) {
            throw new Error(`Unknown type ${type} for node field ${name}`);
        }
        this.type = type;
        this.required = required;
        this.shownState = new FjsObservable(shown);
        this.shown = shown;
        this.shownState.onUpdate = shown => {
            this.shown = shown;
        };
        this.default = defaultValue;
    }

    hide() {
        this.shownState.value = false;
    }

    show() {
        this.shownState.value = true;
    }

    validate(value) {
        if (value.constructor.name !== this.type) {
            return new Error(`Expected ${this.type.name} but got ${value.constructor.name}`);
        }

        if (this.required && this.type === "String" && value.length === 0) {
            return new Error(`Expected non-empty string`);
        }

        if (this.required && this.type === "Number" && isNaN(value)) {
            return new Error(`Expected number`);
        }

        if (this.required && this.type === "Boolean" && typeof value !== 'boolean') {
            return new Error(`${this.name} is required`);
        }

        return true;
    }

    render(value, onChange) {
        const errorState = new FjsObservable('');
        const hiddenClassState = new FjsObservable(this.shownState.value ? '_' : 'hidden');
        this.shownState.onUpdate = shown => {
            if (shown) {
                hiddenClassState.value = 'hidden';
            } else {
                hiddenClassState.value = '_';
            }
        };

        return FJS.create("div")
            .classes("node-field", hiddenClassState)
            .children(
                FJS.create("label")
                    .classes("node-field-label")
                    .text(this.name)
                    .build(),
                FJS.create("div")
                    .classes("node-field-value")
                    .children(
                        FJS.create("input")
                            .classes("node-field-input")
                            .type(this.type.toLowerCase())
                            .value(value)
                            .onchange(e => {
                                const newValue = e.target.value;
                                const validation = this.validate(newValue);
                                if (validation === true) {
                                    onChange(newValue);
                                } else {
                                    errorState.value = validation.message;
                                }
                            })
                            .build(),
                        FJS.create("span")
                            .classes("node-field-error")
                            .text(errorState)
                            .build()
                    ).build()
            ).build();
    }
}