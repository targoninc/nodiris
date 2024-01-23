import {FjsObservable} from "https://fjs.targoninc.com/f.js";

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
            const editorPosition = new FjsObservable({x: 0, y: 0});
            window.onresize = () => {
                this.#renderFrame();
            }
            this.container.appendChild(this.editor.render(editorSize, editorPosition, this.#renderFrame.bind(this)));
            this.container.appendChild(this.editor.renderConnections(editorPosition));
        }
    }
}