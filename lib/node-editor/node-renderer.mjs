import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

export class NodeDomRenderer {
    constructor(editor) {
        this.editor = editor;
        this.editor.setRenderer(() => {
            this.#renderFrame();
        });
        this.container = null;
    }

    start(container) {
        this.container = container;
        this.#renderFrame();
    }

    #renderFrame() {
        if (this.container) {
            this.container.innerHTML = '';
            const editorSize = {
                width: this.container.clientWidth,
                height: this.container.clientHeight
            };
            window.onresize = () => {
                this.#renderFrame();
            }
            this.container.appendChild(this.#renderEditor(editorSize));
            this.container.appendChild(this.#renderConnections());
        }
    }
    
    #renderEditor(editorSize) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});
        const editorX = new FjsObservable(this.editor.position.value.x + "px");
        const editorY = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            editorX.value = position.x + "px";
            editorY.value = position.y + "px";
        }

        return FJS.create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                this.editor.moveOffset(e);
            })
            .ondblclick(() => {
                this.editor.resetPosition();
            })
            .oncontextmenu((e) => {
                this.editor.openContextMenu(e, menuClassState, menuPositionState, this.#renderFrame.bind(this));
            })
            .children(
                FJS.create("div")
                    .classes("node-editor-nodes")
                    .id("node-editor-nodes")
                    .styles("margin-left", editorX, "margin-top", editorY)
                    .children(...this.editor.nodes.map(node => this.#renderNode(node, editorSize)))
                    .build(),
                this.#renderEditorMenu(menuPositionState, menuClassState, editorSize, this.#renderFrame.bind(this))
            ).build();
    }

    #renderEditorMenu(positionState, classState, editorSize) {
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
                        this.editor.addNodeFromMenu(positionState, editorSize);
                    })
                    .build(),
            ).build();
    }

    #renderConnections() {
        const xState = new FjsObservable(this.editor.position.value.x + "px");
        const yState = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return FJS.create("div")
            .classes("node-editor-connections")
            .id("node-editor-connections")
            .styles("left", xState, "top", yState)
            .children(...this.editor.nodes.map(node => this.#renderNodeConnections(node)))
            .build();
    }

    #renderNodeConnections(node) {
        return FJS.create("div")
            .classes("node-connections")
            .id(`${node.id}-connections`)
            .children(...node.connections.map(connection => this.#renderConnection(connection)))
            .build();
    }

    #renderNode(node, editorSize) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});

        return FJS.create("div")
            .classes("node")
            .id(node.id)
            .styles("left", `${node.getPosX(editorSize.width, node.position.x)}px`, "top", `${node.getPosY(editorSize.height, node.position.y)}px`)
            .onmousedown(e => {
                node.moveWithMouse(node.id, this.editor.settings.gridSnapping, e);
            })
            .ondblclick(e => {
                node.startConnecting(e);
            })
            .oncontextmenu((e) => {
                node.openContextMenu(e, menuClassState, menuPositionState, editorSize, this.#renderFrame.bind(this));
            })
            .children(
                this.#renderNodeHeader(node),
                FJS.create("div")
                    .classes("node-fields")
                    .children(
                        ...Object.keys(node.values).map(fieldName => {
                            const field = node.type.fields.find(field => field.name === fieldName);
                            return this.#renderNodeField(field, node.get(fieldName), newValue => {
                                node.set(fieldName, newValue);
                            });
                        })
                    ).build(),
                this.#renderNodeMenu(node, menuPositionState, menuClassState)
            ).build();
    }

    #renderNodeMenu(node, positionState, classState) {
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
                        window.nodeEditor.removeNodeById(node.id);
                    })
                    .build(),
                FJS.create("div")
                    .classes("node-editor-menu-item")
                    .text("Connect")
                    .onclick(e => {
                        node.startConnecting(e);
                    })
                    .build(),
            ).build();
    }

    #renderNodeHeader(node) {
        return FJS.create("div")
            .classes("node-header")
            .children(
                FJS.create("span")
                    .classes("node-title")
                    .text(node.name)
                    .build(),
                FJS.create("select")
                    .classes("node-type-select")
                    .onchange(e => {
                        const type = window.nodeEditor.nodeTypes.find(type => type.name === e.target.value);
                        node.setType(type);
                        this.#renderFrame();
                    })
                    .children(...window.nodeEditor.nodeTypes.map(type => {
                        return FJS.create("option")
                            .value(type.name)
                            .text(type.name)
                            .selected(type.name === node.name)
                            .build();
                    })).build()
            ).build();
    }

    #renderConnection(connection) {
        const {fromX, fromY, length, angle} = connection.getConnectionTransform();
        const arrow = FJS.create("div")
            .classes("node-connection-arrow")
            .build();
        const newNode = FJS.create("div")
            .classes("node-connection")
            .id(connection.id)
            .styles("width", `${length}px`, "transform", `rotate(${angle}deg)`)
            .styles("left", `${fromX}px`, "top", `${fromY}px`)
            .children(arrow)
            .build();

        if (!document.getElementById(connection.id)) {
            return newNode;
        } else {
            document.getElementById(connection.id).replaceWith(newNode);
            return null;
        }
    }

    #renderNodeField(field, value, onChange) {
        const errorState = new FjsObservable('');
        const hiddenClassState = new FjsObservable(field.shownState.value ? '_' : 'hidden');
        field.shownState.onUpdate = shown => {
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
                    .text(field.name)
                    .build(),
                FJS.create("div")
                    .classes("node-field-value")
                    .children(
                        FJS.create("input")
                            .classes("node-field-input")
                            .id(field.id)
                            .type(field.type.toLowerCase())
                            .value(value)
                            .onchange(e => {
                                const input = document.getElementById(field.id);
                                if (!input.checkValidity()) {
                                    errorState.value = input.validationMessage;
                                } else {
                                    errorState.value = '';
                                    onChange(field.getValue(input.value));
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