import {UiText} from "../enums/ui-text.mjs";
import {create, ifjs} from "https://fjs.targoninc.com/f.js";
import {GenericTemplates} from "../templates/generic.templates.mjs";
import {Api} from "../api/api.mjs";

export class UiActions {
    static removePopupContainers() {
        document.querySelectorAll(".popup-container").forEach(popup => {
            popup.remove();
        });
    }

    static copy(text) {
        navigator.clipboard.writeText(text);
        this.toast(UiText.get("copiedToClipboard"), "check");
    }

    static toast(message, icon = null, seconds = 3) {
        const toast = create("div")
            .classes("toast")
            .children(
                ifjs(icon, GenericTemplates.materialIcon(icon)),
                create("span")
                    .text(message)
                    .build()
            ).build();
        const container = document.querySelector(".toast-container");
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, seconds * 1000);
    }

    static download(text, filename, type = "application/json") {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], {
            type
        }));
        a.download = filename;
        a.click();
    }

    static updateCssVariable(name, value) {
        document.documentElement.style.setProperty(name, value);
    }

    static uploadAvatar(editor, avatar) {
        const oldValue = avatar.value;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                avatar.value = base64;
                Api.saveAvatar(base64).then((res) => {
                    if (res.error) {
                        avatar.value = oldValue;
                    }
                    editor.rerender(true);
                });
            };
            reader.readAsDataURL(input.files[0]);
        };
        input.click();
    }
}