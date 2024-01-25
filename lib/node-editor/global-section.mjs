export class GlobalSection {
    /**
     *
     * @param name {string}
     * @param fields {InputField[]}
     */
    constructor(name, fields = []) {
        this.name = name;
        this.fields = fields;
    }

    set(key, value) {
        const field = this.fields.find(field => field.name === key);
        field.value = value;
    }

    get(key) {
        return this.fields.find(field => field.name === key).value;
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