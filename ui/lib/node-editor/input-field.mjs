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
        this.connections = connections.map(c => new EditorConnection(c.from, c.to, c.id)) ?? [];
        this.id = id ?? IdGenerator.generateId();
        this.value = value ?? defaultValue;
        this.outValue = value ?? defaultValue;
    }

    connect(id) {
        if (!this.connections.find(connection => connection.to === id)) {
            this.connections.push(new EditorConnection(this.id, id));
        }
    }

    disconnect(id) {
        const connection = this.connections.find(connection => connection.to === id);
        if (connection) {
            this.connections.splice(this.connections.indexOf(connection), 1);
        }
    }

    hide() {
        this.shownState.value = false;
    }

    show() {
        this.shownState.value = true;
    }

    getDomNode() {
        const domNode = document.getElementById(this.id);
        if (!domNode) {
            console.error(`Node with id ${this.id} not found`);
            return {
                classList: {
                    add: () => {
                    },
                    remove: () => {
                    }
                }
            };
        }
        return domNode;
    }

    highlightAsConnectionTarget() {
        this.getDomNode().classList.add("incoming");
    }

    highlightAsConnectionSource() {
        this.getDomNode().classList.add("outgoing");
    }

    highlightAsConnectionRemoval() {
        this.getDomNode().classList.add("removal");
    }

    unhighlightAsConnectionTarget() {
        this.getDomNode().classList.remove("incoming");
    }

    unhighlightAsConnectionSource() {
        this.getDomNode().classList.remove("outgoing");
    }

    unhighlightAsConnectionRemoval() {
        this.getDomNode().classList.remove("removal");
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
            e.target.blur();
            window.nodeEditor.rerender();
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
            connectedField.outValue = connectedField.calculateOutValue(this.getOutValue());
            if (connectedField.type !== ValueTypes.function) {
                connectedField.value = connectedField.outValue;
            }
            connectedField.propagateValue();
        }
        for (const connection of deleteQueue) {
            this.connections.splice(this.connections.indexOf(connection), 1);
        }
    }

    getOutValue() {
        return this.calculateOutValue(this.value);
    }

    calculateOutValue(value) {
        if (this.type === ValueTypes.function) {
            const x = value;
            try {
                return eval(this.value);
            } catch (e) {
                console.error(e);
                return value;
            }
        } else {
            return value;
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