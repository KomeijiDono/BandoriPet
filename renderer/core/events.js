/**
 * events.js — 自定义事件总线
 * 解耦模块间通信，禁止模块间直接函数调用。
 *
 * 用法：
 *   BandoriEvents.emit('char:switched', { id: 'kasumi' });
 *   BandoriEvents.on('char:switched', function(data) { ... });
 *   BandoriEvents.off('char:switched', myCallback);
 */

(function () {
  'use strict';

  /** @type {Map<string, Array<{fn:Function, once:boolean}>>} */
  var _events = {};

  /**
   * 注册事件监听
   * @param {string}   event
   * @param {function} callback
   */
  function on(event, callback) {
    if (!_events[event]) _events[event] = [];
    _events[event].push({ fn: callback, once: false });
  }

  /**
   * 注册一次性监听
   * @param {string}   event
   * @param {function} callback
   */
  function once(event, callback) {
    if (!_events[event]) _events[event] = [];
    _events[event].push({ fn: callback, once: true });
  }

  /**
   * 移除监听
   * @param {string}   event
   * @param {function} callback
   */
  function off(event, callback) {
    if (!_events[event]) return;
    _events[event] = _events[event].filter(function (h) { return h.fn !== callback; });
  }

  /**
   * 触发事件
   * @param {string} event
   * @param {...*}   args
   */
  function emit(event) {
    if (!_events[event]) return;
    var args = Array.prototype.slice.call(arguments, 1);
    var handlers = _events[event].slice(); // 拷贝，防止遍历中修改
    for (var i = 0; i < handlers.length; i++) {
      var h = handlers[i];
      try { h.fn.apply(null, args); } catch (e) { console.error('[EventBus] 事件处理报错:', event, e); }
      if (h.once) {
        _events[event] = _events[event].filter(function (x) { return x !== h; });
      }
    }
  }

  /**
   * 清除某事件的全部监听
   * @param {string} event
   */
  function clear(event) {
    delete _events[event];
  }

  /**
   * 清除全部事件监听
   */
  function clearAll() {
    _events = {};
  }

  /**
   * 列出当前活跃的事件名
   * @returns {string[]}
   */
  function list() {
    return Object.keys(_events).filter(function (k) { return _events[k].length > 0; });
  }

  // ========== 暴露 API ==========
  window.BandoriEvents = {
    on: on,
    once: once,
    off: off,
    emit: emit,
    clear: clear,
    clearAll: clearAll,
    list: list
  };

  // ============================================================
  // 事件名常量（供所有模块引用，避免魔法字符串）
  // ============================================================

  window.EVENT = {
    // Live2D
    LIVED2_MODEL_LOADED:     'live2d:model-loaded',
    LIVED2_MODEL_DESTROYED:  'live2d:model-destroyed',
    LIVED2_CLICK:            'live2d:click',
    LIVED2_EMOTION_APPLIED:  'live2d:emotion-applied',
    LIVED2_NEUTRAL_RESTORE:  'live2d:neutral-restore',

    // 聊天
    CHAT_MESSAGE_SENT:     'chat:message-sent',
    CHAT_MESSAGE_RECEIVED: 'chat:message-received',
    CHAT_TYPING_START:     'chat:typing-start',
    CHAT_TYPING_END:       'chat:typing-end',

    // TTS
    TTS_SPEAK:       'tts:speak',
    TTS_START:       'tts:start',
    TTS_END:         'tts:end',
    TTS_ERROR:       'tts:error',

    // 音频可视化
    AUDIO_FFT:       'audio:fft',
    AUDIO_VIS_TOGGLE:'audio:vis-toggle',

    // 角色
    CHAR_SWITCHED:   'char:switched',
    CHAR_OUTFIT_CHANGE: 'char:outfit-change',
    CHAR_CONFIG_SAVED:  'char:config-saved',

    // 媒体
    MEDIA_CHANGED:   'media:changed',
    MEDIA_STATE:     'media:state',
    MEDIA_PROGRESS:  'media:progress',
    LYRIC_INDEX_CHANGED: 'lyric:index-changed',

    // 背景
    BG_MODE_CHANGED: 'bg:mode-changed',
    BG_COLOR_CHANGED:'bg:color-changed',
    BG_VIDEO_CHANGED:'bg:video-changed',

    // UI
    SETTINGS_OPEN:   'ui:settings-open',
    SETTINGS_CLOSE:  'ui:settings-close',
    SETTINGS_SAVED:  'ui:settings-saved',
    PHONE_TOGGLE:    'ui:phone-toggle',
    IPAD_TOGGLE:     'ui:ipad-toggle',
    MUSIC_WIDGET_TOGGLE: 'ui:music-widget-toggle',
    INFO_WIDGET_TOGGLE:  'ui:info-widget-toggle',
    PHYSICS_PANEL_TOGGLE:'ui:physics-panel-toggle',
    RADIAL_OPEN:     'ui:radial-open',
    RADIAL_CLOSE:    'ui:radial-close',

    // 窗口
    WINDOW_MIN:      'window:minimize',
    WINDOW_MAX:      'window:maximize',
    WINDOW_CLOSE:    'window:close',
    WINDOW_TOP:      'window:always-on-top',
    WINDOW_IGNORE_MOUSE: 'window:ignore-mouse',

    // 沉浸模式
    IMMERSIVE_TOGGLE:'immersive:toggle',

    // 托盘
    TRAY_TOGGLE_BTN:    'tray:toggle-btn',
    TRAY_TOGGLE_CHAR:   'tray:toggle-char',
    TRAY_TOGGLE_WIDGETS:'tray:toggle-widgets',

    // 系统
    DISPLAY_FPS_CHANGED:'display:fps-changed',
    GPU_CHANGED:        'display:gpu-changed',

    // 情绪雷达
    RADAR_EMOTION:   'radar:emotion',
    RADAR_CONNECT:   'radar:connect',
    RADAR_DISCONNECT:'radar:disconnect',
  };

  console.log('[Renderer] events.js 已就绪');
})();
