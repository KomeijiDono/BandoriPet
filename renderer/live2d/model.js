/**
 * model.js — Live2D 模型加载与情绪状态管理
 * PIXI 初始化 + 模型发现与加载 + 情绪应用 + 交互反馈
 */
(function () {
  'use strict';

  // ===== 状态变量 =====
  var app, live2dModel;
  var currentLive2dMotionNames = new Set();          // 当前模型可用动作名集合
  var currentLive2dExpressionNames = new Set();      // 当前模型可用表情名集合
  var currentLive2dMotionList = [];                   // 动作名列表（已排序）
  var currentLive2dExpressionList = [];               // 表情名列表（已排序）
  var voiceEmotionTimers = [];                        // 语音情绪定时器句柄
  var lastLive2DClickAt = 0;                          // 上次点击时间戳
  var lastLive2DClickMotionName = '';                 // 上次点击使用的动作名
  var lastLive2DClickExpressionName = '';             // 上次点击使用的表情名

  // ===== PIXI 应用初始化：绑定 canvas，透明背景，自适应窗口 =====
  try {
    app = new PIXI.Application({
      view: document.getElementById('canvas'), autoStart: true, resizeTo: window, backgroundAlpha: 0
    });
    window.app = app;
  } catch (e) {
    console.error('[启动] PIXI.Application 初始化失败:', e);
    var canvas = document.getElementById('canvas');
    if (canvas) canvas.style.display = 'none';
  }

  // ===== 情绪状态管理函数 =====

  // 清除所有语音情绪定时器，防止多段语音情绪冲突
  function clearVoiceEmotionTimers() {
    voiceEmotionTimers.forEach(function (timer) { clearTimeout(timer); });
    voiceEmotionTimers = [];
  }

  // 根据情绪标签将表情+动作应用到当前模型
  function applyLive2DEmotion(tag, charId) {
    if (!live2dModel) return;
    charId = charId || localStorage.getItem('current_char') || 'anon';
    var normalized = Live2DEmotion.normalizeEmotionTag(tag) || 'normal';
    var emotion = Live2DEmotion.MAP[normalized] || Live2DEmotion.MAP.normal;
    var expressionName = Live2DEmotion.pickAvailableName(Live2DEmotion.expandExpressionCandidates(emotion.expressions, charId), currentLive2dExpressionNames);
    var motionName = Live2DEmotion.pickAvailableName(emotion.motions, currentLive2dMotionNames);
    if (expressionName) {
      try { live2dModel.expression(expressionName); } catch (error) { console.warn('[emotion] expression failed:', expressionName, error.message); }
    }
    if (motionName) {
      try { live2dModel.motion(motionName); } catch (error) { console.warn('[emotion] motion failed:', motionName, error.message); }
    }
  }

  // 直接按名称应用表情+动作到当前模型
  function applyLive2DResourcePair(expressionName, motionName) {
    if (!live2dModel) return;
    if (expressionName) {
      try { live2dModel.expression(expressionName); } catch (error) { console.warn('[click-action] expression failed:', expressionName, error.message); }
    }
    if (motionName) {
      try { live2dModel.motion(motionName); } catch (error) { console.warn('[click-action] motion failed:', motionName, error.message); }
    }
  }

  // 清除语音定时器并恢复到 neutral 表情
  function restoreLive2DNeutral(charId) {
    clearVoiceEmotionTimers();
    applyLive2DEmotion('normal', charId);
  }

  // 启动语音情绪动作序列：根据音频长度分配各情绪标签的播放时间
  function startVoiceEmotionActions(tags, charId, audio) {
    clearVoiceEmotionTimers();
    var maxEmotionTags = window.ConfigLoader ? window.ConfigLoader.get('chat.maxEmotionTags', 3) : 3;
    var sequence = (Array.isArray(tags) && tags.length > 0 ? tags : ['normal']).slice(0, maxEmotionTags);
    var durationMs = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 0;
    var stepMin = window.ConfigLoader ? window.ConfigLoader.get('chat.voiceEmotionStepMin', 1500) : 1500;
    var stepMax = window.ConfigLoader ? window.ConfigLoader.get('chat.voiceEmotionStepMax', 3500) : 3500;
    var stepDefault = window.ConfigLoader ? window.ConfigLoader.get('chat.voiceEmotionStepDefault', 2600) : 2600;
    var stepMs = durationMs > 0 ? Math.max(stepMin, Math.min(stepMax, durationMs / (sequence.length + 1))) : stepDefault;
    sequence.forEach(function (tag, index) {
      var delay = index === 0 ? 0 : Math.round(stepMs * index);
      if (delay === 0) applyLive2DEmotion(tag, charId);
      else voiceEmotionTimers.push(setTimeout(function () { applyLive2DEmotion(tag, charId); }, delay));
    });
  }

  // 随机选取一个资源名，避免与上次重复
  function pickRandomLive2DName(names, previousName) {
    if (!Array.isArray(names) || names.length === 0) return '';
    if (names.length === 1) return names[0];
    var pool = names.filter(function (name) { return name && name !== previousName; });
    var source = pool.length > 0 ? pool : names;
    return source[Math.floor(Math.random() * source.length)] || '';
  }

  // 点击反馈，2.4秒后恢复，取消连点限制
  function playLive2DClickFeedback() {
    if (!live2dModel) return;
    if (typeof AppState !== 'undefined' && AppState.get('modelDragMoved')) return;

    var charId = localStorage.getItem('current_char') || 'anon';
    var now = Date.now();

    // 点击随机播放表情+动作
    lastLive2DClickAt = now;
    var maxCount = Math.max(currentLive2dMotionList.length, currentLive2dExpressionList.length);
    if (maxCount > 0) {
      var motionName = pickRandomLive2DName(currentLive2dMotionList, lastLive2DClickMotionName);
      var expressionName = pickRandomLive2DName(currentLive2dExpressionList, lastLive2DClickExpressionName);
      if (motionName) lastLive2DClickMotionName = motionName;
      if (expressionName) lastLive2DClickExpressionName = expressionName;
      applyLive2DResourcePair(expressionName, motionName);
    } else {
      applyLive2DEmotion('touch', charId);
    }
    clearVoiceEmotionTimers();
    var clickFeedbackDuration = window.ConfigLoader ? window.ConfigLoader.get('chat.clickFeedbackDuration', 2400) : 2400;
    voiceEmotionTimers.push(setTimeout(function () { restoreLive2DNeutral(charId); }, clickFeedbackDuration));
  }

  // 绑定 Live2D 模型点击交互事件
  function bindLive2DInteractionFeedback() {
    if (!live2dModel) return;
    try { live2dModel.off('pointertap', playLive2DClickFeedback); } catch (e) {}
    live2dModel.interactive = true;
    live2dModel.buttonMode = true;
    live2dModel.on('pointertap', playLive2DClickFeedback);
  }

  // ===== 模型加载 =====
  // 自动发现模型文件：读取 _mtn_emp/<mtnFolder>/ ，自动注入 motions 和 expressions 到 model.json
  async function loadCustomModel(charId, outfitId) {
    if (typeof window.applyBgMode === 'function') window.applyBgMode();
    if (live2dModel) {
      app.stage.removeChild(live2dModel);
      live2dModel.destroy();
      live2dModel = null;
      window.live2dPet = null;
    }
    var titleEl = document.getElementById('app-title');
    if (titleEl) titleEl.innerText = ' Bandori Desktop Pet';
    try {
      var basePath = 'model/' + charId + '/' + outfitId + '/';
      var modelUrl = basePath + 'model.json';
      var response = await fetch(modelUrl);
      var modelJson = await response.json();
      modelJson.url = modelUrl;

      var charactersConfig = window.CharactersConfig;
      var mtnFolder = charactersConfig[charId].mtnFolder;
      var relativeMtnPath = '../../_mtn_emp/' + mtnFolder + '/';
      var absoluteMtnPath = null;
      var autoMotions = {};
      var autoExpressions = [];

      // 获取应用路径并检查动作文件夹
      var appPath = await window.electronAPI.app.getAppPath();
      absoluteMtnPath = window.electronAPI.path.join(appPath, 'model', '_mtn_emp', mtnFolder);

      if (window.electronAPI.fs.existsSync(absoluteMtnPath)) {
        var files = window.electronAPI.fs.readdirSync(absoluteMtnPath);
        files.forEach(function (file) {
          if (file.endsWith('.mtn')) {
            var actionName = file.replace(/[0-9]*\.mtn$/, '');
            if (!autoMotions[actionName]) autoMotions[actionName] = [];
            autoMotions[actionName].push({ "file": relativeMtnPath + file });
          } else if (file.endsWith('.exp.json')) {
            var expName = file.replace(/[0-9]*\.exp\.json$/, '');
            autoExpressions.push({ "name": expName, "file": relativeMtnPath + file });
          }
        });
      } else {
        console.warn('找不到动作文件夹: ' + absoluteMtnPath);
      }

      modelJson.motions = Object.assign({}, modelJson.motions || {}, autoMotions);
      var expressionByName = new Map();
      (modelJson.expressions || []).concat(autoExpressions).forEach(function (expression) {
        if (expression && expression.name) expressionByName.set(expression.name, expression);
      });
      modelJson.expressions = Array.from(expressionByName.values());

      currentLive2dMotionNames = new Set(Object.keys(modelJson.motions || {}));
      currentLive2dExpressionNames = new Set((modelJson.expressions || []).map(function (exp) { return exp.name; }).filter(Boolean));
      currentLive2dMotionList = Array.from(currentLive2dMotionNames).sort();
      currentLive2dExpressionList = Array.from(currentLive2dExpressionNames).sort();
      lastLive2DClickMotionName = '';
      lastLive2DClickExpressionName = '';

      var isLookEnabled = (localStorage.getItem('mouse_follow_enabled') !== 'false');
      live2dModel = await PIXI.live2d.Live2DModel.from(modelJson, {
        basePath: basePath,
        autoInteract: isLookEnabled
      });
      app.stage.addChild(live2dModel);
      window.live2dPet = live2dModel;
      live2dModel.scale.set(parseFloat(localStorage.getItem('anon_scale')) || 0.2);
      live2dModel.x = parseFloat(localStorage.getItem('anon_x')) || 0;
      live2dModel.y = parseFloat(localStorage.getItem('anon_y')) || 0;

      bindLive2DInteractionFeedback();

      var isDragEnabled = (localStorage.getItem('model_drag_enabled') === 'true');
      var dragToggle = document.getElementById('menu-set-drag');
      if (dragToggle) dragToggle.checked = isDragEnabled;
      if (isDragEnabled && typeof window.toggleModelDrag === 'function') {
        window.toggleModelDrag(true);
      }
    } catch (error) {
      console.error("加载模型失败，请检查文件夹名称是否正确对应：", error);
      if (typeof window.addChatMessage === 'function') {
        window.addChatMessage("加载失败了！请检查 model 文件夹名称是否正确哦！", 'ai');
      }
    }
    setTimeout(function () {
      if (window.live2dPet) {
        window.live2dPet.updateTransform();
        if (typeof window.syncUIPhysics === 'function') window.syncUIPhysics();
      }
    }, 150);
  }

  // ===== 首次启动：延迟 0ms 加载初始角色模型 =====
  setTimeout(function () {
    try {
      var charactersConfig = window.CharactersConfig;
      var initChar = localStorage.getItem('current_char');
      if (!charactersConfig || !charactersConfig[initChar]) {
        initChar = (charactersConfig && Object.keys(charactersConfig)[0]) || 'kasumi';
      }
      var initOutfit = localStorage.getItem('outfit_' + initChar);
      if (!charactersConfig || !charactersConfig[initChar] || !charactersConfig[initChar].outfits[initOutfit]) {
        var outfits = charactersConfig && charactersConfig[initChar] && charactersConfig[initChar].outfits;
        initOutfit = (outfits && Object.keys(outfits)[0]) || 'live_default';
      }
      loadCustomModel(initChar, initOutfit);
      if (typeof window.BandoriIPC !== 'undefined') {
        window.BandoriIPC.send('switch-character', initChar);
      }
    } catch (e) {
      console.error('[启动] 角色加载失败:', e);
    }
  }, 0);

  // ===== 暴露 API =====
  window.loadCustomModel = loadCustomModel;
  window.restoreLive2DNeutral = restoreLive2DNeutral;
  window.startVoiceEmotionActions = startVoiceEmotionActions;
  window.applyLive2DEmotion = applyLive2DEmotion;
  window.clearVoiceEmotionTimers = clearVoiceEmotionTimers;
  window.bindLive2DInteractionFeedback = bindLive2DInteractionFeedback;
  window.playLive2DClickFeedback = playLive2DClickFeedback;

  console.log('[Renderer] model.js 已就绪');
})();
