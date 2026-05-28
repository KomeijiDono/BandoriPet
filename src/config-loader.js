// config-loader.js — 主进程配置加载器
// 从 config.json 加载配置，提供默认值回退机制
const fs = require('fs');
const path = require('path');

let config = null;

// 默认配置（与 config.json 结构一致）
const DEFAULT_CONFIG = {
  physics: {
    gravity: 1.5,
    throwPower: 1.2,
    airFriction: 0.01,
    fps: 60,
    bounds: { yMin: -5000, yMax: 5000, xMin: -5000, xMax: 10000 },
    dragVelocityFactor: 0.4,
    speedThreshold: 0.1,
    angularSpeedThreshold: 0.01,
    defaultItemSize: 80,
    minItemSize: 30,
    maxItemSize: 300
  },
  emotion: {
    detectors: {
      gamingProcesses: [
        'valorant', 'csgo', 'cs2', 'dota2', 'league of legends', 'lol',
        'genshinimpact', 'honkai', 'starrail', 'wuthering waves',
        'overwatch', 'apex', 'pubg', 'fortnite', 'minecraft',
        'elden ring', 'monster hunter', 'call of duty', 'steam',
        'battlefield', 'rainbow six', 'rocket league'
      ],
      focusProcesses: [
        'code', 'vscode', 'visual studio', 'devenv', 'intellij', 'idea64',
        'webstorm', 'pycharm', 'sublime_text', 'notepad++',
        'windows terminal', 'cmd', 'powershell',
        'chrome', 'firefox', 'msedge', 'obsidian', 'notion',
        'figma', 'photoshop', 'blender', 'unity', 'unreal',
        'winword', 'excel', 'powerpnt', 'outlook',
        'terminal', 'cursor', 'windsurf'
      ],
      musicProcesses: [
        'spotify', 'qqmusic', 'netease', 'cloudmusic', 'kwmusic',
        'foobar2000', 'aimp', 'musicbee', 'dopamine',
        'youtube music', 'apple music', 'amazon music',
        'tidal', 'deezer', 'soundcloud'
      ]
    },
    updateInterval: 500,
    decayRate: 0.015,
    smoothingFactor: 0.25,
    mainEmotionThreshold: 20,
    changeHysteresis: 3
  },
  sovits: {
    language: 'ja',
    switchDelay: 1000
  }
};

/**
 * 加载配置文件
 * @param {string} rootPath - 项目根目录
 * @returns {object} 配置对象
 */
function loadConfig(rootPath) {
  if (config) return config;
  
  const configPath = path.join(rootPath, 'config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(fileContent);
      config = deepMerge(DEFAULT_CONFIG, userConfig);
      console.log('[配置] 已加载 config.json');
    } else {
      config = { ...DEFAULT_CONFIG };
      console.log('[配置] config.json 不存在，使用默认配置');
    }
  } catch (e) {
    console.error('[配置] 加载 config.json 失败:', e.message);
    config = { ...DEFAULT_CONFIG };
  }
  
  return config;
}

/**
 * 获取配置值（支持点号路径）
 * @param {string} path - 配置路径，如 'physics.gravity'
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getConfig(path, defaultValue) {
  if (!config) return defaultValue;
  
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
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
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * 重新加载配置
 */
function reloadConfig(rootPath) {
  config = null;
  return loadConfig(rootPath);
}

module.exports = { loadConfig, getConfig, reloadConfig };
