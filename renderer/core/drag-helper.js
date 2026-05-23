/**
 * drag-helper.js — 通用拖拽工具
 * 统一管理所有可拖拽 UI 元素
 *
 * 用法:
 *   initDraggable(headerEl, targetEl, { lockCheck, onStart, onEnd, persistX, persistY });
 *   initDraggable(headerEl, targetEl, 'info_widget');  // 简写: 自动持久化
 */
(function () {
  'use strict';

  // 活跃拖拽实例表，用于外部查询拖拽状态
  var activeDrags = {};

  /**
   * 初始化拖拽
   * @param {HTMLElement} headerEl  - 拖拽手柄元素
   * @param {HTMLElement} targetEl  - 被拖拽的目标元素
   * @param {object|string} [opts]  - 配置或持久化键名前缀
   * @param {function} opts.lockCheck      - 返回 true 则阻止本次拖拽
   * @param {function} opts.dragStateRef   - 拖拽中回调 (isDragging:boolean)
   * @param {function} opts.getInitPosition - 获取初始位置回调 (targetEl) => {left, top}
   * @param {function} opts.onStart        - 拖拽开始回调 (targetEl)
   * @param {function} opts.onEnd          - 拖拽结束回调 (targetEl)
   * @param {string}   opts.persistX       - localStorage 键名，持久化水平位置
   * @param {string}   opts.persistY       - localStorage 键名，持久化垂直位置
   */
  function initDraggable(headerEl, targetEl, opts) {
    if (!headerEl || !targetEl) return;

    // 字符串简写：自动生成 persistX/persistY 键名
    if (typeof opts === 'string') {
      opts = { persistX: opts + '_x', persistY: opts + '_y' };
    }
    opts = opts || {};

    // 创建拖拽状态对象
    var dragId = 'drag_' + (opts.id || Math.random().toString(36).slice(2));
    var state = {
      isDragging: false,
      startX: 0, startY: 0,
      initLeft: 0, initTop: 0
    };
    activeDrags[dragId] = state;

    // 从 localStorage 恢复上次拖拽位置
    if (opts.persistX) {
      var savedX = localStorage.getItem(opts.persistX);
      if (savedX) targetEl.style.left = savedX;
    }
    if (opts.persistY) {
      var savedY = localStorage.getItem(opts.persistY);
      if (savedY) targetEl.style.top = savedY;
    }

    // mousedown：记录起点与初始位置，标记拖拽开始
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

    // mousemove：计算偏移量并更新目标位置
    document.addEventListener('mousemove', function (e) {
      if (!state.isDragging) return;
      targetEl.style.left = (state.initLeft + (e.clientX - state.startX)) + 'px';
      targetEl.style.top = (state.initTop + (e.clientY - state.startY)) + 'px';
    });

    // mouseup：结束拖拽，持久化位置，触发回调
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
