// 角色人格模块
// 维护角色中文文件夹名→charId 映射表，通过 fs 读取 characters/{角色名}/soul.md + A_{角色名}.md，支持双模式：
// concise（精简）：灵魂3节各6行 + 表达风格 ~1000字 + 行为规则 ~600字 + 关键台词 ≤10条
// full（完整）：原文拼接，不做截断
(function () {
  'use strict';

  var path = window.electronAPI.path;
  var fs = window.electronAPI.fs;
  var ROOT_DIR = '';
  var rootDirReady = window.electronAPI.app.getAppPath().then(function(appPath) {
    ROOT_DIR = appPath || '';
  }).catch(function(err) {
    console.error('[character-persona] getAppPath 失败:', err);
  });

  var FOLDER_TO_CHARID = {
    '奥泽美咲': 'misaki',
    '八潮瑠唯': 'rui',
    '白金燐子': 'rinko',
    '白鹭千圣': 'chisato',
    '北泽育美': 'hagumi',
    '冰川日菜': 'hina',
    '冰川纱夜': 'sayo',
    '仓田真白': 'mashiro',
    '朝日六花': 'lock',
    '椎名立希': 'taki',
    '凑友希那': 'yukina',
    '大和麻弥': 'maya',
    '二叶筑紫': 'tsukushi',
    '高松灯': 'tomorin',
    '广町七深': 'nanami',
    '和奏瑞依': 'pareo',
    '户山明日香': null,
    '户山香澄': 'kasumi',
    '花园多惠': 'tae',
    '今井莉莎': 'lisa',
    '濑田薰': 'kaoru',
    '美竹兰': 'ran',
    '牛込里美': 'rimi',
    '千早爱音': 'anon',
    '青叶摩卡': 'moca',
    '鳰原令王那': 'rei',
    '若宫伊芙': 'eve',
    '山吹沙绫': 'saaya',
    '上原绯玛丽': 'himari',
    '市谷有咲': 'arisa',
    '松原花音': 'kanon',
    '桐谷透子': 'touko',
    '丸山彩': 'aya',
    '弦卷心': 'kokoro',
    '要乐奈': 'rana',
    '宇田川巴': 'tomoe',
    '宇田川亚子': 'ako',
    '羽泽鸫': 'tsugumi',
    '长崎素世': 'soyo',
    '珠手知由': 'chu2',
    '佐藤益木': 'masuki'
  };

  var CHARID_TO_FOLDER = {};
  (function () {
    for (var k in FOLDER_TO_CHARID) {
      if (FOLDER_TO_CHARID.hasOwnProperty(k) && FOLDER_TO_CHARID[k]) {
        CHARID_TO_FOLDER[FOLDER_TO_CHARID[k]] = k;
      }
    }
  })();

  var fileCache = {};

  function readFiles(charId) {
    if (fileCache[charId]) return fileCache[charId];

    var folderName = CHARID_TO_FOLDER[charId];
    if (!folderName) return null;

    // 如果 ROOT_DIR 还没设置，返回 null
    if (!ROOT_DIR) {
      console.warn('[character-persona] ROOT_DIR 尚未初始化');
      return null;
    }

    var charDir = path.join(ROOT_DIR, 'characters', folderName);
    var result = null;

    try {
      var soulPath = path.join(charDir, 'soul.md');
      var aFilePath = path.join(charDir, 'A_' + folderName + '.md');

      result = {
        soul: fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf-8') : '',
        aFile: fs.existsSync(aFilePath) ? fs.readFileSync(aFilePath, 'utf-8') : ''
      };

      if (result.soul || result.aFile) {
        fileCache[charId] = result;
      }
    } catch (e) {
      console.warn('[character-persona] 读取失败:', charId, e.message);
    }

    return result;
  }

  function extractSection(text, headerName) {
    if (!text) return '';
    var escaped = headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('##\\s+' + escaped + '[\\s\\S]*?(?=\\n##\\s|\\n---|$)');
    var m = text.match(regex);
    if (!m) return '';
    return m[0]
      .replace(/^##\s+.+/m, '')
      .replace(/\|[^|]+\|/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function extractByPattern(text, pattern) {
    if (!text) return '';
    var m = text.match(pattern);
    if (!m) return '';
    return m[0]
      .replace(/^#{1,4}\s+.+/gm, '')
      .replace(/\|[^|]+\|/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  var dialogueHeaders = ['关键台词精选', '关键台词索引', '典型对白摘录', '附录：关键台词'];

  function buildCharacterPersona(charId, mode) {
    var data = readFiles(charId);
    if (!data) return null;
    if (!data.soul && !data.aFile) return null;

    var isFull = mode === 'full';
    var parts = [];
    var soulTxt = data.soul || '';
    var aTxt = data.aFile || '';

    if (isFull) {
      if (soulTxt) {
        var soulClean = soulTxt
          .replace(/^# .+/m, '')
          .replace(/\|/g, '')
          .replace(/\n---+/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        parts.push('【灵魂档案】\n' + soulClean);
      }
    } else {
      var soulDrive = extractSection(soulTxt, '核心驱动力');
      var soulValues = extractSection(soulTxt, '价值观与信念');
      var soulEmotion = extractSection(soulTxt, '情感核心');

      if (soulDrive) {
        var driveLines = soulDrive.split('\n').filter(function (l) { return l.trim(); });
        if (driveLines.length > 6) driveLines = driveLines.slice(0, 6);
        parts.push('【灵魂】\n' + driveLines.join('\n'));
      }
      if (soulValues) {
        var valLines = soulValues.split('\n').filter(function (l) { return l.trim(); });
        if (valLines.length > 6) valLines = valLines.slice(0, 6);
        parts.push('【价值观】\n' + valLines.join('\n'));
      }
      if (soulEmotion) {
        var emoLines = soulEmotion.split('\n').filter(function (l) { return l.trim(); });
        if (emoLines.length > 6) emoLines = emoLines.slice(0, 6);
        parts.push('【情感核心】\n' + emoLines.join('\n'));
      }
    }

    var layer2 = extractByPattern(aTxt, /### Layer 2[：:]\s*表达风格[\s\S]*?(?=\n### Layer 3|$)/);
    if (layer2) {
      if (isFull) {
        parts.push('【表达风格（完整）】\n' + layer2);
      } else {
        var styleLines = [];
        var lines = layer2.split('\n');
        var capture = false;
        for (var i = 0; i < lines.length; i++) {
          var ln = lines[i].trim();
          if (/语言特征|口语特征|基础语言|常用句式|口头禅|语气和语调|言语习惯/.test(ln) ||
              /称呼方式|标志性/.test(ln)) {
            capture = true;
          } else if (/####\s/.test(ln) && !/典型对白|关键台词|附录/.test(ln)) {
            capture = true;
          } else if (/---/.test(ln)) {
            break;
          }
          if (capture && ln) styleLines.push(ln);
        }
        if (styleLines.length < 3 && layer2.length > 0) {
          parts.push('【说话方式】\n' + layer2.substring(0, 800));
          if (layer2.length > 800) parts[parts.length - 1] += '\n……';
        } else if (styleLines.length >= 3) {
          var styleText = styleLines.join('\n');
          if (styleText.length > 1000) styleText = styleText.substring(0, 1000) + '\n……';
          parts.push('【说话方式】\n' + styleText);
        }
      }
    }

    var layer4 = extractByPattern(aTxt, /### Layer 4[：:]\s*行为规则[\s\S]*?(?=\n###\s|##\s|$)/);
    if (layer4) {
      if (isFull) {
        parts.push('【行为规则（完整）】\n' + layer4);
      } else {
        var ifIdx = layer4.indexOf('如果');
        var rulesText = '';
        if (ifIdx > -1) {
          rulesText = layer4.substring(ifIdx);
          var nextH = rulesText.indexOf('\n## ');
          if (nextH > -1) rulesText = rulesText.substring(0, nextH);
          if (rulesText.length > 600) rulesText = rulesText.substring(0, 600) + '\n……';
        } else {
          rulesText = layer4.substring(0, 400);
        }
        if (rulesText) {
          parts.push('【行为规则】\n' + rulesText);
        }
      }
    }

    var diaText = '';
    for (var d = 0; d < dialogueHeaders.length; d++) {
      var sec = extractSection(aTxt, dialogueHeaders[d]);
      if (sec) { diaText = sec; break; }
    }
    if (!diaText) {
      var subDia = extractByPattern(aTxt, /####\s+关键台词|####\s+典型对白|####\s+附录/);
      if (subDia) diaText = subDia;
    }
    if (diaText) {
      if (isFull) {
        parts.push('【关键台词参考（完整）】\n' + diaText);
      } else {
        var diaLines = diaText.split('\n').filter(function (l) { return l.trim(); });
        if (diaLines.length > 10) diaLines = diaLines.slice(0, 10);
        var dJoined = diaLines.join('\n');
        if (dJoined.length > 600) dJoined = dJoined.substring(0, 600) + '\n……';
        parts.push('【关键台词参考】\n' + dJoined);
      }
    }

    return parts.join('\n\n---\n\n');
  }

  function getCharacterPersonaSummary(charId, mode) {
    var data = readFiles(charId);
    if (!data) return null;

    var soulTxt = data.soul || '';
    var aTxt = data.aFile || '';
    var isFull = mode === 'full';

    if (isFull) {
      var fullSoul = soulTxt
        .replace(/^# .+/m, '')
        .replace(/\|/g, '')
        .replace(/\n---+/g, '\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      var fullLayer2 = extractByPattern(aTxt, /### Layer 2[：:]\s*表达风格[\s\S]*?(?=\n### Layer 3|$)/);
      var fullLayer4 = extractByPattern(aTxt, /### Layer 4[：:]\s*行为规则[\s\S]*?(?=\n###\s|##\s|$)/);
      var fullDialogues = '';
      for (var dd = 0; dd < dialogueHeaders.length; dd++) {
        var ss = extractSection(aTxt, dialogueHeaders[dd]);
        if (ss) { fullDialogues = ss; break; }
      }
      var combined = '';
      if (fullSoul) combined += '【灵魂档案】\n' + fullSoul;
      if (fullLayer2) combined += '\n\n【表达风格】\n' + fullLayer2;
      if (fullLayer4) combined += '\n\n【行为规则】\n' + fullLayer4;
      if (fullDialogues) combined += '\n\n【关键台词】\n' + fullDialogues;
      return { full: combined };
    }

    var drive = extractSection(soulTxt, '核心驱动力');
    var driveLines = drive ? drive.split('\n').filter(function (l) { return l.trim(); }) : [];
    var coreSummary = driveLines.slice(0, 3).join('\n');

    var styleSummary = '';
    var layer2 = extractByPattern(aTxt, /### Layer 2[：:]\s*表达风格[\s\S]*?(?=\n### Layer 3|$)/);
    if (layer2) {
      var l2Clean = layer2.replace(/\|.*?\|/g, '').trim();
      styleSummary = l2Clean.substring(0, 300);
      if (l2Clean.length > 300) styleSummary += '\n……';
    }

    var rulesSummary = '';
    var ifThen = aTxt.match(/"如果-那么"行为规则|"如果……就……"行为规则|### "如果-那么"行为规则/);
    if (ifThen) {
      var rText = aTxt.substring(ifThen.index);
      var nH = rText.indexOf('\n## ');
      if (nH > -1) rText = rText.substring(0, nH);
      rulesSummary = rText
        .replace(/^#{1,4}\s+.+/gm, '')
        .replace(/\|/g, '').trim()
        .substring(0, 400);
    }

    if (!coreSummary && !styleSummary && !rulesSummary) return null;

    return {
      core: coreSummary,
      style: styleSummary,
      rules: rulesSummary
    };
  }

  window.buildCharacterPersona = buildCharacterPersona;
  window.getCharacterPersonaSummary = getCharacterPersonaSummary;
  window.__charFolderMap = FOLDER_TO_CHARID;

  console.log('[Renderer] character-persona.js 已就绪, 映射数:', Object.keys(CHARID_TO_FOLDER).length);
})();
