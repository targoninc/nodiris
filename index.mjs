import {EditorNode, NodeEditor, NodeField, NodeType} from "./lib/node-editor/node-editor.mjs";
import {NodeDomRenderer} from "./lib/node-editor/node-renderer.mjs";


const types = [
    new NodeType("testType", [
        new NodeField("testNumber", "Number", 3),
        new NodeField("testString", "String", "test")
    ]),
];

const nodes = [
    new EditorNode(types[0])
];

const existingEditor = sessionStorage.getItem("editor");
let editor;
if (!existingEditor) {
    editor = NodeEditor.create(types, nodes);
} else {
    editor = NodeEditor.fromJSON(JSON.parse(existingEditor));
}
const renderer = new NodeDomRenderer(editor);
renderer.start(document.getElementById("editor"));

/*
setInterval(() => {
    sessionStorage.setItem("editor", JSON.stringify(editor));
}, 100);
 */