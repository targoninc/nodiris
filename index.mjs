import {EditorNode, NodeEditor, NodeField, NodeType, ValueTypes} from "./lib/node-editor/node-editor.mjs";
import {NodeDomRenderer} from "./lib/node-editor/node-renderer.mjs";


const types = [
    new NodeType("testType", [
        new NodeField("testNumber", ValueTypes.number, 3),
        new NodeField("testString", ValueTypes.string, "test")
    ]),
    new NodeType("testType2", [
        new NodeField("testNumberSomething", ValueTypes.number, 2),
        new NodeField("testNumber", ValueTypes.number, 4),
    ]),
];

const nodes = [
    new EditorNode(types[0], { x: -100, y: -100 }),
    new EditorNode(types[0], { x: 100, y: 100 }),
];

nodes[0].connect(nodes[1].id);
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