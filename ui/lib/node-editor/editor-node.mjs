import {EditorConnection} from "./editor-connection.mjs";
import {IdGenerator} from "./utilities/id-generator.mjs";
import {InputField} from "./input-field.mjs";
import {ValueTypes} from "./value-types.mjs";
import {signal, store} from "https://fjs.targoninc.com/f.js";
import {StoreKeys} from "./enums/store-keys.mjs";

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
        this.positionState = signal(position);
        this.connections = connections.map(connection => new EditorConnection(connection.from, connection.to, connection.id));
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
                store().get(StoreKeys.nodeEditor).rerender();
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
        return !this.connections.find(connection => connection.to === id) && this.isAllowedToConnectTo(store().get(StoreKeys.nodeEditor).getNodeById(id).type.name);
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

    moveNode(node, offsetX, offsetY, zoomState, snapToGrid) {
        const snapSize = 10;
        let newX = offsetX;
        let newY = offsetY;
        if (snapToGrid) {
            newX = Math.round(newX / snapSize) * snapSize;
            newY = Math.round(newY / snapSize) * snapSize;
        }
        newX = newX / zoomState.value;
        newY = newY / zoomState.value;
        const editor = store().get(StoreKeys.nodeEditor);
        const nodeInstance = editor.getNodeById(node.id);
        nodeInstance.position = {
            x: newX - window.innerWidth / (2 * zoomState.value),
            y: newY - window.innerHeight / (2 * zoomState.value)
        };
        nodeInstance.positionState.value = nodeInstance.position;
        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;
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

        const editor = store().get(StoreKeys.nodeEditor);
        const move = e => {
            const offsetX = e.clientX - diffX;
            const offsetY = e.clientY - diffY;
            const selectedNodes = editor.selectedNodes;
            selectedNodes.forEach(selectedNodeId => {
                const selectedNode = document.getElementById(selectedNodeId);
                this.moveNode(selectedNode, offsetX, offsetY, zoomState, snapToGrid);
            });
            editor.rerender();
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
        if (store().get(StoreKeys.nodeEditor).nodeIsSelected(this.id)) {
            if (e.ctrlKey) {
                store().get(StoreKeys.nodeEditor).removeSelectedNode(this.id);
            } else {
                store().get(StoreKeys.nodeEditor).unselectAllExcept(this.id);
            }
        } else {
            if (e.ctrlKey) {
                store().get(StoreKeys.nodeEditor).addSelectedNode(this.id);
            } else {
                store().get(StoreKeys.nodeEditor).unselectAllExcept(this.id);
            }
        }
    }

    startConnecting(e) {
        e.stopPropagation();
        store().get(StoreKeys.nodeEditor).startNodeConnection(this.id);
        document.addEventListener("click", e => {
            if (e.target.classList.contains("node")) {
                store().get(StoreKeys.nodeEditor).finishNodeConnection(this.id, e.target.id);
                return;
            }

            const closestNode = e.target.closest(".node");
            if (closestNode) {
                store().get(StoreKeys.nodeEditor).finishNodeConnection(this.id, closestNode.id);
            } else {
                store().get(StoreKeys.nodeEditor).finishNodeConnection(this.id, null);
            }
        }, {once: true});
    }
}