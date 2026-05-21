/**
 * info-widget.js — 信息挂件（时钟、日期、问候语、拖拽、锁定）
 * 从 index.html 内联脚本抽离
 */
(function () {
  'use strict';

  // ========== 时钟 ==========
  function updateClock() {
    var now = new Date();
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');

    var clockTime = document.getElementById('clock-time');
    if (clockTime) clockTime.innerText = hours + ':' + minutes + ':' + seconds;

    var phoneTime = document.getElementById('phone-time');
    if (phoneTime) phoneTime.innerText = hours + ':' + minutes;

    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    var days = ['日', '一', '二', '三', '四', '五', '六'];
    var day = days[now.getDay()];

    var clockDate = document.getElementById('clock-date');
    if (clockDate) clockDate.innerText = year + '年' + month + '月' + date + '日 星期' + day;

    var greeting = document.getElementById('greeting-text');
    if (greeting) {
      var charId = localStorage.getItem('current_char') || 'anon';
      var charName = (window.CharactersConfig && window.CharactersConfig[charId]) ? window.CharactersConfig[charId].name : "大家";
      if (hours >= 5 && hours < 11) greeting.innerText = '早上好，今天也要和' + charName + '一起加油哦！';
      else if (hours >= 11 && hours < 14) greeting.innerText = '午休时间，要和' + charName + '一起吃点什么吗？';
      else if (hours >= 14 && hours < 19) greeting.innerText = '下午好，继续保持专注！';
      else if (hours >= 19 && hours < 23) greeting.innerText = '晚上好，辛苦一天啦。';
      else greeting.innerText = '夜深了，' + charName + '提醒你早点休息哦。';
    }
  }

  setInterval(updateClock, 1000);
  updateClock();

  // ========== 拖拽 ==========
  var widget = document.getElementById('info-widget');
  if (widget) {
    widget.style.left = localStorage.getItem('widget_x') || '20px';
    widget.style.top = localStorage.getItem('widget_y') || '55px';
  }

  var isDragging = false, startX, startY, initialLeft, initialTop;

  if (widget) {
    widget.addEventListener('mousedown', function (e) {
      var lockEl = document.getElementById('lock-widget');
      if (lockEl && lockEl.checked) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = parseInt(window.getComputedStyle(widget).left) || 0;
      initialTop = parseInt(window.getComputedStyle(widget).top) || 0;
      widget.style.border = "1px solid #ff6b81";
      widget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.2)";
    });
  }

  document.addEventListener('mousemove', function (e) {
    if (!isDragging || !widget) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    widget.style.left = (initialLeft + dx) + 'px';
    widget.style.top = (initialTop + dy) + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!isDragging || !widget) return;
    isDragging = false;
    widget.style.border = "1px solid rgba(255, 255, 255, 0.4)";
    widget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1)";
    localStorage.setItem('widget_x', widget.style.left);
    localStorage.setItem('widget_y', widget.style.top);
  });

  // ========== 锁 ==========
  function toggleWidgetLock() {
    var lockEl = document.getElementById('lock-widget');
    var isLocked = lockEl ? lockEl.checked : false;
    localStorage.setItem('widget_locked', isLocked);
    if (widget) {
      if (isLocked) widget.classList.add('locked');
      else widget.classList.remove('locked');
    }
  }

  function toggleInfoWidget() {
    var showEl = document.getElementById('show-info-widget');
    var show = showEl ? showEl.checked : true;
    localStorage.setItem('show_info_widget', show);
    var infoWidget = document.getElementById('info-widget');
    if (infoWidget) infoWidget.style.display = show ? 'block' : 'none';
  }

  // ========== 颜色 ==========
  function applyWidgetColors() {
    var tColor = document.getElementById('c-time');
    var dColor = document.getElementById('c-date');
    var gColor = document.getElementById('c-greeting');
    var wColor = document.getElementById('c-weather');

    var tVal = tColor ? tColor.value : '#ff6b81';
    var dVal = dColor ? dColor.value : '#555555';
    var gVal = gColor ? gColor.value : '#777777';
    var wVal = wColor ? wColor.value : '#5aa1e3';

    var ct = document.getElementById('clock-time');
    var cd = document.getElementById('clock-date');
    var gt = document.getElementById('greeting-text');
    var wt = document.getElementById('weather-text');

    if (ct) ct.style.color = tVal;
    if (cd) cd.style.color = dVal;
    if (gt) gt.style.color = gVal;
    if (wt) wt.style.color = wVal;

    localStorage.setItem('c_time', tVal);
    localStorage.setItem('c_date', dVal);
    localStorage.setItem('c_greeting', gVal);
    localStorage.setItem('c_weather', wVal);
  }

  function initWidgetColors() {
    var tColor = localStorage.getItem('c_time') || '#ff6b81';
    var dColor = localStorage.getItem('c_date') || '#555555';
    var gColor = localStorage.getItem('c_greeting') || '#777777';
    var wColor = localStorage.getItem('c_weather') || '#5aa1e3';

    var ct = document.getElementById('clock-time');
    var cd = document.getElementById('clock-date');
    var gt = document.getElementById('greeting-text');
    var wt = document.getElementById('weather-text');

    if (ct) ct.style.color = tColor;
    if (cd) cd.style.color = dColor;
    if (gt) gt.style.color = gColor;
    if (wt) wt.style.color = wColor;
  }

  // ========== 初始化 ==========
  initWidgetColors();

  var showSaved = localStorage.getItem('show_info_widget') !== 'false';
  var showEl = document.getElementById('show-info-widget');
  if (showEl) showEl.checked = showSaved;
  var infoEl = document.getElementById('info-widget');
  if (infoEl) infoEl.style.display = showSaved ? 'block' : 'none';

  var lockEl = document.getElementById('lock-widget');
  if (lockEl) lockEl.checked = localStorage.getItem('widget_locked') === 'true';
  toggleWidgetLock();

  // ========== 暴露到全局 ==========
  window.updateClock = updateClock;
  window.toggleWidgetLock = toggleWidgetLock;
  window.toggleInfoWidget = toggleInfoWidget;
  window.applyWidgetColors = applyWidgetColors;
  window.initWidgetColors = initWidgetColors;

  console.log('[Renderer] info-widget.js 已就绪');
})();
