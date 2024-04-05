import {Api} from "./api.mjs";

export class Auth {
    static async userState() {
        return await Api.isAuthorized();
    }

    static async authorize(username, password) {
        return await Api.authorize(username, password);
    }

    static async logout() {
        await Api.logout();
    }
}