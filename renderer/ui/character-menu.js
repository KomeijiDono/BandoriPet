/**
 * character-menu.js — 角色切换 UI
 * 
 * 外部依赖（通过 window 或 typeof 守卫访问）：
 *   - charactersConfig        (characters-config.js)
 *   - BandoriIPC              (ipc.js)
 *   - loadCustomModel         (index.html 内联脚本，全局函数)
 *   - updatePhoneBackground   (index.html 内联脚本，全局函数)
 *   - addChatMessage          (chat-api.js, window.addChatMessage)
 *   - applyBgMode             (bg-manager.js, window.applyBgMode)
 *   - bindLive2DInteractionFeedback (index.html 内联脚本，全局函数)
 *   - window.live2dPet        (Live2D 模型实例)
 *   - window.app              (PIXI Application)
 *   - globalVolume            (index.html 内联脚本 let 变量)
 *   - chatMemory              (chat-api.js, window.chatMemory)
 *
 * 暴露到 window：
 *   - toggleCharMenu, renderGallery, openDetailPanel, closeDetailPanel, saveMenuSettings
 *   - toggleModelDrag, toggleMouseFollow
 *   - draggingModel, modelDragMoved (window-control.js 鼠标穿透检查)
 */

(function () {
  'use strict';

  // ===== 内部状态 =====
  var selectedCharId = null;
  var dragData = null;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var modelDragStartX = 0;
  var modelDragStartY = 0;

  // 拖拽移动阈值（像素）
  var DRAG_MOVE_THRESHOLD = 6;

  // 确保 charactersConfig 存在的公共函数
  function ensureCharactersConfig() {
    if (typeof charactersConfig === 'undefined') {
      if (window.CharactersConfig) {
        window.charactersConfig = window.CharactersConfig;
      } else {
        console.error('[character-menu] charactersConfig 未定义');
        return false;
      }
    }
    return true;
  }

  // 切换角色菜单显示/隐藏，带弹入弹出动画
  function toggleCharMenu() {
    var menu = document.getElementById('char-menu');
    if (menu.style.display === 'flex' || menu.style.display === '') {
      menu.style.animation = 'fadeOutCenter 0.2s forwards';
      setTimeout(function () {
        menu.style.display = 'none';
        menu.style.animation = '';
        closeDetailPanel();
      }, 200);
    } else {
      renderGallery();
      menu.style.display = 'flex';
      menu.style.animation = 'popInCenter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    }
  }

  // 渲染角色画廊列表，遍历 charactersConfig 创建角色卡片
  function renderGallery() {
    var list = document.getElementById('char-gallery-list');
    list.innerHTML = '';

    if (!ensureCharactersConfig()) return;

    var id, char, frame;
    for (id in charactersConfig) {
      if (!charactersConfig.hasOwnProperty(id)) continue;
      char = charactersConfig[id];
      frame = document.createElement('div');
      frame.className = 'char-frame';
      frame.innerHTML =
        '<div class="char-frame-inner">' +
          '<img class="char-bg" src="model/' + id + '/character.jpg" onerror="this.src=\'model/' + id + '/character.png\'">' +
          '<img class="band-logo" src="assets/band_' + id + '.png" onerror="this.style.display=\'none\'">' +
          '<img class="member-icon" src="assets/icon_' + id + '.png" onerror="this.style.display=\'none\'">' +
          '<div class="char-info-overlay">' +
            '<div style="font-size: 14px; opacity: 0.8; letter-spacing: 1px;">Bandori Member</div>' +
            '<div style="font-size: 26px; font-weight: bold; letter-spacing: 2px;">' + char.name + '</div>' +
          '</div>' +
        '</div>';
      frame.onclick = (function (cid) {
        return function () { openDetailPanel(cid); };
      })(id);
      list.appendChild(frame);
    }
  }

  // 画廊支持鼠标滚轮横向滚动
  document.addEventListener('DOMContentLoaded', function () {
    var gallery = document.getElementById('char-gallery-list');
    if (gallery) {
      gallery.addEventListener('wheel', function (e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          gallery.scrollLeft += e.deltaY * 1.5;
        }
      }, { passive: false });
    }
  });

  // 打开角色详情面板，加载服装列表和各项设置参数
  function openDetailPanel(id) {
    if (!ensureCharactersConfig()) return;

    selectedCharId = id;
    var panel = document.getElementById('char-detail-panel');
    document.getElementById('detail-char-name').innerText = charactersConfig[id].name;

    var outfitGrid = document.getElementById('outfit-grid');
    outfitGrid.innerHTML = '';
    var outfits = charactersConfig[id].outfits;
    var currentOutfit = localStorage.getItem('outfit_' + id);
    if (!currentOutfit) currentOutfit = Object.keys(outfits)[0];

    var oid, item;
    for (oid in outfits) {
      if (!outfits.hasOwnProperty(oid)) continue;
      item = document.createElement('div');
      item.className = 'outfit-item' + (currentOutfit === oid ? ' active' : '');
      item.innerText = outfits[oid];
      item.onclick = (function (outfitId, charId) {
        return function () {
          localStorage.setItem('outfit_' + charId, outfitId);
          renderGallery();
          openDetailPanel(charId);
        };
      })(oid, id);
      outfitGrid.appendChild(item);
    }

    document.getElementById('menu-set-scale').value = localStorage.getItem('anon_scale') || 0.2;
    document.getElementById('menu-set-x').value = localStorage.getItem('anon_x') || 0;
    document.getElementById('menu-set-y').value = localStorage.getItem('anon_y') || 0;
    document.getElementById('menu-set-delay').value = localStorage.getItem('motion_delay') || 4500;
    document.getElementById('set-prompt').value = localStorage.getItem('prompt_' + id) || charactersConfig[id].prompt;
    document.getElementById('menu-set-drag').checked = (localStorage.getItem('model_drag_enabled') === 'true');
    document.getElementById('menu-set-look').checked = (localStorage.getItem('mouse_follow_enabled') !== 'false');

    var savedLang = localStorage.getItem('voice_lang_' + id) || 'ja';
    var langSwitch = document.getElementById('voice-lang-switch');
    if (langSwitch) {
      langSwitch.value = savedLang;
    }

    var savedVol = localStorage.getItem('anon_volume') || 1.0;
    document.getElementById('menu-set-volume').value = savedVol;
    document.getElementById('volume-val').innerText = Math.round(savedVol * 100) + '%';

    if (typeof globalVolume !== 'undefined') {
      globalVolume = parseFloat(savedVol);
    }

    updatePersonaDisplay(id);

    panel.classList.add('active');
  }

  function updatePersonaDisplay(charId) {
    var textarea = document.getElementById('persona-display');
    var modeBtn = document.getElementById('persona-mode-btn');
    if (!textarea) return;

    var mode = localStorage.getItem('persona_mode') || 'concise';
    if (modeBtn) modeBtn.innerText = mode === 'full' ? '完整' : '精简';

    if (typeof window.getCharacterPersonaSummary !== 'function') {
      textarea.value = '人格档案未加载';
      return;
    }

    var summary = window.getCharacterPersonaSummary(charId, mode);
    if (!summary) {
      textarea.value = '暂无角色人格档案';
      return;
    }

    if (mode === 'full' && summary.full) {
      textarea.value = summary.full;
    } else {
      var lines = [];
      if (summary.core) lines.push('【核心驱动力】\n' + summary.core);
      if (summary.style) lines.push('【表达风格】\n' + summary.style);
      if (summary.rules) lines.push('【行为规则】\n' + summary.rules);
      textarea.value = lines.join('\n\n');
    }
    textarea.scrollTop = 0;
  }

  window.togglePersonaDisplay = function () {
    var display = document.getElementById('persona-display');
    var icon = document.getElementById('persona-expand-icon');
    if (!display) return;
    var isHidden = display.style.display === 'none' || display.style.display === '';
    display.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.innerText = isHidden ? '[收起]' : '[展开]';
  };

  window.togglePersonaMode = function () {
    var mode = localStorage.getItem('persona_mode') || 'concise';
    mode = mode === 'full' ? 'concise' : 'full';
    localStorage.setItem('persona_mode', mode);
    var charId = localStorage.getItem('current_char') || 'anon';
    updatePersonaDisplay(charId);
  };

  // 关闭详情面板（移除 active 类）
  function closeDetailPanel() {
    document.getElementById('char-detail-panel').classList.remove('active');
  }

  // 保存角色菜单设置：模型参数、人设提示词、语音语言等持久化到 localStorage
  function saveMenuSettings() {
    if (!selectedCharId) return;
    if (!ensureCharactersConfig()) return;

    var scale = document.getElementById('menu-set-scale').value;
    var x = document.getElementById('menu-set-x').value;
    var y = document.getElementById('menu-set-y').value;
    var delay = document.getElementById('menu-set-delay').value;
    var promptStr = document.getElementById('set-prompt').value;
    var voiceLangSwitch = document.getElementById('voice-lang-switch');
    var voiceLang = voiceLangSwitch ? voiceLangSwitch.value : 'ja';
    var oldCharId = localStorage.getItem('current_char');

    localStorage.setItem('current_char', selectedCharId);
    localStorage.setItem('anon_scale', scale);
    localStorage.setItem('anon_x', x);
    localStorage.setItem('anon_y', y);
    localStorage.setItem('motion_delay', delay);
    localStorage.setItem('prompt_' + selectedCharId, promptStr);
    localStorage.setItem('voice_lang_' + selectedCharId, voiceLang);

    var savedOutfit = localStorage.getItem('outfit_' + selectedCharId);
    if (!savedOutfit) {
      savedOutfit = Object.keys(charactersConfig[selectedCharId].outfits)[0];
      localStorage.setItem('outfit_' + selectedCharId, savedOutfit);
    }

    if (typeof loadCustomModel === 'function') {
      loadCustomModel(selectedCharId, localStorage.getItem('outfit_' + selectedCharId));
    }

    if (typeof updatePhoneBackground === 'function') {
      updatePhoneBackground(selectedCharId);
    }

    if (oldCharId !== selectedCharId) {
      if (window.chatMemory) {
        window.chatMemory = [];
      }
      var chatHistory = document.getElementById('phone-chat-history');
      if (chatHistory) chatHistory.innerHTML = '';

      if (typeof addChatMessage === 'function') {
        addChatMessage(charactersConfig[selectedCharId].name, 'ai');
      }
      if (window.BandoriIPC) {
        window.BandoriIPC.send('switch-character', selectedCharId);
      }
    } else {
      if (typeof addChatMessage === 'function') {
        addChatMessage('\u5df2\u6210\u529f\u4fdd\u5b58\u3010' + charactersConfig[selectedCharId].name + '\u3011\u7684\u8bbe\u5b9a\u4e0e\u4f4d\u7f6e\u53c2\u6570\uff01', 'ai');
      }
    }

    closeDetailPanel();
  }

  // 切换模型拖拽模式：注册/注销 pointer 事件实现 Live2D 模型拖动
  function toggleModelDrag(enabled) {
    localStorage.setItem('model_drag_enabled', enabled);

    var model = window.live2dPet;
    if (!model) return;

    if (enabled) {
      model.interactive = true;
      model.buttonMode = true;
      model.on('pointerdown', onDragStart)
           .on('pointerup', onDragEnd)
           .on('pointerupoutside', onDragEnd)
           .on('pointermove', onDragMove);
    } else {
      model.interactive = false;
      model.buttonMode = false;
      model.off('pointerdown', onDragStart)
           .off('pointerup', onDragEnd)
           .off('pointerupoutside', onDragEnd)
           .off('pointermove', onDragMove);
      if (typeof bindLive2DInteractionFeedback === 'function') {
        bindLive2DInteractionFeedback();
      }
    }
  }

  // 切换鼠标视线跟随：控制 Live2D 模型头部追踪鼠标位置
  function toggleMouseFollow(enabled) {
    localStorage.setItem('mouse_follow_enabled', enabled);

    var model = window.live2dPet;
    if (!model) return;

    model.autoInteract = enabled;

    if (!enabled) {
      if (model.internalModel && model.internalModel.coreModel) {
        var paramIds = ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamEyeBallX', 'ParamEyeBallY'];
        var i;
        for (i = 0; i < paramIds.length; i++) {
          try {
            model.internalModel.coreModel.setParameterValueById(paramIds[i], 0);
          } catch (e) { console.warn('[character-menu] 重置模型参数失败:', paramIds[i], e.message); }
        }
      }
    }
  }

  // 拖拽开始：记录初始位置和偏移量（this 指向 Live2D PixiJS DisplayObject）
  function onDragStart(event) {
    dragData = event.data;
    AppState.set('draggingModel', true);
    var newPosition = dragData.getLocalPosition(this.parent);
    AppState.set('modelDragMoved', false);
    modelDragStartX = newPosition.x;
    modelDragStartY = newPosition.y;
    dragOffsetX = this.x - newPosition.x;
    dragOffsetY = this.y - newPosition.y;
  }

  // 拖拽结束：保存最终位置到 localStorage 并同步输入框
  function onDragEnd() {
    AppState.set('draggingModel', false);
    dragData = null;
    setTimeout(function () {
      AppState.set('modelDragMoved', false);
    }, 120);

    var newX = Math.round(this.x);
    var newY = Math.round(this.y);

    var xInput = document.getElementById('menu-set-x');
    var yInput = document.getElementById('menu-set-y');
    if (xInput && yInput) {
      xInput.value = newX;
      yInput.value = newY;
    }
    localStorage.setItem('anon_x', newX);
    localStorage.setItem('anon_y', newY);
  }

  // 拖拽中：通过 this.x/this.y 实时更新 PIXI DisplayObject 位置
  function onDragMove() {
    if (AppState.get('draggingModel')) {
      var newPosition = dragData.getLocalPosition(this.parent);
      if (Math.abs(newPosition.x - modelDragStartX) > DRAG_MOVE_THRESHOLD ||
          Math.abs(newPosition.y - modelDragStartY) > DRAG_MOVE_THRESHOLD) {
        AppState.set('modelDragMoved', true);
      }
      this.x = newPosition.x + dragOffsetX;
      this.y = newPosition.y + dragOffsetY;
    }
  }

  // ===== 暴露 API =====
  window.toggleCharMenu = toggleCharMenu;
  window.renderGallery = renderGallery;
  window.openDetailPanel = openDetailPanel;
  window.closeDetailPanel = closeDetailPanel;
  window.saveMenuSettings = saveMenuSettings;
  window.toggleModelDrag = toggleModelDrag;
  window.toggleMouseFollow = toggleMouseFollow;

  console.log('[Renderer] character-menu.js 已就绪');
})();
