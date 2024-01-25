import {NodeEditor} from "./lib/node-editor/node-editor.mjs";
import {NodeEditorDomRenderer} from "./lib/node-editor/renderers/dom-renderer.mjs";
import {ValueTypes} from "./lib/node-editor/value-types.mjs";
import {EditorNode} from "./lib/node-editor/editor-node.mjs";
import {InputField} from "./lib/node-editor/input-field.mjs";
import {NodeType} from "./lib/node-editor/node-type.mjs";


const types = [
    new NodeType("testType", [
        new InputField("testNumber", ValueTypes.number, 3, true),
        new InputField("testString", ValueTypes.string, "test", true)
    ]),
    new NodeType("testType2", [
        new InputField("testNumberSomething", ValueTypes.number, 2, true),
        new InputField("testNumber", ValueTypes.number, 4, true),
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
const renderer = new NodeEditorDomRenderer(editor);
renderer.start(document.getElementById("editor"));

/*
setInterval(() => {
    sessionStorage.setItem("editor", JSON.stringify(editor));
}, 100);
 */