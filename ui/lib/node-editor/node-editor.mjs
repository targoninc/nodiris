import {FjsObservable} from "https://fjs.targoninc.com/f.js";
import {ValueTypes} from "./value-types.mjs";
import {EditorNode} from "./editor-node.mjs";
import {InputField} from "./input-field.mjs";
import {NodeType} from "./node-type.mjs";
import {DefaultEditorSettings} from "./default-editor-settings.mjs";
import {GlobalSection} from "./global-section.mjs";

export class NodeEditor {
    /**
     *
     * @param types {NodeType[]}
     * @param nodes {EditorNode[]}
     * @param globals {GlobalSection[]}
     * @param settings {DefaultEditorSettings | Object}
     * @returns {NodeEditor}
     */
    static create(types = [], nodes = [], globals = [], settings = DefaultEditorSettings) {
        return new NodeEditor(types, nodes, globals, settings);
    }

    /**
     *
     * @param types {NodeType[]}
     * @param nodes {EditorNode[]}
     * @param globals {GlobalSection[]}
     * @param settings {DefaultEditorSettings | Object}
     */
    constructor(types = [], nodes = [], globals = [], settings = DefaultEditorSettings) {
        this.nodeTypes = types;
        this.nodes = nodes;
        this.globals = globals;
        this.position = new FjsObservable({x: 0, y: 0});
        this.zoomState = new FjsObservable(1);
        window.nodeEditor = this;
        this.settings = settings;
        this.rerender = () => {
            console.log("rerender method is not set. Make sure your renderer is set up correctly.");
        };
        this.setTheme(this.settings.theme);
    }

    addGlobalSection(name) {
        this.globals.push(new GlobalSection(name));
    }

    removeGlobalSection(name) {
        this.globals = this.globals.filter(global => global.name !== name);
    }

    setRenderer(method) {
        this.rerender = method;
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
            for (const field of node.fields) {
                field.connections = field.connections.filter(connection => connection.to !== id);
            }
        }
        for (const global of this.globals) {
            for (const field of global.fields) {
                field.connections = field.connections.filter(connection => connection.to !== id);
            }
        }
    }

    /**
     *
     * @param type {string}
     */
    removeNodesByType(type) {
        this.nodes = this.nodes.filter(node => node.type.name !== type);
    }

    getAllFields() {
        const nodeFields = this.nodes.flatMap(node => node.fields);
        const globalFields = this.globals.flatMap(global => global.fields);
        return nodeFields.concat(globalFields);
    }

    getFieldById(id) {
        return this.getAllFields().find(field => field.id === id);
    }

    startNodeConnection(fromId) {
        const sourceNode = this.nodes.find(node => node.id === fromId);
        for (const node of this.nodes) {
            if (node.id !== fromId) {
                if (sourceNode.canConnectTo(node.id)) {
                    if (this.nodeConnectionWouldRecurse(sourceNode, node)) {
                        continue;
                    }
                    node.highlightAsConnectionTarget();
                } else {
                    node.highlightAsConnectionRemoval();
                }
            } else {
                node.highlightAsConnectionSource();
            }
        }
    }

    fieldHasIncomingConnection(id) {
        return this.getAllFields().find(field => field.connections.find(connection => connection.to === id));
    }

    fieldHasOutgoingConnection(id) {
        return this.getAllFields().find(field => field.connections.find(connection => connection.from === id));
    }

    fieldIsReadonly(id) {
        const field = this.getFieldById(id);
        return this.fieldHasIncomingConnection(id) && field.type !== ValueTypes.function;
    }

    setTheme(theme) {
        this.settings.theme = theme;
        this.removeThemeCss();
        this.addThemeCss();
    }

    removeThemeCss() {
        const stylesheets = document.querySelectorAll("link");
        for (const stylesheet of stylesheets) {
            if (stylesheet.href.includes("/themes")) {
                stylesheet.remove();
            }
        }
    }

    addThemeCss() {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = window.location.origin + `/lib/node-editor/themes/${this.settings.theme}.css`;
        document.head.appendChild(link);
    }

    startFieldConnection(sourceField) {
        sourceField.highlightAsConnectionSource();
        const fields = this.getAllFields();
        for (const field of fields) {
            if (field.id === sourceField.id) {
                continue;
            }

            if (this.fieldTypesAreCompatible(sourceField.type, field.type) && sourceField.canConnectTo(field.id)) {
                if (!this.fieldConnectionWouldRecurse(sourceField, field)) {
                    field.highlightAsConnectionTarget();
                }
            }

            if (!sourceField.canConnectTo(field.id)) {
                field.highlightAsConnectionRemoval();
            }
        }
    }

    finishNodeConnection(fromId, toId) {
        for (const node of this.nodes) {
            node.unhighlightAsConnectionTarget();
            node.unhighlightAsConnectionSource();
            node.unhighlightAsConnectionRemoval();
        }
        if (!toId) {
            return;
        }
        const fromNode = this.nodes.find(node => node.id === fromId);
        const toNode = this.nodes.find(node => node.id === toId);
        const isRemoval = !fromNode.canConnectTo(toNode.id);
        if (this.settings.preventCircularConnections) {
            if (this.nodeConnectionWouldRecurse(fromNode, toNode)) {
                console.log("Connection would recurse. Not connecting.");
                return;
            }
        }
        if (isRemoval) {
            fromNode.disconnect(toNode.id);
        } else {
            fromNode.connect(toNode.id);
        }
        this.rerender();
    }

    fieldTypesAreCompatible(sourceType, targetType) {
        if (sourceType === targetType) {
            return true;
        }

        return sourceType === ValueTypes.function || targetType === ValueTypes.function;
    }

    finishFieldConnection(fromId, toId) {
        const fields = this.getAllFields();
        const sourceField = fields.find(field => field.id === fromId);
        const isRemoval = !sourceField.canConnectTo(toId);
        sourceField.unhighlightAsConnectionSource();
        for (const field of fields) {
            if (field.id === fromId) {
                continue;
            }

            if (this.fieldTypesAreCompatible(sourceField.type, field.type) && sourceField.canConnectTo(field.id)) {
                field.unhighlightAsConnectionTarget();
            } else {
                field.unhighlightAsConnectionRemoval();
            }
        }
        if (!toId) {
            return;
        }
        const fromField = fields.find(field => field.id === fromId);
        const toField = fields.find(field => field.id === toId);
        if (isRemoval) {
            fromField.disconnect(toField.id);
        } else {
            if (this.fieldConnectionWouldRecurse(fromField, toField)) {
                console.log("Connection would recurse. Not connecting.");
                return;
            }
            fromField.connect(toField.id);
        }
        this.rerender();
    }

    nodeConnectionWouldRecurse(fromNode, toNode) {
        if (fromNode.id === toNode.id) {
            return true;
        }
        for (const connection of toNode.connections) {
            if (this.nodeConnectionWouldRecurse(fromNode, this.nodes.find(node => node.id === connection.to))) {
                return true;
            }
        }
        return false;
    }

    fieldConnectionWouldRecurse(fromField, toField) {
        if (fromField.id === toField.id) {
            return true;
        }
        const fields = this.getAllFields();
        for (const connection of toField.connections) {
            if (this.fieldConnectionWouldRecurse(fromField, fields.find(field => field.id === connection.to))) {
                return true;
            }
        }
        return false;
    }

    resetView() {
        this.position.value = {x: 0, y: 0};
        this.zoomState.value = 1;
        this.rerender();
    }

    getValue(fieldId) {
        const field = this.getAllFields().find(field => field.id === fieldId);
        if (!field) {
            return null;
        }
        return field.value;
    }

    openContextMenu(e, menuClassState, menuPositionState, rerenderCallback) {
        if (e.target.id !== "node-editor" && e.target.id !== "node-editor-nodes") {
            return;
        }
        e.preventDefault();
        menuClassState.value = menuClassState.value === 'hidden' ? '_' : 'hidden';
        menuPositionState.value = {x: e.clientX, y: e.clientY};
        document.addEventListener("click", () => {
            menuClassState.value = 'hidden';
            rerenderCallback();
        }, {once: true});
    }

    moveOffset(e) {
        if (e.target.id !== "node-editor" && e.target.id !== "node-editor-nodes") {
            return;
        }
        const mouseStart = {
            x: e.clientX,
            y: e.clientY
        };
        const editorStart = {
            x: this.position.value.x,
            y: this.position.value.y
        };
        const move = e => {
            this.position.value = {
                x: editorStart.x + e.clientX - mouseStart.x,
                y: editorStart.y + e.clientY - mouseStart.y
            };
            this.rerender();
        };
        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    }

    zoom(e) {
        const direction = e.deltaY > 0 ? -1 : 1;
        const zoom = this.zoomState.value + direction * 0.1;
        if (zoom < 0.1) {
            return;
        }

        this.zoomState.value = zoom;
        this.rerender();
    }

    addNodeFromMenu(positionState, editorSize) {
        const position = {
            x: (positionState.value.x / this.zoomState.value) - editorSize.width / (2 * this.zoomState.value),
            y: (positionState.value.y / this.zoomState.value) - editorSize.height / (2 * this.zoomState.value)
        };
        this.addNode(new EditorNode(this.nodeTypes[0], position));
    }

    propagateValues() {
        for (const field of this.getAllFields()) {
            field.propagateValue();
        }
    }

    toggleFieldConnections() {
        this.settings.showFieldConnections = !this.settings.showFieldConnections;
    }

    toggleTheme() {
        this.setTheme(this.settings.theme === "dark" ? "light" : "dark");
    }

    toggleGrid() {
        this.settings.showGrid = !this.settings.showGrid;
        this.rerender();
    }

    static fromJSON(parse) {
        const types = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
            return new InputField(field.name, fieldType, field.default, field.required, field.shown, field.connections, field.value, field.id);
        })));
        const nodes = parse.nodes.map(node => {
            const type = types.find(type => type.name === node.type.name);
            return new EditorNode(type, node.position, node.fields, node.id, node.connections);
        });
        const globals = parse.globals.map(global => {
            return new GlobalSection(global.name, global.fields.map(field => {
                const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
                return new InputField(field.name, fieldType, field.default, field.required, field.shown, field.connections, field.value, field.id);
            }));
        });
        const settings = parse.settings;
        return new NodeEditor(types, nodes, globals, settings);
    }
}

