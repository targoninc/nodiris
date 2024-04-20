import {UiActions} from "../renderers/ui-actions.mjs";

export class Api {
    static async authenticationEnabled() {
        const res = await fetch(`/api/authenticationEnabled`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        });
        return res.status === 200;
    }

    static async authorize(username, password) {
        const res = await fetch(`/api/authorize`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });
        return await Api.basicResponseHandling(res);
    }

    static async isAuthorized() {
        const res = await fetch(`/api/isAuthorized`, {
            credentials: 'include'
        });
        return await Api.basicResponseHandling(res);
    }

    static async logout() {
        const res = await fetch(`/api/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        return await Api.basicResponseHandling(res);
    }

    static async saveAvatar(avatar) {
        const res = await fetch(`/api/saveAvatar`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                avatar
            })
        });
        return await Api.basicResponseHandling(res, true);
    }

    static async saveGraph(json) {
        const res = await fetch(`/api/saveGraph`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                graph: json
            })
        });
        return await Api.basicResponseHandling(res);
    }

    static async getUserGraphs() {
        const res = await fetch(`/api/getUserGraphs`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
        });
        return await Api.basicResponseHandling(res);
    }

    static async deleteGraph(id) {
        const res = await fetch(`/api/deleteGraph`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                id
            })
        });
        return await Api.basicResponseHandling(res, true);
    }

    static async basicResponseHandling(res, doesNotExpectJson = false) {
        if (res.status !== 200) {
            const text = await res.text();
            UiActions.toast(text, "error");
            return {
                error: text
            };
        }
        return doesNotExpectJson ? {} : await res.json();
    }
}