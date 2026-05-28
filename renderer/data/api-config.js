/**
 * api-config.js — API 配置中心
 * 统一管理所有 AI API 的默认配置，避免重复定义
 */
(function () {
  'use strict';

  // 默认 API 配置
  var DEFAULT_API_CONFIGS = {
    "deepseek": {
      url: "https://api.deepseek.com/v1/chat/completions",
      key: "",
      model: "deepseek-chat",
      name: "DeepSeek 4.0"
    },
    "gemini": {
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=",
      key: "",
      model: "gemini-3.1-flash-lite",
      name: "Gemini 3.1"
    },
    "openai": {
      url: "https://api.openai.com/v1/chat/completions",
      key: "",
      model: "gpt-5.4-2026-03-05",
      name: "ChatGPT 5.4"
    },
    "qwen": {
      url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      key: "",
      model: "qwen3.6-max-preview",
      name: "Qwen 3.6"
    }
  };

  // 获取用户自定义配置（从 localStorage 加载，补全缺失的默认值）
  function getUserConfigs() {
    var userConfigs = {};
    try {
      var stored = localStorage.getItem('api_configs');
      if (stored) {
        userConfigs = JSON.parse(stored) || {};
      }
    } catch (e) {
      console.warn('[APIConfig] 读取用户配置失败:', e);
    }

    // 补全缺失的默认值
    var result = {};
    Object.keys(DEFAULT_API_CONFIGS).forEach(function (key) {
      result[key] = Object.assign({}, DEFAULT_API_CONFIGS[key], userConfigs[key] || {});
    });

    return result;
  }

  // 获取当前活跃的 API 配置
  function getActiveConfig() {
    var activePreset = localStorage.getItem('api_preset') || 'deepseek';
    var configs = getUserConfigs();
    return {
      preset: activePreset,
      config: configs[activePreset] || DEFAULT_API_CONFIGS[activePreset]
    };
  }

  // 保存用户配置
  function saveUserConfig(preset, config) {
    var configs = getUserConfigs();
    configs[preset] = Object.assign({}, configs[preset], config);
    try {
      localStorage.setItem('api_configs', JSON.stringify(configs));
      localStorage.setItem('api_preset', preset);
    } catch (e) {
      console.error('[APIConfig] 保存配置失败:', e);
    }
  }

  // 获取预设列表
  function getPresetList() {
    return Object.keys(DEFAULT_API_CONFIGS).map(function (key) {
      return {
        id: key,
        name: DEFAULT_API_CONFIGS[key].name
      };
    });
  }

  // ========== 暴露 API ==========
  window.APIConfig = {
    DEFAULT_CONFIGS: DEFAULT_API_CONFIGS,
    getUserConfigs: getUserConfigs,
    getActiveConfig: getActiveConfig,
    saveUserConfig: saveUserConfig,
    getPresetList: getPresetList
  };

  console.log('[Renderer] api-config.js 已就绪');
})();
