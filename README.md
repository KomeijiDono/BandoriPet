# BandoriPet — BanG Dream 桌宠

基于 Electron 28 的 BanG Dream 桌面宠物，支持 Live2D 渲染、GSV 语音交互、AI 聊天、物理道具。

> **📌 重构说明**：本仓库是基于 [ELECTRON-GSV-BandoriPet](https://github.com/Anokianx/ELECTRON-GSV-BandoriPet) 的重构版本。感谢原作者 [@Anokianx](https://github.com/Anokianx) 的开源贡献。

## 功能特性

- **Live2D 渲染** — PixiJS v6 + pixi-live2d-display 0.4.0
- **角色切换** — Live2d角色，自定义服装
- **GSV 语音** — GPT-SoVITS 本地 TTS，口型同步
- **AI 聊天** — 支持 Gemini / DeepSeek / OpenAI / Qwen，可自行配置
- **iPad 群聊** — 多角色群组对话
- **物理道具** — Matter.js 物理模拟，可拖拽、切换形状
- **音频可视化** — 64 位 FFT 频谱
- **音乐组件** — 歌词同步、封面显示
- **天气显示** — IP 定位 + Open-Meteo API
- **鼠标穿透** — 拖拽时自动禁用穿透

## 系统要求

- Windows 10/11
- Node.js 16+
- Python 3.10+
- C++ Runtime
- MSVC Runtime
- Visual Studio Build Tools
- `GPT-SoVITS`（可选，用于 GSV 语音）

## 目录结构

```
BandoriPet/
├── src/                       ← 主进程源码
│   ├── main.js                # 模块编排层
│   ├── voice-config.js        # 角色GSV模型路径
│   ├── sovits-manager.js      # GSV语音引擎管理
│   ├── physics-engine.js      # Matter.js物理引擎
│   ├── audio-capture.js       # 系统音频采集FFT
│   ├── tray-menu.js           # 托盘菜单
│   ├── window-controls.js     # 窗口控制IPC
│   ├── media-control.js       # 媒体键模拟
│   ├── global-shortcut.js     # 全局快捷键
│   └── media_worker.js        # 媒体监听Worker
├── renderer/                  ← 渲染进程
│   ├── core/                  # state / ipc / events / drag-helper
│   ├── live2d/                # emotion / model
│   ├── chat/                  # chat-api / ipad-chat
│   ├── ui/                    # 角色菜单 / 设置 / 手机 / 物理面板
│   ├── audio/                 # 可视化 / 音乐组件
│   ├── background/            # 粒子 / 鼠标拖尾 / 背景
│   ├── external/              # 天气 / 情绪雷达
│   ├── system/                # 窗口控制 / 显示设置 / 更新通知
│   └── data/                  # 角色配置数据
├── assets/                    ← 静态资源
│   ├── icon.ico
│   ├── avatar.png
│   ├── click.mp3
│   └── styles/main.css
├── characters/                ← 角色人设数据
├── native/                    ← C++原生文件
│   ├── sys_audio.exe/.cpp/.obj
│   └── set_wallpaper.cpp
├── index.html                 ← 渲染入口
├── model/                     ← Live2D模型（手动创建）
├── GPT-SoVITS/                ← GSV运行库（可选）
└── physics_items/             ← 物理道具图片（自动创建）
```

## 快速开始

```bash
cd BandoriPet
npm install
npm start          # 启动
npm run build      # 打包 → dist/
```

## 手动配置

### AI 聊天 API

API配置在 `renderer/chat/chat-api.js`和`renderer/chat/ipad-chat.js`中的：

```js
var apiConfigs = {
  "gemini": { url: "...", key: "你的密钥", model: "模型名" },
  ......
};
```

### Live2D 模型

```
model/
  {角色名}/              # 如 anon/
    {服装名}/            # 如 live_default/
      model.json         # Live2D 模型文件
  _mtn_emp/
    {角色名}/            # 动作表情文件
```

角色名需与 `renderer/data/characters-config.js` 中的一致。

### GPT-SoVITS 语音

1. 将 GSV 运行库放入 `GPT-SoVITS/`
2. `src/voice-config.js` 中修改各角色模型路径（相对于 `GPT-SoVITS/`）

两者需单独设置。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Electron 28 |
| 渲染 | PixiJS 6.5.2 + pixi-live2d-display |
| 物理 | Matter.js 0.20 |
| 语音 | GPT-SoVITS（Python 子进程） |
| 音频 | sys_audio.exe（C++） |
| 媒体 | windows-smtc-monitor |

## 开发

项目无构建工具（webpack/vite），渲染进程通过 CDN 加载 PixiJS/Live2D SDK。主进程模块使用依赖注入模式（`initXxx({ ipcMain, win, ... })`），渲染模块使用 IIFE 通过 `window.*` 暴露 API。

```bash
# 快速语法检查
node -c src/main.js
for f in src/*.js renderer/**/*.js; do node -c "$f"; done

# 开启开发者工具（临时，调试用）
# 在 src/main.js 的 win.once('ready-to-show', ...) 中加：
#   win.webContents.openDevTools();
```

### 核心约定

- **nodeIntegration: true, contextIsolation: false** — renderer 可直接 `require('electron')`
- **依赖注入**：主进程模块接收 `{ ipcMain, win, ... }`，返回 `{ getProcess, killProcess }` 接口
- **IIFE 模式**：渲染模块使用 `(function () { 'use strict'; ... })()` 包裹，通过 `window.x = fn` 暴露
- **统一拖拽**：`initDraggable(el, target, opts)` 替代所有手写拖拽，支持 `lockCheck`/`dragStateRef`/`persistX`/`persistY`/`getInitPosition`
- **PixiJS v6 无 Canvas2D 回退**：`new PIXI.Application()` 在 WebGL 不可用时同步抛异常

## 联系方式

- Email: `564449138@qq.com`或`rogescn@icloud.com`
- QQ: `564449138`
