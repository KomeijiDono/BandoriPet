/**
 * emotion-panel.js — 情绪雷达可视化面板
 *
 * 功能：
 *   - 显示当前主情绪（高亮标签）
 *   - 9 维度情绪值进度条
 *   - 简易雷达图（Canvas 绘制）
 *   - 通过 EventBus 实时更新
 *   - 可折叠/拖拽
 */
(function () {
  'use strict';

  var panelEl = null;
  var barsContainer = null;
  var radarCanvas = null;
  var radarCtx = null;
  var mainLabel = null;
  var visible = false;
  var currentVector = null;
  var currentMain = 'relaxed';
  var _listening = false;

  function createPanel() {
    if (panelEl) return;

    var container = document.createElement('div');
    container.id = 'emotion-panel';
    container.innerHTML = [
      '<style>',
      '#emotion-panel {',
      '  position: fixed; bottom: 120px; right: 20px;',
      '  width: 220px; background: rgba(20,20,30,0.85);',
      '  border: 1px solid rgba(255,255,255,0.12);',
      '  border-radius: 12px; padding: 12px 14px;',
      '  color: #ccc; font-family: "Microsoft YaHei", sans-serif;',
      '  font-size: 11px; z-index: 9999;',
      '  backdrop-filter: blur(8px);',
      '  -webkit-app-region: no-drag;',
      '  transition: opacity 0.3s;',
      '}',
      '#emotion-panel.hidden { opacity: 0; pointer-events: none; }',
      '#emotion-panel .header {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '  margin-bottom: 8px;',
      '}',
      '#emotion-panel .header .label { font-weight: bold; font-size: 12px; color: #fff; }',
      '#emotion-panel .header .toggle { cursor: pointer; color: #888; font-size: 14px; }',
      '#emotion-panel .main-emotion {',
      '  text-align: center; font-size: 14px; font-weight: bold;',
      '  padding: 4px 0; margin-bottom: 6px; border-radius: 6px;',
      '  transition: background 0.5s, color 0.5s;',
      '}',
      '#emotion-panel .bar-row {',
      '  display: flex; align-items: center; margin-bottom: 3px;',
      '}',
      '#emotion-panel .bar-label {',
      '  width: 40px; font-size: 10px; text-align: right; padding-right: 6px;',
      '  color: #aaa;',
      '}',
      '#emotion-panel .bar-track {',
      '  flex: 1; height: 6px; background: rgba(255,255,255,0.08);',
      '  border-radius: 3px; overflow: hidden;',
      '}',
      '#emotion-panel .bar-fill {',
      '  height: 100%; border-radius: 3px; transition: width 0.5s ease;',
      '}',
      '#emotion-panel .bar-value {',
      '  width: 26px; font-size: 9px; text-align: right; color: #777;',
      '}',
      '#emotion-panel .radar-wrap {',
      '  margin-top: 8px; display: flex; justify-content: center;',
      '}',
      '#emotion-panel .radar-wrap canvas {',
      '  border-radius: 6px;',
      '}',
      '</style>',
      '<div class="header">',
      '  <span class="label">情绪雷达</span>',
      '  <span class="toggle" id="emotion-panel-toggle">_</span>',
      '</div>',
      '<div class="main-emotion" id="emotion-main-label">放松</div>',
      '<div id="emotion-bars"></div>',
      '<div class="radar-wrap"><canvas id="emotion-radar-canvas" width="160" height="160"></canvas></div>'
    ].join('');

    document.body.appendChild(container);
    panelEl = container;
    barsContainer = document.getElementById('emotion-bars');
    mainLabel = document.getElementById('emotion-main-label');
    radarCanvas = document.getElementById('emotion-radar-canvas');
    radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

    // 折叠开关
    var toggleBtn = document.getElementById('emotion-panel-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var content = barsContainer;
        var radar = document.querySelector('#emotion-panel .radar-wrap');
        var main = mainLabel;
        if (content.style.display === 'none') {
          content.style.display = '';
          if (radar) radar.style.display = '';
          if (main) main.style.display = '';
          toggleBtn.textContent = '_';
        } else {
          content.style.display = 'none';
          if (radar) radar.style.display = 'none';
          if (main) main.style.display = 'none';
          toggleBtn.textContent = '+';
        }
      });
    }

    // 使其可拖拽
    initPanelDrag(container);
  }

  function initPanelDrag(el) {
    if (typeof window.initDraggable === 'function') {
      window.initDraggable(el, el.querySelector('.header'), {
        persistX: true,
        persistY: true,
        dragStateRef: { ref: 'emotionPanelDragging' }
      });
    } else {
      var header = el.querySelector('.header');
      if (!header) return;
      var offsetX, offsetY, dragging = false;
      header.style.cursor = 'move';
      header.addEventListener('mousedown', function (e) {
        dragging = true;
        window.isEmotionPanelDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        el.style.left = (e.clientX - offsetX) + 'px';
        el.style.top = (e.clientY - offsetY) + 'px';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
      });
      document.addEventListener('mouseup', function () {
        dragging = false;
        window.isEmotionPanelDragging = false;
      });
    }
  }

  function buildBars() {
    if (!barsContainer) return;
    var dims = window.EmotionState ? window.EmotionState.DIMS : [];
    var meta = window.EmotionState ? window.EmotionState.META : {};

    var html = '';
    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var m = meta[dim] || { label: dim, color: '#888' };
      html +=
        '<div class="bar-row">' +
        '<span class="bar-label">' + m.label + '</span>' +
        '<div class="bar-track"><div class="bar-fill" id="bar-' + dim + '" style="width:0%;background:' + m.color + '"></div></div>' +
        '<span class="bar-value" id="val-' + dim + '">0</span>' +
        '</div>';
    }
    barsContainer.innerHTML = html;
  }

  function updateBars(vector) {
    currentVector = vector || currentVector;
    if (!currentVector) return;

    var dims = window.EmotionState ? window.EmotionState.DIMS : [];
    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var val = Math.round(currentVector[dim] || 0);
      var bar = document.getElementById('bar-' + dim);
      var valEl = document.getElementById('val-' + dim);
      if (bar) bar.style.width = val + '%';
      if (valEl) valEl.textContent = val;
    }
  }

  function updateMainLabel(emotion) {
    currentMain = emotion || currentMain;
    if (!mainLabel) return;
    var meta = window.EmotionState ? window.EmotionState.META : {};
    var m = meta[currentMain] || { label: currentMain, color: '#888' };
    mainLabel.textContent = m.label;
    mainLabel.style.background = m.color + '33';
    mainLabel.style.color = m.color;
  }

  function drawRadar(vector) {
    if (!radarCtx || !radarCanvas) return;
    var v = vector || currentVector;
    if (!v) return;

    var dims = window.EmotionState ? window.EmotionState.DIMS : [];
    var meta = window.EmotionState ? window.EmotionState.META : {};
    var n = dims.length;
    if (n < 3) return;

    var w = radarCanvas.width;
    var h = radarCanvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(cx, cy) - 20;

    var ctx = radarCtx;
    ctx.clearRect(0, 0, w, h);

    // 背景网格
    for (var level = 1; level <= 4; level++) {
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        var lr = r * (level / 4);
        var x = cx + lr * Math.cos(angle);
        var y = cy + lr * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
    }

    // 轴线
    for (var j = 0; j < n; j++) {
      var a = (Math.PI * 2 * j) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.stroke();
    }

    // 数据多边形
    ctx.beginPath();
    for (var k = 0; k < n; k++) {
      var a2 = (Math.PI * 2 * k) / n - Math.PI / 2;
      var val = Math.min(100, v[dims[k]] || 0) / 100;
      var vr = r * val;
      var vx = cx + vr * Math.cos(a2);
      var vy = cy + vr * Math.sin(a2);
      if (k === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    var mainColor = meta[currentMain] ? meta[currentMain].color : '#88cc88';
    ctx.fillStyle = mainColor.replace(')', ',0.25)').replace('rgb', 'rgba');
    if (mainColor.startsWith('#')) {
      ctx.fillStyle = mainColor + '40';
    }
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 标签
    ctx.fillStyle = '#aaa';
    ctx.font = '9px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    for (var mIdx = 0; mIdx < n; mIdx++) {
      var a3 = (Math.PI * 2 * mIdx) / n - Math.PI / 2;
      var lx = cx + (r + 14) * Math.cos(a3);
      var ly = cy + (r + 14) * Math.sin(a3) + 3;
      var label = (meta[dims[mIdx]] || {}).label || dims[mIdx];
      ctx.fillText(label, lx, ly);
    }
  }

  function onEmotionUpdated(data) {
    if (!data) return;
    if (data.vector) {
      updateBars(data.vector);
      drawRadar(data.vector);
    }
    if (data.main && data.main !== currentMain) {
      updateMainLabel(data.main);
    }
  }

  function show() {
    if (!panelEl) createPanel();
    if (!barsContainer.innerHTML) buildBars();
    panelEl.classList.remove('hidden');
    visible = true;

    if (window.BandoriEvents && !_listening) {
      window.BandoriEvents.on('emotion:updated', onEmotionUpdated);
      _listening = true;
    }
  }

  function hide() {
    if (panelEl) panelEl.classList.add('hidden');
    visible = false;
  }

  function toggle() {
    if (visible) hide(); else show();
  }

  window.EmotionPanel = {
    show: show,
    hide: hide,
    toggle: toggle,
    createPanel: createPanel
  };

  console.log('[EmotionPanel] 已就绪');
})();
