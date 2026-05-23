/**
 * ipad-chat.js — iPad LINE 群聊系统
 * IIFE 模块化。
 *
 * 核心功能：
 *  - 模拟 LINE 聊天列表 + 聊天记录 UI
 *  - 私聊 / 群聊双模式，群聊支持多角色 AI 自主发言
 *  - 群管理：创建群组、踢人、邀请、防踢保护
 *  - iPad 浮窗拖拽（initDraggable），位置/尺寸/缩放持久化
 *
 * 外部依赖 (typeof 守卫):
 *   window.CharactersConfig  — 角色配置
 *   window.BandoriIPC         — IPC 通信 (预留)
 *   addChatMessage            — chat-api.js 的消息气泡函数 (预留)
 *   initDraggable             — drag-helper.js 统一拖拽
 */
(function () {
  'use strict';

  // ======================== 依赖注入 ========================
  var charactersConfig = (typeof window.CharactersConfig !== 'undefined') ? window.CharactersConfig : {};
  var BandoriIPC = (typeof window.BandoriIPC !== 'undefined') ? window.BandoriIPC : null;
  var addChatMessage = (typeof addChatMessage === 'function') ? addChatMessage : function () { };
  var initDraggable = (typeof initDraggable === 'function') ? initDraggable : null;

  // ======================== 私有状态 ========================
  // ipadChatData: 所有聊天会话（私聊 + 群聊）的数据，每个元素 = { id, name, alias, isGroup, icon, members[], msg[], isKicked }
  var ipadChatData = [];
  // currentIpadChatId: 当前活跃聊天 ID，用于决定展示哪个会话的历史
  var currentIpadChatId = null;
  var pendingGroupName = "";
  var promptCallback = null;

  // ======================== iPad 时钟 ========================
  setInterval(function () {
    var now = new Date();
    var el = document.getElementById('ipad-top-time');
    if (el) el.innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }, 1000);

  // ======================== 核心函数 ========================

  /** 页面加载后调用，渲染聊天列表和历史 */
  function initIpadChats() { renderIpadChatList(); renderIpadChatHistory(); }

  function getChatDisplayName(chat) { return chat.isGroup ? chat.name : (chat.alias || chat.name); }

  /** 渲染左侧聊天列表：遍历 ipadChatData 生成列表项，高亮当前活跃聊天 */
  function renderIpadChatList() {
    var listContainer = document.getElementById('ipad-chat-list-container');
    listContainer.innerHTML = '';
    if (ipadChatData.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: #999; font-size: 13px;">暂无聊天记录<br>点击上方 ⊕ 自动检索角色</div>';
      return;
    }
    ipadChatData.forEach(function (chat) {
      var isActive = chat.id === currentIpadChatId ? 'active' : '';
      var lastMsg = chat.msg.length > 0 ? chat.msg[chat.msg.length - 1].text : '';
      listContainer.innerHTML +=
        '<div class="chat-list-item ' + isActive + '" onclick="switchIpadChat(\'' + chat.id + '\')">' +
        '<img src="' + chat.icon + '" class="chat-list-avatar" onerror="this.src=\'avatar.png\'">' +
        '<div class="chat-list-info">' +
        '<div class="chat-list-name">' + getChatDisplayName(chat) + '</div>' +
        '<div class="chat-list-preview">' + lastMsg + '</div>' +
        '</div>' +
        '</div>';
    });
  }

  function switchIpadChat(id) {
    currentIpadChatId = id;
    document.getElementById('chat-settings-btn').style.display = 'block';
    renderIpadChatList(); renderIpadChatHistory();
  }

  /** 
   * 渲染右侧聊天历史：根据 currentIpadChatId 找到对应会话，遍历 msg 数组渲染气泡
   * - sys 消息：灰色居中系统提示
   * - user 消息：右对齐绿色气泡
   * - ai 消息：左对齐气泡（群聊模式带角色头像 + 昵称）
   * - 被踢出时禁用输入区域
   */
  function renderIpadChatHistory() {
    var historyEl = document.getElementById('ipad-chat-history');
    var titleEl = document.getElementById('current-chat-title');
    var inputArea = document.querySelector('.ipad-input-area');
    var inputEl = document.getElementById('ipad-user-input');
    var settingsBtn = document.getElementById('chat-settings-btn');

    if (!currentIpadChatId) {
      titleEl.innerText = "请在左侧选择或添加联系人";
      settingsBtn.style.display = 'none'; historyEl.innerHTML = ''; return;
    }

    var chat = ipadChatData.find(function (c) { return c.id === currentIpadChatId; });
    titleEl.innerText = getChatDisplayName(chat);
    historyEl.innerHTML = '<div class="sys-msg-bubble">今天</div>';

    if (chat.isKicked) {
      inputArea.style.opacity = '0.5'; inputArea.style.pointerEvents = 'none';
      inputEl.placeholder = "你已被移出该群聊"; settingsBtn.style.display = 'none';
    } else {
      inputArea.style.opacity = '1'; inputArea.style.pointerEvents = 'auto';
      inputEl.placeholder = "Aa"; settingsBtn.style.display = 'block';
    }

    chat.msg.forEach(function (m) {
      if (m.sender === 'sys') historyEl.innerHTML += '<div class="sys-msg-bubble">' + m.text + '</div>';
      else if (m.sender === 'user') historyEl.innerHTML += '<div class="group-msg-row group-msg-right"><div class="group-msg-content"><div class="g-bubble">' + m.text + '</div></div></div>';
      else {
        var nicknameHtml = chat.isGroup ? '<span class="group-nickname">' + m.name + '</span>' : '';
        historyEl.innerHTML += '<div class="group-msg-row group-msg-left"><img src="' + m.icon + '" class="group-avatar" onerror="this.src=\'avatar.png\'"><div class="group-msg-content">' + nicknameHtml + '<div class="g-bubble">' + m.text + '</div></div></div>';
      }
    });
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function showAddChatModal() {
    var list = document.getElementById('ipad-contact-list');
    list.innerHTML = '<div class="chat-list-item" onclick="createBandGroupChat()" style="border-bottom: 1px solid #eee;"><div class="chat-list-avatar" style="background:#00C300; display:flex; justify-content:center; align-items:center; color:#fff; font-weight:bold;">群</div><div class="chat-list-info"><div class="chat-list-name" style="color:#00C300;">新建群聊</div></div></div>';
    for (var id in charactersConfig) {
      list.innerHTML += '<div class="chat-list-item" onclick="addNewIpadChat(\'' + id + '\')"><img src="assets/icon_' + id + '.png" class="chat-list-avatar" onerror="this.src=\'avatar.png\'"><div class="chat-list-info"><div class="chat-list-name">' + charactersConfig[id].name + '</div></div></div>';
    }
    document.getElementById('ipad-add-modal').style.display = 'flex';
  }

  function addNewIpadChat(charId) {
    document.getElementById('ipad-add-modal').style.display = 'none';
    if (ipadChatData.find(function (c) { return c.id === charId; })) { switchIpadChat(charId); return; }
    ipadChatData.unshift({ id: charId, name: charactersConfig[charId].name, alias: "", isGroup: false, icon: 'assets/icon_' + charId + '.png', msg: [{ sender: 'sys', text: '你们已成为 LINE 好友，现在可以开始聊天了。' }] });
    switchIpadChat(charId);
  }

  /**
   * 调用 AI API 获取群聊 / 私聊回复
   * 
   * 核心流程：
   *  1. 构建对话历史（最近 15 条）
   *  2. 构建 System Prompt（群聊：全员人设汇总 + 随机发言规则 + 踢人机制；私聊：单角色人设 + 昵称）
   *  3. 发送请求（Gemini 路径：generateContent；OpenAI 类路径：chat/completions）
   *  4. 解析回复：按行拆分，通过 "姓名: 内容" 格式识别发言成员，匹配角色图标
   *  5. 处理 [KICK_USER] 踢人指令（受 anti_kick_enable 开关控制）
   *  6. 失败时显示网络错误系统消息
   */
  async function callChatAPI(chat, typingHint) {
    if (typingHint === undefined) typingHint = "发送中...";
    var historyEl = document.getElementById('ipad-chat-history');
    var fetchTypingId = 'fetch-' + Date.now();
    if (currentIpadChatId === chat.id) {
      historyEl.innerHTML += '<div id="' + fetchTypingId + '" class="sys-msg-bubble">' + typingHint + '</div>';
      historyEl.scrollTop = historyEl.scrollHeight;
    }

    // === 构建历史消息（最近 15 条），sys 消息伪装成 user 角色以保持上下文连贯 ===
    var chatHistory = chat.msg.slice(-15).map(function (m) {
      if (m.sender === 'user') return { role: 'user', content: m.text };
      if (m.sender === 'sys') return { role: 'user', content: '[系统消息]: ' + m.text };
      if (m.sender === 'ai') return { role: 'assistant', content: chat.isGroup ? m.name + ': ' + m.text : m.text };
      return null;
    }).filter(function (m) { return m !== null; });

    function getCharPrompt(id) { return localStorage.getItem('prompt_' + id) || (charactersConfig[id] ? charactersConfig[id].prompt : ""); }

    // === 构建 System Prompt ===
    var systemPrompt = "";

    if (chat.isGroup) {
      // 群聊模式：汇总所有成员的人设，注入随机发言 + 踢人 + 无视规则
      var activePersonas = "";
      chat.members.forEach(function (id) {
        if (charactersConfig[id]) {
          activePersonas += '\n【' + charactersConfig[id].name + '】的设定：\n' + getCharPrompt(id) + '\n';
        }
      });
      systemPrompt = '你正在模拟名为"' + chat.name + '"的LINE群聊。向你发送消息的是玩家。群成员包括你扮演的以下角色：\n' + activePersonas + '\n【格式与互动规则】：\n1. 格式严格为"角色姓名: 回复内容"。禁止多余旁白和外语翻译。\n2. 【随机发言】：每次只挑选随机数量的最可能接话的人发言或者无人在意。\n3. 【逆向踢人】：如果玩家惹人厌，可以在回复中加 [KICK_USER] 。\n4. 如果大家都无视玩家，直接输出：[无回复]';
    } else {
      // 私聊模式：单角色人设 + 备注昵称
      var aliasText = chat.alias ? '\n玩家给你在LINE上备注的昵称是："' + chat.alias + '"。' : "";
      systemPrompt = '你现在的身份是【' + chat.name + '】。' + aliasText + '\n你的性格设定如下：\n' + getCharPrompt(chat.id) + '\n【真实聊天模拟】：你正在和玩家私聊。如果不想理他直接输出：[无回复]';
    }

    var activeAPI = localStorage.getItem('api_preset') || "deepseek";
    var apiConfigs = {
      "deepseek": { url: "", model: "" },
      "gemini": { url: "", key: "", model: "gemini-3.1-flash-lite-preview" },
      "openai": { url: "", key: "", model: "gpt-5.4-2026-03-05" },
      "qwen": { url: "", key: "", model: "qwen3.6-max-preview" }
    };
    var API = apiConfigs[activeAPI];

    try {
      var aiReply = "";
      // === Gemini 路径：generateContent API，key 拼在 URL 上 ===
      if (activeAPI === "gemini") {
        var geminiHistory = chatHistory.map(function (msg) { return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }; });
        var response = await fetch(API.url + API.key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: geminiHistory }) });
        var data = await response.json(); if (data.error) throw new Error(data.error.message);
        aiReply = data.candidates[0].content.parts[0].text;
      } else {
        var response = await fetch(API.url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": 'Bearer ' + API.key }, body: JSON.stringify({ model: API.model, messages: [{ "role": "system", "content": systemPrompt }].concat(chatHistory), temperature: 0.7 }) });
        var data = await response.json(); if (data.error) throw new Error(data.error.message);
        aiReply = data.choices[0].message.content;
      }

      var fEl = document.getElementById(fetchTypingId);

      if (fEl) fEl.remove();
      if (aiReply.includes("[无回复]") || aiReply.trim() === "") return;
      aiReply = aiReply.replace(/(?:\[|<)(\/?(?:ja|zh|en|ko|yue|es))(?:\]|>)/gi, '<$1>');
      var validLangsGroup = ['ja', 'zh', 'en', 'ko', 'yue', 'es', '/ja', '/zh', '/en', '/ko', '/yue', '/es'];
      aiReply = aiReply.replace(/<([^>]+)>/g, function (match, innerText) {
        if (validLangsGroup.includes(innerText.toLowerCase().trim())) {
          return match;
        }
        return '[' + innerText + ']';
      });
      // === 群聊模式按行拆分，每行格式 "角色名: 内容"；私聊直接加角色名前缀 ===
      var lines = chat.isGroup ? aiReply.split('\n') : [chat.name + ': ' + aiReply];

      var parsedMsgs = [];

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim() || line.includes("[无回复]")) continue;

        var isKickLine = false;
        if (line.includes("[KICK_USER]")) { isKickLine = true; line = line.replace("[KICK_USER]", "").trim(); }

        var sepIdx = line.indexOf(':'); if (sepIdx === -1) sepIdx = line.indexOf('：');

        // === 成员识别：通过角色名模糊匹配 charactersConfig，获取正确的头像路径 ===
        if (sepIdx !== -1) {
          var speakerName = line.substring(0, sepIdx).trim();
          var rawReply = line.substring(sepIdx + 1).trim();

          var matchedIcon = chat.isGroup ? 'avatar.png' : chat.icon, matchedId = chat.isGroup ? 'anon' : chat.id;
          if (chat.isGroup) {
            for (var id in charactersConfig) {
              if (charactersConfig[id].name.includes(speakerName) || speakerName.includes(charactersConfig[id].name)) {
                matchedIcon = 'assets/icon_' + id + '.png'; matchedId = id; break;
              }
            }
          }

          var displayText = rawReply.replace(/<[a-zA-Z]+>[\s\S]*?<\/[a-zA-Z]+>/g, '').trim();

          var actionRegex = /(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g;
          var rpRegex = /[（\(][^）\)]*[）\)]|\*.*?\*/g;
          displayText = displayText.replace(actionRegex, '').replace(rpRegex, '').trim();

          if (displayText || isKickLine) {
            parsedMsgs.push({ speakerName: speakerName, replyText: displayText, icon: matchedIcon, isKickLine: isKickLine, charId: matchedId });
          }
        }
      }

      for (var i = 0; i < parsedMsgs.length; i++) {
        var msgData = parsedMsgs[i];

        if (msgData.replyText) {
          chat.msg.push({
            sender: 'ai', name: msgData.speakerName,
            text: msgData.replyText, icon: msgData.icon
          });
          if (typeof uiClickSound !== 'undefined') { uiClickSound.currentTime = 0; uiClickSound.play().catch(function () { }); }
        }

        if (msgData.isKickLine) {
          if (localStorage.getItem('anti_kick_enable') === 'true') {
            chat.msg.push({ sender: 'sys', text: '[系统警告] ' + msgData.speakerName + ' 试图将你移出群聊，但被拦截了！' });
      } else {
        // === OpenAI 类路径：chat/completions API，Bearer 鉴权 ===
            chat.isKicked = true; chat.msg.push({ sender: 'sys', text: msgData.speakerName + ' 将你移出了群聊。' });
          }
        }
        if (msgData.isKickLine && localStorage.getItem('anti_kick_enable') !== 'true') break;
      }
      if (currentIpadChatId === chat.id) { renderIpadChatHistory(); renderIpadChatList(); }

    } catch (error) {
      console.error("API 请求失败:", error);
      var fEl = document.getElementById(fetchTypingId); if (fEl) fEl.remove();
      chat.msg.push({ sender: 'sys', text: '【系统提示】网络连接断开了...' });
      if (currentIpadChatId === chat.id) renderIpadChatHistory();
    }
  }

  /** 发送群聊消息：输入框 → msg 数组 → 刷新 UI → 调用 callChatAPI */
  function sendGroupMessage() {
    var inputEl = document.getElementById('ipad-user-input');
    var text = inputEl.value.trim();
    if (!text || !currentIpadChatId) return;
    var chat = ipadChatData.find(function (c) { return c.id === currentIpadChatId; });
    if (chat.isKicked) return;
    chat.msg.push({ sender: 'user', text: text }); inputEl.value = '';
    renderIpadChatHistory(); renderIpadChatList();
    callChatAPI(chat, "发送中...");
  }

  /** 创建乐队群聊：弹出命名对话框 → 成员选择界面 → 确认后创建群组并发送首条系统消息 */
  function createBandGroupChat() {
    document.getElementById('ipad-add-modal').style.display = 'none';
    showIpadPrompt("请输入群聊名称：", "新乐队群组", function (name) {
      if (!name || !name.trim()) return;
      pendingGroupName = name.trim(); showMemberSelection();
    });
  }

  function showMemberSelection() {
    var list = document.getElementById('ipad-member-list');
    list.innerHTML = '';
    for (var id in charactersConfig) {
      list.innerHTML += '<label style="display: flex; align-items: center; padding: 10px 0; cursor: pointer; border-bottom: 1px solid #f5f5f5;"><input type="checkbox" value="' + id + '" class="group-member-checkbox" style="margin-right: 15px; width: 20px; height: 20px; accent-color: #00C300;"><img src="assets/icon_' + id + '.png" style="width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; object-fit: cover; background: #eee;" onerror="this.src=\'avatar.png\'"><span style="font-size: 15px; color: #333; font-weight: bold;">' + charactersConfig[id].name + '</span></label>';
    }
    document.getElementById('ipad-member-modal').style.display = 'flex';
  }

  function confirmGroupMembers() {
    var checkboxes = document.querySelectorAll('.group-member-checkbox');
    var selectedMembers = []; var memberNames = [];
    checkboxes.forEach(function (cb) { if (cb.checked) { selectedMembers.push(cb.value); memberNames.push(charactersConfig[cb.value].name); } });
    if (selectedMembers.length === 0) { showIpadPrompt("建群失败", "至少需要邀请一名成员！", function () { }); return; }
    document.getElementById('ipad-member-modal').style.display = 'none';
    var newId = 'group_' + Date.now();
    var newChat = { id: newId, name: pendingGroupName, isGroup: true, icon: 'avatar.png', members: selectedMembers, isKicked: false, msg: [{ sender: 'sys', text: '你邀请了 ' + memberNames.join('、') + ' 加入群聊。' }] };
    ipadChatData.unshift(newChat); switchIpadChat(newId);
    callChatAPI(newChat, "大家正在看系统提示...");
  }

  function showIpadPrompt(message, defaultValue, callback) {
    document.getElementById('ipad-prompt-text').innerText = message;
    var inputEl = document.getElementById('ipad-prompt-input');
    inputEl.value = defaultValue || ''; document.getElementById('ipad-prompt-modal').style.display = 'flex';
    inputEl.focus(); promptCallback = callback;
  }

  function closeIpadPrompt(isConfirm) {
    document.getElementById('ipad-prompt-modal').style.display = 'none';
    if (promptCallback) { promptCallback(isConfirm ? document.getElementById('ipad-prompt-input').value : null); promptCallback = null; }
  }

  function editCurrentChatInfo() {
    if (!currentIpadChatId) return;
    var chat = ipadChatData.find(function (c) { return c.id === currentIpadChatId; });
    if (chat.isGroup) {
      document.getElementById('manage-group-name-input').value = chat.name;
      renderGroupManageLists(chat); document.getElementById('ipad-group-manage-modal').style.display = 'flex';
    } else {
      showIpadPrompt('为 ' + chat.name + ' 设置备注名：\n(留空则恢复原名)', chat.alias || "", function (newAlias) {
        if (newAlias !== null) { chat.alias = newAlias.trim(); chat.msg.push({ sender: 'sys', text: chat.alias ? '你将备注名修改为了"' + chat.alias + '"' : '你清除了备注名' }); renderIpadChatList(); renderIpadChatHistory(); }
      });
    }
  }

  function renderGroupManageLists(chat) {
    var currentList = document.getElementById('manage-current-members');
    var inviteList = document.getElementById('manage-invite-members');
    currentList.innerHTML = ''; inviteList.innerHTML = '';
    for (var id in charactersConfig) {
      var char = charactersConfig[id]; var isMember = chat.members.includes(id);
      var html = '<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #f5f5f5;"><div style="display: flex; align-items: center;"><img src="assets/icon_' + id + '.png" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; object-fit: cover; background: #eee;" onerror="this.src=\'avatar.png\'"><span style="font-size: 14px; color: #333; font-weight: bold;">' + char.name + '</span></div>' + (isMember ? '<button onclick="kickGroupMember(\'' + chat.id + '\', \'' + id + '\')" style="background: #ff4757; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">踢出</button>' : '<button onclick="inviteGroupMember(\'' + chat.id + '\', \'' + id + '\')" style="background: #00C300; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">邀请</button>') + '</div>';
      if (isMember) currentList.innerHTML += html; else inviteList.innerHTML += html;
    }
    if (inviteList.innerHTML === '') inviteList.innerHTML = '<div style="padding: 15px; text-align: center; color: #ccc; font-size: 12px;">所有好友都在群里啦</div>';
  }

  function saveManageGroupName() {
    var chat = ipadChatData.find(function (c) { return c.id === currentIpadChatId; });
    var newName = document.getElementById('manage-group-name-input').value.trim();
    if (newName && newName !== chat.name) {
      chat.name = newName; chat.msg.push({ sender: 'sys', text: '你将群名修改为了"' + chat.name + '"' });
      renderIpadChatList(); renderIpadChatHistory(); document.getElementById('ipad-group-manage-modal').style.display = 'none';
    }
  }

  /** 从群组中踢出指定成员，刷新 UI 并触发 AI 提示 */
  function kickGroupMember(chatId, memberId) {
    var chat = ipadChatData.find(function (c) { return c.id === chatId; }); chat.members = chat.members.filter(function (id) { return id !== memberId; });
    chat.msg.push({ sender: 'sys', text: '你将 ' + charactersConfig[memberId].name + ' 移出了群聊。' });
    renderGroupManageLists(chat); renderIpadChatHistory(); callChatAPI(chat, "大家正在看系统消息...");
  }

  /** 邀请成员加入群组，刷新 UI 并触发 AI 提示 */
  function inviteGroupMember(chatId, memberId) {
    var chat = ipadChatData.find(function (c) { return c.id === chatId; }); chat.members.push(memberId);
    chat.msg.push({ sender: 'sys', text: '你邀请了 ' + charactersConfig[memberId].name + ' 加入群聊。' });
    renderGroupManageLists(chat); renderIpadChatHistory(); callChatAPI(chat, "大家正在看系统消息...");
  }

  function toggleGroupChatMenu() {
    var menu = document.getElementById('group-chat-menu');
    if (menu.style.display === 'flex') menu.style.display = 'none';
    else { if (ipadChatData.length === 0) initIpadChats(); menu.style.display = 'flex'; }
  }

  // ======================== DOMContentLoaded ========================
  window.addEventListener('DOMContentLoaded', function () {
    document.documentElement.style.setProperty('--ipad-scale', localStorage.getItem('ipad_scale') || 1.0);
    var ipadMenu = document.getElementById('group-chat-menu');
    if (ipadMenu) {
      ipadMenu.style.width = (localStorage.getItem('ipad_w') || 950) + 'px';
      ipadMenu.style.height = (localStorage.getItem('ipad_h') || 650) + 'px';
      ipadMenu.style.transform = 'scale(' + (localStorage.getItem('ipad_scale') || 1.0) + ')';
      ipadMenu.style.display = 'none';
    }
    var antiKickCheckbox = document.getElementById('anti-kick-enable');
    if (antiKickCheckbox) antiKickCheckbox.checked = localStorage.getItem('anti_kick_enable') === 'true';
    var ipadInput = document.getElementById('ipad-user-input');
    if (ipadInput) {
      ipadInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); }
      });
    }
  });

  // ======================== iPad 拖拽初始化 ========================
  // 拖拽 iOS 状态栏来移动整个 iPad 浮窗，位置持久化到 localStorage
  // 拖拽开始时加重阴影并设置 window.isIpadDragging = true（供穿透检测使用）
  var ipadMenuDom = document.getElementById('group-chat-menu');
  var ipadHeader = document.getElementById('ipad-ios-status-bar');

  if (initDraggable && ipadMenuDom && ipadHeader) {
    initDraggable(ipadHeader, ipadMenuDom, {
      persistX: 'ipad_x',
      persistY: 'ipad_y',
      lockCheck: function () {
        return document.getElementById('lock-widget') && document.getElementById('lock-widget').checked;
      },
      onStart: function (el) {
        el.style.boxShadow = "0 40px 80px rgba(0, 0, 0, 0.6), inset 0 0 0 2px #333";
        window.isIpadDragging = true;
      },
      onEnd: function (el) {
        el.style.boxShadow = "0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 2px #333";
        window.isIpadDragging = false;
      }
    });
  }

  // ======================== 导出公共 API ========================
  window.initIpadChat = initIpadChats;
  window.toggleGroupChatMenu = toggleGroupChatMenu;
  window.switchIpadChat = switchIpadChat;
  window.showAddChatModal = showAddChatModal;
  window.addNewIpadChat = addNewIpadChat;
  window.createBandGroupChat = createBandGroupChat;
  window.confirmGroupMembers = confirmGroupMembers;
  window.closeIpadPrompt = closeIpadPrompt;
  window.editCurrentChatInfo = editCurrentChatInfo;
  window.kickGroupMember = kickGroupMember;
  window.inviteGroupMember = inviteGroupMember;
  window.saveManageGroupName = saveManageGroupName;
  window.sendGroupMessage = sendGroupMessage;

  console.log('[Renderer] ipad-chat.js 已就绪');
})();
