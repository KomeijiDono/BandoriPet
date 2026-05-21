const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron');
const { Worker } = require('worker_threads');
const configPath = path.join(__dirname, 'hw_config.json');
let useGPU = true;
try {
    if (fs.existsSync(configPath)) {
        useGPU = JSON.parse(fs.readFileSync(configPath)).useGPU !== false; 
    }
} catch (e) {}
if (!useGPU) app.disableHardwareAcceleration();

let tray = null;
let win;
let radarProcess = null;
const voiceConfigs = require('./voice-config');
const { initSoVITSManager } = require('./sovits-manager');
const { createTray } = require('./tray-menu');
const { registerWindowControls } = require('./window-controls');
const { initAudioCapture } = require('./audio-capture');
const { registerMediaControl } = require('./media-control');
const { initPhysics } = require('./physics-engine');
const { initGlobalShortcut } = require('./global-shortcut');

const sovitsMgr = initSoVITSManager({ path, spawn, ipcMain, voiceConfigs });

app.whenReady().then(() => {
    const radarPath = path.join(__dirname, 'emotion_radar.py');
    if (fs.existsSync(radarPath)) {
        console.log("后台静默启动...");
        radarProcess = spawn('python', [radarPath], {
            cwd: __dirname,
            windowsHide: true 
        });
        radarProcess.stdout.on('data', (data) => console.log(`[情绪雷达]: ${data.toString().trim()}`));
        radarProcess.stderr.on('data', (data) => console.error(`[报错]: ${data.toString().trim()}`));
        radarProcess.on('close', () => { radarProcess = null; });
    } else {
        console.log("未找到 emotion_radar.py");
    }

    win = new BrowserWindow({
        width: 3840,
        height: 2160,
        transparent: true,
        frame: false,
        hasShadow: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
    });

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

    const phy = initPhysics({ BrowserWindow, ipcMain, screen, fs, path, __dirname, win });

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

    tray = createTray({
        Tray, Menu, app,
        iconPath: path.join(__dirname, 'icon.ico'),
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

    registerWindowControls({ ipcMain, win });

    const audioCap = initAudioCapture({ ipcMain, spawn, fs, path, __dirname, win });

    registerMediaControl({ ipcMain, exec });

    initGlobalShortcut({ ipcMain, globalShortcut, win, app });

    app.on('will-quit', () => {
        if (sovitsMgr.getProcess()) {
            sovitsMgr.killProcess();
        }
        if (audioCap.getProcess()) {
            audioCap.killProcess();
        }
        if (radarProcess) {
            radarProcess.kill();
            radarProcess = null;
        }
    });
});
