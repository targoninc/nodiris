import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

import {NodeConnection} from "./node-connection.mjs";

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
                            })).build()
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