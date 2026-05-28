/**
 * emotion-engine.js — 情绪雷达核心融合引擎
 *
 * 数据流：
 *   APM/Audio/Time/Music 检测器 (渲染进程) ──callback──┐
 *   App/Idle 检测器 (主进程) ──IPC──▶ systemData ──────┤
 *                                                      ▼
 *                                           EMA 平滑 + 权重融合
 *                                                      │
 *                                             情绪向量 (9维)
 *                                                      │
 *                                         自然衰减 → 主情绪选择
 *                                                      │
 *                                    EventBus 发射 ──▶ Live2D / UI面板
 */
(function () {
  'use strict';

  var _state = null;           // 当前情绪向量
  var _mainEmotion = null;     // 当前主情绪
  var _mainEmotionTick = 0;    // 主情绪持续 tick 计数
  var _systemData = {};        // 主进程传来的系统数据 { app, idle }
  var _detectorSignals = {};   // 各检测器最新信号
  var _emaState = null;        // EMA 平滑后的目标值
  var _engineTimer = null;
  var _started = false;
  var _lastStateSnapshot = null; // 上次状态快照，用于增量更新
  var _registeredDetectors = {}; // 已注册的检测器

  function init() {
    var cfg = window.EmotionConfig;
    var st = window.EmotionState;
    if (!cfg || !st) {
      console.error('[EmotionEngine] 依赖 EmotionConfig/EmotionState 未加载');
      return false;
    }

    // 检查 AppState 是否可用
    var hasAppState = !!window.AppState;
    if (!hasAppState) {
      console.warn('[EmotionEngine] AppState 未加载，部分功能将受限');
    }

    _state = st.createInitialState();
    _emaState = st.createInitialState();
    for (var i = 0; i < st.DIMS.length; i++) {
      _emaState[st.DIMS[i]] = _state[st.DIMS[i]];
    }
    _mainEmotion = 'relaxed';
    _mainEmotionTick = 0;

    // 注册 AppState 键（仅在 AppState 可用时）
    if (hasAppState) {
      window.AppState.register('emotionVector', _state, {});
      window.AppState.register('mainEmotion', _mainEmotion, {});
      window.AppState.register('emotionEngineRunning', false, {});
    }

    return true;
  }

  // ---- 接收主进程系统数据 ----
  function onSystemData(data) {
    _systemData = data || {};
  }

  // 监听 IPC 推送
  function listenSystemIPC() {
    if (typeof window.BandoriIPC !== 'undefined') {
      var cfg = window.EmotionConfig;
      var events = (cfg && cfg.events) || {};
      var systemDataEvent = events.SYSTEM_DATA || 'emotion-system-data';
      var musicStateEvent = events.MUSIC_STATE || 'music-state';

      window.BandoriIPC.on(systemDataEvent, onSystemData);
      // 系统媒体检测作为 BGM 后备（即使没开音频采集也能检测）
      window.BandoriIPC.on(musicStateEvent, function (data) {
        if (!data) return;
        _detectorSignals['music'] = _detectorSignals['music'] || {};
        _detectorSignals['music'].isMusicPlaying = (data.state === 'playing');
      });
    }
  }

  // ---- 接收检测器信号 ----
  function onDetectorSignal(source, signal) {
    _detectorSignals[source] = signal;
  }

  // ---- EMA 平滑 ----
  function emaSmooth(target, current, factor) {
    return current + factor * (target - current);
  }

  // ---- 核心：单次 tick ----
  function tick() {
    var cfg = window.EmotionConfig;
    var st = window.EmotionState;
    if (!cfg || !st) return;

    // 帧率归一化：参考间隔 500ms
    var referenceInterval = 500;
    var frameRatio = cfg.updateInterval / referenceInterval;

    var decayRate = cfg.decayRate * (cfg.updateInterval / 1000);
    // EMA 平滑系数帧率适配：adjustedFactor = 1 - (1 - factor) ^ frameRatio
    var rawSmooth = cfg.smoothingFactor;
    var smooth = 1 - Math.pow(1 - rawSmooth, frameRatio);

    var dims = st.DIMS;
    var target = {};

    // 初始化目标值
    for (var i = 0; i < dims.length; i++) {
      target[dims[i]] = 0;
    }

    // ---- 1. APM 检测器 → rage / gaming / focus ----
    var apm = _detectorSignals['apm'] || {};
    var apmCfg = cfg.detectors.apm;
    if (apm.apmRate > apmCfg.rageThreshold) {
      target.rage += apmCfg.rageBoost || 12;
      target.stressed += apmCfg.stressedBoost || 8;
    } else if (apm.apmRate > apmCfg.gamingThreshold) {
      target.gaming += apmCfg.gamingBoost || 35;
      target.focus += apmCfg.focusBoost || 10;
    } else if (apm.apmRate > 30) {
      target.focus += apmCfg.focusBoostLow || 15;
    }
    if (apm.clickRate > apmCfg.clickBurstThreshold) {
      target.rage += apmCfg.clickRageBoost || 8;
    }
    if (apm.mouseSpeed > apmCfg.mouseSpeedThreshold) {
      target.gaming += apmCfg.mouseGamingBoost || 12;
    }

    // ---- 2. Audio 检测器 → （只用于音乐特征，不直接产生情绪） ----
    // Audio 不再直接推 stressed；音乐特征由 Music 检测器处理

    // ---- 3. Time 检测器 → sleepy（23:00=0 → 01:00=100 线性爬升） ----
    var time = _detectorSignals['time'] || {};
    var timeCfg = cfg.detectors.time;
    if (time.isMorning) {
      target.relaxed += timeCfg.morningRelaxedBoost || 10;
    }
    var nightProgress = timeCfg.nightSleepyProgress || 120;
    if (time.hour >= 23) {
      var progress = ((time.hour - 23) * 60 + (time.minute || 0)) / nightProgress;
      target.sleepy = Math.max(target.sleepy || 0, Math.round(Math.min(1, progress) * 100));
    } else if (time.hour < 6) {
      var progress2 = (time.hour * 60 + (time.minute || 0) + 60) / nightProgress;
      target.sleepy = Math.max(target.sleepy || 0, Math.round(Math.min(1, progress2) * 100));
    } else if (time.hour >= 21) {
      target.sleepy = Math.max(target.sleepy || 0, timeCfg.nightSleepyBoost || 10);
    }

    // ---- 4. Music 检测器 → vibing / excited ----
    var music = _detectorSignals['music'] || {};
    var musicCfg = cfg.detectors.music;
    if (music.isMusicPlaying) {
      target.vibing = Math.max(target.vibing || 0, musicCfg.vibingBoost || 40);
      if (music.energyTrend > (musicCfg.energyTrendThreshold || 0.05)) {
        target.excited = Math.max(target.excited || 0, musicCfg.excitedBoost || 20);
      }
    }

    // ---- 5. App 检测器 (主进程) → gaming / focus / vibing ----
    var app = _systemData.app || {};
    var appCfg = cfg.detectors.app;
    if (app.isGaming) {
      target.gaming = Math.max(target.gaming || 0, appCfg.gamingBoost || 50);
    }
    if (app.isFocus) {
      target.focus = Math.max(target.focus || 0, appCfg.focusBoost || 40);
    }
    if (app.isMusic) {
      target.vibing = Math.max(target.vibing || 0, appCfg.musicBoost || 40);
    }

    // ---- 6. Idle 检测器 (主进程) → lonely / sleepy ----
    var idle = _systemData.idle || {};
    var idleCfg = cfg.detectors.idle;
    if (idle.idleTime > idleCfg.sleepyThreshold) {
      target.sleepy = Math.max(target.sleepy || 0, idleCfg.sleepyBoost || 20);
      target.lonely = Math.max(target.lonely || 0, idleCfg.lonelyBoostHigh || 40);
    } else if (idle.idleTime > idleCfg.lonelyThreshold) {
      target.lonely = Math.max(target.lonely || 0, idleCfg.lonelyBoostLow || 30);
    }

    // ---- 7. 无活动时 relaxed 缓慢上升 ----
    var fusionCfg = cfg.fusion || {};
    var hasActivity = (apm.isActive) || (music.isMusicPlaying) || (app.isGaming || app.isFocus);
    if (!hasActivity && idle.idleTime < (fusionCfg.idleThreshold || 60)) {
      target.relaxed += fusionCfg.relaxedBoost || 5;
    }

    // ---- 8. EMA 平滑 + 衰减 + 收敛 ----
    var prevMain = _mainEmotion;
    var changed = false;

    for (var j = 0; j < dims.length; j++) {
      var dim = dims[j];

      // 目标值裁剪到 [0, 100]
      var t = Math.max(0, Math.min(cfg.maxValue, target[dim] || 0));

      // EMA 平滑目标值
      _emaState[dim] = emaSmooth(t, _emaState[dim], smooth);

      // 自然衰减（向 0 缓慢回归）
      _state[dim] = _state[dim] * (1 - decayRate);

      // 向 emaState 逼近（相对拉动，稳态 = emaState）
      var fusionCfg = cfg.fusion || {};
      var relaxedPull = fusionCfg.relaxedPullRate || 0.06;
      var defaultPull = fusionCfg.defaultPullRate || 0.12;
      var pullRate = (dim === 'relaxed') ? relaxedPull : defaultPull;
      _state[dim] = emaSmooth(_emaState[dim], _state[dim], pullRate);

      // 裁剪
      _state[dim] = Math.max(cfg.minValue, Math.min(cfg.maxValue, _state[dim]));
    }

    // ---- 9. 选择主情绪 ----
    var bestDim = 'relaxed';
    var bestScore = _state.relaxed;
    var threshold = cfg.mainEmotionThreshold;
    var scoreDiff = cfg.mainEmotionScoreDiff || 5;  // 从配置读取分数差值阈值

    for (var k = 0; k < st.PRIORITY.length; k++) {
      var d = st.PRIORITY[k];
      // 优先考虑超过阈值 + 比 relaxed 高的
      if (_state[d] > threshold && _state[d] > bestScore - scoreDiff) {
        // 相同分值时按优先级选
        if (_state[d] > bestScore || st.PRIORITY.indexOf(d) < st.PRIORITY.indexOf(bestDim)) {
          bestScore = _state[d];
          bestDim = d;
        }
      }
    }

    // 防抖：新主情绪需持续 N tick 才切换
    if (bestDim !== prevMain) {
      _mainEmotionTick++;
      if (_mainEmotionTick >= cfg.changeHysteresis) {
        _mainEmotion = bestDim;
        changed = true;
        _mainEmotionTick = 0;
      }
    } else {
      _mainEmotionTick = 0;
    }

    // ---- 10. 更新 AppState ----
    // 优化深拷贝：仅在数据变化时才进行拷贝
    var stateChanged = changed;
    if (!stateChanged && _lastStateSnapshot) {
      // 快速检查是否有任何维度变化
      for (var s = 0; s < dims.length; s++) {
        if (Math.abs(_state[dims[s]] - _lastStateSnapshot[dims[s]]) > 0.01) {
          stateChanged = true;
          break;
        }
      }
    } else {
      stateChanged = true;
    }

    if (stateChanged) {
      _lastStateSnapshot = JSON.parse(JSON.stringify(_state));

      if (window.AppState) {
        window.AppState.set('emotionVector', _lastStateSnapshot);
        window.AppState.set('mainEmotion', _mainEmotion);
      }

      // ---- 11. 发射事件 ----
      if (window.BandoriEvents) {
        var events = cfg.events || {};
        var evtUpdated = events.EMOTION_UPDATED || 'emotion:updated';
        var evtChanged = events.EMOTION_CHANGED || 'emotion:changed';

        window.BandoriEvents.emit(evtUpdated, {
          vector: _lastStateSnapshot,
          main: _mainEmotion,
          timestamp: Date.now()
        });

        if (changed) {
          window.BandoriEvents.emit(evtChanged, {
            from: prevMain,
            to: _mainEmotion,
            vector: _lastStateSnapshot,
            timestamp: Date.now()
          });
        }
      }
    }

    // ---- 12. 驱动 Live2D ----
    if (changed && cfg.emotionToLive2D && cfg.emotionToLive2D[_mainEmotion]) {
      var tag = cfg.emotionToLive2D[_mainEmotion];
      var charId = window.AppState ? window.AppState.get('selectedCharId') : null;
      if (typeof window.applyLive2DEmotion === 'function') {
        window.applyLive2DEmotion(tag, charId || 'kasumi');
      }
    }
  }

  // ---- 公共 API ----

  function start() {
    if (_started) return;

    // 初始化失败时中止启动
    if (!init()) {
      console.error('[EmotionEngine] 初始化失败，无法启动');
      return;
    }

    var cfg = window.EmotionConfig;
    var interval = (cfg && cfg.updateInterval) || 500;

    listenSystemIPC();

    // 启动已注册的检测器
    for (var name in _registeredDetectors) {
      if (_registeredDetectors.hasOwnProperty(name)) {
        var detector = _registeredDetectors[name];
        if (detector && typeof detector.start === 'function') {
          detector.start(function (sig) { onDetectorSignal(name, sig); });
        }
      }
    }

    // 启动内置检测器（向后兼容）
    if (window.ApmDetector && !_registeredDetectors['apm']) {
      window.ApmDetector.start(function (sig) { onDetectorSignal('apm', sig); });
    }
    if (window.AudioDetector && !_registeredDetectors['audio']) {
      window.AudioDetector.start(function (sig) { onDetectorSignal('audio', sig); });
    }
    if (window.TimeDetector && !_registeredDetectors['time']) {
      window.TimeDetector.start(function (sig) { onDetectorSignal('time', sig); });
    }
    if (window.MusicDetector && !_registeredDetectors['music']) {
      window.MusicDetector.start(function (sig) { onDetectorSignal('music', sig); });
    }

    _engineTimer = setInterval(tick, interval);
    _started = true;

    if (window.AppState) {
      window.AppState.set('emotionEngineRunning', true);
    }

    console.log('[EmotionEngine] 已启动');
  }

  function stop() {
    if (_engineTimer) {
      clearInterval(_engineTimer);
      _engineTimer = null;
    }

    // 停止已注册的检测器
    for (var name in _registeredDetectors) {
      if (_registeredDetectors.hasOwnProperty(name)) {
        var detector = _registeredDetectors[name];
        if (detector && typeof detector.stop === 'function') {
          detector.stop();
        }
      }
    }

    // 停止内置检测器（向后兼容）
    if (window.ApmDetector && !_registeredDetectors['apm']) window.ApmDetector.stop();
    if (window.AudioDetector && !_registeredDetectors['audio']) window.AudioDetector.stop();
    if (window.TimeDetector && !_registeredDetectors['time']) window.TimeDetector.stop();
    if (window.MusicDetector && !_registeredDetectors['music']) window.MusicDetector.stop();

    _started = false;
    if (window.AppState) {
      window.AppState.set('emotionEngineRunning', false);
    }
    console.log('[EmotionEngine] 已停止');
  }

  // 注册检测器
  function registerDetector(name, detector) {
    if (!name || !detector) {
      console.warn('[EmotionEngine] 注册检测器失败：名称和检测器对象不能为空');
      return false;
    }

    // 如果检测器已存在，先停止旧的
    if (_registeredDetectors[name]) {
      var old = _registeredDetectors[name];
      if (typeof old.stop === 'function') {
        old.stop();
      }
    }

    _registeredDetectors[name] = detector;

    // 如果引擎已启动，立即启动新检测器
    if (_started && typeof detector.start === 'function') {
      detector.start(function (sig) { onDetectorSignal(name, sig); });
    }

    console.log('[EmotionEngine] 检测器已注册:', name);
    return true;
  }

  // 注销检测器
  function unregisterDetector(name) {
    if (!_registeredDetectors[name]) {
      return false;
    }

    var detector = _registeredDetectors[name];
    if (typeof detector.stop === 'function') {
      detector.stop();
    }

    delete _registeredDetectors[name];
    delete _detectorSignals[name];

    console.log('[EmotionEngine] 检测器已注销:', name);
    return true;
  }

  // 获取已注册的检测器列表
  function getRegisteredDetectors() {
    return Object.keys(_registeredDetectors);
  }

  function getState() {
    return JSON.parse(JSON.stringify(_state));
  }

  function getMainEmotion() {
    return _mainEmotion;
  }

  window.EmotionEngine = {
    start: start,
    stop: stop,
    getState: getState,
    getMainEmotion: getMainEmotion,
    onSystemData: onSystemData,
    registerDetector: registerDetector,
    unregisterDetector: unregisterDetector,
    getRegisteredDetectors: getRegisteredDetectors
  };

  console.log('[EmotionEngine] 已就绪');
})();
