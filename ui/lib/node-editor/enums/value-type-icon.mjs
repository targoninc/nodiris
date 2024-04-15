import {ValueTypes} from "../value-types.mjs";

export class ValueTypeIcon {
    static get(type) {
        switch (type) {
            case ValueTypes.function:
                return "function";
            case ValueTypes.number:
                return "pin";
            case ValueTypes.string:
                return "text_fields";
            case ValueTypes.boolean:
                return "check";
            case ValueTypes.object:
                return "data_object";
            case ValueTypes.array:
                return "list";
            default:
                return "icon-unknown";
        }
    }
}