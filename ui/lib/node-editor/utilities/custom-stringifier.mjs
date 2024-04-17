import {FjsObservable} from "https://fjs.targoninc.com/f.js";

export class CustomStringifier {
    static isFjsObservable(obj) {
        if (!obj) {
            return false;
        }
        return obj.constructor === FjsObservable;
    }

    static stringify(obj, circularCheckExclusionProps = []) {
        if (this.isFjsObservable(obj)) {
            return JSON.stringify(obj.value);
        }

        const seen = [];
        return JSON.stringify(obj, (key, val) => {
            if (typeof val === "object") {
                if (this.isFjsObservable(val)) {
                    return val.value;
                }

                // avoid circular references
                if (seen.indexOf(val) >= 0) {
                    if (circularCheckExclusionProps.includes(key)) {
                        return val;
                    }
                    return;
                }

                seen.push(val);
            }

            return val;
        });
    }
}