/**
 * settings-panel.js — 设置面板
 * toggleSettings / saveSettings / 面板拖拽
 */
(function () {
  'use strict';

  var defaultApiConfigs = {
    "deepseek": { url: "https://api.deepseek.com/v1/chat/completions", key: "", model: "deepseek-chat" },
    "gemini":   { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=", key: "", model: "gemini-3.1-flash-lite" },
    "openai":   { url: "https://api.openai.com/v1/chat/completions", key: "", model: "gpt-5.4-2026-03-05" },
    "qwen":     { url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", key: "", model: "qwen3.6-max-preview" }
  };
  var currentApiConfigs = {};
  var activePreset = 'deepseek';

  // 切换设置面板显示/隐藏，打开时从 localStorage 恢复所有字段值
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

      activePreset = localStorage.getItem('api_preset') || 'deepseek';
      document.getElementById('api-preset').value = activePreset;

      // 加载 API 持久化配置
      currentApiConfigs = JSON.parse(localStorage.getItem('api_configs')) || {};
      // 补全由于版本升级或未配置导致的默认值
      for (var k in defaultApiConfigs) {
        if (!currentApiConfigs[k]) {
          currentApiConfigs[k] = Object.assign({}, defaultApiConfigs[k]);
        }
      }
      var config = currentApiConfigs[activePreset] || { url: '', key: '', model: '' };
      document.getElementById('api-url').value = config.url || '';
      document.getElementById('api-key').value = config.key || '';
      document.getElementById('api-model').value = config.model || '';

      document.getElementById('set-phone-w').value = localStorage.getItem('phone_w') || 320;
      document.getElementById('set-phone-h').value = localStorage.getItem('phone_h') || 500;
      document.getElementById('set-phone-scale').value = localStorage.getItem('phone_scale') || 1.0;
      panel.style.display = 'flex';
      panel.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    }
  }

  // 保存设置：手机尺寸/缩放、API 预设，保存后触发模型 wink 动画
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

    // 保存当前输入框的 API 配置
    currentApiConfigs[apiPreset] = {
      url: document.getElementById('api-url').value.trim(),
      key: document.getElementById('api-key').value.trim(),
      model: document.getElementById('api-model').value.trim()
    };
    localStorage.setItem('api_configs', JSON.stringify(currentApiConfigs));

    toggleSettings();
    if (typeof addChatMessage === 'function') addChatMessage("控制台设置应用并保存好啦！", 'ai');

    var model = window.live2dPet || window.live2dModel;
    if (model) {
      try { model.motion("wink"); model.expression("wink"); } catch (e) { console.warn('[设置] 模型动画失败:', e.message); }
      setTimeout(function () {
        try { model.expression("default"); } catch (e) { console.warn('[设置] 模型还原失败:', e.message); }
      }, 3000);
    }
  }

  // 测试连接
  async function testApiConnection() {
    var testBtn = document.getElementById('btn-test-api');
    if (!testBtn) return;

    var originalText = testBtn.innerText;
    testBtn.innerText = "测试中...";
    testBtn.disabled = true;
    testBtn.style.background = "#aaa";

    var url = document.getElementById('api-url').value.trim();
    var key = document.getElementById('api-key').value.trim();
    var model = document.getElementById('api-model').value.trim();
    var preset = document.getElementById('api-preset').value;

    if (!url) {
      alert("请输入 API URL！");
      testBtn.innerText = originalText;
      testBtn.disabled = false;
      testBtn.style.background = "#5aa1e3";
      return;
    }

    try {
      var response;
      if (preset === "gemini") {
        var testUrl = url + key;
        response = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
          })
        });
      } else {
        var headers = { "Content-Type": "application/json" };
        if (key) {
          headers["Authorization"] = 'Bearer ' + key;
        }
        response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5
          })
        });
      }

      var data = await response.json();
      if (!response.ok || data.error) {
        var errMsg = (data.error && data.error.message) || response.statusText || "未知错误";
        throw new Error(errMsg);
      }

      testBtn.innerText = "成功 ✔";
      testBtn.style.background = "#2ed573";
      setTimeout(function () {
        testBtn.innerText = originalText;
        testBtn.disabled = false;
        testBtn.style.background = "#5aa1e3";
      }, 2000);

    } catch (err) {
      testBtn.innerText = "失败 ✘";
      testBtn.style.background = "#ff4757";
      alert("API 测试连接失败，错误详情:\n" + err.message);
      setTimeout(function () {
        testBtn.innerText = originalText;
        testBtn.disabled = false;
        testBtn.style.background = "#5aa1e3";
      }, 2000);
    }
  }

  // 绑定 API 切换和测试按钮事件
  setTimeout(function () {
    var presetSelect = document.getElementById('api-preset');
    if (presetSelect) {
      presetSelect.addEventListener('change', function () {
        if (activePreset) {
          currentApiConfigs[activePreset] = {
            url: document.getElementById('api-url').value.trim(),
            key: document.getElementById('api-key').value.trim(),
            model: document.getElementById('api-model').value.trim()
          };
        }
        activePreset = presetSelect.value;
        var config = currentApiConfigs[activePreset] || { url: '', key: '', model: '' };
        document.getElementById('api-url').value = config.url || '';
        document.getElementById('api-key').value = config.key || '';
        document.getElementById('api-model').value = config.model || '';
      });
    }

    var testBtn = document.getElementById('btn-test-api');
    if (testBtn) {
      testBtn.addEventListener('click', testApiConnection);
    }
  }, 100);

  // 面板拖拽：通过标题栏 initDraggable 实现拖拽，设置拖拽状态标记
  setTimeout(function () {
    var panel = document.getElementById('settings-panel');
    var header = document.getElementById('settings-header');
    if (panel && header) {
      if (typeof initDraggable === 'function') {
        initDraggable(header, panel, { onStart: function (el) { el.style.border = '2px solid #ff6b81'; window.isSetDragging = true; }, onEnd: function (el) { el.style.border = '2px solid #ffb6c1'; window.isSetDragging = false; } });
      }
    }
  }, 100);

  window.toggleSettings = toggleSettings;
  window.saveSettings = saveSettings;

  console.log('[Renderer] settings-panel.js 已就绪');
})();
