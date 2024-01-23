import {FJS} from "https://fjs.targoninc.com/f.js";

export class NodeConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.id = Math.random().toString(36).substring(7);
    }

    render() {
        const from = document.getElementById(this.from);
        const to = document.getElementById(this.to);
        const fromX = from.offsetLeft;
        const fromY = from.offsetTop;
        const toX = to.offsetLeft;
        const toY = to.offsetTop;
        const diffX = toX - fromX;
        const diffY = toY - fromY;
        const length = Math.sqrt(diffX * diffX + diffY * diffY);
        const angle = Math.atan2(diffY, diffX) * 180 / Math.PI;
        const arrow = FJS.create("div")
            .classes("node-connection-arrow")
            .build();
        const newNode = FJS.create("div")
            .classes("node-connection")
            .id(this.id)
            .styles("width", `${length}px`, "transform", `rotate(${angle}deg)`)
            .styles("left", `${fromX}px`, "top", `${fromY}px`)
            .children(
                arrow
            )
            .build();

        if (!document.getElementById(this.id)) {
            return newNode;
        } else {
            document.getElementById(this.id).replaceWith(newNode);
            return null;
        }
    }
}