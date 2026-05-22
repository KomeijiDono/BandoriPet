/**
 * settings-panel.js — 设置面板
 * toggleSettings / saveSettings / 面板拖拽
 */
(function () {
  'use strict';

  function toggleSettings() {
    var panel = document.getElementById('settings-panel');
    if (!panel) return;
    if (panel.style.display === 'flex') {
      panel.style.animation = 'fadeOut 0.2s forwards';
      setTimeout(function () { panel.style.display = 'none'; panel.style.animation = ''; }, 200);
    } else {
      document.getElementById('c-time').value = localStorage.getItem('c_time') || '#ff6b81';
      document.getElementById('c-date').value = localStorage.getItem('c_date') || '#555555';
      document.getElementById('c-greeting').value = localStorage.getItem('c_greeting') || '#777777';
      document.getElementById('c-weather').value = localStorage.getItem('c_weather') || '#5aa1e3';
      document.getElementById('api-preset').value = localStorage.getItem('api_preset') || 'deepseek';
      document.getElementById('set-phone-w').value = localStorage.getItem('phone_w') || 320;
      document.getElementById('set-phone-h').value = localStorage.getItem('phone_h') || 500;
      document.getElementById('set-phone-scale').value = localStorage.getItem('phone_scale') || 1.0;
      panel.style.display = 'flex';
      panel.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    }
  }

  function saveSettings() {
    var apiPreset = document.getElementById('api-preset').value;
    var phoneW = document.getElementById('set-phone-w').value;
    var phoneH = document.getElementById('set-phone-h').value;
    var phoneScale = document.getElementById('set-phone-scale').value;

    var smartphone = document.getElementById('smartphone-ui');
    if (smartphone) {
      smartphone.style.width = phoneW + 'px';
      smartphone.style.height = phoneH + 'px';
      smartphone.style.transform = 'scale(' + phoneScale + ')';
    }

    var charId = localStorage.getItem('current_char') || 'anon';
    if (typeof updatePhoneBackground === 'function') updatePhoneBackground(charId);

    localStorage.setItem('phone_w', phoneW);
    localStorage.setItem('phone_h', phoneH);
    localStorage.setItem('phone_scale', phoneScale);
    localStorage.setItem('api_preset', apiPreset);

    toggleSettings();
    if (typeof addChatMessage === 'function') addChatMessage("控制台设置应用并保存好啦！", 'ai');

    var model = window.live2dPet || window.live2dModel;
    if (model) {
      try { model.motion("wink"); model.expression("wink"); } catch (e) {}
      setTimeout(function () {
        try { model.expression("default"); } catch (e) {}
      }, 3000);
    }
  }

  // 面板拖拽（用 initDraggable 或手动实现）
  setTimeout(function () {
    var panel = document.getElementById('settings-panel');
    var header = document.getElementById('settings-header');
    if (panel && header) {
      if (typeof initDraggable === 'function') {
        initDraggable(header, panel, { onStart: function (el) { el.style.border = '2px solid #ff6b81'; }, onEnd: function (el) { el.style.border = '2px solid #ffb6c1'; } });
      }
    }
  }, 100);

  window.toggleSettings = toggleSettings;
  window.saveSettings = saveSettings;

  console.log('[Renderer] settings-panel.js 已就绪');
})();
