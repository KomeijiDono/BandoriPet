/**
 * emotion-config.js — 情绪雷达配置参数
 * 所有可调参数集中于此，方便后续设置面板暴露
 */
(function () {
  'use strict';

  window.EmotionConfig = {
    // 情绪引擎核心参数
    updateInterval: 500,       // 融合引擎更新间隔 (ms)
    decayRate: 0.015,          // 每秒衰减率 (0~1)
    smoothingFactor: 0.25,     // EMA 平滑系数 (越小越平滑)
    mainEmotionThreshold: 20,  // 主情绪切换阈值，超过此值才视为有效
    changeHysteresis: 3,       // 主情绪切换防抖延迟 (tick 次数)

    // 情绪维度上限
    maxValue: 100,
    minValue: 0,

    // 各检测器权重
    detectors: {
      apm: {
        weight: 1.0,
        rageThreshold: 300,       // APM > 此值触发 rage (每分钟操作)
        gamingThreshold: 150,     // APM > 此值触发 gaming
        clickBurstThreshold: 5,   // 每秒点击 > 此值触发 rage
        mouseSpeedThreshold: 800  // 鼠标移动速度 > 此值 (px/s)
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
        ]
      },
      idle: {
        weight: 1.2,
        lonelyThreshold: 60,     // 空闲 > 60s 触发 lonely
        sleepyThreshold: 300     // 空闲 > 300s 触发 sleepy
      },
      time: {
        weight: 0.5,
        nightStart: 23,
        nightEnd: 6,
        morningStart: 6,
        morningEnd: 9
      },
      music: {
        weight: 0.8,
        bassBinStart: 0,          // FFT 低频起始 bin (0-64)
        bassBinEnd: 12,           // FFT 低频结束 bin
        energyThreshold: 0.3,     // 总能量 > 此值视为"有音乐"
        bassRatioThreshold: 0.35  // 低频能量占比 > 此值
      }
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
    }
  };

  console.log('[EmotionConfig] 已加载');
})();
