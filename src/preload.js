/**
 * preload.js — Electron Preload 脚本
 * 通过 contextBridge 安全地暴露 Node.js API 到渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// ============================================================
// IPC 通道白名单（安全控制）
// ============================================================

/** renderer → main (send) */
const SEND_CHANNELS = [
  'window-min',
  'window-max',
  'window-close',
  'switch-character',
  'toggle-cpp-audio',
  'set-ignore-mouse',
  'set-always-on-top',
  'set-auto-start',
  'media-control',
  'update-physics-params',
  'resize-physics-item',
  'remove-physics-item',
  'clear-all-physics',
  'update-ui-bodies',
  'physics-change-shape',
  'register-radial-shortcut',
  'physics-drag-start',
  'physics-drag-end',
];

/** renderer → main (invoke, request-response) */
const INVOKE_CHANNELS = [
  'get-physics-images',
  'spawn-physics-item',
  'save-physics-image',
];

/** main → renderer (on) */
const ON_CHANNELS = [
  'tray-action',
  'audio-fft',
  'music-changed',
  'music-state',
  'music-progress',
  'toggle-immersive',
  'physics-shape-updated',
  'trigger-global-radial',
  'sync-angle',
  'flash-effect',
];

// ============================================================
// 暴露 API 到渲染进程
// ============================================================

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- IPC 通信 ----
  send: (channel, data) => {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  invoke: (channel, data) => {
    if (INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Channel ${channel} not allowed`));
  },
  
  on: (channel, callback) => {
    if (ON_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  once: (channel, callback) => {
    if (ON_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    }
  },
  
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // ---- 文件系统（只读操作）----
  fs: {
    readFileSync: (filePath, encoding) => fs.readFileSync(filePath, encoding),
    writeFileSync: (filePath, data) => fs.writeFileSync(filePath, data),
    existsSync: (filePath) => fs.existsSync(filePath),
    readdirSync: (dirPath) => fs.readdirSync(dirPath),
    mkdirSync: (dirPath, options) => fs.mkdirSync(dirPath, options),
    unlinkSync: (filePath) => fs.unlinkSync(filePath),
    statSync: (filePath) => fs.statSync(filePath),
  },

  // ---- 路径工具 ----
  path: {
    join: (...args) => path.join(...args),
    dirname: (filePath) => path.dirname(filePath),
    basename: (filePath) => path.basename(filePath),
    extname: (filePath) => path.extname(filePath),
    resolve: (...args) => path.resolve(...args),
  },

  // ---- 应用信息（通过 IPC 获取）----
  app: {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    getPath: (name) => ipcRenderer.invoke('get-app-path', name),
  },

  // ---- 通道常量（供渲染进程引用）----
  channels: {
    SEND: SEND_CHANNELS.reduce((m, ch) => { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
    INVOKE: INVOKE_CHANNELS.reduce((m, ch) => { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
    ON: ON_CHANNELS.reduce((m, ch) => { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
  },
});

console.log('[Preload] electronAPI 已暴露到渲染进程');
