/**
 * physics-panel.js — 物理挂件控制面板
 * IIFE 模式
 */
(function () {
  'use strict';

  var BandoriIPC = window.BandoriIPC;
  if (!BandoriIPC) {
    console.warn('[PhysicsPanel] BandoriIPC 不可用，物理面板功能将被禁用');
    return;
  }

  var activePhysicsItems = [];

  // SHAPE_ICONS：三种形状（圆形/方形/八边形）的 SVG 图标映射
  const SHAPE_ICONS = {
    'circle': '<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>圆形',
    'rectangle': '<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/></svg>方形',
    'octagon': '<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5" fill="none" stroke="currentColor" stroke-width="2"/></svg>八边形'
  };

  // 切换物理道具面板显示/隐藏
  function togglePhysicsPanel() {
    const panel = document.getElementById('physics-panel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      loadPhysicsGallery();
    } else {
      panel.style.display = 'none';
    }
  }

  // 加载物理道具缩略图画廊（从主进程获取图片列表）
  async function loadPhysicsGallery() {
    const images = await BandoriIPC.invoke('get-physics-images');
    const gallery = document.getElementById('physics-gallery');
    gallery.innerHTML = '';

    images.forEach(img => {
      const imgEl = document.createElement('img');
      imgEl.src = 'file:///' + encodeURI(img.path.replace(/\\/g, '/'));
      imgEl.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: 0.2s;';
      imgEl.title = '点击掉落';
      imgEl.onmouseover = () => imgEl.style.borderColor = '#ff6b81';
      imgEl.onmouseout = () => imgEl.style.borderColor = 'transparent';

      imgEl.onclick = () => spawnPhysicsItem(img.name, imgEl.src);
      gallery.appendChild(imgEl);
    });
  }

  // 生成物理道具：在屏幕顶部中心创建并通知主进程
  async function spawnPhysicsItem(name, src) {
    const maxItems = parseInt(document.getElementById('slider-max').value);

    if (activePhysicsItems.length >= maxItems) {
      console.log("已达到最大道具数量限制");
      return;
    }

    const bounce = parseFloat(document.getElementById('slider-bounce').value);
    const itemId = 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const startSize = 80;

    const startX = window.screen.width / 2;
    const startY = -50;

    await BandoriIPC.invoke('spawn-physics-item', {
      id: itemId, imgUrl: src, startX, startY, size: startSize, bounce
    });

    activePhysicsItems.push({ id: itemId, name: name, size: startSize, shape: 'octagon' });
    renderActivePhysicsList();
  }

  // 渲染活跃道具列表：每行显示名称、形状切换按钮、大小滑块、删除按钮
  function renderActivePhysicsList() {
    const list = document.getElementById('active-physics-list');
    list.innerHTML = '';
    activePhysicsItems.forEach(item => {
      const shapeHtml = SHAPE_ICONS[item.shape || 'octagon'];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.05); padding: 5px 10px; border-radius: 8px;';
      row.innerHTML =
        '<span style="font-size: 12px; font-weight: bold; width: 45px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + item.name + '">' + item.name + '</span>' +
        '<button onclick="changePhysicsShape(\'' + item.id + '\')" style="display: flex; align-items: center; justify-content: center; font-size: 11px; background: rgba(255,107,129,0.15); color: #ff6b81; border: 1px solid rgba(255,182,193,0.5); padding: 2px 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; min-width: 65px;" onmouseover="this.style.background=\'rgba(255,107,129,0.3)\'" onmouseout="this.style.background=\'rgba(255,107,129,0.15)\'" title="点击切换形状">' +
        shapeHtml +
        '</button>' +
        '<input type="range" min="30" max="300" value="' + item.size + '" style="width: 55px;" onchange="resizePhysicsItem(\'' + item.id + '\', this.value)" title="调整大小">' +
        '<button onclick="removePhysicsItem(\'' + item.id + '\')" style="background: transparent; border: none; color: #ff4757; cursor: pointer; font-weight: bold;">✕</button>';
      list.appendChild(row);
    });
  }

  function resizePhysicsItem(id, newSize) {
    // 调整道具大小并通知主进程
    const sizeNum = parseInt(newSize);
    const item = activePhysicsItems.find(i => i.id === id);
    if (item) item.size = sizeNum;
    BandoriIPC.send('resize-physics-item', id, sizeNum);
  }

  function removePhysicsItem(id) {
    // 移除单个道具并刷新列表
    BandoriIPC.send('remove-physics-item', id);
    activePhysicsItems = activePhysicsItems.filter(i => i.id !== id);
    renderActivePhysicsList();
  }

  function clearAllPhysicsItems() {
    // 清除全部物理道具
    BandoriIPC.send('clear-all-physics');
    activePhysicsItems = [];
    renderActivePhysicsList();
  }

  // 同步滑块参数：更新显示值、持久化存储、通知主进程
  function syncParams() {
    const gravity = parseFloat(document.getElementById('slider-gravity').value);
    const bounce = parseFloat(document.getElementById('slider-bounce').value);
    const max = parseInt(document.getElementById('slider-max').value);
    const fps = parseInt(document.getElementById('slider-fps').value);
    const throwPower = parseFloat(document.getElementById('slider-throw').value);
    const frictionAir = parseFloat(document.getElementById('slider-frictionAir').value);

    document.getElementById('val-gravity').innerText = gravity;
    document.getElementById('val-bounce').innerText = bounce;
    document.getElementById('val-max').innerText = max;
    document.getElementById('val-fps').innerText = fps;
    document.getElementById('val-throw').innerText = throwPower;
    document.getElementById('val-frictionAir').innerText = frictionAir;

    localStorage.setItem('physics_gravity', gravity);
    localStorage.setItem('physics_bounce', bounce);
    localStorage.setItem('physics_max', max);
    localStorage.setItem('physics_fps', fps);
    localStorage.setItem('physics_throw', throwPower);
    localStorage.setItem('physics_frictionAir', frictionAir);

    BandoriIPC.send('update-physics-params', { gravity, fps, throwPower, frictionAir });
  }

  function changePhysicsShape(id) {
    // 切换道具碰撞形状（圆形↔方形↔八边形循环）
    BandoriIPC.send('physics-change-shape', id);
  }

  var lastSyncData = { relX: 0, relY: 0, width: 0, height: 0 };
  // 同步 Live2D 模型作为 UI 碰撞体到主进程（仅在数据变化时发送）
  function syncUIPhysics() {
    const pet = window.live2dPet;
    if (!pet || !pet.visible || pet.destroyed || !pet.internalModel) return;
    pet.updateTransform();
    const internalBounds = pet.getBounds();
    if (internalBounds.width <= 1 || internalBounds.height <= 1) return;
    const config = {
      widthScale: 0.38,
      heightScale: 1,
      yOffsetRatio: 0.2
    };
    const relX = Math.round(internalBounds.x + internalBounds.width / 2);
    const relY = Math.round(internalBounds.y + internalBounds.height / 2 + (internalBounds.height * config.yOffsetRatio));
    const width = Math.round(internalBounds.width * config.widthScale);
    const height = Math.round(internalBounds.height * config.heightScale);
    if (relX !== lastSyncData.relX || relY !== lastSyncData.relY ||
      width !== lastSyncData.width || height !== lastSyncData.height) {
      BandoriIPC.send('update-ui-bodies', [{ id: 'char_canvas', relX, relY, width, height }]);
      lastSyncData.relX = relX;
      lastSyncData.relY = relY;
      lastSyncData.width = width;
      lastSyncData.height = height;
    }
  }

  // 通过 requestAnimationFrame 持续循环同步 UI 碰撞体
  function loopSync() {
    syncUIPhysics();
    requestAnimationFrame(loopSync);
  }
  loopSync();

  function onDomReady() {
    const dropzone = document.getElementById('physics-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.backgroundColor = 'transparent'; });
      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.style.backgroundColor = 'transparent';

        const files = e.dataTransfer.files;
        for (let file of files) {
          if (/\.(png|jpe?g|gif|webp)$/i.test(file.name)) {
            await BandoriIPC.invoke('save-physics-image', file.path, file.name);
          }
        }
        loadPhysicsGallery();
      });
    }

    const params = ['gravity', 'bounce', 'max', 'fps', 'throw', 'frictionAir'];
    params.forEach(param => {
      const savedValue = localStorage.getItem('physics_' + param);
      const slider = document.getElementById('slider-' + param);
      if (slider) {
        if (savedValue !== null) {
          slider.value = savedValue;
        }
        slider.addEventListener('input', syncParams);
      }
    });
    syncParams();

    const panel = document.getElementById('physics-panel');
    const header = document.getElementById('physics-panel-header');
    if (panel && header && typeof window.initDraggable === 'function') {
      panel.style.right = 'auto';
      panel.style.left = (window.innerWidth - 380) + 'px';
      window.initDraggable(header, panel, 'physics_panel');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }

  BandoriIPC.on('toggle-immersive', function (isImmersive) {
    const physicsPanel = document.getElementById('physics-panel');
    const physicsBtn = document.getElementById('btn-physics-toggle');
    const floatingControls = document.getElementById('floating-controls');

    if (isImmersive) {
      if (physicsPanel) physicsPanel.style.display = 'none';
      if (physicsBtn) physicsBtn.style.display = 'none';
      if (floatingControls) floatingControls.style.display = 'none';
    } else {
      if (physicsBtn) physicsBtn.style.display = '';
      if (floatingControls) floatingControls.style.display = 'flex';
    }
  });

  BandoriIPC.on('physics-shape-updated', function (id, newShape) {
    const item = activePhysicsItems.find(i => i.id === id);
    if (item) {
      item.shape = newShape;
      renderActivePhysicsList();
    }
  });

  window.togglePhysicsPanel = togglePhysicsPanel;
  window.loadPhysicsGallery = loadPhysicsGallery;
  window.spawnPhysicsItem = spawnPhysicsItem;
  window.renderActivePhysicsList = renderActivePhysicsList;
  window.resizePhysicsItem = resizePhysicsItem;
  window.removePhysicsItem = removePhysicsItem;
  window.clearAllPhysicsItems = clearAllPhysicsItems;
  window.changePhysicsShape = changePhysicsShape;
  window.syncParams = syncParams;

})();
