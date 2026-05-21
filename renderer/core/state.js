/**
 * state.js — 全局状态中心
 * 所有全局变量统一收敛到此模块，作为单一数据源。
 * 迁移期间通过 Object.defineProperty 提供向后兼容桥接。
 */

(function () {
  'use strict';

  var _state = {};
  var _listeners = {};
  var _bridgeVars = [];

  /**
   * 获取状态值
   * @param {string} key
   * @returns {*}
   */
  function get(key) {
    return _state[key];
  }

  /**
   * 设置状态值，触发变更回调
   * @param {string} key
   * @param {*} value
   */
  function set(key, value) {
    var old = _state[key];
    _state[key] = value;
    if (old !== value && _listeners[key]) {
      _listeners[key].forEach(function (fn) {
        try { fn(value, old); } catch (e) { console.error('[State] 监听器报错:', key, e); }
      });
    }
  }

  /**
   * 订阅状态变更
   * @param {string} key
   * @param {function} callback - (newValue, oldValue)
   */
  function subscribe(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
  }

  /**
   * 移除订阅
   * @param {string} key
   * @param {function} callback
   */
  function unsubscribe(key, callback) {
    if (_listeners[key]) {
      _listeners[key] = _listeners[key].filter(function (fn) { return fn !== callback; });
    }
  }

  /**
   * 注册一个状态键（含默认值、localStorage 持久化配置）
   * @param {string} key       - 状态键名
   * @param {*}      defaultValue
   * @param {object} [opts]    - { persistKey?: string, bridge?: boolean }
   *   persistKey: localStorage 键名，为空则不持久化
   *   bridge: 是否创建 window 全局变量向后兼容桥接
   */
  function register(key, defaultValue, opts) {
    opts = opts || {};
    var val = defaultValue;
    if (opts.persistKey) {
      try {
        var stored = localStorage.getItem(opts.persistKey);
        if (stored !== null) {
          try { val = JSON.parse(stored); } catch (e) { val = stored; }
        }
      } catch (e) {}
    }
    _state[key] = val;

    if (opts.persistKey) {
      subscribe(key, function (v) {
        try {
          localStorage.setItem(opts.persistKey, JSON.stringify(v));
        } catch (e) {}
      });
    }

    if (opts.bridge && typeof window !== 'undefined') {
      _bridgeVars.push(key);
      Object.defineProperty(window, key, {
        get: function () { return _state[key]; },
        set: function (v) { set(key, v); },
        enumerable: true,
        configurable: true
      });
    }
  }

  /**
   * 从现有全局变量初始化向后兼容桥接
   * 将 window 上已有的全局变量值吸收到 _state 中
   * @param {string} key
   * @param {string} [persistKey]
   */
  function bridge(key, persistKey) {
    var val = window[key];
    _state[key] = val;
    _bridgeVars.push(key);
    if (persistKey) {
      subscribe(key, function (v) {
        try { localStorage.setItem(persistKey, JSON.stringify(v)); } catch (e) {}
      });
    }
    Object.defineProperty(window, key, {
      get: function () { return _state[key]; },
      set: function (v) { set(key, v); },
      enumerable: true,
      configurable: true
    });
  }

  /**
   * 批量注册状态键
   * @param {object} defs - { key: { default, persistKey, bridge }, ... }
   */
  function registerAll(defs) {
    Object.keys(defs).forEach(function (key) {
      var d = defs[key];
      register(key, d.default, { persistKey: d.persistKey, bridge: d.bridge });
    });
  }

  /**
   * 获取当前状态的快照副本
   * @returns {object}
   */
  function snapshot() {
    return JSON.parse(JSON.stringify(_state));
  }

  // ========== 暴露 API ==========
  window.AppState = {
    get: get,
    set: set,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    register: register,
    bridge: bridge,
    registerAll: registerAll,
    snapshot: snapshot
  };

  console.log('[Renderer] state.js 已就绪');
})();
