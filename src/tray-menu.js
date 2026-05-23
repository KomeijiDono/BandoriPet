// 系统托盘菜单模块：创建托盘图标与右键菜单，支持窗口切换、沉浸模式与退出
module.exports = { createTray };

// config: { Tray, Menu, app, iconPath(托盘图标路径), win(主窗口), onImmersiveToggle(沉浸模式切换回调) }
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
            label: '沉浸模式',                            // checkbox 菜单项：切换沉浸模式
            type: 'checkbox',
            checked: false,
            click: (menuItem) => {
                const isImmersive = menuItem.checked;
                if (win && !win.isDestroyed()) {
                    win.webContents.send('toggle-immersive', isImmersive);
                }
                if (onImmersiveToggle) {                  // 回调主进程，同步窗口穿透等设置
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
