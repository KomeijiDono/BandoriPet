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

    document.addEventListener('keydown', function () {
      keyPressCount++;
    });

    document.addEventListener('mousedown', function () {
      clickCount++;
    });

    document.addEventListener('mousemove', function (e) {
      if (lastMouseX !== 0 || lastMouseY !== 0) {
        var dx = e.clientX - lastMouseX;
        var dy = e.clientY - lastMouseY;
        mouseDist += Math.sqrt(dx * dx + dy * dy);
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    tickTimer = setInterval(tick, 500);
  }

  function stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    onUpdate = null;
  }

  window.ApmDetector = {
    start: start,
    stop: stop
  };

  console.log('[ApmDetector] 已就绪');
})();
