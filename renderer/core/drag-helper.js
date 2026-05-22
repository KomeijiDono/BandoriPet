/**
 * drag-helper.js — 通用拖拽工具
 * 统一管理所有可拖拽 UI 元素，消除 10 处重复代码。
 *
 * 用法:
 *   initDraggable(headerEl, targetEl, { lockCheck, onStart, onEnd, persistX, persistY });
 *   initDraggable(headerEl, targetEl, 'info_widget');  // 简写: 自动持久化
 */
(function () {
  'use strict';

  var activeDrags = {};

  /**
   * 初始化拖拽
   * @param {HTMLElement} headerEl  - 拖拽手柄元素
   * @param {HTMLElement} targetEl  - 被拖拽的目标元素
   * @param {object|string} [opts]  - 配置或持久化键名前缀
   */
  function initDraggable(headerEl, targetEl, opts) {
    if (!headerEl || !targetEl) return;

    if (typeof opts === 'string') {
      opts = { persistX: opts + '_x', persistY: opts + '_y' };
    }
    opts = opts || {};

    var dragId = 'drag_' + (opts.id || Math.random().toString(36).slice(2));
    var state = {
      isDragging: false,
      startX: 0, startY: 0,
      initLeft: 0, initTop: 0
    };
    activeDrags[dragId] = state;

    // 恢复持久化位置
    if (opts.persistX) {
      var savedX = localStorage.getItem(opts.persistX);
      if (savedX) targetEl.style.left = savedX;
    }
    if (opts.persistY) {
      var savedY = localStorage.getItem(opts.persistY);
      if (savedY) targetEl.style.top = savedY;
    }

    headerEl.addEventListener('mousedown', function (e) {
      if (opts.lockCheck && opts.lockCheck()) return;
      state.isDragging = true;
      if (opts.dragStateRef) opts.dragStateRef(true);
      state.startX = e.clientX;
      state.startY = e.clientY;
      if (opts.getInitPosition) {
        var pos = opts.getInitPosition(targetEl);
        state.initLeft = pos.left;
        state.initTop = pos.top;
      } else {
        state.initLeft = parseInt(window.getComputedStyle(targetEl).left) || 0;
        state.initTop = parseInt(window.getComputedStyle(targetEl).top) || 0;
      }
      if (opts.onStart) opts.onStart(targetEl);
    });

    document.addEventListener('mousemove', function (e) {
      if (!state.isDragging) return;
      targetEl.style.left = (state.initLeft + (e.clientX - state.startX)) + 'px';
      targetEl.style.top = (state.initTop + (e.clientY - state.startY)) + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!state.isDragging) return;
      state.isDragging = false;
      if (opts.dragStateRef) opts.dragStateRef(false);
      if (opts.onEnd) opts.onEnd(targetEl);
      if (opts.persistX) localStorage.setItem(opts.persistX, targetEl.style.left);
      if (opts.persistY) localStorage.setItem(opts.persistY, targetEl.style.top);
    });

    return {
      isDragging: function () { return state.isDragging; },
      destroy: function () { delete activeDrags[dragId]; }
    };
  }

  window.initDraggable = initDraggable;
  console.log('[Renderer] drag-helper.js 已就绪');
})();
