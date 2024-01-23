export class NodeConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.id = Math.random().toString(36).substring(7);
    }

    getConnectionTransform() {
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
        return {fromX, fromY, length, angle};
    }
}