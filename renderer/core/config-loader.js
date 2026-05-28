/**
 * config-loader.js — 渲染进程配置加载器
 * 从 config.json 加载配置，提供默认值回退机制
 */
(function () {
  'use strict';

  var config = null;

  // 默认配置
  var DEFAULT_CONFIG = {
    ui: {
      phone: { width: 320, height: 500, scale: 1.0, defaultX: '40px', defaultY: '50px' },
      widget: { defaultX: '20px', defaultY: '55px' },
      animation: { fadeOut: 200, popIn: 400, restoreDefault: 3000, settingsSave: 3000 },
      colors: {
        time: '#ff6b81', date: '#555555', greeting: '#777777', weather: '#5aa1e3',
        defaultRgb: '255, 182, 193', gradientStart: '#ffb6c1', gradientEnd: '#87ceeb'
      },
      particles: {
        defaultCount: 80, defaultSpeed: 1, defaultShape: 'circle', defaultColor: '#ffb6c1',
        sizeMin: 1, sizeMax: 4, starPoints: 5
      },
      mouseTrail: { spawnProbability: 0.4, dynamicHueStep: 0.5 },
      radialMenu: { radius: 95, itemSize: 54, defaultKey: '`', defaultMode: 'click' }
    },
    chat: {
      maxHistory: 20, temperature: 0.7, maxEmotionTags: 3,
      voiceEmotionStepMin: 1500, voiceEmotionStepMax: 3500, voiceEmotionStepDefault: 2600,
      clickFeedbackDuration: 2400, emotionRestoreDelay: 3000
    },
    external: {
      weatherInterval: 3600000,
      weatherApiUrl: 'https://api.open-meteo.com/v1/forecast',
      geoApiUrl: 'https://get.geojs.io/v1/ip/geo.json',
      radarWsUrl: 'ws://localhost:8765',
      radarReconnectDelay: 10000,
      radarCooldown: 10000
    },
    audio: {
      fftSize: 64, lerpFactor: 0.18, dynamicHueStep: 0.5,
      defaultBarCount: 60, maxBoost: 300
    }
  };

  /**
   * 加载配置（异步）
   */
  function loadConfig() {
    return new Promise(function (resolve) {
      if (config) {
        resolve(config);
        return;
      }

      // 尝试从文件系统加载
      if (window.electronAPI && window.electronAPI.fs && window.electronAPI.path) {
        window.electronAPI.app.getAppPath().then(function (appPath) {
          var fs = window.electronAPI.fs;
          var path = window.electronAPI.path;
          var configPath = path.join(appPath, 'config.json');

          try {
            if (fs.existsSync(configPath)) {
              var fileContent = fs.readFileSync(configPath, 'utf-8');
              var userConfig = JSON.parse(fileContent);
              config = deepMerge(DEFAULT_CONFIG, userConfig);
              console.log('[配置] 已加载 config.json');
            } else {
              config = deepMerge({}, DEFAULT_CONFIG);
              console.log('[配置] config.json 不存在，使用默认配置');
            }
          } catch (e) {
            console.error('[配置] 加载 config.json 失败:', e.message);
            config = deepMerge({}, DEFAULT_CONFIG);
          }

          resolve(config);
        }).catch(function () {
          config = deepMerge({}, DEFAULT_CONFIG);
          resolve(config);
        });
      } else {
        config = deepMerge({}, DEFAULT_CONFIG);
        resolve(config);
      }
    });
  }

  /**
   * 获取配置值（支持点号路径）
   * @param {string} path - 配置路径，如 'ui.phone.width'
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  function getConfig(path, defaultValue) {
    if (!config) return defaultValue;

    var keys = path.split('.');
    var value = config;

    for (var i = 0; i < keys.length; i++) {
      if (value && typeof value === 'object' && keys[i] in value) {
        value = value[keys[i]];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * 深度合并对象
   */
  function deepMerge(target, source) {
    var result = {};
    for (var key in target) {
      result[key] = target[key];
    }

    for (var key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // 暴露到全局
  window.ConfigLoader = {
    load: loadConfig,
    get: getConfig
  };

  console.log('[Renderer] config-loader.js 已就绪');
})();
