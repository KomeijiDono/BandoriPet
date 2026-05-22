/**
 * window-control.js — 窗口控制
 * 最小化、最大化、关闭、标题栏、置顶、鼠标穿透
 * 从 index.html 内联脚本抽离
 */
(function () {
  'use strict';

  // ========== 窗口操作 ==========
  function minWindow() {
    window.BandoriIPC.send('window-min');
  }

  function maxWindow() {
    window.BandoriIPC.send('window-max');
  }

  function closeWindow() {
    window.BandoriIPC.send('window-close');
  }

  // ========== 标题栏 ==========
  function toggleTitleBar() {
    var hide = document.getElementById('hide-titlebar').checked;
    var titleBar = document.getElementById('title-bar');
    if (hide) {
      titleBar.style.display = 'none';
      if (typeof addChatMessage === 'function') {
        addChatMessage("顶栏已隐藏，想移动主窗口请先取消隐藏哦~", 'ai');
      }
    } else {
      titleBar.style.display = 'flex';
    }
    localStorage.setItem('hide_titlebar', hide);
  }

  // ========== 窗口置顶 ==========
  function toggleAlwaysOnTop(isInit) {
    var el = document.getElementById('s-always-top');
    if (!el) return;
    var isTop = el.checked;
    localStorage.setItem('s_always_top', isTop);
    window.BandoriIPC.send('set-always-on-top', isTop);
  }

  // ========== 鼠标穿透 ==========
  var lastIgnoreState = false;

  function initMousePassthrough() {
    // 恢复穿透状态
    var ptSaved = localStorage.getItem('s_passthrough');
    var ptEl = document.getElementById('s-passthrough');
    if (ptSaved !== null && ptEl) {
      ptEl.checked = ptSaved === 'true';
    }

    // 标题栏初始状态
    var hideSaved = localStorage.getItem('hide_titlebar') === 'true';
    var hideEl = document.getElementById('hide-titlebar');
    if (hideEl) hideEl.checked = hideSaved;
    if (hideSaved) {
      var tb = document.getElementById('title-bar');
      if (tb) tb.style.display = 'none';
    }

    // 置顶初始状态
    var topEl = document.getElementById('s-always-top');
    if (topEl) {
      var topSaved = localStorage.getItem('s_always_top') === 'true';
      topEl.checked = topSaved;
      if (topSaved) {
        window.BandoriIPC.send('set-always-on-top', true);
      }
    }
  }

  document.addEventListener('mousemove', function (e) {
    var enablePassthrough = document.getElementById('s-passthrough') && document.getElementById('s-passthrough').checked;
    if (!enablePassthrough) {
      if (lastIgnoreState !== false) {
        lastIgnoreState = false;
        window.BandoriIPC.send('set-ignore-mouse', false);
      }
      return;
    }

    var shouldIgnore = true;

    if ((typeof isVisDragging !== 'undefined' && isVisDragging) ||
        (typeof isSetDragging !== 'undefined' && isSetDragging) ||
        (typeof isDragging !== 'undefined' && isDragging) ||
        (typeof isMusicDragging !== 'undefined' && isMusicDragging) ||
        (typeof isPhoneDragging !== 'undefined' && isPhoneDragging) ||
        (typeof isLyricDragging !== 'undefined' && isLyricDragging) ||
        (typeof isTxtDragging !== 'undefined' && isTxtDragging) ||
        (typeof isIpadDragging !== 'undefined' && isIpadDragging) ||
        (typeof draggingModel !== 'undefined' && draggingModel)) {
      shouldIgnore = false;
    }

    var transparentBgIds = ['canvas', 'app-background', 'bg-layer-gradient', 'bg-layer-pattern', 'bg-layer-lines', 'particle-canvas', 'bg-text-layer'];

    if (shouldIgnore && e.target && e.target.tagName !== 'HTML' && e.target.tagName !== 'BODY') {
      if (!e.target.id || !transparentBgIds.includes(e.target.id)) {
        shouldIgnore = false;
      }
    }

    if (shouldIgnore && window.live2dPet) {
      var dragEnabled = localStorage.getItem('model_drag_enabled') === 'true';
      if (dragEnabled) {
        var bounds = window.live2dPet.getBounds();
        var padding = 20;
        if (e.clientX >= (bounds.x - padding) && e.clientX <= (bounds.x + bounds.width + padding) &&
            e.clientY >= (bounds.y - padding) && e.clientY <= (bounds.y + bounds.height + padding)) {
          shouldIgnore = false;
        }
      }
    }

    if (lastIgnoreState !== shouldIgnore) {
      lastIgnoreState = shouldIgnore;
      window.BandoriIPC.send('set-ignore-mouse', shouldIgnore);
    }
  });

  // ========== 暴露到全局 ==========
  window.minWindow = minWindow;
  window.maxWindow = maxWindow;
  window.closeWindow = closeWindow;
  window.toggleTitleBar = toggleTitleBar;
  window.toggleAlwaysOnTop = toggleAlwaysOnTop;

  document.addEventListener('DOMContentLoaded', initMousePassthrough);

  console.log('[Renderer] window-control.js 已就绪');
})();
