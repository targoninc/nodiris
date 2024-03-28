export class NodeType {
    constructor(name, fields = []) {
        this.name = name;
        this.fields = fields;
    }

    addField(field) {
        this.fields.push(field);
    }

    updateField(field) {
        this.fields = this.fields.map(f => f.name === field.name ? field : f);
    }

    removeFieldByName(name) {
        this.fields = this.fields.filter(field => field.name !== name);
    }
}