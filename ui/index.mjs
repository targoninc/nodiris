import {NodeEditor} from "./lib/node-editor/node-editor.mjs";
import {NodeEditorDomRenderer} from "./lib/node-editor/renderers/dom-renderer.mjs";
import {ValueTypes} from "./lib/node-editor/value-types.mjs";
import {EditorNode} from "./lib/node-editor/editor-node.mjs";
import {InputField} from "./lib/node-editor/input-field.mjs";
import {NodeType} from "./lib/node-editor/node-type.mjs";


const types = [
    new NodeType("Choice", [
        new InputField("Message", ValueTypes.string, "", true),
        new InputField("Message function", ValueTypes.function, "", true),
    ], {
        canConnectTo: ["Narrator"],
    }),
    new NodeType("Narrator", [
        new InputField("Message", ValueTypes.string, "", true),
        new InputField("Message function", ValueTypes.function, "", true),
    ], {
        canConnectTo: ["Choice"],
    }),
];

const nodes = [
    new EditorNode(types[0], { x: 0, y: 0 }, [
        new InputField("Message", ValueTypes.string, "What if I say this?"),
    ]),
    new EditorNode(types[1], { x: 200, y: 200 }, [
        new InputField("Message", ValueTypes.string, "Then you get this answer!"),
    ]),
];

const globals = [];

nodes[0].connect(nodes[1].id);
const existingEditor = sessionStorage.getItem("editor");
let editor;
if (!existingEditor) {
    editor = NodeEditor.create(types, nodes, globals);
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