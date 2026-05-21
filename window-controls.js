function registerWindowControls({ ipcMain, win }) {
    ipcMain.on('window-min', () => win.minimize());
    ipcMain.on('window-max', () => {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    ipcMain.on('window-close', () => win.close());
    ipcMain.on('set-always-on-top', (event, isTop) => {
        if (isTop) {
            win.setAlwaysOnTop(true, 'screen-saver');
        } else {
            win.setAlwaysOnTop(false);
        }
    });
    ipcMain.on('set-ignore-mouse', (event, ignore) => {
        if (ignore) {
            win.setIgnoreMouseEvents(true, { forward: true });
        } else {
            win.setIgnoreMouseEvents(false);
        }
    });
}

module.exports = { registerWindowControls };
