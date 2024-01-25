export class GlobalSection {
    /**
     *
     * @param name {string}
     * @param values {Object}
     * @param fields {InputField[]}
     */
    constructor(name, values = {}, fields = []) {
        this.name = name;
        this.values = values;
        this.fields = fields;
    }

    set(key, value) {
        this.values[key] = value;
    }

    get(key) {
        return this.values[key];
    }

    addField(field) {
        this.fields.push(field);
    }

    removeFieldByName(name) {
        this.fields = this.fields.filter(field => field.name !== name);
    }

    getFieldByName(name) {
        return this.fields.find(field => field.name === name);
    }
}