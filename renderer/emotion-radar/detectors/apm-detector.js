/**
 * apm-detector.js — APM 键盘/鼠标活动检测器
 * 监听 keydown/keyup/mousemove/mousedown 事件
 * 输出信号：apmRate, clickRate, mouseSpeed, isActive
 */
(function () {
  'use strict';

  var keyPressCount = 0;
  var clickCount = 0;
  var mouseDist = 0;
  var lastMouseX = 0;
  var lastMouseY = 0;
  var lastTickTime = Date.now();
  var tickTimer = null;
  var onUpdate = null;

  // 具名事件处理函数（用于正确移除监听器）
  function handleKeydown() {
    keyPressCount++;
  }

  function handleMousedown() {
    clickCount++;
  }

  function handleMousemove(e) {
    if (lastMouseX !== 0 || lastMouseY !== 0) {
      var dx = e.clientX - lastMouseX;
      var dy = e.clientY - lastMouseY;
      mouseDist += Math.sqrt(dx * dx + dy * dy);
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

  function reset() {
    keyPressCount = 0;
    clickCount = 0;
    mouseDist = 0;
    lastTickTime = Date.now();
  }

  function tick() {
    var now = Date.now();
    var elapsed = (now - lastTickTime) / 1000;
    if (elapsed <= 0) elapsed = 0.5;

    var apmRate = (keyPressCount / elapsed) * 60;
    var clickRate = clickCount / elapsed;
    var mouseSpeed = mouseDist / elapsed;
    var wasActive = keyPressCount > 0 || clickCount > 0 || mouseDist > 10;

    reset();

    if (typeof onUpdate === 'function') {
      onUpdate({
        apmRate: apmRate,
        clickRate: clickRate,
        mouseSpeed: mouseSpeed,
        isActive: wasActive
      });
    }
  }

  function start(callback) {
    if (tickTimer) return;

    onUpdate = callback;

    // 使用具名函数注册事件监听器
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMousedown);
    document.addEventListener('mousemove', handleMousemove);

    tickTimer = setInterval(tick, 500);
  }

  function stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }

    // 移除事件监听器，防止内存泄漏
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('mousedown', handleMousedown);
    document.removeEventListener('mousemove', handleMousemove);

    onUpdate = null;
  }

  window.ApmDetector = {
    start: start,
    stop: stop
  };

  console.log('[ApmDetector] 已就绪');
})();
