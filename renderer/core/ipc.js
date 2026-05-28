/**
 * ipc.js — IPC 通信统一层
 * 所有 ipcRenderer 操作必须通过此模块，禁止其他模块直接 require('electron')。
 *
 * 通道注册表维护所有 IPC 通道的文档。
 */

(function () {
  'use strict';

  var electronAPI = window.electronAPI;

  // 已注册的监听器映射表：channel → callback[]
  var _handlers = {};

  // invoke 临时回调（保留接口，当前已改用 ipcRenderer.invoke）
  var _invokeCallbacks = {};
  var _invokeSeq = 0;

  // ============================================================
  // 通道注册表（文档用途，不强制校验）
  // ============================================================

  /** renderer → main (send) */
  var SEND_CHANNELS = [
    'window-min',              // 最小化窗口
    'window-max',              // 最大化/恢复窗口
    'window-close',            // 关闭窗口
    'switch-character',        // 切换角色(charId)
    'toggle-cpp-audio',        // 开关 C++ 音频采集(enable:boolean)
    'set-ignore-mouse',        // 鼠标穿透(ignore:boolean)
    'set-always-on-top',       // 窗口置顶(isTop:boolean)
    'set-auto-start',          // 开机自启
    'media-control',           // 媒体控制(action:'play-pause'|'next'|'prev')
    'update-physics-params',   // 物理引擎参数
    'resize-physics-item',     // 调整物理道具大小(id, newSize)
    'remove-physics-item',     // 移除物理道具(id)
    'clear-all-physics',       // 清空全部物理道具
    'update-ui-bodies',        // 上报 UI 碰撞边界
    'physics-change-shape',    // 切换物理道具形状(id)
    'register-radial-shortcut',// 注册全局快捷键(key)
    'physics-drag-start',      // 物理道具拖拽开始(id)
    'physics-drag-end',        // 物理道具拖拽结束(id)
  ];

  /** renderer → main (invoke, request-response) */
  var INVOKE_CHANNELS = [
    'get-physics-images',      // 获取物理道具图片列表
    'spawn-physics-item',      // 生成物理道具
    'save-physics-image',      // 保存物理道具图片
  ];

  /** main → renderer (on) */
  var ON_CHANNELS = [
    'tray-action',             // 托盘菜单操作(action)
    'audio-fft',               // 64 元素 FFT 数据
    'music-changed',           // 歌曲切换(data:{title,artist,album,...})
    'music-state',             // 播放状态(data:{playing:boolean})
    'music-progress',          // 播放进度(data:{seconds:number})
    'toggle-immersive',        // 沉浸模式(isImmersive:boolean)
    'physics-shape-updated',   // 物理道具形状变更确认(id, newShape)
    'trigger-global-radial',   // 全局快捷键触发径向菜单
    'sync-angle',              // 物理道具角度同步(angle)
    'flash-effect',            // 物理道具闪烁效果
  ];

  // ============================================================
  // send — 单向发送消息到主进程（无返回值）
  // ============================================================

  function send(channel, data) {
    electronAPI.send(channel, data);
  }

  // ============================================================
  // invoke — 双向调用，发送并等待主进程返回 Promise
  // ============================================================

  function invoke(channel, data) {
    return electronAPI.invoke(channel, data);
  }

  // ============================================================
  // on — 注册持久监听，同时记录到 _handlers 供本地管理
  // ============================================================

  function on(channel, callback) {
    if (!_handlers[channel]) _handlers[channel] = [];
    _handlers[channel].push(callback);
    electronAPI.on(channel, function () {
      var args = Array.prototype.slice.call(arguments);
      callback.apply(null, args);
    });
  }

  // ============================================================
  // once — 一次性监听，触发后自动移除
  // ============================================================

  function once(channel, callback) {
    electronAPI.once(channel, function () {
      var args = Array.prototype.slice.call(arguments);
      callback.apply(null, args);
    });
  }

  // ============================================================
  // off — 移除指定通道上的某个回调
  // ============================================================

  function off(channel, callback) {
    if (_handlers[channel]) {
      _handlers[channel] = _handlers[channel].filter(function (fn) { return fn !== callback; });
    }
    electronAPI.off(channel, callback);
  }

  // ============================================================
  // removeAllListeners — 清空某通道的全部监听
  // ============================================================

  function removeAllListeners(channel) {
    _handlers[channel] = [];
    electronAPI.removeAllListeners(channel);
  }

  // ============================================================
  // 暴露 API
  // ============================================================

  window.BandoriIPC = {
    send: send,
    invoke: invoke,
    on: on,
    once: once,
    off: off,
    removeAllListeners: removeAllListeners,

    // 通道常量（供其他模块引用，避免魔法字符串）
    SEND: SEND_CHANNELS.reduce(function (m, ch) { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
    INVOKE: INVOKE_CHANNELS.reduce(function (m, ch) { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
    ON: ON_CHANNELS.reduce(function (m, ch) { m[ch.replace(/-/g, '_').toUpperCase()] = ch; return m; }, {}),
  };

  console.log('[Renderer] ipc.js 已就绪，注册通道: send=' + SEND_CHANNELS.length + ' invoke=' + INVOKE_CHANNELS.length + ' on=' + ON_CHANNELS.length);
})();
