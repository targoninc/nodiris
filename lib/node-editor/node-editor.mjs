import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";
import {ValueTypes} from "./value-types.mjs";
import {EditorNode} from "./editor-node.mjs";

export class NodeEditor {
    static create(types = [], nodes = []) {
        return new NodeEditor(types, nodes);
    }

    constructor(types = [], nodes = []) {
        this.nodeTypes = types;
        this.nodes = nodes;
        window.nodeEditor = this;
    }

    addNodeType(type) {
        this.nodeTypes.push(type);
    }

    updateNodeType(type) {
        this.nodeTypes = this.nodeTypes.map(t => t.name === type.name ? type : t);
    }

    removeNodeTypeByName(name) {
        this.nodeTypes = this.nodeTypes.filter(type => type.name !== name);
        this.removeNodesByType(name);
    }

    getNodesByType(type) {
        return this.nodes.filter(node => node.type === type);
    }

    /**
     *
     * @param node {EditorNode}
     */
    addNode(node) {
        this.nodes.push(node);
    }

    /**
     *
     * @param name {string}
     */
    removeNodeByName(name) {
        this.nodes = this.nodes.filter(node => node.name !== name);
    }

    /**
     *
     * @param id {string}
     */
    removeNodeById(id) {
        this.nodes = this.nodes.filter(node => node.id !== id);
    }

    /**
     *
     * @param type {string}
     */
    removeNodesByType(type) {
        this.nodes = this.nodes.filter(node => node.type.name !== type);
    }

    render(editorSize, rerenderCallback) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});

        return FJS.create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                //this.moveOffset(e);
            })
            .oncontextmenu((e) => {
                if (e.target.id !== "node-editor") {
                    return;
                }
                e.preventDefault();
                menuClassState.value = menuClassState.value === 'hidden' ? '_' : 'hidden';
                menuPositionState.value = {x: e.clientX, y: e.clientY};
                document.addEventListener("click", () => {
                    menuClassState.value = 'hidden';
                    rerenderCallback();
                }, {once: true});
            })
            .children(
                FJS.create("div")
                    .classes("node-editor-nodes")
                    .children(...this.nodes.map(node => node.render(editorSize, rerenderCallback)))
                    .build(),
                this.renderMenu(menuPositionState, menuClassState, editorSize, rerenderCallback)
            )
            .build();
    }

    renderMenu(positionState, classState, editorSize) {
        const xState = new FjsObservable(positionState.value.x + "px");
        const yState = new FjsObservable(positionState.value.y + "px");
        positionState.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return FJS.create("div")
            .classes("node-editor-menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                FJS.create("div")
                    .classes("node-editor-menu-item")
                    .text("Add node")
                    .onclick(() => {
                        const position = {
                            x: positionState.value.x - editorSize.width / 2,
                            y: positionState.value.y - editorSize.height / 2
                        };
                        this.addNode(new EditorNode(this.nodeTypes[0], position));
                    })
                    .build(),
            ).build();
    }

    renderConnections() {
        return FJS.create("div")
            .classes("node-editor-connections")
            .id("node-editor-connections")
            .children(...this.nodes.map(node => node.renderConnections()))
            .build();
    }

    static fromJSON(parse) {
        const types = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
            return new NodeField(field.name, fieldType, field.default, field.required, field.shown);
        })));
        const nodes = parse.nodes.map(node => {
            const type = types.find(type => type.name === node.type.name);
            return new EditorNode(type, node.position, node.values, node.id);
        });
        return new NodeEditor(types, nodes);
    }
}

export class NodeType {
    constructor(name, fields = []) {
        this.name = name;
        this.fields = fields;
    }

    addField(field) {
        this.fields.push(field);
    }

    updateField(field) {
        this.fields = this.fields.map(f => f.name === field.name ? field : f);
    }

    removeFieldByName(name) {
        this.fields = this.fields.filter(field => field.name !== name);
    }
}

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

