import {create, ifjs, nullElement, signal, store} from "https://fjs.targoninc.com/f.js";
import {Icon} from "../icons/icon.mjs";
import {InputField} from "../input-field.mjs";
import {ValueTypes} from "../value-types.mjs";
import {Keymap} from "../keymap.mjs";
import {Auth} from "../api/auth.mjs";
import {Api} from "../api/api.mjs";
import {ImageProcessor} from "../utilities/image-processor.mjs";
import {UiActions} from "./ui-actions.mjs";
import {GenericTemplates} from "../templates/generic.templates.mjs";
import {NodeType} from "../node-type.mjs";
import {StoreKeys} from "../enums/store-keys.mjs";
import {UiText} from "../enums/ui-text.mjs";
import {ValueTypeIcon} from "../enums/value-type-icon.mjs";

export class NodeEditorDomRenderer {
    constructor(editor) {
        this.editor = editor;
        this.editor.setRenderer((force = false) => {
            this.#renderFrame(force)
        });
        this.container = null;
        this.lastNodeClick = null;
        this.panelCollapsedState = signal(false);
        this.language = store().get(StoreKeys.language$)?.value ?? "en";
        if (!store().get(StoreKeys.language$)) {
            store().set(StoreKeys.language$, signal(this.language));
        }
    }

    start(container) {
        this.container = container;
        this.registerKeyBindings();
        this.editor.rerender();
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
                    this.editor.rerender();
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
                this.editor.rerender();
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
                create("div")
                    .classes("toast-container")
                    .build()
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
        const buttonText = signal(authenticated.value ? UiText.get("logout") : UiText.get("login"));
        const buttonIcon = signal(authenticated.value ? "logout" : "login");
        user.subscribe(u => {
            authenticated.value = u !== null;
            buttonText.value = u !== null ? UiText.get("logout") : UiText.get("login");
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
                        GenericTemplates.button(buttonText, () => {
                            if (authenticated.value) {
                                authenticated.value = false;
                                user.value = null;
                                buttonText.value = UiText.get("login");
                                buttonIcon.value = "login";
                            } else {
                                this.#renderLoginPopup(this.handleLoginRequest(error, authenticated, user, buttonText, buttonIcon));
                            }
                        }, buttonIcon),
                    ).build(),
                ifjs(error, create("div")
                    .classes("error")
                    .text(error)
                    .build())
            ).build();
    }

    handleLoginRequest(error, authenticated, user, buttonText, buttonIcon) {
        return async () => {
            const popupInputs = document.querySelectorAll(".input-popup-input");
            const username = popupInputs[0].value;
            const password = popupInputs[1].value;
            Auth.authorize(username, password).then(res => {
                if (res.error) {
                    error.value = res.error;
                } else {
                    authenticated.value = true;
                    user.value = res.user;
                    this.editor.user.value = res.user;
                    buttonText.value = UiText.get("logout");
                    buttonIcon.value = "logout";
                }
            });
        };
    }

    #renderLoggedInComponent(user) {
        const username = signal(user.value ? user.value.username : "");
        const avatar = signal(user.value ? user.value.avatar ?? Icon.testImage() : Icon.testImage());
        const updateUserDeps = (u) => {
            if (!u) {
                return;
            }
            username.value = u.username;
            avatar.value = u.avatar ?? Icon.testImage();
        }
        user.subscribe(updateUserDeps);
        updateUserDeps(user.value);

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
                                    this.editor.rerender(true);
                                });
                            };
                            reader.readAsDataURL(input.files[0]);
                        };
                        input.click();
                    })
                    .children(
                        ifjs(avatar, GenericTemplates.materialIcon("person"), true),
                        ifjs(avatar, this.#renderAvatar(avatar)),
                    ).build(),
                create("span")
                    .text(username)
                    .build()
            ).build();
    }

    #renderAvatar(avatar) {
        const src = signal(Icon.testImage());
        avatar.subscribe(async a => {
            ImageProcessor.getBase64Src(a).then(s => {
                src.value = s;
            });
        });
        ImageProcessor.getBase64Src(avatar.value).then(s => {
            src.value = s;
        });

        return create("img")
            .classes("node-editor-avatar")
            .attributes("src", src)
            .build();
    }

    #renderEditorGlobals(collapsedState) {
        const collapseTextState = signal(collapsedState.value ? UiText.get("pinPanel") : UiText.get("unpinPanel"));
        const collapseIconState = signal(collapsedState.value ? "transition_slide" : "transition_fade");
        const collapsedClassState = signal(collapsedState.value ? 'collapsed' : 'expanded');
        collapsedState.onUpdate = collapsed => {
            if (collapsed) {
                collapseTextState.value = UiText.get("pinPanel");
                collapseIconState.value = "transition_slide";
                collapsedClassState.value = 'collapsed';
            } else {
                collapseTextState.value = UiText.get("unpinPanel");
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
                        ifjs(this.editor.authenticationEnabled, this.#renderUserComponent()),
                        ifjs(this.editor.authenticationEnabled, create("div").build(), true),
                        create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.select([
                                    { value: "en", text: "English", selected: this.language === "en" },
                                    { value: "de", text: "Deutsch", selected: this.language === "de" },
                                ], e => {
                                    this.language = e.target.value;
                                    store().get(StoreKeys.language$).value = this.language;
                                    this.editor.rerender();
                                }),
                                GenericTemplates.button(collapseTextState, () => {
                                    collapsedState.value = !collapsedState.value;
                                }, collapseIconState),
                            ).build(),
                    ).build(),
                this.#renderGeneralSection()
            ).build();
    }

    #renderGeneralSection() {
        const uploadTextState = signal(UiText.get("upload"));
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
                                GenericTemplates.inputPopup(UiText.get("graphName"), this.editor.graphInfo.name, name => {
                                    this.editor.setGraphName(name);
                                    this.editor.rerender(true);
                                });
                            })
                            .build(),
                        GenericTemplates.infoPill(this.editor.graphInfo.public ? UiText.get("public") : UiText.get("private"),
                            this.editor.graphInfo.public ? "lock_open" : "lock",
                            UiText.get("graphOnlyVisibleToYou")),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.button(UiText.get("copy"), () => {
                            UiActions.copy(this.editor.stringify());
                        }, "content_copy"),
                        GenericTemplates.button(UiText.get("download"), () => {
                            UiActions.download(this.editor.stringify(), `graph-${this.editor.graphInfo.name}.json`);
                        }, "download"),
                        GenericTemplates.button(uploadTextState, () => this.uploadJsonHandler(uploadIconState, uploadTextState), uploadIconState),
                    ).build(),
                this.#tabSwitcher([
                    {
                        name: UiText.get("globals"),
                        key: "globals",
                        content: this.#renderGlobalsSection()
                    },
                    {
                        name: UiText.get("nodeTypes"),
                        key: "nodeTypes",
                        content: this.#renderNodeTypesSection()
                    }
                ])
            ).build();
    }

    uploadJsonHandler(uploadIconState, uploadTextState) {
        uploadIconState.value = "input";
        uploadTextState.value = UiText.get("selecting") + "...";
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            if (!input.files[0]) {
                uploadIconState.value = "upload";
                uploadTextState.value = UiText.get("upload");
                return;
            }
            uploadIconState.value = "cached";
            uploadTextState.value = UiText.get("loading") + "...";
            const reader = new FileReader();
            reader.onload = () => {
                const json = JSON.parse(reader.result);
                this.editor.loadFromJSON(json);
                this.editor.rerender(true);
                uploadIconState.value = "upload";
                uploadTextState.value = UiText.get("upload");
            };
            reader.readAsText(input.files[0]);
        };
        input.click();
    }

    #renderNodeTypesSection() {
        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.button(UiText.get("addNodeType"), () => {
                    GenericTemplates.inputPopup(UiText.get("nodeTypeName"), "", name => {
                        this.editor.addNodeType(new NodeType(name));
                        this.editor.rerender(true);
                    });
                }, "add"),
                ...this.editor.nodeTypes.map(nodeType => {
                    return create("div")
                        .classes("node-editor-node-type", "flex-v")
                        .children(
                            create("h1")
                                .text(nodeType.name)
                                .build(),
                            create("div")
                                .classes("flex")
                                .children(
                                    GenericTemplates.button(UiText.get("addField"), () => {
                                        GenericTemplates.inputPopup(UiText.get("fieldName"), "", name => {
                                            GenericTemplates.dropdownPopup(UiText.get("fieldType"), Object.values(ValueTypes), type => {
                                                nodeType.addField(new InputField(name, type, null));
                                                this.editor.rerender(true);
                                            });
                                        });
                                    }, "add"),
                                    GenericTemplates.button(UiText.get("removeNodeType"), () => {
                                        this.editor.removeNodeTypeByName(nodeType.name);
                                        this.editor.rerender(true);
                                    }, "delete")
                                ).build(),
                            create("div")
                                .classes("flex-v")
                                .children(
                                    ...nodeType.fields.map(field => {
                                        return create("div")
                                            .classes("node-editor-node-type-field")
                                            .children(
                                                create("div")
                                                    .classes("flex", "center-children", "spaced")
                                                    .children(
                                                        create("h2")
                                                            .text(field.name)
                                                            .build(),
                                                        GenericTemplates.infoPill(field.type, ValueTypeIcon.get(field.type), UiText.get("fieldType")),
                                                    ).build(),
                                                GenericTemplates.button(UiText.get("removeField"), () => {
                                                    nodeType.removeFieldByName(field.name);
                                                    this.editor.rerender(true);
                                                }, "delete"),
                                            ).build();
                                    }),
                                ).build(),
                        ).build();
                })
            ).build();
    }

    #renderGlobalsSection() {
        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.button(UiText.get("addGlobalSection"), () => {
                    GenericTemplates.inputPopup(UiText.get("globalName"), "", name => {
                        this.editor.addGlobalSection(name);
                        this.editor.rerender(true);
                    });
                }, "add"),
                ...this.editor.globals.map(global => this.#renderEditorGlobalSection(global))
            ).build();
    }

    #tabSwitcher(tabs) {
        const tabState = store().get(StoreKeys.tabKey$);
        const tabContent = signal(tabs.find(tab => tab.key === tabState.value).content);
        const tabButtons = tabs.map(tab => {
            const buttonActive = signal(tabState.value === tab.key ? "active" : "_");
            tabState.subscribe(tabKey => {
                buttonActive.value = tabKey === tab.key ? "active" : "_";
            });

            return create("button")
                .classes("node-editor-tab-button", buttonActive)
                .onclick(() => {
                    tabState.value = tab.key;
                    tabContent.value = tab.content;
                })
                .text(tab.name)
                .build();
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("node-editor-tab-switcher")
                    .children(
                        ...tabButtons
                    ).build(),
                create("div")
                    .classes("node-editor-tab-content")
                    .children(tabContent)
                    .build()
            ).build();
    }

    #renderLoginPopup(onLogin) {
        const popup = create("div")
            .classes("input-popup", "flex-v")
            .children(
                create("div")
                    .classes("input-popup-title")
                    .text(UiText.get("login"))
                    .build(),
                create("input")
                    .classes("input-popup-input")
                    .placeholder(UiText.get("username"))
                    .id("username-input")
                    .attributes("autofocus", "true")
                    .build(),
                create("input")
                    .classes("input-popup-input")
                    .id("event-input")
                    .placeholder(UiText.get("password"))
                    .type("password")
                    .build(),
                GenericTemplates.popupButtons(onLogin)
            ).build();
        const container = GenericTemplates.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
        const focusInput = document.getElementById("username-input");
        focusInput.focus();
        const input = document.getElementById("event-input");
        input.onkeydown = e => {
            if (e.key === "Enter") {
                onLogin();
                UiActions.removePopupContainers();
            }
        }
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
                                    GenericTemplates.inputField(field, global.get(field.name), newValue => {
                                        global.set(field.name, newValue);
                                        this.editor.rerender(true);
                                    }),
                                    GenericTemplates.button(UiText.get("removeField"), () => {
                                        global.removeFieldByName(field.name);
                                        this.editor.rerender(true);
                                    }, "delete"),
                                ).build();
                        })
                    ).build()
            ).build();
    }

    #renderGlobalsSettings(global) {
        return create("div")
            .classes("global-section-settings", "flex")
            .children(
                GenericTemplates.button(UiText.get("addField"), () => {
                    GenericTemplates.inputPopup(UiText.get("fieldName"), "", name => {
                        GenericTemplates.dropdownPopup(UiText.get("fieldValue"), Object.values(ValueTypes), type => {
                            const field = new InputField(name, type, null);
                            global.addField(field);
                            this.editor.rerender(true);
                            document.getElementById(field.id).focus();
                        });
                    });
                }, "add"),
                GenericTemplates.button(UiText.get("removeSection"), () => {
                    this.editor.removeGlobalSection(global.name);
                    this.editor.rerender();
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
                this.#renderMenuItem(UiText.get("addNode"), () => {
                    this.editor.addNodeFromMenu(positionState, editorSize);
                }, "addNode"),
                ifjs(hasSelectedNodes, this.#renderMenuItem(UiText.get("removeSelected"), () => {
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
            this.editor.rerender();
            node.startConnecting(e);
        } else {
            node.toggleSelection(e);
            this.editor.rerender();
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
                            return GenericTemplates.inputField(field, field.value, newValue => {
                                node.set(field.name, newValue);
                                this.editor.rerender();
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
                this.#renderMenuItem(UiText.get("removeNode"), () => {
                    this.editor.removeNodeById(node.id);
                    this.editor.rerender(true);
                }, "delete"),
                this.#renderMenuItem(UiText.get("duplicateNode"), () => {
                    this.editor.duplicateNode(node);
                    this.editor.rerender(true);
                }, "copy"),
                this.#renderMenuItem(UiText.get("connect"), e => {
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
                small ? null : GenericTemplates.select(this.editor.nodeTypes.map(t => {
                    return {
                        value: t.name,
                        text: t.name,
                        selected: t.name === node.name
                    };
                }), e => {
                    const type = this.editor.nodeTypes.find(type => type.name === e.target.value);
                    node.setType(type);
                    this.editor.rerender();
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
}