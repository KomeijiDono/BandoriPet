/**
 * emotion-radar.js — 情绪雷达 WebSocket
 * 连接配置中的 WebSocket URL 监听情绪事件，触发语音播报
 */
(function () {
  'use strict';

  // 从配置文件加载 WebSocket URL 和重连延迟
  var radarWsUrl = window.ConfigLoader ? window.ConfigLoader.get('external.radarWsUrl', 'ws://localhost:8765') : 'ws://localhost:8765';
  var radarReconnectDelay = window.ConfigLoader ? window.ConfigLoader.get('external.radarReconnectDelay', 10000) : 10000;
  var radarCooldown = window.ConfigLoader ? window.ConfigLoader.get('external.radarCooldown', 10000) : 10000;

  var isRadarActive = false;

  function connectEmotionRadar() {
    var radarSocket = new WebSocket(radarWsUrl);
    radarSocket.onopen = function () {
      console.log("情绪雷达对接成功");
    };
    radarSocket.onmessage = function (event) {
      var data = JSON.parse(event.data);
      if (isRadarActive) return;

      // 暴怒检测 → 随机抽取一条吐槽语音
      var voiceLines = [
        { text: "[surprise] 哇！打个游戏而已，别这么大火气嘛！", lang: "zh" },
        { text: "[sad] 又在口吐芬芳了……别气别气，深呼吸！", lang: "zh" },
        { text: "[angry] 键盘要被你敲坏啦！温柔一点！", lang: "zh" }
      ];
      var randomLine = voiceLines[Math.floor(Math.random() * voiceLines.length)];
      if (data.type === 'rage_audio' || data.type === 'rage_apm') {
        console.log("");
        isRadarActive = true;
        // 以下函数来自全局作用域，后续迁移到 chat/tts 模块后会通过 EventBus 调用
        var emotionTags = (typeof Live2DEmotion !== 'undefined' && Live2DEmotion.extractEmotionTags) ? Live2DEmotion.extractEmotionTags(randomLine.text) : [];
        var cleanText = randomLine.text.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
        if (typeof addChatMessage === 'function') addChatMessage(cleanText, 'ai');
        if (typeof playSoVitsAudio === 'function') playSoVitsAudio(cleanText, randomLine.lang, null, emotionTags);
        setTimeout(function () {
          isRadarActive = false;
          console.log("进行下一次监听");
        }, radarCooldown);
      }
    };
    radarSocket.onclose = function () {
      // WebSocket断线后自动重连
      setTimeout(connectEmotionRadar, radarReconnectDelay);
    };
  }

  connectEmotionRadar();

  console.log('[Renderer] emotion-radar.js 已就绪');
})();
