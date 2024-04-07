export class UiActions {
    static removePopupContainers() {
        document.querySelectorAll(".popup-container").forEach(popup => {
            popup.remove();
        });
    }
}