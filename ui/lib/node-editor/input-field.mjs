import {ValueTypes} from "./value-types.mjs";
import {FjsObservable} from "https://fjs.targoninc.com/f.js";
import {IdGenerator} from "./id-generator.mjs";
import {EditorConnection} from "./editor-connection.mjs";

export class InputField {
    constructor(name, type, defaultValue, required = false, shown = true, connections = [], value = null, id = null) {
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
        this.connections = connections ?? [];
        this.id = id ?? IdGenerator.generateId();
        this.value = value ?? defaultValue;
    }

    connect(id) {
        if (!this.connections.find(connection => connection.to === id)) {
            this.connections.push(new EditorConnection(this.id, id));
        }
    }

    hide() {
        this.shownState.value = false;
    }

    show() {
        this.shownState.value = true;
    }

    highlightAsConnectionTarget() {
        document.getElementById(this.id).classList.add("incoming");
    }

    highlightAsConnectionSource() {
        document.getElementById(this.id).classList.add("outgoing");
    }

    unhighlightAsConnectionTarget() {
        document.getElementById(this.id).classList.remove("incoming");
    }

    unhighlightAsConnectionSource() {
        document.getElementById(this.id).classList.remove("outgoing");
    }

    startConnecting(e) {
        e.stopPropagation();
        window.nodeEditor.startFieldConnection(this);
        document.addEventListener("click", e => {
            if (!e.target.classList.contains("node-field-input")) {
                window.nodeEditor.finishFieldConnection(this.id, null);
                return;
            }

            window.nodeEditor.finishFieldConnection(this.id, e.target.id);
        }, {once: true});
    }

    canConnectTo(id) {
        if (window.nodeEditor.fieldHasIncomingConnection(id)) {
            return false;
        }
        return !this.connections.find(connection => connection.to === id);
    }

    propagateValue() {
        let deleteQueue = [];
        for (const connection of this.connections) {
            const connectedField = window.nodeEditor.getFieldById(connection.to);
            if (!connectedField) {
                deleteQueue.push(connection);
                continue;
            }
            connectedField.value = this.value;
            connectedField.propagateValue();
        }
        for (const connection of deleteQueue) {
            this.connections.splice(this.connections.indexOf(connection), 1);
        }
    }

    getValue(value) {
        switch (this.type) {
            case ValueTypes.number:
                return Number(value);
            case ValueTypes.string:
                return String(value);
            case ValueTypes.boolean:
                return Boolean(value);
            case ValueTypes.object:
            case ValueTypes.array:
                return JSON.parse(value);
            default:
                return value;
        }
    }
}