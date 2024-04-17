import {store} from "https://fjs.targoninc.com/f.js";
import {StoreKeys} from "./enums/store-keys.mjs";

export const Keymap = {
    toggleFieldConnections: {
        keys: ["c"],
        action: () => {
            store().get(StoreKeys.nodeEditor).toggleFieldConnections();
        }
    },
    toggleTheme: {
        keys: ["t"],
        action: () => {
            store().get(StoreKeys.nodeEditor).toggleTheme();
        }
    },
    toggleGrid: {
        keys: ["g"],
        action: () => {
            store().get(StoreKeys.nodeEditor).toggleGrid();
        }
    },
    resetView: {
        keys: ["r"],
        action: () => {
            store().get(StoreKeys.nodeEditor).resetView();
        }
    },
}