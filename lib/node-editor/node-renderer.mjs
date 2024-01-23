import {FJS, FjsObservable} from "https://fjs.targoninc.com/f.js";

export class NodeDomRenderer {
    constructor(editor) {
        this.editor = editor;
        this.editor.setRenderer(() => {
            this.#renderFrame();
        });
        this.container = null;
    }

    start(container) {
        this.container = container;
        this.#renderFrame();
    }

    #renderFrame() {
        if (this.container) {
            this.container.innerHTML = '';
            const editorSize = {
                width: this.container.clientWidth,
                height: this.container.clientHeight
            };
            window.onresize = () => {
                this.#renderFrame();
            }
            this.container.appendChild(this.#renderEditor(editorSize, this.#renderFrame.bind(this)));
            this.container.appendChild(this.#renderConnections());
        }
    }
    
    #renderEditor(editorSize, rerenderCallback) {
        const menuClassState = new FjsObservable('hidden');
        const menuPositionState = new FjsObservable({x: 0, y: 0});
        const editorX = new FjsObservable(this.editor.position.value.x + "px");
        const editorY = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            editorX.value = position.x + "px";
            editorY.value = position.y + "px";
        }

        return FJS.create("div")
            .classes("node-editor")
            .id("node-editor")
            .onmousedown(e => {
                this.editor.moveOffset(e);
            })
            .ondblclick(() => {
                this.editor.position.value = {x: 0, y: 0};
            })
            .oncontextmenu((e) => {
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
            })
            .children(
                FJS.create("div")
                    .classes("node-editor-nodes")
                    .id("node-editor-nodes")
                    .styles("margin-left", editorX, "margin-top", editorY)
                    .children(...this.editor.nodes.map(node => node.render(editorSize, this.editor.position, rerenderCallback)))
                    .build(),
                this.#renderEditorMenu(menuPositionState, menuClassState, editorSize, rerenderCallback)
            ).build();
    }

    #renderEditorMenu(positionState, classState, editorSize) {
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
                        this.editor.addNodeFromMenu(positionState, editorSize);
                    })
                    .build(),
            ).build();
    }

    #renderConnections() {
        const xState = new FjsObservable(this.editor.position.value.x + "px");
        const yState = new FjsObservable(this.editor.position.value.y + "px");
        this.editor.position.onUpdate = position => {
            xState.value = position.x + "px";
            yState.value = position.y + "px";
        };

        return FJS.create("div")
            .classes("node-editor-connections")
            .id("node-editor-connections")
            .styles("left", xState, "top", yState)
            .children(...this.editor.nodes.map(node => this.#renderNodeConnections(node)))
            .build();
    }

    #renderNodeConnections(node) {
        return FJS.create("div")
            .classes("node-connections")
            .id(`${node.id}-connections`)
            .children(...node.connections.map(connection => connection.render()))
            .build();
    }
}