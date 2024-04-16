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
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
    }

    static async isAuthorized() {
        const res = await fetch(`/api/isAuthorized`, {
            credentials: 'include'
        });
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
    }

    static async logout() {
        const res = await fetch(`/api/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
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
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
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
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
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
        if (res.status !== 200) {
            return {
                error: await res.text()
            };
        }
        return await res.json();
    }
}