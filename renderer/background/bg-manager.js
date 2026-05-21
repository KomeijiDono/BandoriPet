/**
 * bg-manager.js — 背景管理系统
 * 背景模式切换、高级背景图层、自定义背景图、视频背景
 * 从 index.html 内联脚本抽离
 * 依赖：window.initParticles（由 particles.js 暴露）、window.app（PIXI Application）
 */
(function () {
  'use strict';

  var appBg = document.getElementById('app-background');
  var bgInput = document.getElementById('bg-file-input');
  var bgDisplay = document.getElementById('bg-path-display');

  // ========== 背景模式切换 ==========
  function applyBgMode() {
    var modeSelect = document.getElementById('bg-mode');
    var mode = modeSelect ? modeSelect.value : (localStorage.getItem('anon_bg_mode') || 'transparent');
    localStorage.setItem('anon_bg_mode', mode);

    var video = document.getElementById('dynamic-bg');
    var pCanvas = document.getElementById('particle-canvas');
    var uploadRow = document.getElementById('video-upload-row');
    var pSettings = document.getElementById('particle-settings');
    var advSettings = document.getElementById('advanced-bg-settings');

    var bgColorEnable = document.getElementById('bg-color-enable').checked;
    var customColor = document.getElementById('bg-custom-color').value;

    localStorage.setItem('bg_color_enable', bgColorEnable);
    localStorage.setItem('bg_custom_color', customColor);

    if (bgColorEnable && mode !== 'transparent') {
      document.body.style.backgroundColor = customColor;
      if (window.app && window.app.renderer) window.app.renderer.backgroundAlpha = 0;
    } else {
      document.body.style.backgroundColor = "transparent";
    }

    if (video) video.style.display = "none";
    if (pCanvas) pCanvas.style.display = "none";
    if (uploadRow) uploadRow.style.display = "none";
    if (pSettings) pSettings.style.display = "none";
    if (advSettings) advSettings.style.display = "none";

    document.getElementById('app-background').style.animation = "none";

    if (mode === 'particles') {
      if (pCanvas) pCanvas.style.display = "block";
      if (pSettings) pSettings.style.display = "flex";
      if (typeof window.initParticles === 'function') window.initParticles();
    } else if (mode === 'video') {
      if (video) video.style.display = "block";
      if (uploadRow) uploadRow.style.display = "flex";
      var savedVideo = localStorage.getItem('saved_video_path');
      if (savedVideo && video) video.src = savedVideo;
    } else if (mode === 'advanced') {
      if (advSettings) advSettings.style.display = "flex";
      updateAdvancedBG();
    } else {
      document.getElementById('app-background').style.background = "";
      var txtLayer = document.getElementById('bg-text-layer');
      if (txtLayer) txtLayer.innerText = "";
    }
  }

  // ========== 粒子设置 ==========
  function applyParticleSettings() {
    localStorage.setItem('p_color', document.getElementById('p-color').value);
    localStorage.setItem('p_count', document.getElementById('p-count').value);
    localStorage.setItem('p_speed', document.getElementById('p-speed').value);
    localStorage.setItem('p_shape', document.getElementById('p-shape').value);
    if (typeof window.initParticles === 'function') window.initParticles();
  }

  // ========== 自定义背景图 ==========
  function applyCustomBg(imgPath) {
    if (appBg) appBg.style.backgroundImage = "url('" + imgPath + "')";
    if (bgDisplay) {
      var filename = imgPath.substring(imgPath.lastIndexOf('/') + 1);
      bgDisplay.innerText = decodeURI(filename);
    }
  }

  function clearBackground() {
    localStorage.removeItem('custom_background');
    if (appBg) appBg.style.backgroundImage = '';
    if (bgDisplay) bgDisplay.innerText = "无";
  }

  if (bgInput) {
    bgInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var bgPath = "file:///" + file.path.replace(/\\/g, '/');
      localStorage.setItem('custom_background', bgPath);
      applyCustomBg(bgPath);
    });
  }

  var savedCustomBg = localStorage.getItem('custom_background');
  if (savedCustomBg) applyCustomBg(savedCustomBg);

  // ========== 视频背景上传 ==========
  document.addEventListener('DOMContentLoaded', function () {
    var uploader = document.getElementById('video-upload');
    if (uploader) {
      uploader.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file) {
          var videoPath = "file:///" + file.path.replace(/\\/g, '/');
          localStorage.setItem('saved_video_path', videoPath);
          var vEl = document.getElementById('dynamic-bg');
          if (vEl) vEl.src = videoPath;
        }
      });
    }
  });

  // ========== 高级背景图层 ==========
  function updateAdvancedBG() {
    var layerGrad = document.getElementById('bg-layer-gradient');
    var layerPat = document.getElementById('bg-layer-pattern');
    var layerLine = document.getElementById('bg-layer-lines');

    if (document.getElementById('bg-mode').value !== 'advanced') {
      if (layerGrad) layerGrad.style.opacity = 0;
      if (layerPat) layerPat.style.opacity = 0;
      if (layerLine) layerLine.style.opacity = 0;
      return;
    }

    var useGrad = document.getElementById('adv-gradient').checked;
    var spdGrad = 101 - document.getElementById('adv-grad-speed').value;
    var usePat = document.getElementById('adv-pattern').checked;
    var spdPat = 101 - document.getElementById('adv-pat-speed').value;
    var useLine = document.getElementById('adv-lines').checked;
    var spdLine = 101 - document.getElementById('adv-line-speed').value;

    localStorage.setItem('adv_grad', useGrad); localStorage.setItem('adv_grad_s', spdGrad);
    localStorage.setItem('adv_pat', usePat); localStorage.setItem('adv_pat_s', spdPat);
    localStorage.setItem('adv_line', useLine); localStorage.setItem('adv_line_s', spdLine);

    if (useGrad) {
      layerGrad.style.opacity = 1;
      layerGrad.style.animation = 'iridescentBg ' + spdGrad + 's ease infinite';
    } else layerGrad.style.opacity = 0;

    if (usePat) {
      layerPat.style.opacity = 1;
      layerPat.style.animation = 'patternMove ' + spdPat + 's linear infinite';
    } else layerPat.style.opacity = 0;

    if (useLine) {
      layerLine.style.opacity = 1;
      layerLine.style.animation = 'linesRandom ' + spdLine + 's ease-in-out infinite';
    } else layerLine.style.opacity = 0;

    var txtLayer = document.getElementById('bg-text-layer');
    var txtContent = document.getElementById('adv-text-content');
    if (txtLayer && txtContent) {
      txtLayer.innerText = txtContent.value;
      txtLayer.style.fontFamily = '"' + document.getElementById('adv-font-family').value + '", sans-serif';
      txtLayer.style.fontSize = document.getElementById('adv-font-size').value + 'px';
      txtLayer.style.color = document.getElementById('adv-text-color').value;
      txtLayer.style.fontWeight = "bold";

      var txtStyle = document.getElementById('adv-text-style').value;
      var txtAnim = document.getElementById('adv-text-anim').value;
      txtLayer.className = '';
      if (txtStyle !== 'normal') txtLayer.classList.add('text-style-' + txtStyle);
      if (txtAnim !== 'none') txtLayer.classList.add('text-anim-' + txtAnim);
      var txtZ = document.getElementById('adv-text-zindex').value;
      localStorage.setItem('adv_z', txtZ);
      txtLayer.style.zIndex = txtZ;
    }

    localStorage.setItem('adv_txt', txtContent ? txtContent.value : '');
    localStorage.setItem('adv_font', document.getElementById('adv-font-family').value);
    localStorage.setItem('adv_size', document.getElementById('adv-font-size').value);
    localStorage.setItem('adv_color', document.getElementById('adv-text-color').value);
    localStorage.setItem('adv_style', document.getElementById('adv-text-style').value);
    localStorage.setItem('adv_anim', document.getElementById('adv-text-anim').value);
  }

  function initAdvancedSettings() {
    var el = document.getElementById('adv-gradient');
    if (el) el.checked = localStorage.getItem('adv_grad') === 'true';
    el = document.getElementById('adv-pattern');
    if (el) el.checked = localStorage.getItem('adv_pat') === 'true';
    el = document.getElementById('adv-lines');
    if (el) el.checked = localStorage.getItem('adv_line') === 'true';
    el = document.getElementById('adv-text-content');
    if (el) el.value = localStorage.getItem('adv_txt') || '';
    el = document.getElementById('adv-font-family');
    if (el) el.value = localStorage.getItem('adv_font') || 'Microsoft YaHei';
    el = document.getElementById('adv-font-size');
    if (el) el.value = localStorage.getItem('adv_size') || '120';
    el = document.getElementById('adv-text-color');
    if (el) el.value = localStorage.getItem('adv_color') || '#ffb6c1';
    el = document.getElementById('adv-text-style');
    if (el) el.value = localStorage.getItem('adv_style') || 'normal';
    el = document.getElementById('adv-text-anim');
    if (el) el.value = localStorage.getItem('adv_anim') || 'none';
    el = document.getElementById('adv-grad-speed');
    if (el) el.value = 101 - (localStorage.getItem('adv_grad_s') || 16);
    el = document.getElementById('adv-text-zindex');
    if (el) el.value = localStorage.getItem('adv_z') || '-8';
  }

  document.addEventListener('DOMContentLoaded', initAdvancedSettings);

  // ========== 暴露到全局 ==========
  window.applyBgMode = applyBgMode;
  window.applyParticleSettings = applyParticleSettings;
  window.applyCustomBg = applyCustomBg;
  window.clearBackground = clearBackground;
  window.updateAdvancedBG = updateAdvancedBG;
  window.initAdvancedSettings = initAdvancedSettings;

  console.log('[Renderer] bg-manager.js 已就绪');
})();
