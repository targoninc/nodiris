import {StoreKeys} from "./store-keys.mjs";
import {signal, store} from "https://fjs.targoninc.com/f.js";

export const languageTextMap = {
    en: {
        login: "Login",
        logout: "Logout",
        pinPanel: "Pin Panel",
        unpinPanel: "Unpin Panel",
        upload: "Upload",
        download: "Download",
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
        copy: "Copy",
        copiedToClipboard: "Copied to clipboard",
        saveToCloud: "Save to cloud",
        load: "Load",
        delete: "Delete",
        successDeletingGraph: "Successfully deleted graph",
        successSavingGraph: "Successfully saved graph",
        resetGraph: "Reset graph",
        resetGraphConfirmation: "Reset graph?",
        no: "No",
        yes: "Yes",
    },
    de: {
        login: "Anmelden",
        logout: "Abmelden",
        pinPanel: "Panel anheften",
        unpinPanel: "Panel lösen",
        upload: "Hochladen",
        download: "Herunterladen",
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
        copy: "Kopieren",
        copiedToClipboard: "In die Zwichenablage kopiert",
        saveToCloud: "In Cloud speichern",
        load: "Laden",
        delete: "Löschen",
        successDeletingGraph: "Graph erfolgreich gelöscht",
        successSavingGraph: "Graph erfolgreich gespeichert",
        resetGraph: "Graph zurücksetzen",
        resetGraphConfirmation: "Graph zurücksetzen?",
        no: "Nein",
        yes: "Ja",
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