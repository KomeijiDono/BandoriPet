/**
 * display-settings.js — 显示与系统设置
 * 管理 GPU 加速、FPS 限制、开机自启、分辨率等
 * 从 index.html 内联脚本抽离
 */
(function () {
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(require('electron').remote ? require('electron').remote.app.getAppPath() : __dirname, 'hw_config.json');

  var savedConfigPath = null;
  var savedApp = null;

  function init(configPathOverride, appRef) {
    if (configPathOverride) savedConfigPath = configPathOverride;
    if (appRef) savedApp = appRef;
  }

  function initGPUStatus() {
    let useGPU = true;
    try {
      if (fs.existsSync(configPath)) {
        useGPU = JSON.parse(fs.readFileSync(configPath)).useGPU !== false;
      }
    } catch (e) { console.warn('[显示设置] GPU 配置读取失败:', e.message); }
    var el = document.getElementById('hw-accel');
    if (el) el.checked = useGPU;
  }

  function toggleGPU() {
    var el = document.getElementById('hw-accel');
    if (!el) return;
    var useGPU = el.checked;
    try {
      fs.writeFileSync(configPath, JSON.stringify({ useGPU: useGPU }));
      if (typeof addChatMessage === 'function') {
        addChatMessage("GPU 设置已保存，彻底退出桌宠后重新启动生效哦~", 'ai');
      }
    } catch (e) {
      console.error("保存GPU设置失败", e);
    }
  }

  function initDisplaySettings() {
    var fpsEl = document.getElementById('s-fps');
    if (fpsEl) fpsEl.value = localStorage.getItem('disp_fps') || '60';
    var autoEl = document.getElementById('s-autostart');
    if (autoEl) autoEl.checked = localStorage.getItem('disp_autostart') === 'true';
    applyFPS();
    toggleAutoStart(true);
  }

  function applyFPS() {
    var fpsEl = document.getElementById('s-fps');
    if (!fpsEl) return;
    var fps = parseInt(fpsEl.value);
    localStorage.setItem('disp_fps', fps);
    if (window.app && window.app.ticker) {
      window.app.ticker.maxFPS = fps === 0 ? 0 : fps;
    }
  }

  function toggleAutoStart(isInit) {
    var el = document.getElementById('s-autostart');
    if (!el) return;
    var enable = el.checked;
    localStorage.setItem('disp_autostart', enable);
    window.BandoriIPC.send('set-auto-start', enable);
    if (!isInit && typeof addChatMessage === 'function') {
      addChatMessage(enable ? "已开启开机自启！" : "已关闭开机自启！", 'ai');
    }
  }

  function triggerDisplayUpdate() {
    // 分辨率切换（需要重启生效）
  }

  // 延迟初始化
  setTimeout(initDisplaySettings, 500);

  // 暴露到全局（保持与原有 onchange="..." 的兼容性）
  window.toggleGPU = toggleGPU;
  window.applyFPS = applyFPS;
  window.toggleAutoStart = toggleAutoStart;
  window.triggerDisplayUpdate = triggerDisplayUpdate;
  window.initGPUStatus = initGPUStatus;

  // 初始化 GPU 状态（当 DOM 就绪后）
  document.addEventListener('DOMContentLoaded', function () {
    initGPUStatus();
  });

  console.log('[Renderer] display-settings.js 已就绪');
})();
