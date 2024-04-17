import {signal, store} from "https://fjs.targoninc.com/f.js";

export class StoreKeys {
    static create(key, initialValue) {
        return store().get(key) ?? (() => {
            store().set(key, signal(initialValue));
            return store().get(key);
        })();
    }

    static nodeEditor = "nodeEditor";
    static language$ = "language";
    static tabKey$ = "tabKey";
    static renderer = "renderer";
    static searchResults = "searchResults";
    static ownGraphs = "ownGraphs";
}