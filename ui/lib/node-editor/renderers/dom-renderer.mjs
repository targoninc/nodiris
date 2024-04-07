import {create, FjsObservable, ifjs, signal} from "https://fjs.targoninc.com/f.js";
import {Icon} from "../icons/icon.mjs";
import {InputField} from "../input-field.mjs";
import {ValueTypes} from "../value-types.mjs";
import {Keymap} from "../keymap.mjs";
import {Auth} from "../auth/auth.mjs";
import {Api} from "../auth/api.mjs";

export class NodeEditorDomRenderer {
    constructor(editor) {
        this.editor = editor;
        this.editor.setRenderer(() => {
            this.#renderFrame();
        });
        this.container = null;
        this.panelCollapsedState = signal(false);
        this.lastNodeClick = null;
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
            });
        }
    }

    #renderFrame(force = false) {
        if (this.container && (!window.focusLock || force)) {
            if (window.focusLock && force) {
                window.focusLock = false;
            }
            if (this.editor.settings.showGrid) {
                this.#updateCssVariable('--node-editor-grid', '1px solid var(--node-border)');
            } else {
                this.#updateCssVariable('--node-editor-grid', 'none');
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
        const menuClassState = signal('hidden');
        const menuPositionState = signal({x: 0, y: 0});
        const editorX = signal(this.editor.position.value.x + "px");
        const editorY = signal(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            editorX.value = position.x + "px";
            editorY.value = position.y + "px";
        }
        this.editor.propagateValues();

        return create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                if (e.button === 1) {
                    this.editor.moveOffset(e);
                } else if (e.button === 0) {
                    this.editor.startSelecting(e);
                }
            })
            .onclick((e) => {
                if (e.target.id === "node-editor" || e.target.id === "node-editor-nodes") {
                    this.editor.unselectAllExcept();
                    this.editor.rerender();
                }
            })
            .onwheel(e => {
                this.editor.zoom(e);
            })
            .ondblclick(() => {
                this.editor.resetView();
            })
            .oncontextmenu((e) => {
                window.focusLock = true;
                this.editor.openContextMenu(e, menuClassState, menuPositionState, this.#renderFrame.bind(this, true));
            })
            .children(
                create("div")
                    .classes("node-editor-grid")
                    .id("node-editor-grid")
                    .children(
                        this.#generateGrid(this.editor.position.value.x, this.editor.position.value.y)
                    ).build(),
                create("div")
                    .classes("node-editor-nodes")
                    .id("node-editor-nodes")
                    .styles("margin-left", editorX, "margin-top", editorY)
                    .children(...this.editor.nodes.map(node => this.#renderNode(node, editorSize)))
                    .build(),
                this.#renderEditorGlobals(collapsedState),
                this.#renderEditorMenu(menuPositionState, menuClassState, editorSize),
            ).build();
    }

    #generateGrid(xOff, yOff) {
        const grid = [];
        const zoom = this.editor.zoomState.value;
        const resolution = 100 * zoom;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const xMod = xOff % resolution;
        const yMod = yOff % resolution;
        let x, y, i = 0;
        do {
            x = i * resolution + xMod + width / 2;
            y = i * resolution + yMod + height / 2;
            grid.push(create("div").classes("grid-line", "vertical").styles("left", `${x}px`).build());
            grid.push(create("div").classes("grid-line", "horizontal").styles("top", `${y}px`).build());
            i++;
        } while (x < width || y < height);
        do {
            x = i * resolution + xMod + width / 2;
            y = i * resolution + yMod + height / 2;
            grid.push(create("div").classes("grid-line", "vertical").styles("left", `${x}px`).build());
            grid.push(create("div").classes("grid-line", "horizontal").styles("top", `${y}px`).build());
            i--;
        } while (x > 0 || y > 0);
        return grid;
    }

    #renderUserComponent() {
        const user = this.editor.user;
        const authenticated = signal(user.value !== null);
        const buttonText = signal(authenticated.value ? "Logout" : "Login");
        const buttonIcon = signal(authenticated.value ? "logout" : "login");
        user.subscribe(u => {
            authenticated.value = u !== null;
            buttonText.value = u !== null ? "Logout" : "Login";
            buttonIcon.value = u !== null ? "logout" : "login";
        });
        const error = signal(null);

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        ifjs(authenticated, this.#renderLoggedInComponent(user)),
                        this.#renderButton(buttonText, () => {
                            if (authenticated.value) {
                                authenticated.value = false;
                                user.value = null;
                                buttonText.value = "Login";
                                buttonIcon.value = "login";
                            } else {
                                this.#renderInputPopup("Username", "", username => {
                                    this.#renderInputPopup("Password", "", password => {
                                        Auth.authorize(username, password).then(res => {
                                            if (res.error) {
                                                error.value = res.error;
                                            } else {
                                                authenticated.value = true;
                                                user.value = res.user;
                                                this.editor.user = res.user;
                                                buttonText.value = "Logout";
                                                buttonIcon.value = "logout";
                                            }
                                        });
                                    }, "password");
                                });
                            }
                        }, buttonIcon),
                    ).build(),
                ifjs(error, create("div")
                    .classes("error")
                    .text(error)
                    .build())
            ).build();
    }

    #renderLoggedInComponent(user) {
        const username = signal(user.value ? user.value.username : "");
        const avatar = signal(user.value ? user.value.avatar : null);
        user.subscribe(u => {
            username.value = u.username;
            avatar.value = u.avatar;
        });

        return create("div")
            .classes("flex", "node-editor-user")
            .children(
                create("div")
                    .classes("flex", "ignore-child-pointer")
                    .onclick(() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = () => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const base64 = reader.result.split(',')[1];
                                avatar.value = base64;
                                Api.saveAvatar(base64).then(() => {
                                    this.#renderFrame(true);
                                });
                            };
                            reader.readAsDataURL(input.files[0]);
                        };
                        input.click();
                    })
                    .children(
                        ifjs(avatar, this.#renderMaterialIcon("person"), true),
                        ifjs(avatar, this.#renderAvatar(avatar)),
                    ).build(),
                create("span")
                    .text(username)
                    .build()
            ).build();
    }

    #renderAvatar(avatar) {
        const src = signal(`data:image/png;base64,${avatar.value}`);
        avatar.subscribe(async a => {
            if (a.constructor.name === "Object") {
                let uint8Array = new Uint8Array(a.data);
                const blob = new Blob([uint8Array], {type: a.type});
                const base64 = await blob.text();
                src.value = `data:image/png;base64,${base64}`;
            } else {
                const base64 = a.toString('base64');
                src.value = `data:image/png;base64,${base64}`;
            }
        });

        return create("img")
            .classes("node-editor-avatar")
            .attributes("src", src)
            .build();
    }

    #renderEditorGlobals(collapsedState) {
        const collapseTextState = signal(collapsedState.value ? "Pin Panel" : "Unpin panel");
        const collapseIconState = signal(collapsedState.value ? "transition_slide" : "transition_fade");
        const collapsedClassState = signal(collapsedState.value ? 'collapsed' : 'expanded');
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

        return create("div")
            .classes("node-editor-globals", "flex-v", collapsedClassState)
            .children(
                create("div")
                    .classes("flex", "spaced")
                    .children(
                        this.#renderUserComponent(),
                        this.#renderButton(collapseTextState, () => {
                            collapsedState.value = !collapsedState.value;
                        }, collapseIconState),
                    ).build(),
                this.#renderGeneralSection(),
                ...this.editor.globals.map(global => this.#renderEditorGlobalSection(global))
            ).build();
    }

    #renderGeneralSection() {
        const uploadTextState = signal("Upload JSON");
        const uploadIconState = signal("upload");

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "spaced", "center-children")
                    .children(
                        create("h1")
                            .text(this.editor.graphInfo.name)
                            .onclick(() => {
                                this.#renderInputPopup("Graph name", this.editor.graphInfo.name, name => {
                                    this.editor.setGraphName(name);
                                    this.#renderFrame(true);
                                });
                            })
                            .build(),
                        this.#renderInfoPill(this.editor.graphInfo.public ? "Public" : "Private", this.editor.graphInfo.public ? "lock_open" : "lock")
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        this.#renderButton("Add global section", () => {
                            this.#renderInputPopup("Global name", "", name => {
                                this.editor.addGlobalSection(name);
                                this.#renderFrame(true);
                            });
                        }, "add"),
                        this.#renderButton("Download JSON", () => {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(new Blob([JSON.stringify(this.editor)], {type: 'application/json'}));
                            const timestamp = new Date().toISOString().replace(/:/g, '-');
                            a.download = 'node-editor-' + timestamp + '.json';
                            a.click();
                        }, "download"),
                        this.#renderButton(uploadTextState, () => {
                            uploadIconState.value = "input";
                            uploadTextState.value = "Selecting...";
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json';
                            input.onchange = () => {
                                if (!input.files[0]) {
                                    uploadIconState.value = "upload";
                                    uploadTextState.value = "Upload JSON";
                                    return;
                                }
                                uploadIconState.value = "cached";
                                uploadTextState.value = "Loading...";
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const json = JSON.parse(reader.result);
                                    this.editor.loadFromJSON(json);
                                    this.#renderFrame(true);
                                    uploadIconState.value = "upload";
                                    uploadTextState.value = "Upload JSON";
                                };
                                reader.readAsText(input.files[0]);
                            };
                            input.click();
                        }, uploadIconState),
                    ).build()
            ).build();
    }

    #renderInfoPill(text, icon = null) {
        return create("div")
            .classes("info-pill")
            .children(
                icon ? this.#renderMaterialIcon(icon) : null,
                create("span")
                    .text(text)
                    .build()
            ).build();
    }

    #renderMaterialIcon(icon) {
        return create("span")
            .classes("material-symbols-outlined")
            .text(icon)
            .build();
    }

    #renderPopupContainer(children) {
        return create("div")
            .classes("popup-container")
            .children(...children)
            .build();
    }

    #removePopupContainers() {
        document.querySelectorAll(".popup-container").forEach(popup => {
            popup.remove();
        });
    }

    #renderInputPopup(title, value, onSave, type = "text") {
        const popup = create("div")
            .classes("input-popup", "flex-v")
            .children(
                create("div")
                    .classes("input-popup-title")
                    .text(title)
                    .build(),
                create("input")
                    .classes("input-popup-input")
                    .value(value)
                    .type(type)
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
        const popup = create("div")
            .classes("input-popup", "flex-v")
            .children(
                create("div")
                    .classes("input-popup-title")
                    .text(title)
                    .build(),
                create("select")
                    .classes("input-popup-input")
                    .children(...options.map(option => {
                        return create("option")
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
        return create("div")
            .classes("flex", "spaced")
            .children(
                this.#renderButton("Cancel", () => {
                    this.#removePopupContainers();
                    onCancel();
                }, "cancel"),
                this.#renderButton("Save", () => {
                    this.#removePopupContainers();
                    onSave();
                }, "save"),
            ).build();
    }

    /**
     *
     * @param global {GlobalSection}
     */
    #renderEditorGlobalSection(global) {
        return create("div")
            .classes("node-editor-global-section")
            .children(
                create("h1")
                    .text(global.name)
                    .build(),
                this.#renderGlobalsSettings(global),
                create("div")
                    .classes("global-section-fields")
                    .children(
                        ...global.fields.map(field => {
                            return create("div")
                                .classes("global-section-field")
                                .children(
                                    this.#renderInputField(field, global.get(field.name), newValue => {
                                        global.set(field.name, newValue);
                                        this.#renderFrame(true);
                                    }),
                                    this.#renderButton("Remove field", () => {
                                        global.removeFieldByName(field.name);
                                        this.#renderFrame(true);
                                    }, "delete"),
                                ).build();
                        })
                    ).build()
            ).build();
    }

    #renderButton(text, onclick, icon = null) {
        return create("button")
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
                create("span")
                    .classes("node-editor-button-text")
                    .text(text)
                    .build()
            ).build();
    }

    #renderSelect(options, onchange) {
        return create("select")
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
                return create("option")
                    .value(option.value)
                    .text(option.text)
                    .selected(option.selected)
                    .build();
            }))
            .onchange(onchange)
            .build();
    }

    #renderGlobalsSettings(global) {
        return create("div")
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
        const xState = signal(positionState.value.x + "px");
        const yState = signal(positionState.value.y + "px");
        positionState.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };
        const hasSelectedNodes = this.editor.selectedNodes.length > 0;

        return create("div")
            .classes("menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                this.#renderMenuItem("Add node", () => {
                    this.editor.addNodeFromMenu(positionState, editorSize);
                }, "addNode"),
                ifjs(hasSelectedNodes, this.#renderMenuItem("Remove selected", () => {
                    this.editor.removeSelectedNodes();
                }, "delete"))
            ).build();
    }

    #renderConnections() {
        const xState = signal(this.editor.position.value.x + "px");
        const yState = signal(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        let fieldConnections = create("div").build();
        if (this.editor.settings.showFieldConnections) {
            fieldConnections = create("div")
                .classes("node-global-connections")
                .id("node-global-connections")
                .styles("left", xState, "top", yState)
                .children(...this.editor.globals.map(global => this.#renderGlobalConnections(global)))
                .children(...this.editor.nodes.map(node => {
                    return create("div")
                        .classes("node-node-connections")
                        .children(
                            ...node.fields.map(field => {
                                if (this.editor.settings.connectionFilter && !this.editor.settings.connectionFilter.includes(field.name)) {
                                    return null;
                                }

                                return create("div")
                                    .classes("node-connection")
                                    .id(`${node.id}-${field.id}-connection`)
                                    .children(...field.connections.map(connection => this.#renderConnection(connection, "global-node")))
                                    .build();
                            })
                        ).build();
                }))
                .build()
        }

        return create("div")
            .children(
                create("div")
                    .classes("node-editor-connections")
                    .id("node-editor-connections")
                    .styles("left", xState, "top", yState)
                    .children(...this.editor.nodes.map(node => this.#renderNodeConnections(node)))
                    .build(),
                fieldConnections
            ).build();
    }

    #renderNodeConnections(node) {
        const small = this.editor.zoomState.value < 1;

        return create("div")
            .classes("node-connections")
            .id(`${node.id}-connections`)
            .children(...node.connections.map(connection => this.#renderConnection(connection, "node", small)))
            .build();
    }

    #renderGlobalConnections(global) {
        return create("div")
            .classes("global-connections")
            .children(...global.fields.map(field => {
                return create("div")
                    .classes("global-connection")
                    .id(`${global.name}-${field.id}-connection`)
                    .children(...field.connections.map(connection => this.#renderConnection(connection, "global")))
                    .build();
            })).build();
    }

    #handleNodeClick(e, node) {
        if (this.lastNodeClick && this.lastNodeClick.node === node && Date.now() - this.lastNodeClick.time < 300) {
            this.editor.unselectAllExcept();
            window.nodeEditor.rerender();
            node.startConnecting(e);
        } else {
            node.toggleSelection(e);
            window.nodeEditor.rerender();
        }
        this.lastNodeClick = {
            node: node,
            time: Date.now()
        };
    }

    #renderNode(node, editorSize) {
        const menuClassState = signal('hidden');
        const menuPositionState = signal({x: 0, y: 0});
        const nodeX = signal(`${node.getPosX(editorSize.width, this.editor.zoomState.value, node.position.x)}px`);
        const nodeY = signal(`${node.getPosY(editorSize.height, this.editor.zoomState.value, node.position.y)}px`);
        node.positionState.subscribe((position) => {
            nodeX.value = node.getPosX(editorSize.width, this.editor.zoomState.value, position.x) + "px";
            nodeY.value = node.getPosY(editorSize.height, this.editor.zoomState.value, position.y) + "px";
        });
        const selected = this.editor.nodeIsSelected(node.id) ? "selected" : "_";

        if (this.editor.zoomState.value < 0.4) {
            return create("div")
                .classes("node", "node-small", selected)
                .id(node.id)
                .styles("left", nodeX, "top", nodeY)
                .onmousedown(e => {
                    node.moveWithMouse(node.id, this.editor.settings.gridSnapping, this.editor.zoomState, e);
                })
                .onclick((e) => {
                    this.#handleNodeClick(e, node);
                })
                .oncontextmenu((e) => {
                    node.openContextMenu(e, menuClassState, menuPositionState, this.editor.zoomState.value, editorSize, this.#renderFrame.bind(this));
                })
                .children(
                    this.#renderNodeHeader(node, true),
                    this.#renderNodeMenu(node, menuPositionState, menuClassState)
                ).build();
        }

        if (this.editor.zoomState.value < 1) {
            return create("div")
                .classes("node", selected)
                .id(node.id)
                .styles("left", nodeX, "top", nodeY)
                .onmousedown(e => {
                    node.moveWithMouse(node.id, this.editor.settings.gridSnapping, this.editor.zoomState, e);
                })
                .onclick((e) => {
                    this.#handleNodeClick(e, node);
                })
                .oncontextmenu((e) => {
                    node.openContextMenu(e, menuClassState, menuPositionState, this.editor.zoomState.value, editorSize, this.#renderFrame.bind(this));
                })
                .children(
                    this.#renderNodeHeader(node),
                    this.#renderNodeMenu(node, menuPositionState, menuClassState)
                ).build();
        }

        return create("div")
            .classes("node", selected)
            .id(node.id)
            .styles("left", nodeX, "top", nodeY)
            .onmousedown(e => {
                node.moveWithMouse(node.id, this.editor.settings.gridSnapping, this.editor.zoomState, e);
            })
            .onclick((e) => {
                this.#handleNodeClick(e, node);
            })
            .oncontextmenu((e) => {
                node.openContextMenu(e, menuClassState, menuPositionState, this.editor.zoomState.value, editorSize, this.#renderFrame.bind(this));
            })
            .children(
                this.#renderNodeHeader(node),
                create("div")
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
        const xState = signal(positionState.value.x + "px");
        const yState = signal(positionState.value.y + "px");
        positionState.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return create("div")
            .classes("menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                this.#renderMenuItem("Remove node", () => {
                    window.nodeEditor.removeNodeById(node.id);
                    this.#renderFrame(true);
                }, "delete"),
                this.#renderMenuItem("Duplicate node", () => {
                    window.nodeEditor.duplicateNode(node);
                    this.#renderFrame(true);
                }, "copy"),
                this.#renderMenuItem("Connect", e => {
                    node.startConnecting(e);
                    classState.value = 'hidden';
                }, "link"),
            ).build();
    }

    #renderMenuItem(text, onclick, icon = "add") {
        return create("div")
            .classes("menu-item")
            .onclick(onclick)
            .children(
                Icon.asImage(icon).build(),
                create("span")
                    .classes("node-editor-menu-item-text")
                    .text(text)
                    .build()
            ).build();
    }

    #renderNodeHeader(node, small = false) {
        return create("div")
            .classes("node-header")
            .children(
                create("span")
                    .classes("node-title")
                    .text(node.name)
                    .build(),
                small ? null : this.#renderSelect(window.nodeEditor.nodeTypes.map(t => {
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

    #renderConnection(connection, type, small = false) {
        const {fromX, fromY, length, angle} = connection.getConnectionTransform(type, this.editor.position.value);
        const arrow = create("div")
            .classes("node-connection-arrow", small ? "small" : "_")
            .build();
        const newNode = create("div")
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
    #renderInput(field, value, onChange, errorState = signal("")) {
        let type = field.type;
        if (type === ValueTypes.boolean) {
            type = 'checkbox';
        } else if (type === ValueTypes.number || type === ValueTypes.string || type === ValueTypes.function) {
            type = 'text';
        }

        const actualValue = this.editor.getValue(field.id);
        const base = create("input")
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
        const errorState = signal('');
        const hiddenClassState = signal(field.shownState.value ? '_' : 'hidden');
        field.shownState.onUpdate = shown => {
            if (shown) {
                hiddenClassState.value = 'hidden';
            } else {
                hiddenClassState.value = '_';
            }
        };

        return create("div")
            .classes("node-field", hiddenClassState)
            .children(
                create("label")
                    .classes("node-field-label")
                    .for(field.id)
                    .text(field.name)
                    .build(),
                create("div")
                    .classes("node-field-value")
                    .children(
                        this.#renderInput(field, value, onChange, errorState),
                        create("span")
                            .classes("node-field-error")
                            .text(errorState)
                            .build(),
                    ).build(),
                create("div")
                    .classes("node-field-connector")
                    .onclick(e => {
                        field.startConnecting(e);
                    }).build()
            ).build();
    }
}