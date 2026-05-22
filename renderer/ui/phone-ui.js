/**
 * phone-ui.js — 手机 UI 组件
 * 手机初始化 / updatePhoneBackground / 拖拽 / toggleSmartphone / 背景文字拖拽
 */
(function () {
  'use strict';

  var smartphoneUI, phoneHeader;

  function initPhoneUI() {
    smartphoneUI = document.getElementById('smartphone-ui');
    phoneHeader = document.getElementById('phone-header');
    if (!smartphoneUI) return;

    smartphoneUI.style.left = localStorage.getItem('phone_x') || '40px';
    smartphoneUI.style.top = localStorage.getItem('phone_y') || '50px';
    smartphoneUI.style.width = (localStorage.getItem('phone_w') || 320) + 'px';
    smartphoneUI.style.height = (localStorage.getItem('phone_h') || 500) + 'px';
    smartphoneUI.style.transform = 'scale(' + (localStorage.getItem('phone_scale') || 1.0) + ')';

    // 手机拖拽
    if (phoneHeader && typeof initDraggable === 'function') {
      initDraggable(phoneHeader, smartphoneUI, {
        lockCheck: function () { return document.getElementById('lock-widget') && document.getElementById('lock-widget').checked; },
        onStart: function (el) { el.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 0 0 2px #555'; },
        onEnd: function (el) { el.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2), inset 0 0 0 2px #555'; },
        persistX: 'phone_x',
        persistY: 'phone_y'
      });
    }

    // 背景文字层拖拽
    var txtLayer = document.getElementById('bg-text-layer');
    if (txtLayer) {
      if (localStorage.getItem('adv_txt_x')) {
        txtLayer.style.left = localStorage.getItem('adv_txt_x');
        txtLayer.style.top = localStorage.getItem('adv_txt_y');
      }
      if (typeof initDraggable === 'function') {
        initDraggable(txtLayer, txtLayer, {
          lockCheck: function () { return document.getElementById('lock-widget') && document.getElementById('lock-widget').checked; },
          onStart: function (el) { el.style.border = '1px dashed rgba(255, 182, 193, 0.8)'; },
          onEnd: function (el) { el.style.border = 'none'; },
          persistX: 'adv_txt_x',
          persistY: 'adv_txt_y'
        });
      }
    }
  }

  function updatePhoneBackground(charId) {
    var charactersConfig = window.CharactersConfig;
    var charName = (charactersConfig && charactersConfig[charId]) ? charactersConfig[charId].name : 'MyGO!!!!!';
    var titleEl = document.getElementById('phone-title');
    if (titleEl) titleEl.innerText = charName;
    if (!smartphoneUI) smartphoneUI = document.getElementById('smartphone-ui');
    if (!smartphoneUI) return;

    var bgFileName = 'character.jpg';
    try {
      if (typeof require !== 'undefined') {
        var fs = require('fs');
        var path = require('path');
        if (fs.existsSync(path.join(__dirname, 'model', charId, 'character.png'))) {
          bgFileName = 'character.png';
        }
      }
    } catch (e) {}
    smartphoneUI.style.backgroundImage = "url('model/" + charId + "/" + bgFileName + "'), linear-gradient(135deg, #ffb6c1 0%, #87ceeb 100%)";
  }

  function toggleSmartphone() {
    var show = document.getElementById('show-smartphone');
    if (!show) return;
    var enabled = show.checked;
    localStorage.setItem('show_smartphone', enabled);
    var el = document.getElementById('smartphone-ui');
    if (el) el.style.display = enabled ? 'flex' : 'none';
  }

  // 初始化
  setTimeout(initPhoneUI, 0);

  // DOMContentLoaded: 恢复手机显示状态
  window.addEventListener('DOMContentLoaded', function () {
    var phoneSaved = localStorage.getItem('show_smartphone') !== 'false';
    var checkbox = document.getElementById('show-smartphone');
    if (checkbox) checkbox.checked = phoneSaved;
    toggleSmartphone();
  });

  updatePhoneBackground(localStorage.getItem('current_char') || 'anon');

  window.updatePhoneBackground = updatePhoneBackground;
  window.toggleSmartphone = toggleSmartphone;

  console.log('[Renderer] phone-ui.js 已就绪');
})();
