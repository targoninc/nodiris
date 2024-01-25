export class IdGenerator {
    static generateId(length = 12) {
        let id = "";
        for (let i = 0; i < length; i++) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
        return id;
    }
}