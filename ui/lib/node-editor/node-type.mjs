export class NodeType {
    constructor(name, fields = [], options = {}) {
        this.name = name;
        this.fields = fields;
        this.options = options;
    }

    addField(field) {
        this.fields.push(field);
    }

    setOption(key, value) {
        this.options[key] = value;
    }

    getOption(key) {
        return this.options[key];
    }

    updateField(field) {
        this.fields = this.fields.map(f => f.name === field.name ? field : f);
    }

    removeFieldByName(name) {
        this.fields = this.fields.filter(field => field.name !== name);
    }

    setFieldType(name, type) {
        const field = this.fields.find(field => field.name === name);
        field.type = type;
    }

    setFieldDefault(name, defaultValue) {
        const field = this.fields.find(field => field.name === name);
        field.default = defaultValue;
    }
}