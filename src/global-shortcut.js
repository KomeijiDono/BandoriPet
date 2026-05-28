// ============================================================================
// global-shortcut.js — 全局快捷键模块
// 负责径向菜单的全局快捷键注册 / 注销，仅在窗口失焦时生效
// 窗口获得焦点时注销快捷键（避免与应用内部输入冲突）
// ============================================================================
let currentRadialKey = null;  // 当前绑定的快捷键键名

// 注册全局快捷键，处理空格键和单字母的大小写格式化
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
    } catch (err) {
        console.warn('[全局快捷键] 注册失败:', err.message);
    }
}

// initGlobalShortcut 依赖注入：接收 ipcMain、globalShortcut、win、app
function initGlobalShortcut({ ipcMain, globalShortcut, win, app }) {
    // ---- IPC：渲染进程注册径向菜单快捷键 ----
    ipcMain.on('register-radial-shortcut', (event, key) => {
        currentRadialKey = key;
        if (win && !win.isFocused()) {
            registerGlobalKey(globalShortcut, win);
        }
    });

    // ---- 窗口获得焦点时注销快捷键（避免与应用内部输入冲突） ----
    app.on('browser-window-focus', () => {
        globalShortcut.unregisterAll();
    });

    // ---- 窗口失去焦点时重新注册快捷键 ----
    app.on('browser-window-blur', () => {
        registerGlobalKey(globalShortcut, win);
    });

    // ---- 应用退出时清理所有快捷键 ----
    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
}

module.exports = { initGlobalShortcut };
