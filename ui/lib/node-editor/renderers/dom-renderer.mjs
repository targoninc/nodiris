import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";
import {Icon} from "../icons/icon.mjs";
import {InputField} from "../input-field.mjs";
import {ValueTypes} from "../value-types.mjs";
import {Keymap} from "../keymap.mjs";

export class NodeEditorDomRenderer {
    constructor(editor) {
        this.editor = editor;
        this.editor.setRenderer(() => {
            this.#renderFrame();
        });
        this.container = null;
        this.panelCollapsedState = new FjsObservable(false);
        this.gridState = new FjsObservable(false);
    }

    start(container) {
        this.container = container;
        this.registerKeyBindings();
        this.#renderFrame();
    }

    registerKeyBindings() {
        for (const key of Object.keys(Keymap)) {
            document.addEventListener("keydown", e => {
                if (e.target.tagName === "INPUT") {
                    return;
                }
                const keys = Keymap[key].keys;
                if (keys.includes(e.key)) {
                    e.preventDefault();
                    Keymap[key].action();
                    this.#renderFrame();
                }

                if (e.ctrlKey) {
                    this.showGrid();
                }
            });
        }
    }

    showGrid() {
        this.gridState.value = !this.gridState.value;
        if (this.gridState.value) {
            this.#updateCssVariable('--node-editor-grid', '1px solid var(--node-border)');
        } else {
            this.#updateCssVariable('--node-editor-grid', 'none');
        }
    }

    #renderFrame(force = false) {
        if (this.container && (!window.focusLock || force)) {
            if (window.focusLock && force) {
                window.focusLock = false;
            }
            this.container.innerHTML = '';
            const editorSize = {
                width: this.container.clientWidth,
                height: this.container.clientHeight
            };
            window.onresize = () => {
                this.#renderFrame();
            }
            const zoom = this.editor.zoomState.value;
            if (zoom < 1) {
                this.#updateCssVariable('--node-editor-zoom', zoom);
            } else {
                this.#updateCssVariable('--node-editor-zoom', 1);
            }
            this.container.appendChild(this.#renderEditor(editorSize, this.panelCollapsedState));
            this.container.appendChild(this.#renderConnections());
        }
    }

    #updateCssVariable(name, value) {
        document.documentElement.style.setProperty(name, value);
    }
    
    #renderEditor(editorSize, collapsedState) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});
        const editorX = new FjsObservable(this.editor.position.value.x + "px");
        const editorY = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            editorX.value = position.x + "px";
            editorY.value = position.y + "px";
        }
        this.editor.propagateValues();

        return FJS.create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                this.editor.moveOffset(e);
            })
            .onwheel(e => {
                this.editor.zoom(e);
            })
            .ondblclick(() => {
                this.editor.resetView();
            })
            .oncontextmenu((e) => {
                this.editor.openContextMenu(e, menuClassState, menuPositionState, this.#renderFrame.bind(this));
            })
            .children(
                FJS.create("div")
                    .classes("node-editor-grid")
                    .id("node-editor-grid")
                    .children(
                        this.#generateGrid()
                    ).build(),
                FJS.create("div")
                    .classes("node-editor-nodes")
                    .id("node-editor-nodes")
                    .styles("margin-left", editorX, "margin-top", editorY)
                    .children(...this.editor.nodes.map(node => this.#renderNode(node, editorSize)))
                    .build(),
                this.#renderEditorGlobals(collapsedState),
                this.#renderEditorMenu(menuPositionState, menuClassState, editorSize),
            ).build();
    }

    #generateGrid() {
        const grid = [];
        for (let i = 0; i < 100; i++) {
            grid.push(FJS.create("div").classes("grid-line", "vertical").styles("left", `${i * 100}px`).build());
            grid.push(FJS.create("div").classes("grid-line", "horizontal").styles("top", `${i * 100}px`).build());
        }
        return grid;
    }

    #renderEditorGlobals(collapsedState) {
        const collapseTextState = new FjsObservable(collapsedState.value ? "Pin Panel" : "Unpin panel");
        const collapseIconState = new FjsObservable(collapsedState.value ? "transition_slide" : "transition_fade");
        const collapsedClassState = new FjsObservable(collapsedState.value ? 'collapsed' : 'expanded');
        collapsedState.onUpdate = collapsed => {
            if (collapsed) {
                collapseTextState.value = "Pin panel";
                collapseIconState.value = "transition_slide";
                collapsedClassState.value = 'collapsed';
            } else {
                collapseTextState.value = "Unpin panel";
                collapseIconState.value = "transition_fade";
                collapsedClassState.value = 'expanded';
            }
        }

        return FJS.create("div")
            .classes("node-editor-globals", "flex-v", collapsedClassState)
            .children(
                FJS.create("div")
                    .classes("flex")
                    .children(
                        this.#renderButton("Add global section", () => {
                            this.#renderInputPopup("Global name", "", name => {
                                this.editor.addGlobalSection(name);
                                this.#renderFrame(true);
                            });
                        }, "add"),
                        this.#renderButton(collapseTextState, () => {
                            collapsedState.value = !collapsedState.value;
                        }, collapseIconState),
                    ).build(),
                ...this.editor.globals.map(global => this.#renderEditorGlobalSection(global))
            ).build();
    }

    #renderMaterialIcon(icon) {
        return FJS.create("span")
            .classes("material-symbols-outlined")
            .text(icon)
            .build();
    }

    #renderPopupContainer(children) {
        return FJS.create("div")
            .classes("popup-container")
            .children(...children)
            .build();
    }

    #removePopupContainer() {
        document.querySelector(".popup-container")?.remove();
    }

    #renderInputPopup(title, value, onSave) {
        const popup = FJS.create("div")
            .classes("input-popup", "flex-v")
            .children(
                FJS.create("div")
                    .classes("input-popup-title")
                    .text(title)
                    .build(),
                FJS.create("input")
                    .classes("input-popup-input")
                    .value(value)
                    .id("focus-input")
                    .build(),
                this.#renderPopupButtons(() => {
                    onSave(popup.querySelector(".input-popup-input").value);
                })
            ).build();
        const container = this.#renderPopupContainer([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
        const input = document.getElementById("focus-input");
        input.focus();
        input.onkeydown = e => {
            if (e.key === "Enter") {
                onSave(popup.querySelector(".input-popup-input").value);
            }
        }
    }

    #renderDropdownPopup(title, options, onSave) {
        const popup = FJS.create("div")
            .classes("input-popup", "flex-v")
            .children(
                FJS.create("div")
                    .classes("input-popup-title")
                    .text(title)
                    .build(),
                FJS.create("select")
                    .classes("input-popup-input")
                    .children(...options.map(option => {
                        return FJS.create("option")
                            .value(option)
                            .text(option)
                            .build();
                    }))
                    .build(),
                this.#renderPopupButtons(() => {
                    onSave(popup.querySelector(".input-popup-input").value);
                })
            ).build();
        const container = this.#renderPopupContainer([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
    }

    #renderPopupButtons(onSave = () => {}, onCancel = () => {}) {
        return FJS.create("div")
            .classes("flex", "spaced")
            .children(
                this.#renderButton("Cancel", () => {
                    onCancel();
                    this.#removePopupContainer();
                }, "cancel"),
                this.#renderButton("Save", () => {
                    onSave();
                    this.#removePopupContainer();
                }, "save"),
            ).build();
    }

    /**
     *
     * @param global {GlobalSection}
     */
    #renderEditorGlobalSection(global) {
        return FJS.create("div")
            .classes("node-editor-global-section")
            .children(
                FJS.create("span")
                    .classes("global-section-title")
                    .text(global.name)
                    .build(),
                this.#renderGlobalsSettings(global),
                FJS.create("div")
                    .classes("global-section-fields")
                    .children(
                        ...global.fields.map(field => this.#renderInputField(field, global.get(field.name), newValue => {
                            global.set(field.name, newValue);
                            this.#renderFrame();
                        }))
                    ).build()
            ).build();
    }

    #renderButton(text, onclick, icon = null) {
        return FJS.create("button")
            .classes("node-editor-button")
            .onclick(onclick)
            .onfocus(() => {
                window.focusLock = true;
            })
            .onblur(() => {
                window.focusLock = false;
            })
            .children(
                icon ? this.#renderMaterialIcon(icon) : null,
                FJS.create("span")
                    .classes("node-editor-button-text")
                    .text(text)
                    .build()
            ).build();
    }

    #renderSelect(options, onchange) {
        return FJS.create("select")
            .classes("node-editor-select")
            .onmouseover(() => {
                window.focusLock = true;
            })
            .onmouseout(() => {
                window.focusLock = false;
            })
            .onfocus(() => {
                window.focusLock = true;
            })
            .onblur(() => {
                window.focusLock = false;
            })
            .children(...options.map(option => {
                return FJS.create("option")
                    .value(option.value)
                    .text(option.text)
                    .selected(option.selected)
                    .build();
            }))
            .onchange(onchange)
            .build();
    }

    #renderGlobalsSettings(global) {
        return FJS.create("div")
            .classes("global-section-settings", "flex")
            .children(
                this.#renderButton("Add field", () => {
                    this.#renderInputPopup("Field name", "", name => {
                        this.#renderDropdownPopup("Field value", Object.values(ValueTypes), type => {
                            const field = new InputField(name, type, null);
                            global.addField(field);
                            this.#renderFrame(true);
                            document.getElementById(field.id).focus();
                        });
                    });
                }, "add"),
                this.#renderButton("Remove section", () => {
                    this.editor.removeGlobalSection(global.name);
                    this.#renderFrame();
                }, "delete"),
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
            .classes("menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                this.#renderMenuItem("Add node", () => {
                    this.editor.addNodeFromMenu(positionState, editorSize);
                }, "addNode"),
            ).build();
    }

    #renderConnections() {
        const xState = new FjsObservable(this.editor.position.value.x + "px");
        const yState = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        let fieldConnections = FJS.create("div").build();
        if (this.editor.settings.showFieldConnections) {
            fieldConnections = FJS.create("div")
                .classes("node-global-connections")
                .id("node-global-connections")
                .styles("left", xState, "top", yState)
                .children(...this.editor.globals.map(global => this.#renderGlobalConnections(global)))
                .children(...this.editor.nodes.map(node => {
                    return FJS.create("div")
                        .classes("node-node-connections")
                        .children(
                            ...node.fields.map(field => {
                                if (this.editor.settings.connectionFilter && !this.editor.settings.connectionFilter.includes(field.name)) {
                                    return null;
                                }

                                return FJS.create("div")
                                    .classes("node-connection")
                                    .id(`${node.id}-${field.id}-connection`)
                                    .children(...field.connections.map(connection => this.#renderConnection(connection, "global-node")))
                                    .build();
                            })
                        ).build();
                }))
                .build()
        }

        return FJS.create("div")
            .children(
                FJS.create("div")
                    .classes("node-editor-connections")
                    .id("node-editor-connections")
                    .styles("left", xState, "top", yState)
                    .children(...this.editor.nodes.map(node => this.#renderNodeConnections(node)))
                    .build(),
                fieldConnections
            ).build();
    }

    #renderNodeConnections(node) {
        return FJS.create("div")
            .classes("node-connections")
            .id(`${node.id}-connections`)
            .children(...node.connections.map(connection => this.#renderConnection(connection, "node")))
            .build();
    }

    #renderGlobalConnections(global) {
        return FJS.create("div")
            .classes("global-connections")
            .children(...global.fields.map(field => {
                return FJS.create("div")
                    .classes("global-connection")
                    .id(`${global.name}-${field.id}-connection`)
                    .children(...field.connections.map(connection => this.#renderConnection(connection, "global")))
                    .build();
            })).build();
    }

    #renderNode(node, editorSize) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});
        const nodeX = new FjsObservable(`${node.getPosX(editorSize.width, this.editor.zoomState.value, node.position.x)}px`);
        const nodeY = new FjsObservable(`${node.getPosY(editorSize.height, this.editor.zoomState.value, node.position.y)}px`);
        node.positionState.onUpdate = position => {
            nodeX.value = node.getPosX(editorSize.width, this.editor.zoomState.value, position.x) + "px";
            nodeY.value = node.getPosY(editorSize.height, this.editor.zoomState.value, position.y) + "px";
        };

        if (this.editor.zoomState.value < .5) {
            return FJS.create("div")
                .classes("node")
                .id(node.id)
                .styles("left", nodeX, "top", nodeY)
                .onmousedown(e => {
                    node.moveWithMouse(node.id, this.editor.settings.gridSnapping, this.editor.zoomState, e);
                })
                .ondblclick(e => {
                    node.startConnecting(e);
                })
                .oncontextmenu((e) => {
                    node.openContextMenu(e, menuClassState, menuPositionState, this.editor.zoomState.value, editorSize, this.#renderFrame.bind(this));
                })
                .children(
                    this.#renderNodeHeader(node),
                    this.#renderNodeMenu(node, menuPositionState, menuClassState)
                ).build();
        }

        return FJS.create("div")
            .classes("node")
            .id(node.id)
            .styles("left", nodeX, "top", nodeY)
            .onmousedown(e => {
                node.moveWithMouse(node.id, this.editor.settings.gridSnapping, this.editor.zoomState, e);
            })
            .ondblclick(e => {
                node.startConnecting(e);
            })
            .oncontextmenu((e) => {
                node.openContextMenu(e, menuClassState, menuPositionState, this.editor.zoomState.value, editorSize, this.#renderFrame.bind(this));
            })
            .children(
                this.#renderNodeHeader(node),
                FJS.create("div")
                    .classes("node-fields", "flex-v")
                    .children(
                        ...node.fields.map(field => {
                            return this.#renderInputField(field, field.value, newValue => {
                                node.set(field.name, newValue);
                                this.#renderFrame();
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
            .classes("menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                this.#renderMenuItem("Remove node", () => {
                    window.nodeEditor.removeNodeById(node.id);
                }, "delete"),
                this.#renderMenuItem("Connect", e => {
                    node.startConnecting(e);
                    classState.value = 'hidden';
                }, "link"),
            ).build();
    }

    #renderMenuItem(text, onclick, icon = "add") {
        return FJS.create("div")
            .classes("menu-item")
            .onclick(onclick)
            .children(
                Icon.asImage(icon).build(),
                FJS.create("span")
                    .classes("node-editor-menu-item-text")
                    .text(text)
                    .build()
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
                this.#renderSelect(window.nodeEditor.nodeTypes.map(t => {
                    return {
                        value: t.name,
                        text: t.name,
                        selected: t.name === node.name
                    };
                }), e => {
                    const type = window.nodeEditor.nodeTypes.find(type => type.name === e.target.value);
                    node.setType(type);
                    this.#renderFrame();
                }),
            ).build();
    }

    #renderConnection(connection, type) {
        const {fromX, fromY, length, angle} = connection.getConnectionTransform(type, this.editor.position.value);
        const arrow = FJS.create("div")
            .classes("node-connection-arrow")
            .build();
        const newNode = FJS.create("div")
            .classes("node-connection", "connection-" + type)
            .id(connection.id)
            .attributes("data-from", connection.from, "data-to", connection.to)
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

    /**
     *
     * @param field {InputField}
     * @param value {*}
     * @param onChange {function}
     * @param errorState {FjsObservable}
     * @returns {*}
     */
    #renderInput(field, value, onChange, errorState = new FjsObservable("")) {
        let type = field.type;
        if (type === ValueTypes.boolean) {
            type = 'checkbox';
        } else if (type === ValueTypes.number || type === ValueTypes.string || type === ValueTypes.function) {
            type = 'text';
        }

        const actualValue = this.editor.getValue(field.id);
        const base = FJS.create("input")
            .classes("node-field-input")
            .type(type.toLowerCase())
            .value(value)
            .id(field.id)
            .name(field.id)
            .title(actualValue)
            .onfocus(() => {
                window.focusLock = true;
            })
            .onblur(() => {
                window.focusLock = false;
            })
            .ondblclick(e => {
                field.startConnecting(e);
            })
            .onkeydown(e => {
                if (this.editor.fieldIsReadonly(field.id)) {
                    e.target.value = field.value;
                    this.editor.rerender();
                }
            })
            .onchange(() => {
                if (this.editor.fieldIsReadonly(field.id)) {
                    return;
                }
                const input = document.getElementById(field.id);
                if (!input.checkValidity() && (!input.value.startsWith("{{") && !input.value.endsWith("}}"))) {
                    errorState.value = input.validationMessage;
                } else {
                    errorState.value = '';
                    onChange(field.getValue(input.value));
                }
            });

        if (this.editor.fieldIsReadonly(field.id)) {
            base.classes("disabled");
        }

        return base.build();
    }

    #renderInputField(field, value, onChange) {
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
                    .for(field.id)
                    .text(field.name)
                    .build(),
                FJS.create("div")
                    .classes("node-field-value")
                    .children(
                        this.#renderInput(field, value, onChange, errorState),
                        FJS.create("span")
                            .classes("node-field-error")
                            .text(errorState)
                            .build()
                    ).build()
            ).build();
    }
}