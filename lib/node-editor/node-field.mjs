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
        const fieldId = Math.random().toString(36).substring(7);

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
                            .id(fieldId)
                            .type(this.type.toLowerCase())
                            .value(value)
                            .onchange(e => {
                                const input = document.getElementById(fieldId);
                                if (!input.checkValidity()) {
                                    errorState.value = input.validationMessage;
                                } else {
                                    errorState.value = '';
                                    onChange(input.value);
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