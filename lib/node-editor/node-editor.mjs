import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

const knownValueTypes = ["String", "Number", "Boolean", "Object", "Array"];

export class NodeEditor {
    static create(types = [], nodes = []) {
        return new NodeEditor(types, nodes);
    }

    constructor(types = [], nodes = []) {
        this.nodeTypes = types;
        this.nodes = nodes;
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

    render(editorSize) {
        return FJS.create("div")
            .classes("node-editor")
            .onmousedown(e => {
                //this.moveOffset(e);
            })
            .children(...this.nodes.map(node => node.render(editorSize)))
            .build();
    }

    static fromJSON(parse) {
        const types = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = knownValueTypes.find(type => type.name === field.type.name);
            return new NodeField(field.name, fieldType, field.default, field.required, field.shown);
        })));
        const nodes = parse.nodes.map(node => {
            const type = types.find(type => type.name === node.type.name);
            return new EditorNode(type, node.values, node.id, node.position);
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

export class EditorNode {
    /**
     *
     * @param type {NodeType}
     * @param values {Object} key-value pairs of field names and values
     * @param id {string | null}
     * @param position {{x: number, y: number}}
     */
    constructor(type, values = {}, id = null, position = {x: 0, y: 0}) {
        this.type = type;
        this.values = values;
        for (const field of this.fields) {
            if (!this.values[field.name]) {
                this.values[field.name] = field.default;
            }
        }
        this.id = id ?? Math.random().toString(36).substring(7);
        this.position = position;
    }

    get name() {
        return this.type.name;
    }

    /**
     *
     * @returns {NodeField[]}
     */
    get fields() {
        return this.type.fields;
    }

    set(name, value) {
        this.values[name] = value;
    }

    get(name) {
        return this.values[name];
    }

    updatePosition(position) {
        this.position = position;
    }

    #getPosX(editorWidth, x) {
        return editorWidth / 2 + x;
    }

    #getPosY(editorHeight, y) {
        return editorHeight / 2 + y;
    }

    render(editorSize) {
        return FJS.create("div")
            .classes("node")
            .id(this.id)
            .styles("left", `${this.#getPosX(editorSize.width, this.position.x)}px`, "top", `${this.#getPosY(editorSize.height, this.position.y)}px`)
            .onmousedown(e => {
                this.moveWithMouse(this.id, e);
            })
            .children(
                FJS.create("span")
                    .classes("node-title")
                    .text(this.name)
                    .build(),
                FJS.create("div")
                    .classes("node-fields")
                    .children(
                        ...Object.keys(this.values).map(fieldName => {
                            const field = this.fields.find(field => field.name === fieldName);
                            if (!field.shown) {
                                return null;
                            }
                            const value = this.values[fieldName];
                            return field.render(value, newValue => {
                                this.set(fieldName, newValue);
                            });
                        })
                    ).build()
            ).build();
    }

    moveWithMouse(id, e) {
        const mousex = e.clientX;
        const mousey = e.clientY;
        const node = document.getElementById(id);
        const nodeX = node.offsetLeft;
        const nodeY = node.offsetTop;
        const diffX = mousex - nodeX;
        const diffY = mousey - nodeY;
        const move = e => {
            node.style.left = `${e.clientX - diffX}px`;
            node.style.top = `${e.clientY - diffY}px`;
            this.position = {
                x: e.clientX - diffX - window.innerWidth / 2,
                y: e.clientY - diffY - window.innerHeight / 2
            }
        };
        const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }
}

export class NodeField {
    constructor(name, type, defaultValue, required = false, shown = true) {
        this.name = name;
        if (!knownValueTypes.includes(type)) {
            throw new Error(`Unknown type ${type.name} for node field ${name}`);
        }
        this.type = type;
        this.required = required;
        this.shown = shown;
        this.default = defaultValue;
    }

    hide() {
        this.shown = false;
    }

    show() {
        this.shown = true;
    }

    validate(value) {
        if (value.constructor.toString() !== this.type) {
            return new Error(`Expected ${this.type.name} but got ${value.constructor.name}`);
        }

        if (this.required && this.type === String && value.length === 0) {
            return new Error(`Expected non-empty string`);
        }

        if (this.required && this.type === Number && isNaN(value)) {
            return new Error(`Expected number`);
        }

        if (this.required && this.type === Boolean && typeof value !== 'boolean') {
            return new Error(`${this.name} is required`);
        }

        return true;
    }

    render(value, onChange) {
        const errorState = new FjsObservable('');

        return FJS.create("div")
            .classes("node-field")
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
