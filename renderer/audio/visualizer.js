/**
 * visualizer.js — C++ 音频可视化组件 + 挂件拖拽
 * 从 index.html 内联脚本抽离
 */
(function () {
  'use strict';

  var isCppVisualizing = false;
  var visDataArray = new Array(64).fill(0);
  var visAnimId;
  var dynamicHue = 0;
  var smoothedData = [];

  window.BandoriIPC.on('audio-fft', function (fftData) {
    visDataArray = fftData;
  });

  function getRgbFromHex(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) : '255, 182, 193';
  }

  function toggleCppAudio() {
    var enable = document.getElementById('cpp-audio-enable').checked;
    window.BandoriIPC.send('toggle-cpp-audio', enable);
    var vCanvas = document.getElementById('visualizer-canvas');
    var visWidget = document.getElementById('vis-widget');

    if (enable) {
      isCppVisualizing = true;
      if (vCanvas) vCanvas.style.display = 'block';
      if (visWidget) visWidget.style.display = 'block';
      drawAdvancedVisualizer();
      if (typeof addChatMessage === 'function') addChatMessage("麦克风监听已启动！", 'ai');
    } else {
      isCppVisualizing = false;
      if (vCanvas) vCanvas.style.display = 'none';
      if (visWidget) visWidget.style.display = 'none';
      if (visAnimId) cancelAnimationFrame(visAnimId);
      visDataArray.fill(0);
    }
  }

  function drawAdvancedVisualizer() {
    if (!isCppVisualizing) return;
    visAnimId = requestAnimationFrame(drawAdvancedVisualizer);

    var vCanvas = document.getElementById('visualizer-canvas');
    var vCtx = vCanvas.getContext('2d');

    vCanvas.width = vCanvas.offsetWidth;
    vCanvas.height = vCanvas.offsetHeight;
    vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

    var style = document.getElementById('vis-style').value;
    var amp = parseInt(document.getElementById('vis-amp').value) / 100.0;
    var binCount = parseInt(document.getElementById('vis-count').value);
    var isDynamic = document.getElementById('vis-dynamic').checked;

    dynamicHue = (dynamicHue + 0.5) % 360;
    var rgb = getRgbFromHex(document.getElementById('vis-color').value);

    var colorBase = isDynamic ? 'hsla(' + dynamicHue + ', 100%, 65%, 0.8)' : 'rgba(' + rgb + ', 0.8)';
    var colorTop  = isDynamic ? 'hsla(' + dynamicHue + ', 100%, 80%, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    var colorBot  = isDynamic ? 'hsla(' + dynamicHue + ', 100%, 60%, 0.4)' : 'rgba(' + rgb + ', 0.4)';

    var rawFrequencies = [];
    var targetBars = parseInt(document.getElementById('vis-count').value) || 60;
    var halfBars = Math.ceil(targetBars / 2);
    var dataLength = visDataArray.length;
    var step = dataLength / halfBars;

    for (var i = 0; i < halfBars; i++) {
      var dataIndex = Math.floor(i * step);
      var boost = 1 + (i * 0.08);
      var val = (visDataArray[dataIndex] || 0) * boost * amp;
      rawFrequencies.push(Math.min(val, 300));
    }

    var finalData = rawFrequencies.slice().reverse().concat(rawFrequencies);
    if (targetBars % 2 !== 0) finalData.pop();

    var bufferLengthToDraw = finalData.length;

    if (smoothedData.length !== bufferLengthToDraw) {
      smoothedData = new Array(bufferLengthToDraw).fill(0);
    }

    var lerpFactor = 0.18;
    for (var j = 0; j < bufferLengthToDraw; j++) {
      smoothedData[j] += (finalData[j] - smoothedData[j]) * lerpFactor;
    }

    vCtx.fillStyle = colorBase;
    vCtx.strokeStyle = colorBase;
    vCtx.lineWidth = 2;

    if (style === 'bar') {
      var barWidth = (vCanvas.width / bufferLengthToDraw) * 0.8;
      var x = (vCanvas.width - (barWidth + 2) * bufferLengthToDraw) / 2;
      for (var k = 0; k < bufferLengthToDraw; k++) {
        var barHeight = (smoothedData[k] / 255) * vCanvas.height;
        var grad = vCtx.createLinearGradient(0, vCanvas.height - barHeight, 0, vCanvas.height);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBot);
        vCtx.fillStyle = grad;
        vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    }
    else if (style === 'circle') {
      var centerX = vCanvas.width / 2;
      var centerY = vCanvas.height / 2;
      var radius = Math.min(centerX, centerY) * 0.3;
      vCtx.beginPath();
      vCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      vCtx.strokeStyle = colorBot;
      vCtx.stroke();

      for (var m = 0; m < bufferLengthToDraw; m++) {
        var barHeight2 = (smoothedData[m] / 255) * (Math.min(centerX, centerY) * 0.6);
        var rads = (Math.PI * 2 / bufferLengthToDraw) * m - Math.PI / 2;
        var x1 = centerX + Math.cos(rads) * radius;
        var y1 = centerY + Math.sin(rads) * radius;
        var xEnd = centerX + Math.cos(rads) * (radius + barHeight2);
        var yEnd = centerY + Math.sin(rads) * (radius + barHeight2);
        var grad2 = vCtx.createLinearGradient(x1, y1, xEnd, yEnd);
        grad2.addColorStop(0, colorBot);
        grad2.addColorStop(1, colorTop);
        vCtx.strokeStyle = grad2;
        vCtx.beginPath();
        vCtx.moveTo(x1, y1);
        vCtx.lineTo(xEnd, yEnd);
        vCtx.stroke();
      }
    }
    else if (style === 'line') {
      var sliceWidth = vCanvas.width / (bufferLengthToDraw - 1);
      var lineX = 0;
      vCtx.beginPath();
      var lineGrad = vCtx.createLinearGradient(0, 0, vCanvas.width, 0);
      lineGrad.addColorStop(0, colorBot);
      lineGrad.addColorStop(0.5, colorTop);
      lineGrad.addColorStop(1, colorBot);
      vCtx.lineWidth = 4;
      vCtx.lineJoin = 'round';
      vCtx.shadowBlur = 10;
      vCtx.shadowColor = colorTop;

      for (var n = 0; n < bufferLengthToDraw; n++) {
        var v = smoothedData[n] / 255.0;
        var lineY = vCanvas.height * 0.8 - (v * vCanvas.height * 0.6);
        if (n === 0) vCtx.moveTo(lineX, lineY);
        else vCtx.lineTo(lineX, lineY);
        lineX += sliceWidth;
      }
      vCtx.strokeStyle = lineGrad;
      vCtx.stroke();
      vCtx.shadowBlur = 0;
    }
  }

  // ========== 挂件拖拽 ==========
  var visWidget = document.getElementById('vis-widget');
  var isVisDragging = false, vStartX, vStartY, vInitLeft, vInitTop;

  function updateVisSize() {
    var w = parseInt(document.getElementById('vis-width').value);
    var h = parseInt(document.getElementById('vis-height').value);

    if (visWidget.style.transform !== 'none') {
      var rect = visWidget.getBoundingClientRect();
      visWidget.style.left = rect.left + 'px';
      visWidget.style.top = rect.top + 'px';
      visWidget.style.transform = 'none';
    }

    var oldW = parseInt(visWidget.style.width) || 100;
    var oldH = parseInt(visWidget.style.height) || 100;

    visWidget.style.width = w + 'px';
    visWidget.style.height = h + 'px';

    var currentLeft = parseFloat(visWidget.style.left) || 0;
    var currentTop = parseFloat(visWidget.style.top) || 0;

    visWidget.style.left = (currentLeft - (w - oldW) / 2) + 'px';
    visWidget.style.top = (currentTop - (h - oldH)) + 'px';

    localStorage.setItem('vis_x', visWidget.style.left);
    localStorage.setItem('vis_y', visWidget.style.top);
    localStorage.setItem('vis_w', w);
    localStorage.setItem('vis_h', h);

    var vCanvas = document.getElementById('visualizer-canvas');
    if (vCanvas) { vCanvas.width = w; vCanvas.height = h; }
  }

  if (localStorage.getItem('vis_w')) {
    document.getElementById('vis-width').value = localStorage.getItem('vis_w');
    document.getElementById('vis-height').value = localStorage.getItem('vis_h');
  }
  updateVisSize();
  if (localStorage.getItem('vis_x')) {
    visWidget.style.left = localStorage.getItem('vis_x');
    visWidget.style.top = localStorage.getItem('vis_y');
    visWidget.style.transform = 'none';
  }

  document.getElementById('lock-widget').addEventListener('change', function (e) {
    visWidget.style.border = 'none';
    visWidget.style.background = 'transparent';
    if (e.target.checked) {
      visWidget.style.pointerEvents = 'none';
      visWidget.style.cursor = 'default';
    } else {
      visWidget.style.pointerEvents = 'auto';
      visWidget.style.cursor = 'move';
    }
  });

  visWidget.addEventListener('mousedown', function (e) {
    if (document.getElementById('lock-widget').checked) return;
    isVisDragging = true;
    vStartX = e.clientX;
    vStartY = e.clientY;
    var rect = visWidget.getBoundingClientRect();
    vInitLeft = rect.left;
    vInitTop = rect.top;
    visWidget.style.left = vInitLeft + 'px';
    visWidget.style.top = vInitTop + 'px';
    visWidget.style.bottom = 'auto';
    visWidget.style.right = 'auto';
    visWidget.style.transform = 'none';
    visWidget.style.border = "1px solid rgba(255, 107, 129, 0.4)";
  });

  document.addEventListener('mousemove', function (e) {
    if (!isVisDragging) return;
    visWidget.style.left = (vInitLeft + (e.clientX - vStartX)) + 'px';
    visWidget.style.top = (vInitTop + (e.clientY - vStartY)) + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (isVisDragging) {
      isVisDragging = false;
      visWidget.style.border = "none";
      localStorage.setItem('vis_x', visWidget.style.left);
      localStorage.setItem('vis_y', visWidget.style.top);
    }
  });

  // ========== 暴露到全局 ==========
  window.toggleCppAudio = toggleCppAudio;
  window.updateVisSize = updateVisSize;
  window.updateVisSettings = function () {
    var slider = document.getElementById('vis-count');
    var num = document.getElementById('vis-count-num');
    if (slider && num) {
      if (document.activeElement === slider) num.value = slider.value;
    }
  };

  console.log('[Renderer] visualizer.js 已就绪');
})();
