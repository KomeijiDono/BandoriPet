module.exports = { createTray };

function createTray(config) {
    const { Tray, Menu, app, iconPath, win, onImmersiveToggle } = config;

    const tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示 / 隐藏 右上角控制台',
            click: () => { if (win) win.webContents.send('tray-action', 'toggle-btn'); }
        },
        {
            label: '显示 / 隐藏 桌宠',
            click: () => { if (win) win.webContents.send('tray-action', 'toggle-char'); }
        },
        {
            label: '显示 / 隐藏 桌面挂件与手机',
            click: () => { if (win) win.webContents.send('tray-action', 'toggle-widgets'); }
        },
        { type: 'separator' },
        {
            label: '沉浸模式',
            type: 'checkbox',
            checked: false,
            click: (menuItem) => {
                const isImmersive = menuItem.checked;
                if (win && !win.isDestroyed()) {
                    win.webContents.send('toggle-immersive', isImmersive);
                }
                if (onImmersiveToggle) {
                    onImmersiveToggle(isImmersive);
                }
            }
        },
        { type: 'separator' },
        {
            label: '退出 Bandori 桌宠',
            click: () => { app.quit(); }
        }
    ]);

    tray.setToolTip('Bandori 桌宠');
    tray.setContextMenu(contextMenu);

    return tray;
}
