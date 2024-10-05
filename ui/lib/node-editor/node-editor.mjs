import {signal, store} from "https://fjs.targoninc.com/f.js";
import {ValueTypes} from "./value-types.mjs";
import {EditorNode} from "./editor-node.mjs";
import {InputField} from "./input-field.mjs";
import {NodeType} from "./node-type.mjs";
import {DefaultEditorSettings} from "./default-editor-settings.mjs";
import {GlobalSection} from "./global-section.mjs";
import {DefaultEditorGraphinfo} from "./default-editor-graphinfo.mjs";
import {Api} from "./api/api.mjs";
import {StoreKeys} from "./enums/store-keys.mjs";
import {UiText} from "./enums/ui-text.mjs";
import {CustomStringifier} from "./utilities/custom-stringifier.mjs";

export class NodeEditor {
    /**
     *
     * @param graphInfo {Object}
     * @param types {NodeType[]}
     * @param nodes {EditorNode[]}
     * @param globals {GlobalSection[]}
     * @param settings {DefaultEditorSettings | Object}
     * @returns {NodeEditor}
     */
    static create(graphInfo = {}, types = [], nodes = [], globals = [], settings = DefaultEditorSettings) {
        return new NodeEditor(graphInfo, types, nodes, globals, settings);
    }

    /**
     *
     * @param graphInfo {Object}
     * @param types {NodeType[]}
     * @param nodes {EditorNode[]}
     * @param globals {GlobalSection[]}
     * @param settings {DefaultEditorSettings | Object}
     */
    constructor(graphInfo = {}, types = [], nodes = [], globals = [], settings = DefaultEditorSettings) {
        this.graphInfo = signal(graphInfo ?? DefaultEditorGraphinfo);
        this.nodeTypes = types;
        this.nodes = nodes;
        this.globals = globals;
        this.position = signal({x: 0, y: 0});
        this.zoomState = signal(1);
        this.settings = settings;
        this.selectedNodes = [];
        this.userGraphs = [];
        this.authenticationEnabled = signal(false);
        this.user = signal(null);
        this.uiStates = {
            selectedTab: signal("globals"),
        };

        store().set(StoreKeys.tabKey$, this.uiStates.selectedTab);
        store().set(StoreKeys.nodeEditor, this);

        this.rerender = () => {
            console.log("rerender method is not set. Make sure your renderer is set up correctly.");
        };
        this.initialize();
    }

    resetGraph() {
        this.nodeTypes = [];
        this.nodes = [];
        this.globals = [];
        this.position.value = {x: 0, y: 0};
        this.zoomState.value = 1;
        this.selectedNodes = [];
        this.settings = DefaultEditorSettings;
        this.graphInfo = signal(DefaultEditorGraphinfo);
        this.setTitle(this.graphInfo.value.name);
    }

    stringify() {
        const circularCheckExclusionProps = ["type"];
        const base = JSON.parse(CustomStringifier.stringify(this, circularCheckExclusionProps));
        delete base["user"];
        delete base["authenticationEnabled"];
        delete base["userGraphs"];
        delete base["selectedNodes"];
        return JSON.stringify(base);
    }

    initialize() {
        this.loadAuthentication();
        this.setTitle(this.graphInfo.value.name);
    }

    loadAuthentication() {
        Api.authenticationEnabled().then(enabled => {
            this.authenticationEnabled.value = enabled;
            if (enabled) {
                this.loadUser();
            }
        });
    }

    loadUser() {
        Api.isAuthorized().then(res => {
            if (res.user) {
                console.log("User is already authorized");
                this.user.value = res.user;
                this.loadUserGraphs();
            } else {
                console.log("User is not authorized");
            }
        });
    }

    loadUserGraphs() {
        Api.getUserGraphs().then(res => {
            this.userGraphs = res.graphs;
        });
    }

    addGlobalSection(name) {
        this.globals.push(new GlobalSection(name));
    }

    removeGlobalSection(name) {
        this.globals = this.globals.filter(global => global.name !== name);
    }

    setRenderer(method) {
        this.rerender = (...args) => {
            this.consistencyCheck();
            method(...args);
        };
    }

    consistencyCheck() {
        for (const node of this.nodes) {
            for (const connection of node.connections) {
                if (!this.nodes.find(n => n.id === connection.to)) {
                    node.disconnect(connection.to);
                }
            }

            for (const field of node.fields) {
                for (const nodeType of this.nodeTypes) {
                    if (nodeType.name === node.type.name) {
                        node.setType(nodeType);
                    }
                }
            }
        }
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

    duplicateNode(node) {
        const clone = new EditorNode(node.type, {x: node.position.x + 10, y: node.position.y + 10});
        for (const field of node.fields) {
            clone.set(field.name, field.value);
        }
        this.nodes.push(clone);
        this.rerender();
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

    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }

    startNodeConnection(fromId) {
        const sourceNode = this.nodes.find(node => node.id === fromId);
        sourceNode.highlightAsConnectionSource();
        for (const node of this.nodes) {
            if (node.id === fromId) {
                continue;
            }

            if (sourceNode.isAllowedToConnectTo(node.type.name) && sourceNode.canConnectTo(node.id)) {
                if (!this.nodeConnectionWouldRecurse(sourceNode, node)) {
                    node.highlightAsConnectionTarget();
                }
            }

            if (!sourceNode.canConnectTo(node.id) && sourceNode.isAllowedToConnectTo(node.type.name)) {
                node.highlightAsConnectionRemoval();
            }
        }
    }

    fieldHasIncomingConnection(id) {
        return this.getAllFields().find(field => field.connections.find(connection => connection.to === id));
    }

    fieldHasOutgoingConnection(id) {
        return this.getAllFields().find(field => field.connections.find(connection => connection.from === id));
    }

    getIncomingFieldConnections(id) {
        return this.getAllFields().filter(field => field.connections.find(connection => connection.to === id));
    }

    fieldIsReadonly(id) {
        const field = this.getFieldById(id);
        return this.fieldHasIncomingConnection(id) && field.type !== ValueTypes.function;
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
        const isRemoval = sourceField && !sourceField.canConnectTo(toId);
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

    startSelecting(e) {
        if (e.target.id !== "node-editor" && e.target.id !== "node-editor-nodes") {
            return;
        }
        document.querySelector(".node-editor").classList.add("selecting");
        const mouseStart = {
            x: e.clientX,
            y: e.clientY
        };
        const selectBox = document.createElement("div");
        selectBox.classList.add("select-box");
        document.body.appendChild(selectBox);
        const move = e => {
            const width = Math.abs(e.clientX - mouseStart.x);
            const height = Math.abs(e.clientY - mouseStart.y);
            selectBox.style.width = width + "px";
            selectBox.style.height = height + "px";
            selectBox.style.left = Math.min(mouseStart.x, e.clientX) + "px";
            selectBox.style.top = Math.min(mouseStart.y, e.clientY) + "px";
        };
        const stop = () => {
            const selectedNodes = this.nodes.filter(node => {
                const nodeElement = document.getElementById(node.id);
                if (!nodeElement) {
                    return false;
                }
                const nodeRect = nodeElement.getBoundingClientRect();
                const selectRect = selectBox.getBoundingClientRect();
                return nodeRect.left < selectRect.right &&
                    nodeRect.right > selectRect.left &&
                    nodeRect.top < selectRect.bottom &&
                    nodeRect.bottom > selectRect.top;
            });
            this.unselectAllExcept();
            for (const node of selectedNodes) {
                this.addSelectedNode(node.id);
            }
            selectBox.remove();
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
            document.querySelector(".node-editor").classList.remove("selecting");
            this.rerender();
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    }

    addSelectedNode(id) {
        this.selectedNodes.push(id);
    }

    removeSelectedNode(id) {
        this.selectedNodes = this.selectedNodes.filter(nid => nid !== id);
    }

    unselectAllExcept(id = null) {
        if (!id) {
            this.selectedNodes = [];
            return;
        }
        this.selectedNodes = [id];
    }

    nodeIsSelected(id) {
        return this.selectedNodes.includes(id);
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
        const nodeEditorDom = document.querySelector(".node-editor");
        nodeEditorDom.classList.add("grabbing");
        const move = e => {
            this.position.value = {
                x: editorStart.x + e.clientX - mouseStart.x,
                y: editorStart.y + e.clientY - mouseStart.y
            };
            //this.rerender();
        };
        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
            nodeEditorDom.classList.remove("grabbing");
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

    removeSelectedNodes() {
        for (const id of this.selectedNodes) {
            this.removeNodeById(id);
        }
        this.selectedNodes = [];
        this.rerender();
    }

    propagateValues() {
        for (const field of this.getAllFields()) {
            field.propagateValue();
        }
    }

    toggleFieldConnections() {
        this.settings.showFieldConnections = !this.settings.showFieldConnections;
    }

    toggleGrid() {
        this.settings.showGrid = !this.settings.showGrid;
        this.rerender();
    }

    setGraphName(name) {
        this.graphInfo.value = {
            ...this.graphInfo.value,
            name
        };
        this.setTitle(this.graphInfo.value.name);
    }

    setTitle(title) {
        document.title = 'Nodiris - ' + title;
    }

    static fromJSON(parse) {
        const types = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
            return new InputField(field.name, fieldType, field.default, field.required, field.shown, field.connections, field.value, field.id);
        }), type.options));
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
        const settings = parse.settings ?? DefaultEditorSettings;
        const graphInfo = parse.graphInfo ?? DefaultEditorGraphinfo;
        return new NodeEditor(graphInfo, types, nodes, globals, settings);
    }

    loadFromJSON(parse) {
        this.nodeTypes = parse.nodeTypes.map(type => new NodeType(type.name, type.fields.map(field => {
            const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
            return new InputField(field.name, fieldType, field.default, field.required, field.shown, field.connections, field.value, field.id);
        }), type.options));
        this.nodes = parse.nodes.map(node => {
            const type = this.nodeTypes.find(type => type.name === node.type.name);
            return new EditorNode(type, node.position, node.fields, node.id, node.connections);
        });
        this.globals = parse.globals.map(global => {
            return new GlobalSection(global.name, global.fields.map(field => {
                const fieldType = Object.values(ValueTypes).find(type => type.name === field.type.name);
                return new InputField(field.name, fieldType, field.default, field.required, field.shown, field.connections, field.value, field.id);
            }));
        });
        this.settings = parse.settings;
        this.graphInfo = signal(parse.graphInfo);
        this.selectedNodes = [];
        this.setTitle(this.graphInfo.value.name);
    }

    handleNodeClick(e, node) {
        if (this.lastNodeClick && this.lastNodeClick.node === node && Date.now() - this.lastNodeClick.time < 300) {
            this.unselectAllExcept();
            this.rerender();
            node.startConnecting(e);
        }
        this.lastNodeClick = {
            node: node,
            time: Date.now()
        };
    }

    uploadJsonHandler(uploadIconState, uploadTextState) {
        uploadIconState.value = "input";
        uploadTextState.value = UiText.get("selecting") + "...";
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            if (!input.files[0]) {
                uploadIconState.value = "upload";
                uploadTextState.value = UiText.get("upload");
                return;
            }
            uploadIconState.value = "cached";
            uploadTextState.value = UiText.get("loading") + "...";
            const reader = new FileReader();
            reader.onload = () => {
                const json = JSON.parse(reader.result);
                this.loadFromJSON(json);
                this.rerender(true);
                uploadIconState.value = "upload";
                uploadTextState.value = UiText.get("upload");
            };
            reader.readAsText(input.files[0]);
        };
        input.click();
    }
}

