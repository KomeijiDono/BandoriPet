/**
 * window-control.js — 窗口控制
 * 最小化、最大化、关闭、标题栏、置顶、鼠标穿透
 */
(function () {
  'use strict';

  // ========== 窗口操作 ==========

  // 最小化窗口
  function minWindow() {
    window.BandoriIPC.send('window-min');
  }

  // 最大化窗口
  function maxWindow() {
    window.BandoriIPC.send('window-max');
  }

  // 关闭窗口
  function closeWindow() {
    window.BandoriIPC.send('window-close');
  }

  // ========== 标题栏 ==========

  // 显示/隐藏标题栏，隐藏时提示用户无法移动窗口
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

  // 切换窗口置顶状态，isInit=true时不触发语音反馈
  function toggleAlwaysOnTop(isInit) {
    var el = document.getElementById('s-always-top');
    if (!el) return;
    var isTop = el.checked;
    localStorage.setItem('s_always_top', isTop);
    window.BandoriIPC.send('set-always-on-top', isTop);
  }

  // ========== 鼠标穿透 ==========
  var lastIgnoreState = false;
  var mouseX = 0;
  var mouseY = 0;
  var rafId = null;

  // 初始化：从localStorage恢复穿透/标题栏/置顶三项状态
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

    // 启动鼠标穿透检测循环
    startPassthroughLoop();
  }

  // 鼠标穿透检测循环：使用 requestAnimationFrame 优化性能
  function startPassthroughLoop() {
    // 监听鼠标位置更新
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // 使用 requestAnimationFrame 进行穿透检测
    function checkPassthrough() {
      var enablePassthrough = document.getElementById('s-passthrough') && document.getElementById('s-passthrough').checked;
      if (!enablePassthrough) {
        // 穿透关闭时确保恢复鼠标响应
        if (lastIgnoreState !== false) {
          lastIgnoreState = false;
          window.BandoriIPC.send('set-ignore-mouse', false);
        }
        rafId = requestAnimationFrame(checkPassthrough);
        return;
      }

      var shouldIgnore = true;

      // 使用统一的拖拽状态检测：任一拖拽中则禁止穿透
      if (typeof AppState !== 'undefined' && AppState.isAnyDragging()) {
        shouldIgnore = false;
      }

      var transparentBgIds = ['canvas', 'app-background', 'bg-layer-gradient', 'bg-layer-pattern', 'bg-layer-lines', 'particle-canvas', 'bg-text-layer'];

      // 获取鼠标下方的元素
      var elementBelow = document.elementFromPoint(mouseX, mouseY);
      if (shouldIgnore && elementBelow && elementBelow.tagName !== 'HTML' && elementBelow.tagName !== 'BODY') {
        if (!elementBelow.id || !transparentBgIds.includes(elementBelow.id)) {
          shouldIgnore = false;
        }
      }

      if (shouldIgnore && window.live2dPet) {
        var dragEnabled = localStorage.getItem('model_drag_enabled') === 'true';
        if (dragEnabled) {
          var bounds = window.live2dPet.getBounds();
          var padding = 20;
          if (mouseX >= (bounds.x - padding) && mouseX <= (bounds.x + bounds.width + padding) &&
              mouseY >= (bounds.y - padding) && mouseY <= (bounds.y + bounds.height + padding)) {
            shouldIgnore = false;
          }
        }
      }

      if (lastIgnoreState !== shouldIgnore) {
        lastIgnoreState = shouldIgnore;
        window.BandoriIPC.send('set-ignore-mouse', shouldIgnore);
      }

      rafId = requestAnimationFrame(checkPassthrough);
    }

    // 启动检测循环
    rafId = requestAnimationFrame(checkPassthrough);
  }

  // ========== 暴露到全局 ==========
  window.minWindow = minWindow;
  window.maxWindow = maxWindow;
  window.closeWindow = closeWindow;
  window.toggleTitleBar = toggleTitleBar;
  window.toggleAlwaysOnTop = toggleAlwaysOnTop;

  document.addEventListener('DOMContentLoaded', initMousePassthrough);

  console.log('[Renderer] window-control.js 已就绪');
})();
