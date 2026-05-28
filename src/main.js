// ============================================================
//  BandoriPet 主进程入口 — 模块编排层
//  职责：组装所有子模块、创建窗口、托盘、统一生命周期管理
// ============================================================

// ---- Node.js 内置模块 ----
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

// ---- Electron 核心 API ----
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron');
const { Worker } = require('worker_threads');

// main.js 位于 src/，项目根目录为上一级
const ROOT = path.join(__dirname, '..');

// ---- 加载配置文件 ----
const { loadConfig, getConfig } = require('./config-loader');
loadConfig(ROOT);

// ---- GPU 硬件加速配置（hw_config.json 可选） ----
const configPath = path.join(ROOT, 'hw_config.json');
let useGPU = true;
try {
    if (fs.existsSync(configPath)) {
        useGPU = JSON.parse(fs.readFileSync(configPath)).useGPU !== false; 
    }
} catch (e) {}
if (!useGPU) app.disableHardwareAcceleration();

// ---- 全局状态变量 ----
let tray = null;          // 系统托盘实例
let win;                  // 主 BrowserWindow
let emotionEngine = null; // 情绪引擎管理接口

// ---- 子模块 require + 初始化 ----
const voiceConfigs = require('./voice-config');
const { initSoVITSManager } = require('./sovits-manager');
const { createTray } = require('./tray-menu');
const { registerWindowControls } = require('./window-controls');
const { initAudioCapture } = require('./audio-capture');
const { registerMediaControl } = require('./media-control');
const { initPhysics } = require('./physics-engine');
const { initGlobalShortcut } = require('./global-shortcut');
const { initEmotionEngine } = require('./emotion-engine');

// GSV 语音引擎管理器（返回 getProcess / killProcess 接口）
const sovitsMgr = initSoVITSManager({ path, spawn, ipcMain, voiceConfigs, ROOT, fs });

// ============================================================
//  App 就绪回调 — 创建窗口、组装所有子系统
// ============================================================
app.whenReady().then(() => {

    // ---- 1. 情绪引擎（主进程 app/idle 检测 + IPC 推送） ----
    const { powerMonitor } = require('electron');
    emotionEngine = initEmotionEngine({ ipcMain, powerMonitor, getWin: () => win });
    // 待窗口创建后启动（见下方）
    console.log('[主进程] 情绪引擎模块已加载');

    // ---- 2. 创建主窗口（透明、无框、4K） ----
    win = new BrowserWindow({
        width: 3840,
        height: 2160,
        transparent: true,
        frame: false,
        hasShadow: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false
        }
    });

    win.loadFile(path.join(ROOT, 'index.html'));
    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
        // 窗口就绪后启动情绪引擎
        if (emotionEngine) emotionEngine.start();
    });

    // ---- 3. 媒体监听 Worker 线程 ----
    try {
        const workerPath = path.join(__dirname, 'media_worker.js');
        const mediaWorker = new Worker(workerPath);
        mediaWorker.on('message', (msg) => {
            if (win && !win.isDestroyed()) {
                if (msg.type === 'music-changed') {
                    console.log(`[后台捕获切歌] ${msg.data.title} - ${msg.data.artist}`);
                }
                win.webContents.send(msg.type, msg.data);
            }
        });
        mediaWorker.on('error', (err) => {
            console.error('媒体监听 Worker 报错:', err);
        });
        console.log("媒体控制线程已成功启动！");
    } catch (e) {
        console.error("启动媒体监听线程失败:", e);
    }

    // ---- 4. Matter.js 物理引擎（墙壁 + 道具管理） ----
    const phy = initPhysics({ BrowserWindow, ipcMain, screen, fs, path, __dirname, win, ROOT });

    // ---- 5. 窗口关闭时清理物理道具 ----
    win.on('closed', () => {
        if (phy && phy.physicalItems) {
            phy.physicalItems.forEach(item => {
                if (item.window && !item.window.isDestroyed()) {
                    item.window.destroy();
                }
            });
            phy.physicalItems = [];
        }
        app.quit();
    });

    // ---- 6. 系统托盘菜单 ----
    tray = createTray({
        Tray, Menu, app,
        iconPath: path.join(ROOT, 'assets', 'icon.ico'),
        win,
        onImmersiveToggle: (isImmersive) => {
            if (phy && phy.physicalItems) {
                phy.physicalItems.forEach(item => {
                    if (item.window && !item.window.isDestroyed()) {
                        if (isImmersive) {
                            item.window.hide();
                        } else {
                            item.window.show();
                        }
                    }
                });
            }
        }
    });

    // ---- 7. 窗口控制 IPC（最小化/最大化/关闭/置顶/鼠标穿透） ----
    registerWindowControls({ ipcMain, win });

    // ---- 7.5 应用信息 IPC ----
    ipcMain.handle('get-app-path', (event, pathName) => {
        if (pathName) {
            return app.getPath(pathName);
        }
        return app.getAppPath();
    });

    // ---- 8. 系统音频采集（sys_audio.exe FFT） ----
    const audioCap = initAudioCapture({ ipcMain, spawn, fs, path, __dirname, win, ROOT });

    // ---- 9. 媒体键控制（PowerShell 模拟） ----
    registerMediaControl({ ipcMain, exec });

    // ---- 10. 全局快捷键（径向菜单） ----
    initGlobalShortcut({ ipcMain, globalShortcut, win, app });

    // ---- 11. 退出时统一清理所有子进程 ----
    app.on('will-quit', () => {
        if (emotionEngine) emotionEngine.stop();
        if (sovitsMgr.getProcess()) {
            sovitsMgr.killProcess();
        }
        if (audioCap.getProcess()) {
            audioCap.killProcess();
        }
    });
});
