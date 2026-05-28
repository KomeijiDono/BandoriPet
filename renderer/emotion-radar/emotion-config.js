/**
 * emotion-config.js — 情绪雷达配置参数
 * 所有可调参数集中于此，方便后续设置面板暴露
 * 支持从主进程 config.json 同步配置
 */
(function () {
  'use strict';

  // 默认配置
  var defaultConfig = {
    // 情绪引擎核心参数
    updateInterval: 500,       // 融合引擎更新间隔 (ms)
    decayRate: 0.015,          // 每秒衰减率 (0~1)
    smoothingFactor: 0.25,     // EMA 平滑系数 (越小越平滑)
    mainEmotionThreshold: 20,  // 主情绪切换阈值，超过此值才视为有效
    changeHysteresis: 3,       // 主情绪切换防抖延迟 (tick 次数)

    // 情绪维度上限
    maxValue: 100,
    minValue: 0,

    // 主情绪切换防抖分数差值
    mainEmotionScoreDiff: 5,

    // 各检测器权重
    detectors: {
      apm: {
        weight: 1.0,
        rageThreshold: 300,       // APM > 此值触发 rage (每分钟操作)
        gamingThreshold: 150,     // APM > 此值触发 gaming
        clickBurstThreshold: 5,   // 每秒点击 > 此值触发 rage
        mouseSpeedThreshold: 800, // 鼠标移动速度 > 此值 (px/s)
        // 情绪增量权重
        rageBoost: 12,            // APM 超过 rage 阈值时 rage 增量
        stressedBoost: 8,         // APM 超过 rage 阈值时 stressed 增量
        gamingBoost: 35,          // APM 超过 gaming 阈值时 gaming 增量
        focusBoost: 10,           // APM 超过 gaming 阈值时 focus 增量
        focusBoostLow: 15,        // APM 适中时 focus 增量
        clickRageBoost: 8,        // 点击爆发时 rage 增量
        mouseGamingBoost: 12      // 鼠标快速移动时 gaming 增量
      },
      audio: {
        weight: 0.7,
        peakThreshold: 0.55,      // RMS > 此值触发 stressed
        peakDuration: 3000        // 持续高音量时长阈值 (ms)
      },
      app: {
        weight: 1.5,              // 前台程序信息权重较高
        gamingProcesses: [
          'valorant', 'csgo', 'cs2', 'dota2', 'lol', 'league of legends',
          'genshinimpact', 'honkai', 'starrail', 'wuthering waves',
          'overwatch', 'apex', 'pubg', 'fortnite', 'minecraft',
          'elden ring', 'monster hunter', 'call of duty', 'steam'
        ],
        focusProcesses: [
          'vscode', 'visual studio', 'intellij', 'webstorm', 'pycharm',
          'sublime', 'notepad++', 'terminal', 'cmd', 'powershell',
          'chrome', 'firefox', 'edge', 'obsidian', 'notion',
          'figma', 'photoshop', 'blender', 'unity', 'unreal',
          'word', 'excel', 'powerpoint', 'outlook'
        ],
        // 情绪增量权重
        gamingBoost: 50,          // 检测到游戏时 gaming 增量
        focusBoost: 40,           // 检测到专注时 focus 增量
        musicBoost: 40            // 检测到音乐时 vibing 增量
      },
      idle: {
        weight: 1.2,
        lonelyThreshold: 60,      // 空闲 > 60s 触发 lonely
        sleepyThreshold: 300,     // 空闲 > 300s 触发 sleepy
        // 情绪增量权重
        sleepyBoost: 20,          // 空闲超过 sleepy 阈值时 sleepy 增量
        lonelyBoostHigh: 40,      // 空闲超过 sleepy 阈值时 lonely 增量
        lonelyBoostLow: 30        // 空闲超过 lonely 阈值时 lonely 增量
      },
      time: {
        weight: 0.5,
        nightStart: 23,
        nightEnd: 6,
        morningStart: 6,
        morningEnd: 9,
        // 情绪增量权重
        morningRelaxedBoost: 10,  // 早晨时 relaxed 增量
        nightSleepyBoost: 10,     // 晚上 21-23 点时 sleepy 增量
        nightSleepyProgress: 120  // 深夜 sleepy 线性爬升时长（分钟）
      },
      music: {
        weight: 0.8,
        bassBinStart: 0,          // FFT 低频起始 bin (0-64)
        bassBinEnd: 12,           // FFT 低频结束 bin
        energyThreshold: 0.3,     // 总能量 > 此值视为"有音乐"
        bassRatioThreshold: 0.35, // 低频能量占比 > 此值
        // 情绪增量权重
        vibingBoost: 40,          // 检测到音乐时 vibing 增量
        energyTrendThreshold: 0.05, // 能量趋势阈值
        excitedBoost: 20          // 能量趋势超过阈值时 excited 增量
      }
    },

    // 融合引擎参数
    fusion: {
      relaxedBoost: 5,            // 无活动时 relaxed 增量
      relaxedPullRate: 0.06,      // relaxed 维度的 EMA 拉动速率
      defaultPullRate: 0.12,      // 其他维度的 EMA 拉动速率
      idleThreshold: 60           // 无活动判断的空闲阈值（秒）
    },

    // 主情绪 → Live2D 标签映射
    emotionToLive2D: {
      rage: 'angry',
      stressed: 'serious',
      sleepy: 'sad',
      lonely: 'sad',
      focus: 'serious',
      gaming: 'surprised',
      vibing: 'happy',
      excited: 'happy',
      relaxed: 'normal'
    },

    // 主情绪 → 动作行为
    emotionBehaviors: {
      rage:    { shake: true,  bubble: true  },
      stressed:{ shake: false, bubble: false },
      sleepy:  { yawn: true,   dimUI: false  },
      lonely:  { bubble: true,  idleAnim: true },
      focus:   { quiet: true,  corner: true  },
      gaming:  { cheer: true,  bubble: true  },
      vibing:  { sway: true,   bubble: false },
      excited: { jump: true,   bubble: true  },
      relaxed: { defaultAnim: true }
    },

    // 事件名称定义（集中管理）
    events: {
      EMOTION_UPDATED: 'emotion:updated',
      EMOTION_CHANGED: 'emotion:changed',
      SYSTEM_DATA: 'emotion-system-data',
      MUSIC_STATE: 'music-state'
    }
  };

  // 合并配置（深度合并）
  function deepMerge(target, source) {
    var result = {};
    for (var key in target) {
      if (target.hasOwnProperty(key)) {
        result[key] = target[key];
      }
    }
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
            target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          result[key] = deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  // 当前配置
  var config = defaultConfig;

  // 从主进程同步配置
  function syncFromMainProcess() {
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.invoke) {
      window.electronAPI.invoke('get-emotion-config').then(function (mainConfig) {
        if (mainConfig && mainConfig.detectors) {
          // 合并主进程的进程列表配置
          if (mainConfig.detectors.gamingProcesses) {
            config.detectors.app.gamingProcesses = mainConfig.detectors.gamingProcesses;
          }
          if (mainConfig.detectors.focusProcesses) {
            config.detectors.app.focusProcesses = mainConfig.detectors.focusProcesses;
          }
          if (mainConfig.detectors.musicProcesses) {
            config.detectors.app.musicProcesses = mainConfig.detectors.musicProcesses;
          }
          console.log('[EmotionConfig] 已从主进程同步配置');
        }
      }).catch(function (err) {
        console.warn('[EmotionConfig] 从主进程同步配置失败:', err.message);
      });
    }
  }

  // 初始化时同步
  syncFromMainProcess();

  window.EmotionConfig = config;

  console.log('[EmotionConfig] 已加载');
})();
