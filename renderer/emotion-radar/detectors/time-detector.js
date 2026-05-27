/**
 * time-detector.js — 时间段检测器
 * 根据当前系统时间判断时段
 * 输出信号：period (morning/noon/afternoon/evening/night/late_night)
 */
(function () {
  'use strict';

  var tickTimer = null;
  var onUpdate = null;

  function getPeriod(hour) {
    if (hour >= 0 && hour < 6)   return 'late_night';
    if (hour >= 6 && hour < 9)   return 'morning';
    if (hour >= 9 && hour < 12)  return 'noon';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  function tick() {
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var period = getPeriod(hour);

    if (typeof onUpdate === 'function') {
      onUpdate({
        hour: hour,
        minute: minute,
        period: period,
        isNight: (hour >= 23 || hour < 6),
        isMorning: (hour >= 6 && hour < 9)
      });
    }
  }

  function start(callback) {
    if (tickTimer) return;
    onUpdate = callback;
    tick();
    tickTimer = setInterval(tick, 60000); // 每分钟检查一次
  }

  function stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    onUpdate = null;
  }

  window.TimeDetector = {
    start: start,
    stop: stop
  };

  console.log('[TimeDetector] 已就绪');
})();
