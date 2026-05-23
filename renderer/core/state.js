/**
 * state.js — 全局状态中心
 * 所有全局变量统一收敛到此模块，作为单一数据源。
 * 迁移期间通过 Object.defineProperty 提供向后兼容桥接。
 */

(function () {
  'use strict';

  // 核心存储 & 订阅表 & 桥接变量名列表
  var _state = {};
  var _listeners = {};
  var _bridgeVars = [];

  // ---- get/set/subscribe ----

  function get(key) {
    return _state[key];
  }

  function set(key, value) {
    var old = _state[key];
    _state[key] = value;
    // 值发生变化时，通知所有订阅者
    if (old !== value && _listeners[key]) {
      _listeners[key].forEach(function (fn) {
        try { fn(value, old); } catch (e) { console.error('[State] 监听器报错:', key, e); }
      });
    }
  }

  // 订阅状态变更
  function subscribe(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
  }

  // 移除订阅
  function unsubscribe(key, callback) {
    if (_listeners[key]) {
      _listeners[key] = _listeners[key].filter(function (fn) { return fn !== callback; });
    }
  }

  // ---- register / bridge / registerAll ----

  // 注册状态键（支持默认值、localStorage 持久化、window 桥接）
  function register(key, defaultValue, opts) {
    opts = opts || {};
    var val = defaultValue;
    // 优先从 localStorage 恢复已持久化的值
    if (opts.persistKey) {
      try {
        var stored = localStorage.getItem(opts.persistKey);
        if (stored !== null) {
          try { val = JSON.parse(stored); } catch (e) { val = stored; }
        }
      } catch (e) {}
    }
    _state[key] = val;

    // 监听变更并自动写回 localStorage
    if (opts.persistKey) {
      subscribe(key, function (v) {
        try {
          localStorage.setItem(opts.persistKey, JSON.stringify(v));
        } catch (e) {}
      });
    }

    // 创建 window 全局变量桥接（兼容旧代码直接读写 window.xxx）
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

  // 从现有 window 全局变量吸收值，建立向后兼容桥接
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

  // 批量注册多个状态键
  function registerAll(defs) {
    Object.keys(defs).forEach(function (key) {
      var d = defs[key];
      register(key, d.default, { persistKey: d.persistKey, bridge: d.bridge });
    });
  }

  // ---- snapshot ----

  // 返回当前状态的深拷贝快照
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
