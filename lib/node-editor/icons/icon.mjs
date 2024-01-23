import {FJS} from "https://fjs.targoninc.com/f.js";

export class Icon {
    static name(name) {
        return window.location.origin + "/lib/node-editor/icons/" + name + ".svg";
    }

    static asImage(name) {
        return FJS.create("img")
            .classes("icon")
            .src(Icon.name(name));
    }
}