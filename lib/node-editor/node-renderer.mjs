export class NodeDomRenderer {
    constructor(editor) {
        this.editor = editor;
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
            this.container.appendChild(this.editor.render(editorSize));
            this.container.appendChild(this.editor.renderConnections());
        }
    }
}