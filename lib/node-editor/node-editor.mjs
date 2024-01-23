import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";
import {ValueTypes} from "./value-types.mjs";
import {EditorNode} from "./editor-node.mjs";
import {NodeField} from "./node-field.mjs";
import {NodeType} from "./node-type.mjs";

export class NodeEditor {
    static create(types = [], nodes = []) {
        return new NodeEditor(types, nodes);
    }

    constructor(types = [], nodes = []) {
        this.nodeTypes = types;
        this.nodes = nodes;
        window.nodeEditor = this;
        this.rerender = () => {};
    }

    addNodeType(type) {
        this.nodeTypes.push(type);
    }

    updateNodeType(type) {
        this.nodeTypes = this.nodeTypes.map(t => t.name === type.name ? type : t);
    }

    removeNodeTypeByName(name) {
        this.nodeTypes = this.nodeTypes.filter(type => type.name !== name);
        this.removeNodesByType(name);
    }

    getNodesByType(type) {
        return this.nodes.filter(node => node.type === type);
    }

    /**
     *
     * @param node {EditorNode}
     */
    addNode(node) {
        this.nodes.push(node);
    }

    /**
     *
     * @param name {string}
     */
    removeNodeByName(name) {
        this.nodes = this.nodes.filter(node => node.name !== name);
    }

    /**
     *
     * @param id {string}
     */
    removeNodeById(id) {
        this.nodes = this.nodes.filter(node => node.id !== id);
        for (const node of this.nodes) {
            node.connections = node.connections.filter(connection => connection.to !== id);
        }
    }

    /**
     *
     * @param type {string}
     */
    removeNodesByType(type) {
        this.nodes = this.nodes.filter(node => node.type.name !== type);
    }

    startConnection(fromId) {
        const sourceNode = this.nodes.find(node => node.id === fromId);
        for (const node of this.nodes) {
            if (node.id !== fromId) {
                if (sourceNode.canConnectTo(node.id)) {
                    node.highlightAsConnectionTarget();
                }
            } else {
                node.highlightAsConnectionSource();
            }
        }
    }

    finishConnection(fromId, toId) {
        for (const node of this.nodes) {
            if (node.id !== fromId) {
                node.unhighlightAsConnectionTarget();
            } else {
                node.unhighlightAsConnectionSource();
            }
        }
        if (!toId) {
            return;
        }
        const fromNode = this.nodes.find(node => node.id === fromId);
        const toNode = this.nodes.find(node => node.id === toId);
        fromNode.connect(toNode.id);
        this.rerender();
    }

    render(editorSize, editorPosition, rerenderCallback) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});
        const editorX = new FjsObservable(editorPosition.value.x + "px");
        const editorY = new FjsObservable(editorPosition.value.y + "px");
        editorPosition.onUpdate = position => {
            editorX.value = position.x + "px";
            editorY.value = position.y + "px";
        }
        this.rerender = rerenderCallback;

        return FJS.create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                this.moveOffset(editorPosition, e);
            })
            .ondblclick(e => {
                editorPosition.value = {x: 0, y: 0};
            })
            .oncontextmenu((e) => {
                if (e.target.id !== "node-editor") {
                    return;
                }
                e.preventDefault();
                menuClassState.value = menuClassState.value === 'hidden' ? '_' : 'hidden';
                menuPositionState.value = {x: e.clientX, y: e.clientY};
                document.addEventListener("click", () => {
                    menuClassState.value = 'hidden';
                    rerenderCallback();
                }, {once: true});
            })
            .children(
                FJS.create("div")
                    .classes("node-editor-nodes")
                    .styles("margin-left", editorX, "margin-top", editorY)
                    .children(...this.nodes.map(node => node.render(editorSize, rerenderCallback)))
                    .build(),
                this.renderMenu(menuPositionState, menuClassState, editorSize, rerenderCallback)
            )
            .build();
    }

    moveOffset(editorPosition, e) {
        if (e.target.id !== "node-editor") {
            return;
        }
        const mouseStart = {
            x: e.clientX,
            y: e.clientY
        };
        const editorStart = {
            x: editorPosition.value.x,
            y: editorPosition.value.y
        };
        const move = e => {
            editorPosition.value = {
                x: editorStart.x + e.clientX - mouseStart.x,
                y: editorStart.y + e.clientY - mouseStart.y
            };
        };
        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    }

    renderMenu(positionState, classState, editorSize) {
        const xState = new FjsObservable(positionState.value.x + "px");
        const yState = new FjsObservable(positionState.value.y + "px");
        positionState.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return FJS.create("div")
            .classes("node-editor-menu", classState)
            .styles("left", xState, "top", yState)
            .children(
                FJS.create("div")
                    .classes("node-editor-menu-item")
                    .text("Add node")
                    .onclick(() => {
                        const position = {
                            x: positionState.value.x - editorSize.width / 2,
                            y: positionState.value.y - editorSize.height / 2
                        };
                        this.addNode(new EditorNode(this.nodeTypes[0], position));
                    })
                    .build(),
            ).build();
    }

    renderConnections(editorPosition) {
        const xState = new FjsObservable(editorPosition.value.x + "px");
        const yState = new FjsObservable(editorPosition.value.y + "px");
        editorPosition.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return FJS.create("div")
            .classes("node-editor-connections")
            .id("node-editor-connections")
            .styles("left", xState, "top", yState)
            .children(...this.nodes.map(node => node.renderConnections()))
            .build();
    }

    static fromJSON(parse) {
        const types = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
            return new NodeField(field.name, fieldType, field.default, field.required, field.shown);
        })));
        const nodes = parse.nodes.map(node => {
            const type = types.find(type => type.name === node.type.name);
            return new EditorNode(type, node.position, node.values, node.id);
        });
        return new NodeEditor(types, nodes);
    }
}

