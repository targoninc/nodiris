import {EditorConnection} from "./editor-connection.mjs";
import {FjsObservable} from "https://fjs.targoninc.com/f.js";
import {IdGenerator} from "./id-generator.mjs";
import {InputField} from "./input-field.mjs";
import {ValueTypes} from "./value-types.mjs";

export class EditorNode {
    /**
     *
     * @param type {NodeType}
     * @param id {string | null}
     * @param fields {InputField[]}
     * @param position {{x: number, y: number}}
     * @param connections {EditorConnection[]}
     */
    constructor(type, position = {x: 0, y: 0}, fields = [], id = null, connections = []) {
        this.type = type;
        const newFields = [];
        for (const field of this.type.fields) {
            const existingField = fields.find(f => f.name === field.name);
            if (existingField) {
                newFields.push(new InputField(field.name, field.type, field.default, field.required, newFields.shown, existingField.connections.map(connection => new EditorConnection(connection.from, connection.to)), existingField.value, existingField.id));
            } else {
                newFields.push(new InputField(field.name, field.type, field.default, field.required, field.shown));
            }
        }
        this.fields = newFields;
        this.id = id ?? IdGenerator.generateId();
        this.position = position;
        this.positionState = new FjsObservable(position);
        this.connections = connections;
    }

    setType(type) {
        this.type = type;
        const previousFields = this.fields;
        this.fields = [];
        for (const field of this.type.fields) {
            const existingField = previousFields.find(f => f.name === field.name);
            if (existingField) {
                const fieldConnections = existingField.connections.map(connection => new EditorConnection(connection.from, connection.to));
                this.fields.push(new InputField(field.name, field.type, field.default, field.required, this.fields.shown, fieldConnections, existingField.value, existingField.id));
            } else {
                this.fields.push(new InputField(field.name, field.type, field.default, field.required, field.shown));
            }
        }
    }

    get name() {
        return this.type.name;
    }

    set(name, value) {
        const field = this.fields.find(field => field.name === name);
        field.value = value;
        if (field.type === ValueTypes.function && field.value.includes("Date.now()")) {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            this.updateInterval = setInterval(() => {
                field.propagateValue();
                window.nodeEditor.rerender();
            }, 100);
        } else if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        field.propagateValue();
    }

    get(name) {
        return this.fields.find(field => field.name === name).value;
    }

    connect(id) {
        if (!this.connections.find(connection => connection.to === id)) {
            this.connections.push(new EditorConnection(this.id, id));
        }
    }

    disconnect(id) {
        const connection = this.connections.find(connection => connection.to === id);
        if (connection) {
            this.connections.splice(this.connections.indexOf(connection), 1);
        }
    }

    isAllowedToConnectTo(type) {
        if (!this.type.getOption("canConnectTo")) {
            return true;
        }

        return this.type.getOption("canConnectTo").includes(type);
    }

    canConnectTo(id) {
        return !this.connections.find(connection => connection.to === id) && this.isAllowedToConnectTo(window.nodeEditor.getNodeById(id).type.name);
    }

    addConnection(connection) {
        this.connections.push(connection);
    }

    removeConnection(connection) {
        this.connections = this.connections.filter(c => c !== connection);
    }

    removeConnectionById(id) {
        this.connections = this.connections.filter(c => c.id !== id);
    }

    getPosX(editorWidth, zoom, x) {
        return editorWidth / 2 + (x * zoom);
    }

    getPosY(editorHeight, zoom, y) {
        return editorHeight / 2 + (y * zoom);
    }

    openContextMenu(e, menuClassState, menuPositionState, zoom, editorSize, rerenderCallback) {
        if (e.target.nodeName === "INPUT") {
            return;
        }
        e.preventDefault();
        menuClassState.value = menuClassState.value === 'hidden' ? '_' : 'hidden';
        const nodeSize = {
            width: e.target.clientWidth,
            height: e.target.clientHeight
        };
        menuPositionState.value = {
            x: e.clientX - this.getPosX(editorSize.width, zoom, this.position.x) + nodeSize.width / 2,
            y: e.clientY - this.getPosY(editorSize.height, zoom, this.position.y) + nodeSize.height / 2
        };
        document.addEventListener("click", () => {
            menuClassState.value = 'hidden';
            rerenderCallback();
        }, {once: true});
    }

    moveWithMouse(id, snapToGrid, zoomState, e) {
        if (e.target.nodeName === "INPUT") {
            return;
        }
        const mousex = e.clientX;
        const mousey = e.clientY;
        const node = document.getElementById(id);
        const nodeX = node.offsetLeft;
        const nodeY = node.offsetTop;
        const diffX = mousex - nodeX;
        const diffY = mousey - nodeY;
        const snapSize = 10;
        const move = e => {
            let newX = e.clientX - diffX;
            let newY = e.clientY - diffY;
            if (snapToGrid) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
            }
            newX = newX / zoomState.value;
            newY = newY / zoomState.value;
            node.style.left = `${newX}px`;
            node.style.top = `${newY}px`;
            this.position = {
                x: newX - window.innerWidth / (2 * zoomState.value),
                y: newY - window.innerHeight / (2 * zoomState.value)
            };
            this.positionState.value = this.position;
            window.nodeEditor.rerender();
        };
        const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }

    getDomNode() {
        const domNode = document.getElementById(this.id);
        if (!domNode) {
            console.error(`Node with id ${this.id} not found`);
            return {
                classList: {
                    add: () => {
                    },
                    remove: () => {
                    }
                }
            };
        }
        return domNode;
    }

    highlightAsConnectionTarget() {
        this.getDomNode().classList.add("incoming");
    }

    highlightAsConnectionSource() {
        this.getDomNode().classList.add("outgoing");
    }

    highlightAsConnectionRemoval() {
        this.getDomNode().classList.add("removal");
    }

    unhighlightAsConnectionTarget() {
        this.getDomNode().classList.remove("incoming");
    }

    unhighlightAsConnectionSource() {
        this.getDomNode().classList.remove("outgoing");
    }

    unhighlightAsConnectionRemoval() {
        this.getDomNode().classList.remove("removal");
    }

    toggleSelection(e) {
        if (window.nodeEditor.nodeIsSelected(this.id)) {
            if (e.ctrlKey) {
                window.nodeEditor.removeSelectedNode(this.id);
            } else {
                window.nodeEditor.unselectAllExcept(this.id);
            }
        } else {
            if (e.ctrlKey) {
                window.nodeEditor.addSelectedNode(this.id);
            } else {
                window.nodeEditor.unselectAllExcept(this.id);
            }
        }
    }

    startConnecting(e) {
        e.stopPropagation();
        window.nodeEditor.startNodeConnection(this.id);
        document.addEventListener("click", e => {
            if (e.target.classList.contains("node")) {
                window.nodeEditor.finishNodeConnection(this.id, e.target.id);
                return;
            }

            const closestNode = e.target.closest(".node");
            if (closestNode) {
                window.nodeEditor.finishNodeConnection(this.id, closestNode.id);
            } else {
                window.nodeEditor.finishNodeConnection(this.id, null);
            }
        }, {once: true});
    }
}