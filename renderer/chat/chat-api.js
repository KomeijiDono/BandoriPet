/**
 * chat-api.js — 手机聊天核心
 * 提供 addChatMessage、sendMessage、chatMemory 等被 phone-ui.js / live2d 模块广泛引用的函数。
 * 负责：消息气泡渲染、多 API 请求（DeepSeek/Gemini/OpenAI/Qwen）、多语言翻译指令注入、语音文本提取、情绪标签处理。
 */
(function () {
  'use strict';

  // 对话记忆（最多保留最近 20 条），挂载到 window.chatMemory 供其他模块共享
  var chatMemory = [];
  var MAX_HISTORY = 20;

  /**
   * 向手机聊天界面添加一条消息气泡
   * @param {string} text - 消息文本
   * @param {string} sender - 'typing' 显示"对方正在输入..."指示器；'user' 用户气泡；其他为 AI 气泡
   * 注：typing 指示器会在下一次非 typing 消息时自动移除
   */
  function addChatMessage(text, sender) {
    var history = document.getElementById('phone-chat-history');
    if (!history) return;

    // "对方正在输入..." 打字指示器（临时占位气泡，后面真正的消息到来时会被移除）
    if (sender === 'typing') {
      var typingMsg = document.createElement('div');
      typingMsg.className = 'msg-bubble msg-typing';
      typingMsg.id = 'msg-typing-indicator';
      typingMsg.innerText = text;
      history.appendChild(typingMsg);
      history.scrollTop = history.scrollHeight;
      return;
    }

    // 正式消息到来，先移除打字指示器
    var typingIndicator = document.getElementById('msg-typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    // 根据 sender 添加不同样式的消息气泡：user → 右对齐绿色，ai → 左对齐白色
    var msgDiv = document.createElement('div');
    msgDiv.className = 'msg-bubble ' + (sender === 'user' ? 'msg-user' : 'msg-ai');
    msgDiv.innerText = text;
    history.appendChild(msgDiv);

    history.scrollTop = history.scrollHeight;
  }

  function clearChatMemory() {
    chatMemory = [];
    window.chatMemory = chatMemory;
  }

  /**
   * 发送消息：用户输入 → 多 API 请求 → AI 回复 → 语音合成 + 聊天气泡
   * 流程概览：
   *  1. 读取用户输入并清空输入框
   *  2. 根据 localStorage 选择 API 提供商（deepseek/gemini/openai/qwen）
   *  3. 根据角色语音语言注入 ENFORCER 多语言翻译指令
   *  4. 发送请求（Gemini 用 generateContent 格式，OpenAI 类用 chat/completions 格式）
   *  5. 从回复中提取显示文本、语音文本、情绪标签
   *  6. 失败时播放 cry 动画并回滚最后一条 user 记忆
   */
  async function sendMessage() {
    var inputElement = document.getElementById('user-input');
    var text = inputElement.value.trim();
    if (!text) return;

    // === 多 API 默认配置 ===
    var defaultApiConfigs = {
      "deepseek": { url: "https://api.deepseek.com/v1/chat/completions", key: "", model: "deepseek-chat" },
      "gemini":   { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=", key: "", model: "gemini-3.1-flash-lite" },
      "openai":   { url: "https://api.openai.com/v1/chat/completions", key: "", model: "gpt-5.4-2026-03-05" },
      "qwen":     { url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", key: "", model: "qwen3.6-max-preview" }
    };

    // === 从 localStorage 获取用户自定义配置 ===
    var apiConfigs = JSON.parse(localStorage.getItem('api_configs')) || defaultApiConfigs;
    // 补全由于版本升级或未配置导致的默认值
    for (var k in defaultApiConfigs) {
      if (!apiConfigs[k]) {
        apiConfigs[k] = Object.assign({}, defaultApiConfigs[k]);
      }
    }

    // === 根据 localStorage 选择活跃 API、角色、System Prompt ===
    var activeAPI = localStorage.getItem('api_preset') || "deepseek";
    var API_URL = apiConfigs[activeAPI] ? apiConfigs[activeAPI].url : defaultApiConfigs[activeAPI].url;
    var API_KEY = apiConfigs[activeAPI] ? apiConfigs[activeAPI].key : defaultApiConfigs[activeAPI].key;
    var MODEL_NAME = apiConfigs[activeAPI] ? apiConfigs[activeAPI].model : defaultApiConfigs[activeAPI].model;
    var charId = localStorage.getItem('current_char') || 'anon';
    var charactersConfig = window.CharactersConfig;
    var CURRENT_PROMPT = localStorage.getItem('prompt_' + charId) || (charactersConfig && charactersConfig[charId] ? charactersConfig[charId].prompt : '');
    inputElement.value = '';
    addChatMessage(text, 'user');
    addChatMessage("对方正在输入...", 'typing');
    chatMemory.push({ role: 'user', text: text });

    if (chatMemory.length > MAX_HISTORY) {
      chatMemory = chatMemory.slice(chatMemory.length - MAX_HISTORY);
      window.chatMemory = chatMemory;
    }

    try {
      var aiReply = "";
      var currentChar = localStorage.getItem('current_char') || 'anon';
      var selectedLang = localStorage.getItem('voice_lang_' + currentChar) || 'ja';

      // === ENFORCER：根据所选语音语言，向 AI 注入多语言翻译强制指令 ===
      var ENFORCER = "";

      if (selectedLang === 'ja') {
        ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将日文翻译放在 <ja> 和 </ja> 标签内！】";
      } else if (selectedLang === 'en') {
        ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将英文翻译放在 <en> 和 </en> 标签内！】";
      } else if (selectedLang === 'zh') {
        ENFORCER = "\n\n【系统强制指令：请直接用纯正的中文回复我，严禁输出任何外语！】";
      } else if (selectedLang === 'ko') {
        ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将韩文翻译放在 <ko> 和 </ko> 标签内！】";
      } else if (selectedLang === 'yue') {
        ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将粤语口语翻译放在 <yue> 和 </yue> 标签内！】";
      } else if (selectedLang === 'es') {
        ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将西班牙语翻译放在 <es> 和 </es> 标签内！】";
      }

      // === 发送请求（Gemini 路径：generateContent API；OpenAI 类路径：chat/completions） ===
      if (activeAPI === "gemini") {
        var geminiHistory = chatMemory.map(function (msg) {
          return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] };
        });
        geminiHistory[geminiHistory.length - 1].parts[0].text += ENFORCER;
        var response = await fetch(API_URL + API_KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system_instruction: { parts: [{ text: CURRENT_PROMPT }] }, contents: geminiHistory })
        });
        var data = await response.json();
        if (data.error) throw new Error(data.error.message);
        if (data.candidates && data.candidates.length > 0) {
          aiReply = data.candidates[0].content.parts[0].text;
        }
      } else {
        var openaiHistory = chatMemory.map(function (msg) {
          return { role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text };
        });
        openaiHistory[openaiHistory.length - 1].content += ENFORCER;
        var response = await fetch(API_URL, {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": 'Bearer ' + API_KEY },
          body: JSON.stringify({ model: MODEL_NAME, messages: [{ "role": "system", "content": CURRENT_PROMPT }].concat(openaiHistory), temperature: 0.7 })
        });
        var data = await response.json();
        if (data.error) throw new Error(data.error.message);
        if (data.choices && data.choices[0].message) {
          aiReply = data.choices[0].message.content;
        }
      }

      if (aiReply) {
        // === 情绪标签清理：统一 [tag] / <tag> 格式，仅保留合法语言标签的尖括号 ===
        aiReply = aiReply.replace(/(?:\[|<)(\/?(?:ja|zh|en|ko|yue|es))(?:\]|>)/gi, '<$1>');
        var validLangs = ['ja', 'zh', 'en', 'ko', 'yue', 'es', '/ja', '/zh', '/en', '/ko', '/yue', '/es'];
        aiReply = aiReply.replace(/<([^>]+)>/g, function (match, innerText) {
          if (validLangs.indexOf(innerText.toLowerCase().trim()) !== -1) return match;
          return '[' + innerText + ']';
        });

        // === 提取情绪标签（如 [happy] [sad]），传给 Live2D 动画系统 ===
        var Live2DEmotion = window.Live2DEmotion;
        var emotionTags = Live2DEmotion ? Live2DEmotion.extractEmotionTags(aiReply) : [];
        chatMemory.push({ role: 'ai', text: aiReply });

        // === 语音文本提取：从 AI 回复中分离显示文本（中文）和语音文本（目标语言） ===
        var voiceText = aiReply;
        var voiceLang = selectedLang;
        var displayText = aiReply;
        if (selectedLang === 'ja') {
          var match = aiReply.match(/<ja>([\s\S]*?)<\/ja>/);
          if (match) { voiceText = match[1]; displayText = aiReply.replace(/<ja>[\s\S]*?<\/ja>/g, '').trim(); }
        } else if (selectedLang === 'en') {
          var match = aiReply.match(/<en>([\s\S]*?)<\/en>/);
          if (match) { voiceText = match[1]; displayText = aiReply.replace(/<en>[\s\S]*?<\/en>/g, '').trim(); }
        } else if (selectedLang === 'ko') {
          var match = aiReply.match(/<ko>([\s\S]*?)<\/ko>/);
          if (match) { voiceText = match[1]; displayText = aiReply.replace(/<ko>[\s\S]*?<\/ko>/g, '').trim(); }
        } else if (selectedLang === 'yue') {
          var match = aiReply.match(/<yue>([\s\S]*?)<\/yue>/);
          if (match) { voiceText = match[1]; displayText = aiReply.replace(/<yue>[\s\S]*?<\/yue>/g, '').trim(); }
        } else if (selectedLang === 'es') {
          var match = aiReply.match(/<es>([\s\S]*?)<\/es>/);
          if (match) { voiceText = match[1]; displayText = aiReply.replace(/<es>[\s\S]*?<\/es>/g, '').trim(); voiceLang = 'en'; }
        }

        // === 清理残留标签、动作标签（如 [action_xxx]）、RP 括号（如 (*...*)） ===
        displayText = displayText.replace(/<\/[a-zA-Z]+>/g, '');
        displayText = displayText.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
        var cleanVoiceText = voiceText.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
        var removeRpRegex = /[（\(][^）\)]*[）\)]|\*.*?\*/g;
        displayText = displayText.replace(removeRpRegex, '').trim();
        cleanVoiceText = cleanVoiceText.replace(removeRpRegex, '').trim();

        addChatMessage(displayText, 'ai');
        if (typeof window.playSoVitsAudio === 'function') {
          window.playSoVitsAudio(cleanVoiceText, voiceLang, null, emotionTags);
        }
      } else {
        addChatMessage("没听懂...", 'ai');
        chatMemory.pop();
      }
    } catch (error) {
      // === 错误处理：显示错误气泡 + 播放 Live2D cry 动画 + 回滚最后一条 user 记忆 ===
      console.error("API 请求失败:", error);
      addChatMessage("网络好像断了！[cry]", 'ai');
      chatMemory.pop();
      var model = window.live2dPet || window.live2dModel;
      if (model) {
        try { model.motion("cry"); model.expression("cry"); } catch (e) {}
        setTimeout(function () { try { model.expression("default"); } catch (e) {} }, 3000);
      }
    }
  }

  window.addChatMessage = addChatMessage;
  window.chatMemory = chatMemory;
  window.MAX_HISTORY = MAX_HISTORY;
  window.clearChatMemory = clearChatMemory;
  window.sendMessage = sendMessage;

  // 注册 Enter 键发送
  var userInput = document.getElementById('user-input');
  if (userInput) {
    userInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  console.log('[Renderer] chat-api.js 已就绪');
})();
