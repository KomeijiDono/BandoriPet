/**
 * chat-api.js — 手机聊天核心
 * 提供 addChatMessage、chatMemory 等被其他模块广泛引用的函数
 */
(function () {
  'use strict';

  var chatMemory = [];
  var MAX_HISTORY = 20;

  function addChatMessage(text, sender) {
    var history = document.getElementById('phone-chat-history');
    if (!history) return;

    if (sender === 'typing') {
      var typingMsg = document.createElement('div');
      typingMsg.className = 'msg-bubble msg-typing';
      typingMsg.id = 'msg-typing-indicator';
      typingMsg.innerText = text;
      history.appendChild(typingMsg);
      history.scrollTop = history.scrollHeight;
      return;
    }

    var typingIndicator = document.getElementById('msg-typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    var msgDiv = document.createElement('div');
    msgDiv.className = 'msg-bubble ' + (sender === 'user' ? 'msg-user' : 'msg-ai');
    msgDiv.innerText = text;
    history.appendChild(msgDiv);

    history.scrollTop = history.scrollHeight;
  }

  function clearChatMemory() {
    chatMemory = [];
  }

  window.addChatMessage = addChatMessage;
  window.chatMemory = chatMemory;
  window.MAX_HISTORY = MAX_HISTORY;
  window.clearChatMemory = clearChatMemory;

  console.log('[Renderer] chat-api.js 已就绪');
})();
