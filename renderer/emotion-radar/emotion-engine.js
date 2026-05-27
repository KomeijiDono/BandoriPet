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

  function init() {
    var cfg = window.EmotionConfig;
    var st = window.EmotionState;
    if (!cfg || !st) {
      console.error('[EmotionEngine] 依赖 EmotionConfig/EmotionState 未加载');
      return;
    }
    _state = st.createInitialState();
    _emaState = st.createInitialState();
    for (var i = 0; i < st.DIMS.length; i++) {
      _emaState[st.DIMS[i]] = _state[st.DIMS[i]];
    }
    _mainEmotion = 'relaxed';
    _mainEmotionTick = 0;

    // 注册 AppState 键
    if (window.AppState) {
      window.AppState.register('emotionVector', _state, {});
      window.AppState.register('mainEmotion', _mainEmotion, {});
      window.AppState.register('emotionEngineRunning', false, {});
    }
  }

  // ---- 接收主进程系统数据 ----
  function onSystemData(data) {
    _systemData = data || {};
  }

  // 监听 IPC 推送
  function listenSystemIPC() {
    if (typeof window.BandoriIPC !== 'undefined') {
      window.BandoriIPC.on('emotion-system-data', onSystemData);
      // 系统媒体检测作为 BGM 后备（即使没开音频采集也能检测）
      window.BandoriIPC.on('music-state', function (data) {
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

    var decayRate = cfg.decayRate * (cfg.updateInterval / 1000);
    var smooth = cfg.smoothingFactor;
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
      target.rage += 12;
      target.stressed += 8;
    } else if (apm.apmRate > apmCfg.gamingThreshold) {
      target.gaming += 35;
      target.focus += 10;
    } else if (apm.apmRate > 30) {
      target.focus += 15;
    }
    if (apm.clickRate > apmCfg.clickBurstThreshold) {
      target.rage += 8;
    }
    if (apm.mouseSpeed > apmCfg.mouseSpeedThreshold) {
      target.gaming += 12;
    }

    // ---- 2. Audio 检测器 → （只用于音乐特征，不直接产生情绪） ----
    // Audio 不再直接推 stressed；音乐特征由 Music 检测器处理

    // ---- 3. Time 检测器 → sleepy（23:00=0 → 01:00=100 线性爬升） ----
    var time = _detectorSignals['time'] || {};
    if (time.isMorning) {
      target.relaxed += 10;
    }
    if (time.hour >= 23) {
      var progress = ((time.hour - 23) * 60 + (time.minute || 0)) / 120;
      target.sleepy = Math.max(target.sleepy || 0, Math.round(Math.min(1, progress) * 100));
    } else if (time.hour < 6) {
      var progress2 = (time.hour * 60 + (time.minute || 0) + 60) / 120;
      target.sleepy = Math.max(target.sleepy || 0, Math.round(Math.min(1, progress2) * 100));
    } else if (time.hour >= 21) {
      target.sleepy = Math.max(target.sleepy || 0, 10);
    }

    // ---- 4. Music 检测器 → vibing / excited ----
    var music = _detectorSignals['music'] || {};
    if (music.isMusicPlaying) {
      target.vibing = Math.max(target.vibing || 0, 40);
      if (music.energyTrend > 0.05) {
        target.excited = Math.max(target.excited || 0, 20);
      }
    }

    // ---- 5. App 检测器 (主进程) → gaming / focus / vibing ----
    var app = _systemData.app || {};
    if (app.isGaming) {
      target.gaming = Math.max(target.gaming || 0, 50);
    }
    if (app.isFocus) {
      target.focus = Math.max(target.focus || 0, 40);
    }
    if (app.isMusic) {
      target.vibing = Math.max(target.vibing || 0, 40);
    }

    // ---- 6. Idle 检测器 (主进程) → lonely / sleepy ----
    var idle = _systemData.idle || {};
    var idleCfg = cfg.detectors.idle;
    if (idle.idleTime > idleCfg.sleepyThreshold) {
      target.sleepy = Math.max(target.sleepy || 0, 20);
      target.lonely = Math.max(target.lonely || 0, 40);
    } else if (idle.idleTime > idleCfg.lonelyThreshold) {
      target.lonely = Math.max(target.lonely || 0, 30);
    }

    // ---- 7. 无活动时 relaxed 缓慢上升 ----
    var hasActivity = (apm.isActive) || (music.isMusicPlaying) || (app.isGaming || app.isFocus);
    if (!hasActivity && idle.idleTime < 60) {
      target.relaxed += 5;
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
      var pullRate = (dim === 'relaxed') ? 0.06 : 0.12;
      _state[dim] = emaSmooth(_emaState[dim], _state[dim], pullRate);

      // 裁剪
      _state[dim] = Math.max(cfg.minValue, Math.min(cfg.maxValue, _state[dim]));
    }

    // ---- 9. 选择主情绪 ----
    var bestDim = 'relaxed';
    var bestScore = _state.relaxed;
    var threshold = cfg.mainEmotionThreshold;

    for (var k = 0; k < st.PRIORITY.length; k++) {
      var d = st.PRIORITY[k];
      // 优先考虑超过阈值 + 比 relaxed 高的
      if (_state[d] > threshold && _state[d] > bestScore - 5) {
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
    if (window.AppState) {
      window.AppState.set('emotionVector', JSON.parse(JSON.stringify(_state)));
      window.AppState.set('mainEmotion', _mainEmotion);
    }

    // ---- 11. 发射事件 ----
    if (window.BandoriEvents) {
      var EV = window.EVENT || {};
      var evtUpdated = EV.EMOTION_UPDATED || 'emotion:updated';
      var evtChanged = EV.EMOTION_CHANGED || 'emotion:changed';

      window.BandoriEvents.emit(evtUpdated, {
        vector: JSON.parse(JSON.stringify(_state)),
        main: _mainEmotion,
        timestamp: Date.now()
      });

      if (changed) {
        window.BandoriEvents.emit(evtChanged, {
          from: prevMain,
          to: _mainEmotion,
          vector: JSON.parse(JSON.stringify(_state)),
          timestamp: Date.now()
        });
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
    init();

    var cfg = window.EmotionConfig;
    var interval = (cfg && cfg.updateInterval) || 500;

    listenSystemIPC();

    // 启动检测器
    if (window.ApmDetector) {
      window.ApmDetector.start(function (sig) { onDetectorSignal('apm', sig); });
    }
    if (window.AudioDetector) {
      window.AudioDetector.start(function (sig) { onDetectorSignal('audio', sig); });
    }
    if (window.TimeDetector) {
      window.TimeDetector.start(function (sig) { onDetectorSignal('time', sig); });
    }
    if (window.MusicDetector) {
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
    if (window.ApmDetector) window.ApmDetector.stop();
    if (window.AudioDetector) window.AudioDetector.stop();
    if (window.TimeDetector) window.TimeDetector.stop();
    if (window.MusicDetector) window.MusicDetector.stop();
    _started = false;
    if (window.AppState) {
      window.AppState.set('emotionEngineRunning', false);
    }
    console.log('[EmotionEngine] 已停止');
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
    onSystemData: onSystemData
  };

  console.log('[EmotionEngine] 已就绪');
})();
