import {ValueTypes} from "./value-types.mjs";
import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

export class NodeField {
    constructor(name, type, defaultValue, required = false, shown = true, id = null) {
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
        this.id = id ?? Math.random().toString(36).substring(7);
    }

    hide() {
        this.shownState.value = false;
    }

    show() {
        this.shownState.value = true;
    }
}