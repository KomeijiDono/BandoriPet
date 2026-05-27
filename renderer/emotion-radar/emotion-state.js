/**
 * emotion-state.js — 情绪状态定义
 * 定义所有情绪维度与状态结构
 */
(function () {
  'use strict';

  // 所有情绪维度
  var EMOTION_DIMS = [
    'rage',
    'stressed',
    'sleepy',
    'lonely',
    'focus',
    'gaming',
    'vibing',
    'excited',
    'relaxed'
  ];

  // 创建初始状态向量
  function createInitialState() {
    var state = {};
    for (var i = 0; i < EMOTION_DIMS.length; i++) {
      state[EMOTION_DIMS[i]] = 0;
    }
    // relaxed 默认偏高（中性起始状态）
    state.relaxed = 30;
    return state;
  }

  // 情绪维度元数据（用于 UI 展示）
  var EMOTION_META = {
    rage:    { label: '红温',   icon: '??', color: '#ff4444' },
    stressed:{ label: '烦躁',   icon: '??', color: '#ff8844' },
    sleepy:  { label: '困倦',   icon: '??', color: '#88aaff' },
    lonely:  { label: '寂寞',   icon: '??', color: '#8888cc' },
    focus:   { label: '专注',   icon: '??', color: '#44cc44' },
    gaming:  { label: '游戏中', icon: '??', color: '#cc44cc' },
    vibing:  { label: '听歌中', icon: '??', color: '#44cccc' },
    excited: { label: '兴奋',   icon: '??', color: '#cccc44' },
    relaxed: { label: '放松',   icon: '??', color: '#88cc88' }
  };

  // 情绪优先级（值相同时按此顺序选主情绪）
  var EMOTION_PRIORITY = [
    'rage', 'stressed', 'sleepy', 'lonely',
    'gaming', 'excited', 'vibing', 'focus', 'relaxed'
  ];

  // 情绪色彩柔和版（用于 UI 填充）
  var EMOTION_COLORS_SOFT = {
    rage:    'rgba(255, 68, 68, 0.3)',
    stressed:'rgba(255, 136, 68, 0.3)',
    sleepy:  'rgba(136, 170, 255, 0.3)',
    lonely:  'rgba(136, 136, 204, 0.3)',
    focus:   'rgba(68, 204, 68, 0.3)',
    gaming:  'rgba(204, 68, 204, 0.3)',
    vibing:  'rgba(68, 204, 204, 0.3)',
    excited: 'rgba(204, 204, 68, 0.3)',
    relaxed: 'rgba(136, 204, 136, 0.3)'
  };

  window.EmotionState = {
    DIMS: EMOTION_DIMS,
    META: EMOTION_META,
    PRIORITY: EMOTION_PRIORITY,
    COLORS_SOFT: EMOTION_COLORS_SOFT,
    createInitialState: createInitialState
  };

  console.log('[EmotionState] 已加载');
})();
