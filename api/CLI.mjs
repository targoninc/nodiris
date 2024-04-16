export class CLI {
    static color(text, color, newLine = true) {
        process.stdout.write(`\x1b[${color}m${text}\x1b[0m${newLine ? "\n" : ""}`);
    }

    static error(text, newLine = true) {
        this.color(text, 31, newLine);
    }

    static warn(text, newLine = true) {
        this.color(text, 33, newLine);
    }

    static info(text, newLine = true) {
        this.color(text, 36, newLine);
    }

    static success(text, newLine = true) {
        this.color(text, 32, newLine);
    }

    static debug(text, newLine = true) {
        this.color(text, 35, newLine);
    }

    static out(text, newLine = true) {
        process.stdout.write(text + (newLine ? "\n" : ""));
    }

    static sameLineDiff(tokens, compareTokens) {
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === compareTokens[i]) {
                CLI.error(compareTokens[i] + " ", false);
            } else {
                CLI.success(tokens[i] + " ", false);
            }
        }
    }

    static rewrite(text) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(text);
    }

    static clear() {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
    }
}