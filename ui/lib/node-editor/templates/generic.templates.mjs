import {create, signal, store} from "https://fjs.targoninc.com/f.js";
import {UiActions} from "../utilities/ui-actions.mjs";
import {ValueTypes} from "../value-types.mjs";
import {StoreKeys} from "../enums/store-keys.mjs";
import {UiText} from "../enums/ui-text.mjs";

export class GenericTemplates {
    static inputPopup(title, value, onSave, type = "text") {
        const popup = create("div")
            .classes("popup", "flex-v")
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
                this.popupButtons(() => {
                    const value = popup.querySelector(".input-popup-input").value;
                    UiActions.removePopupContainers();
                    onSave(value);
                }, () => {}, false)
            ).build();
        const container = this.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
        const input = document.getElementById("focus-input");
        input.focus();
        input.onkeydown = e => {
            if (e.key === "Enter") {
                const value = popup.querySelector(".input-popup-input").value;
                UiActions.removePopupContainers();
                onSave(value);
            }
        }
    }

    static dropdownPopup(title, options, onSave) {
        const popup = create("div")
            .classes("popup", "flex-v")
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
                this.popupButtons(() => {
                    const value = popup.querySelector(".input-popup-input").value;
                    UiActions.removePopupContainers();
                    onSave(value);
                }, () => {}, false)
            ).build();
        const container = this.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
    }

    static popupButtons(onSave = () => {}, onCancel = () => {}, removePopups = true, texts = {
        cancel: UiText.get("cancel"),
        save: UiText.get("save")
    }) {
        return create("div")
            .classes("flex", "spaced")
            .children(
                this.button(texts.cancel, () => {
                    onCancel();
                    if (removePopups) {
                        UiActions.removePopupContainers();
                    }
                }, "cancel"),
                this.button(texts.save, () => {
                    onSave();
                    if (removePopups) {
                        UiActions.removePopupContainers();
                    }
                }, "save"),
            ).build();
    }

    static tabSwitcher(tabs) {
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
            .classes("flex-v", "node-editor-tab-switcher-container")
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

    static button(text, onclick, icon = null) {
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
                icon ? this.materialIcon(icon) : null,
                create("span")
                    .classes("node-editor-button-text")
                    .text(text)
                    .build()
            ).build();
    }

    static select(options, onchange) {
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

    static infoPill(text, icon = null, title = null, onclick = null) {
        return create("div")
            .classes("info-pill", onclick ? "clickable" : "_")
            .title(title)
            .onclick(() => {
                if (onclick) {
                    onclick();
                }
            })
            .children(
                icon ? this.materialIcon(icon) : null,
                create("span")
                    .text(text)
                    .build()
            ).build();
    }

    static materialIcon(icon, tag = "span") {
        return create(tag)
            .classes("material-symbols-outlined")
            .text(icon)
            .build();
    }

    static popupContainers(children) {
        return create("div")
            .classes("popup-container")
            .children(...children)
            .build();
    }

    static inputField(field, value, onChange) {
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
                        this.fieldInput(field, value, onChange, errorState),
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

    /**
     *
     * @param field {InputField}
     * @param value {*}
     * @param onChange {function}
     * @param errorState {FjsObservable}
     * @returns {*}
     */
    static fieldInput(field, value, onChange, errorState = signal("")) {
        let type = field.type;
        if (type === ValueTypes.boolean) {
            type = 'checkbox';
        } else if (type === ValueTypes.number || type === ValueTypes.string || type === ValueTypes.function) {
            type = 'text';
        }
        const editor = store().get(StoreKeys.nodeEditor);

        const actualValue = field.value;
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
                if (editor.fieldIsReadonly(field.id)) {
                    e.target.value = field.value;
                    editor.rerender();
                }
            })
            .onchange(() => {
                if (editor.fieldIsReadonly(field.id)) {
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

        if (editor.fieldIsReadonly(field.id)) {
            base.classes("disabled");
        }

        return base.build();
    }

    static input(type, label, value, onChange, errorState = signal("")) {
        return create("div")
            .classes("flex", "spaced")
            .children(
                create("input")
                    .classes("node-field-input")
                    .id("input")
                    .type(type)
                    .value(value)
                    .placeholder(label)
                    .onkeydown(e => {
                        if (e.key === "Enter") {
                            onChange(e.target.value);
                        }
                    })
                    .onblur(e => {
                        onChange(e.target.value);
                    })
                    .build(),
                create("span")
                    .classes("node-field-error")
                    .text(errorState)
                    .build(),
            ).build();
    }

    static link(text, href, classes = []) {
        const isExternal = href.startsWith("http");

        return create("a")
            .classes("link", "flex", ...classes)
            .attributes("href", href)
            .target("_blank")
            .children(
                isExternal ? this.materialIcon("open_in_new") : null,
                create("span")
                    .text(text)
                    .build()
            ).build();
    }

    static spinner() {
        const circleCount = 4;
        const delay = 0.2;

        return create("div")
            .classes("spinner")
            .children(
                ...Array.from({length: circleCount}, (_, i) => {
                    return create("div")
                        .classes("spinner-circle")
                        .styles("animation-delay", `-${i * delay}s`)
                        .build();
                })
            ).build();
    }

    static confirmationPopup(message, onConfirm = () => {}, icon = null) {
        const popup = create("div")
            .classes("popup", "flex-v")
            .children(
                create("div")
                    .classes("flex", "center-children")
                    .children(
                        icon ? this.materialIcon(icon, "h1") : null,
                        create("h1")
                            .classes("confirmation-popup-title")
                            .text(message)
                            .build(),
                    ).build(),
                this.popupButtons(() => {
                    onConfirm();
                    UiActions.removePopupContainers();
                }, () => {
                    UiActions.removePopupContainers();
                }, false, {
                    cancel: UiText.get("no"),
                    save: UiText.get("yes")
                })
            ).build();
        const container = this.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
    }
}