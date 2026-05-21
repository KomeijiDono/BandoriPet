let currentRadialKey = null;

function registerGlobalKey(globalShortcut, win) {
    globalShortcut.unregisterAll();
    if (!currentRadialKey) return;
    let shortcutKey = currentRadialKey;
    if (shortcutKey === ' ') shortcutKey = 'Space';
    if (shortcutKey.length === 1) shortcutKey = shortcutKey.toUpperCase();

    try {
        globalShortcut.register(shortcutKey, () => {
            if (win && !win.isDestroyed()) win.webContents.send('trigger-global-radial');
        });
    } catch (err) {}
}

function initGlobalShortcut({ ipcMain, globalShortcut, win, app }) {
    ipcMain.on('register-radial-shortcut', (event, key) => {
        currentRadialKey = key;
        if (win && !win.isFocused()) {
            registerGlobalKey(globalShortcut, win);
        }
    });

    app.on('browser-window-focus', () => {
        globalShortcut.unregisterAll();
    });

    app.on('browser-window-blur', () => {
        registerGlobalKey(globalShortcut, win);
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
}

module.exports = { initGlobalShortcut };
