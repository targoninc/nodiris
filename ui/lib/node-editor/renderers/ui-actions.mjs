import {UiText} from "../enums/ui-text.mjs";
import {create, ifjs} from "https://fjs.targoninc.com/f.js";
import {GenericTemplates} from "../templates/generic.templates.mjs";

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
}