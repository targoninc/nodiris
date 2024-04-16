import {StoreKeys} from "./store-keys.mjs";
import {signal, store} from "https://fjs.targoninc.com/f.js";

export const languageTextMap = {
    en: {
        login: "Login",
        logout: "Logout",
        pinPanel: "Pin Panel",
        unpinPanel: "Unpin Panel",
        uploadJson: "Upload JSON",
        downloadJson: "Download JSON",
        public: "Public",
        private: "Private",
        graphOnlyVisibleToYou: "This graph is only visible to you",
        selecting: "Selecting",
        loading: "Loading",
        addNodeType: "Add node type",
        nodeTypeName: "Node type name",
        removeNodeType: "Remove node type",
        addGlobalSection: "Add global section",
        globalName: "Global name",
        globals: "Globals",
        nodeTypes: "Node Types",
        cancel: "Cancel",
        save: "Save",
        username: "Username",
        password: "Password",
        removeField: "Remove field",
        addField: "Add field",
        fieldName: "Field name",
        fieldValue: "Field value",
        fieldType: "Field type",
        removeSection: "Remove section",
        addNode: "Add Node",
        removeSelected: "Remove Selected",
        removeNode: "Remove Node",
        duplicateNode: "Duplicate node",
        connect: "Connect",
        graphName: "Graph name",
        copyJson: "Copy JSON",
        copiedToClipboard: "Copied to clipboard",
    },
    de: {
        login: "Anmelden",
        logout: "Abmelden",
        pinPanel: "Panel anheften",
        unpinPanel: "Panel lösen",
        uploadJson: "JSON hochladen",
        downloadJson: "JSON herunterladen",
        public: "Öffentlich",
        private: "Privat",
        graphOnlyVisibleToYou: "Dieser Graph ist nur für dich sichtbar",
        selecting: "Auswählen",
        loading: "Laden",
        addNodeType: "Knotentyp hinzufügen",
        nodeTypeName: "Knotentypname",
        removeNodeType: "Knotentyp entfernen",
        addGlobalSection: "Globale Sektion hinzufügen",
        globalName: "Globaler Name",
        globals: "Globale",
        nodeTypes: "Knotentypen",
        cancel: "Abbrechen",
        save: "Speichern",
        username: "Benutzername",
        password: "Passwort",
        removeField: "Feld entfernen",
        addField: "Feld hinzufügen",
        fieldName: "Feldname",
        fieldValue: "Feldwert",
        fieldType: "Feldtyp",
        removeSection: "Sektion entfernen",
        addNode: "Knoten hinzufügen",
        removeSelected: "Ausgewählte entfernen",
        removeNode: "Knoten entfernen",
        duplicateNode: "Knoten duplizieren",
        connect: "Verbinden",
        graphName: "Graphname",
        copyJson: "JSON kopieren",
        copiedToClipboard: "In die Zwichenablage kopiert",
    }
}

export class UiText {
    static get(key) {
        const lang = store().get(StoreKeys.language$)?.value ?? "en";
        return languageTextMap[lang][key] ?? (() => {
            UiText.warnMissing(lang, key);
            return key;
        })()
    }

    static warnMissing(lang, key) {
        console.warn(`Missing text for language "${lang}" and key "${key}"`);
    }
}