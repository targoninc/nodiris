export const Keymap = {
    toggleFieldConnections: {
        keys: ["c"],
        action: () => {
            window.nodeEditor.toggleFieldConnections();
        }
    },
    toggleTheme: {
        keys: ["t"],
        action: () => {
            window.nodeEditor.toggleTheme();
        }
    },
    toggleGrid: {
        keys: ["g"],
        action: () => {
            window.nodeEditor.toggleGrid();
        }
    },
}