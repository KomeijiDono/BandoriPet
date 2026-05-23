// 窗口控制模块：注册5个IPC handler，供渲染进程操控主窗口的显示状态
// deps: { ipcMain, win(主BrowserWindow) }
function registerWindowControls({ ipcMain, win }) {
    // 窗口最小化
    ipcMain.on('window-min', () => win.minimize());
    // 窗口最大化/还原切换
    ipcMain.on('window-max', () => {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    // 关闭窗口
    ipcMain.on('window-close', () => win.close());
    // 置顶开关（screen-saver级别可覆盖全屏程序）
    ipcMain.on('set-always-on-top', (event, isTop) => {
        if (isTop) {
            win.setAlwaysOnTop(true, 'screen-saver');
        } else {
            win.setAlwaysOnTop(false);
        }
    });
    // 鼠标穿透开关（穿透时鼠标事件转发到下层窗口）
    ipcMain.on('set-ignore-mouse', (event, ignore) => {
        if (ignore) {
            win.setIgnoreMouseEvents(true, { forward: true });
        } else {
            win.setIgnoreMouseEvents(false);
        }
    });
}

module.exports = { registerWindowControls };
