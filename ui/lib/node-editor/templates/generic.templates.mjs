import {create, signal} from "https://fjs.targoninc.com/f.js";
import {UiActions} from "../renderers/ui-actions.mjs";
import {ValueTypes} from "../value-types.mjs";

export class GenericTemplates {
    static inputPopup(title, value, onSave, type = "text") {
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
                this.popupButtons(() => {
                    onSave(popup.querySelector(".input-popup-input").value);
                })
            ).build();
        const container = this.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
        const input = document.getElementById("focus-input");
        input.focus();
        input.onkeydown = e => {
            if (e.key === "Enter") {
                onSave(popup.querySelector(".input-popup-input").value);
                UiActions.removePopupContainers();
            }
        }
    }

    static dropdownPopup(title, options, onSave) {
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
                this.popupButtons(() => {
                    onSave(popup.querySelector(".input-popup-input").value);
                })
            ).build();
        const container = this.popupContainers([popup]);
        const editor = document.getElementById("editor");
        editor.appendChild(container);
    }

    static popupButtons(onSave = () => {}, onCancel = () => {}) {
        return create("div")
            .classes("flex", "spaced")
            .children(
                this.button("Cancel", () => {
                    onCancel();
                    UiActions.removePopupContainers();
                }, "cancel"),
                this.button("Save", () => {
                    onSave();
                    UiActions.removePopupContainers();
                }, "save"),
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

    static infoPill(text, icon = null) {
        return create("div")
            .classes("info-pill")
            .children(
                icon ? this.materialIcon(icon) : null,
                create("span")
                    .text(text)
                    .build()
            ).build();
    }

    static materialIcon(icon) {
        return create("span")
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
                        this.input(field, value, onChange, errorState),
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
    static input(field, value, onChange, errorState = signal("")) {
        let type = field.type;
        if (type === ValueTypes.boolean) {
            type = 'checkbox';
        } else if (type === ValueTypes.number || type === ValueTypes.string || type === ValueTypes.function) {
            type = 'text';
        }

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
                if (window.nodeEditor.fieldIsReadonly(field.id)) {
                    e.target.value = field.value;
                    window.nodeEditor.rerender();
                }
            })
            .onchange(() => {
                if (window.nodeEditor.fieldIsReadonly(field.id)) {
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

        if (window.nodeEditor.fieldIsReadonly(field.id)) {
            base.classes("disabled");
        }

        return base.build();
    }
}