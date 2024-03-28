import {IdGenerator} from "./id-generator.mjs";

export class EditorConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.id = IdGenerator.generateId();
    }

    getConnectionTransform(type, editorPosition) {
        const from = document.getElementById(this.from);
        const to = document.getElementById(this.to);
        let fromX = from.offsetLeft;
        let fromY = from.offsetTop;
        if (type === "global") {
            fromX += from.offsetWidth - editorPosition.x;
            fromY += from.offsetHeight / 2 - editorPosition.y;
        }
        let fromNode;
        if (type === "global-node") {
            fromNode = from.closest(".node");
            fromX += from.offsetWidth + fromNode.offsetLeft - fromNode.offsetWidth / 2;
            fromY += (from.offsetHeight / 2) + fromNode.offsetTop - fromNode.offsetHeight / 2;
        }
        let toX = to.offsetLeft;
        let toY = to.offsetTop;
        let toNode;
        if (type === "global" || type === "global-node") {
            toNode = to.closest(".node");
            toX += toNode.offsetLeft - toNode.offsetWidth / 2;
            toY += (to.offsetHeight / 2) + toNode.offsetTop - toNode.offsetHeight / 2;
        }
        const diffX = toX - fromX;
        const diffY = toY - fromY;
        const length = Math.sqrt(diffX * diffX + diffY * diffY);
        const angle = Math.atan2(diffY, diffX) * 180 / Math.PI;
        return {fromX, fromY, length, angle};
    }
}