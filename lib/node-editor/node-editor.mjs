import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

export class ValueTypes {
    static string = "String";
    static number = "Number";
    static boolean = "Boolean";
    static object = "Object";
    static array = "Array";
}

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

export class EditorNode {
    /**
     *
     * @param type {NodeType}
     * @param values {Object} key-value pairs of field names and values
     * @param id {string | null}
     * @param position {{x: number, y: number}}
     * @param connections {NodeConnection[]}
     */
    constructor(type, position = {x: 0, y: 0}, values = {}, id = null, connections = []) {
        this.type = type;
        this.values = values;
        for (const field of this.fields) {
            if (!this.values[field.name]) {
                this.values[field.name] = field.default;
            }
        }
        this.id = id ?? Math.random().toString(36).substring(7);
        this.position = position;
        this.connections = connections;
    }

    setType(type) {
        this.type = type;
        const previousValues = this.values;
        this.values = {};
        for (const field of this.fields) {
            if (previousValues[field.name]) {
                this.values[field.name] = previousValues[field.name];
            } else {
                this.values[field.name] = field.default;
            }
        }
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

    connect(id) {
        this.connections.push(new NodeConnection(this.id, id));
    }

    addConnection(connection) {
        this.connections.push(connection);
    }

    removeConnection(connection) {
        this.connections = this.connections.filter(c => c !== connection);
    }

    removeConnectionById(id) {
        this.connections = this.connections.filter(c => c.id !== id);
    }

    #getPosX(editorWidth, x) {
        return editorWidth / 2 + x;
    }

    #getPosY(editorHeight, y) {
        return editorHeight / 2 + y;
    }

    render(editorSize, rerenderCallback) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});

        return FJS.create("div")
            .classes("node")
            .id(this.id)
            .styles("left", `${this.#getPosX(editorSize.width, this.position.x)}px`, "top", `${this.#getPosY(editorSize.height, this.position.y)}px`)
            .onmousedown(e => {
                this.moveWithMouse(this.id, e);
            })
            .oncontextmenu((e) => {
                if (e.target.nodeName === "INPUT") {
                    return;
                }
                e.preventDefault();
                menuClassState.value = menuClassState.value === 'hidden' ? '_' : 'hidden';
                const nodeSize = {
                    width: e.target.clientWidth,
                    height: e.target.clientHeight
                };
                menuPositionState.value = {
                    x: e.clientX - this.#getPosX(editorSize.width, this.position.x) + nodeSize.width / 2,
                    y: e.clientY - this.#getPosY(editorSize.height, this.position.y) + nodeSize.height / 2
                };
                document.addEventListener("click", () => {
                    menuClassState.value = 'hidden';
                    rerenderCallback();
                }, {once: true});
            })
            .children(
                FJS.create("div")
                    .classes("node-header")
                    .children(
                        FJS.create("span")
                            .classes("node-title")
                            .text(this.name)
                            .build(),
                        FJS.create("select")
                            .classes("node-type-select")
                            .onchange(e => {
                                const type = window.nodeEditor.nodeTypes.find(type => type.name === e.target.value);
                                this.setType(type);
                                rerenderCallback();
                            })
                            .children(...window.nodeEditor.nodeTypes.map(type => {
                                return FJS.create("option")
                                    .value(type.name)
                                    .text(type.name)
                                    .selected(type.name === this.name)
                                    .build();
                                }
                            ))
                    ).build(),
                FJS.create("div")
                    .classes("node-fields")
                    .children(
                        ...Object.keys(this.values).map(fieldName => {
                            const field = this.fields.find(field => field.name === fieldName);
                            return field.render(this.values[fieldName], newValue => {
                                this.set(fieldName, newValue);
                            });
                        })
                    ).build(),
                this.renderMenu(menuPositionState, menuClassState)
            ).build();
    }

    renderMenu(positionState, classState) {
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
                    .text("Remove node")
                    .onclick(() => {
                        window.nodeEditor.removeNodeById(this.id);
                    })
                    .build(),
            ).build();
    }

    renderConnections() {
        return FJS.create("div")
            .classes("node-connections")
            .id(`${this.id}-connections`)
            .children(...this.connections.map(connection => connection.render()))
            .build();
    }

    moveWithMouse(id, e) {
        if (e.target.nodeName === "INPUT") {
            return;
        }
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
            this.renderConnections(document.getElementById(`${this.id}-connections`));
            for (const nodes of window.nodeEditor.nodes) {
                if (nodes.id === this.id) {
                    continue;
                }
                nodes.renderConnections(document.getElementById(`${nodes.id}-connections`));
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

export class NodeConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.id = Math.random().toString(36).substring(7);
    }

    render() {
        const from = document.getElementById(this.from);
        const to = document.getElementById(this.to);
        const fromX = from.offsetLeft;
        const fromY = from.offsetTop;
        const toX = to.offsetLeft;
        const toY = to.offsetTop;
        const diffX = toX - fromX;
        const diffY = toY - fromY;
        const length = Math.sqrt(diffX * diffX + diffY * diffY);
        const angle = Math.atan2(diffY, diffX) * 180 / Math.PI;
        const arrow = FJS.create("div")
            .classes("node-connection-arrow")
            .build();
        const newNode = FJS.create("div")
            .classes("node-connection")
            .id(this.id)
            .styles("width", `${length}px`, "transform", `rotate(${angle}deg)`)
            .styles("left", `${fromX}px`, "top", `${fromY}px`)
            .children(
                arrow
            )
            .build();

        if (!document.getElementById(this.id)) {
            return newNode;
        } else {
            document.getElementById(this.id).replaceWith(newNode);
            return null;
        }
    }
}
