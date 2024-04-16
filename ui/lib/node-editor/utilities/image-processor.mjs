export class ImageProcessor {
    static async getBase64Src(image) {
        if (!image) {
            return null;
        }
        if (window.avatarCache && window.avatarCache[image]) {
            return window.avatarCache[image];
        }
        let response;
        if (image.constructor.name === "Object") {
            let uint8Array = new Uint8Array(image.data);
            const blob = new Blob([uint8Array], {type: image.type});
            const base64 = await blob.text();
            response = `data:image/png;base64,${base64}`;
        } else {
            const base64 = image.toString('base64');
            response = `data:image/png;base64,${base64}`;
        }
        if (!window.avatarCache) {
            window.avatarCache = {};
        }
        window.avatarCache[image] = response;
        return response;
    }
}