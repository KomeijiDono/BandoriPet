/**
 * emotion.js — Live2D 表情/动作映射与管理
 * 提供：表情→动作映射表、标签别名、标签解析、资源匹配、表情应用
 */
(function () {
  'use strict';

  // 核心情绪映射：情绪标签 → 候选表情(motions)和动作(expressions)列表
  var LIVE2D_EMOTION_MAP = {
    normal:     { expressions: ['default','normal','idle01','idle'], motions: ['idle01','idle02','idle','nf01','f01'] },
    happy:      { expressions: ['smile01','smile02','smile03','happy','kandou','special01','special02','default','surprised'], motions: ['smile01','smile02','smile03','gattsu01','jaan01','kime01','happy01','happy02','smile','gattsu','kandou'] },
    angry:      { expressions: ['serious02','serious01','worry','angry','default'], motions: ['angry01','angry02','angry03','pui01','serious01','angry'] },
    sad:        { expressions: ['sad','worry','worry2','default'], motions: ['sad01','cry01','cry02','sad','cry'] },
    thinking:   { expressions: ['thinking01','worry','worry2','serious01','eeto01','default'], motions: ['thinking01','thinking02','thinking03','nf01','nf02','nf03','nnf01','eeto01','odoodo01','thinking','nf','nnf'] },
    serious:    { expressions: ['serious01','serious02','worry','default'], motions: ['serious01','kime01','serious'] },
    surprised:  { expressions: ['surprised','worry2','default'], motions: ['surprised01','surprised'] },
    shame:      { expressions: ['shame01','worry2','worry','awate01','panic','default'], motions: ['shame01','awate01','awate02','odoodo01','shame'] },
    bye:        { expressions: ['default'], motions: ['bye01','bye'] },
    sing:       { expressions: ['default'], motions: ['sing01','sing','smile01','kime01'] },
    touch:      { expressions: ['surprised','shame01','worry2','smile01','default'], motions: ['surprised01','shame01','smile01','kime01','nf01'] }
  };

  // 标签别名表：将各种原始标签统一归并到标准情绪类别
  var LIVE2D_TAG_ALIASES = {
    default: 'normal', idle: 'normal', normal: 'normal', f: 'normal',
    happy: 'happy', smile: 'happy', wink: 'happy', kandou: 'happy', kime: 'happy',
    angry: 'angry', pui: 'angry',
    sad: 'sad', cry: 'sad',
    thinking: 'thinking', nf: 'thinking', nnf: 'thinking', odoodo: 'thinking', eeto: 'thinking',
    serious: 'serious', surprised: 'surprised',
    shame: 'shame', scared: 'shame', worry: 'shame',
    bye: 'bye', sing: 'sing', touch: 'touch', tap: 'touch'
  };

  // 获取当前 Live2D 模型实例（优先从 window.live2dPet）
  function getLive2DModel() {
    return window.live2dPet || window.live2dModel || null;
  }

  // 将原始标签标准化：去角色前缀、去数字后缀、查别名表、关键字推断 → 标准情绪标签
  function normalizeEmotionTag(rawTag) {
    var charactersConfig = window.CharactersConfig;
    var tag = String(rawTag || '').toLowerCase().trim();
    tag = tag.replace(/\.exp(?:\.json)?$/i, '').replace(/\.mtn$/i, '');
    var tagPrefix = tag.split('_')[0];
    if (typeof charactersConfig !== 'undefined' && charactersConfig && charactersConfig[tagPrefix]) {
      tag = tag.slice(tagPrefix.length + 1);
    }
    tag = tag.replace(/\d+$/g, '');
    if (LIVE2D_TAG_ALIASES[tag]) return LIVE2D_TAG_ALIASES[tag];
    if (tag.includes('angry') || tag.includes('pui')) return 'angry';
    if (tag.includes('sad') || tag.includes('cry')) return 'sad';
    if (tag.includes('smile') || tag.includes('happy') || tag.includes('wink') || tag.includes('kime')) return 'happy';
    if (tag.includes('think') || tag.includes('worry') || tag.includes('odoodo') || tag === 'nf' || tag === 'nnf') return 'thinking';
    if (tag.includes('serious')) return 'serious';
    if (tag.includes('surpris')) return 'surprised';
    if (tag.includes('shame') || tag.includes('scared') || tag.includes('awate')) return 'shame';
    if (tag.includes('bye')) return 'bye';
    if (tag.includes('sing')) return 'sing';
    if (tag.includes('default') || tag.includes('normal') || tag.includes('idle')) return 'normal';
    return '';
  }

  // 从 AI 回复文本中提取 [tag] / 【tag】 标记，最多3个；无标记时用关键词推断
  function extractEmotionTags(replyText) {
    var tags = [];
    var seen = {};
    var tagRegex = /(?:\[|【)([a-zA-Z0-9_\.]+)(?:\]|】)/g;
    var match;
    while ((match = tagRegex.exec(String(replyText || ''))) !== null) {
      var normalized = normalizeEmotionTag(match[1]);
      if (normalized && LIVE2D_EMOTION_MAP[normalized] && !seen[normalized]) {
        tags.push(normalized);
        seen[normalized] = true;
      }
      if (tags.length >= 3) break;
    }
    if (tags.length > 0) return tags;

    var text = String(replyText || '').replace(tagRegex, '');
    if (/生气|愤怒|不允许|请认真|荒唐|angry/i.test(text)) return ['angry'];
    if (/难过|遗憾|抱歉|哭|失落|sad|sorry/i.test(text)) return ['sad'];
    if (/恭喜|太好了|很好|不错|开心|高兴|happy|great/i.test(text)) return ['happy'];
    if (/让我想想|需要确认|也就是说|从逻辑上|可能|perhaps|thinking/i.test(text)) return ['thinking'];
    if (/意外|惊讶|竟然|surprised/i.test(text)) return ['surprised'];
    return ['normal'];
  }

  // 展开候选名：纯名追加 charId_ 前缀变体，提高匹配命中率
  function expandExpressionCandidates(names, charId) {
    var candidates = [];
    names.forEach(function (name) {
      if (!name) return;
      if (name.indexOf('_') !== -1) candidates.push(name);
      else candidates.push(charId + '_' + name, name);
    });
    return candidates;
  }

  // 标准化资源名：去扩展名、去数字后缀、去角色前缀 → 用于模糊匹配
  function normalizeResourceName(name) {
    var charactersConfig = window.CharactersConfig;
    var value = String(name || '').toLowerCase()
      .replace(/\.(?:exp\.json|mtn)$/g, '')
      .replace(/\d+$/g, '');
    var prefix = value.split('_')[0];
    if (typeof charactersConfig !== 'undefined' && charactersConfig && charactersConfig[prefix]) {
      value = value.slice(prefix.length + 1);
    }
    return value;
  }

  // 从候选列表中选出实际可用的资源名：精确匹配优先，否则模糊匹配
  function pickAvailableName(candidates, availableNames) {
    if (!availableNames || availableNames.size === 0) return candidates[0] || '';
    var direct = candidates.find(function (name) { return availableNames.has(name); });
    if (direct) return direct;
    var available = Array.from(availableNames);
    for (var i = 0; i < candidates.length; i++) {
      var normalizedCandidate = normalizeResourceName(candidates[i]);
      var fuzzy = available.find(function (name) {
        var normalizedName = normalizeResourceName(name);
        return normalizedName === normalizedCandidate
          || normalizedName.indexOf(normalizedCandidate) !== -1
          || normalizedCandidate.indexOf(normalizedName) !== -1;
      });
      if (fuzzy) return fuzzy;
    }
    return '';
  }

  // 根据情绪标签应用表情+动作到模型（通用版，可传入外部 model/名称集）
  function applyLive2DEmotion(tag, charId, model, motionNames, expressionNames) {
    model = model || getLive2DModel();
    if (!model) return;
    charId = charId || localStorage.getItem('current_char') || 'anon';
    var normalized = normalizeEmotionTag(tag) || 'normal';
    var emotion = LIVE2D_EMOTION_MAP[normalized] || LIVE2D_EMOTION_MAP.normal;
    var expressionName = pickAvailableName(expandExpressionCandidates(emotion.expressions, charId), expressionNames || new Set());
    var motionName = pickAvailableName(emotion.motions, motionNames || new Set());
    if (expressionName) {
      try { model.expression(expressionName); } catch (error) { console.warn('[emotion] expression failed:', expressionName, error.message); }
    }
    if (motionName) {
      try { model.motion(motionName); } catch (error) { console.warn('[emotion] motion failed:', motionName, error.message); }
    }
  }

  // 直接按名称应用一对表情+动作（供点击反馈等场景使用）
  function applyLive2DResourcePair(expressionName, motionName, model) {
    model = model || getLive2DModel();
    if (!model) return;
    if (expressionName) {
      try { model.expression(expressionName); } catch (error) { console.warn('[click-action] expression failed:', expressionName, error.message); }
    }
    if (motionName) {
      try { model.motion(motionName); } catch (error) { console.warn('[click-action] motion failed:', motionName, error.message); }
    }
  }

  // ========== 暴露 API ==========
  window.Live2DEmotion = {
    MAP: LIVE2D_EMOTION_MAP,
    TAG_ALIASES: LIVE2D_TAG_ALIASES,
    normalizeEmotionTag: normalizeEmotionTag,
    extractEmotionTags: extractEmotionTags,
    expandExpressionCandidates: expandExpressionCandidates,
    normalizeResourceName: normalizeResourceName,
    pickAvailableName: pickAvailableName,
    applyLive2DEmotion: applyLive2DEmotion,
    applyLive2DResourcePair: applyLive2DResourcePair
  };

  console.log('[Renderer] emotion.js 已就绪');
})();
