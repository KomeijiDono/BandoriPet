// ============================================================================
// physics-engine.js — Matter.js 物理引擎模块
// 负责物理道具的生成、拖拽、碰撞检测、形状切换，共 13 个 IPC handler
// 物理道具各自为独立 BrowserWindow（透明无框），通过 IPC 同步位置/角度
// ============================================================================
const Matter = require('matter-js');
const { Engine, World, Bodies } = Matter;
const { getConfig } = require('./config-loader');

// initPhysics 依赖注入：接收 BrowserWindow、IPC、screen、fs、path 等主进程模块
function initPhysics({ BrowserWindow, ipcMain, screen, fs, path, __dirname, win, ROOT }) {
    // ---- 物理道具图片目录 ----
    const physicsItemsDir = path.join(ROOT, 'physics_items');
    if (!fs.existsSync(physicsItemsDir)) {
        fs.mkdirSync(physicsItemsDir, { recursive: true });
    }

    // ---- 从配置文件加载物理参数 ----
    const physicsConfig = getConfig('physics', {});

    // ---- 物理引擎和世界初始化 ----
    const engine = Engine.create();
    const world = engine.world;
    engine.gravity.y = physicsConfig.gravity || 1.5;  // Y 轴重力（向下）

    // ---- 状态变量 ----
    let physicalItems = [];        // 所有物理道具的引用数组
    let physicsTimer = null;       // 物理循环定时器
    let throwPowerMultiplier = physicsConfig.throwPower || 1.2; // 投掷力度倍率
    let globalFrictionAir = physicsConfig.airFriction || 0.01;  // 全局空气阻力

    // ---- 拖拽状态 ----
    let draggingItemId = null;       // 当前拖拽中的道具 ID
    let dragOffset = { x: 0, y: 0 }; // 鼠标与道具中心的偏移
    let dragVelocity = { x: 0, y: 0 }; // 拖拽速度（用于松手后投掷）

    // 启动物理循环（setInterval 方式，替代 Matter.Runner）
    function startPhysicsLoop(fps) {
        if (physicsTimer) clearInterval(physicsTimer);
        const intervalMs = 1000 / fps;
        const dragVelocityFactor = physicsConfig.dragVelocityFactor || 0.4;
        const bounds = physicsConfig.bounds || { yMin: -5000, yMax: 5000, xMin: -5000, xMax: 10000 };
        const speedThreshold = physicsConfig.speedThreshold || 0.1;
        const angularSpeedThreshold = physicsConfig.angularSpeedThreshold || 0.01;

        physicsTimer = setInterval(() => {
            Engine.update(engine, intervalMs);

            // ---- 拖拽中：实时跟随鼠标 ----
            if (draggingItemId) {
                const item = physicalItems.find(i => i.id === draggingItemId);
                if (item) {
                    const cursor = screen.getCursorScreenPoint();
                    const targetX = cursor.x + dragOffset.x;
                    const targetY = cursor.y + dragOffset.y;

                    dragVelocity = {
                        x: (targetX - item.body.position.x) * dragVelocityFactor,
                        y: (targetY - item.body.position.y) * dragVelocityFactor
                    };

                    Matter.Body.setPosition(item.body, { x: targetX, y: targetY });
                    Matter.Body.setVelocity(item.body, { x: 0, y: 0 });
                }
            }

            // ---- 同步道具窗口位置/角度，越界检测 ----
            physicalItems.forEach(item => {
                if (!item.window || item.window.isDestroyed()) return;
                const { x, y } = item.body.position;

                if (Number.isNaN(x) || Number.isNaN(y) || y > bounds.yMax || y < bounds.yMin || x > bounds.xMax || x < bounds.xMin) {
                    item.window.close();
                    return;
                }
                // 速度/角速度过低时跳过同步，节省性能
                const speed = Matter.Vector.magnitude(item.body.velocity);
                const angularSpeed = Math.abs(item.body.angularVelocity);
                if (!item.isDragging && speed < speedThreshold && angularSpeed < angularSpeedThreshold) {
                    return;
                }

                // 增量同步：仅当位置或角度变化超过阈值时才更新窗口
                const newX = Math.round(x - item.width / 2);
                const newY = Math.round(y - item.height / 2);
                const newAngle = item.body.angle;
                const posThreshold = 1; // 像素
                const angleThreshold = 0.01; // 弧度

                if (item.lastSyncedX !== undefined &&
                    Math.abs(newX - item.lastSyncedX) < posThreshold &&
                    Math.abs(newY - item.lastSyncedY) < posThreshold &&
                    Math.abs(newAngle - item.lastSyncedAngle) < angleThreshold) {
                    return;
                }

                item.lastSyncedX = newX;
                item.lastSyncedY = newY;
                item.lastSyncedAngle = newAngle;

                try {
                    item.window.setBounds({
                        x: newX,
                        y: newY,
                        width: Math.round(item.width),
                        height: Math.round(item.height)
                    });
                    if (item.window.webContents) {
                        item.window.webContents.send('sync-angle', newAngle);
                    }
                } catch (err) {
                    console.warn('[物理引擎] 同步道具位置失败:', err.message);
                }
            });
        }, intervalMs);
    }
    startPhysicsLoop(physicsConfig.fps || 60);

    // ---- 物理墙壁：地面、左墙、右墙、天花板 ----
    {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
        const wallOptions = {
            isStatic: true,
            friction: 0,
            restitution: 0.9
        };
        const ground = Bodies.rectangle(screenW / 2, screenH + 500, screenW + 2000, 1000, wallOptions);
        const leftWall = Bodies.rectangle(-500, screenH / 2, 1000, screenH + 2000, wallOptions);
        const rightWall = Bodies.rectangle(screenW + 500, screenH / 2, 1000, screenH + 2000, wallOptions);
        const ceiling = Bodies.rectangle(screenW / 2, -500, screenW + 2000, 1000, wallOptions);
        World.add(world, [ground, leftWall, rightWall, ceiling]);
    }

    // ---- IPC：获取可用物理道具图片列表 ----
    ipcMain.handle('get-physics-images', () => {
        const files = fs.readdirSync(physicsItemsDir);
        return files.filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => {
            return { name: f, path: path.join(physicsItemsDir, f) };
        });
    });

    // ---- IPC：保存物理道具图片到 physics_items 目录 ----
    ipcMain.handle('save-physics-image', (event, sourcePath, fileName) => {
        const destPath = path.join(physicsItemsDir, fileName);
        fs.copyFileSync(sourcePath, destPath);
        return { name: fileName, path: destPath };
    });

    // ---- IPC：生成物理道具（创建独立 BrowserWindow + Matter.js 碰撞体） ----
    ipcMain.handle('spawn-physics-item', (event, data) => {
        const { id, imgUrl, startX, startY, size, bounce } = data;

        let itemWin = new BrowserWindow({
            width: size, height: size,
            transparent: true, frame: false, alwaysOnTop: true, resizable: false, skipTaskbar: true,
            type: 'toolbar',
            webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
        });

        itemWin.setAlwaysOnTop(true, 'screen-saver');

        const htmlContent = `
    <html>
    <head>
    <style>
        body { margin: 0; overflow: hidden; background: transparent; user-select: none; -webkit-user-select: none; }
        #drag-area { width: 100vw; height: 100vh; cursor: grab; display: flex; justify-content: center; align-items: center; }
        img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; -webkit-user-drag: none; transform-origin: center center; }
        #drag-area:active { cursor: grabbing; }
    </style>
    </head>
    <body>
        <div id="drag-area"><img id="item-img" src="${imgUrl}"></div>
        <script>
            const { ipcRenderer } = require('electron');
            const area = document.getElementById('drag-area');
            const img = document.getElementById('item-img');
            ipcRenderer.on('sync-angle', (e, angle) => {
                img.style.transform = 'rotate(' + angle + 'rad)';
            });
            area.addEventListener('mousedown', (e) => {
                if(e.button === 0) ipcRenderer.send('physics-drag-start', '${id}');
            });
            window.addEventListener('mouseup', (e) => {
                if(e.button === 0) ipcRenderer.send('physics-drag-end', '${id}');
            });
            window.addEventListener('mouseleave', () => {
                ipcRenderer.send('physics-drag-end', '${id}');
            });
            ipcRenderer.on('flash-effect', () => {
                img.style.filter = 'brightness(2) drop-shadow(0 0 10px white)';
                setTimeout(() => { img.style.filter = ''; }, 200);
            });
            window.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                ipcRenderer.send('physics-change-shape', '${id}'); 
            });
        </script>
    </body>
    </html>
    `;

        itemWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        const body = Bodies.polygon(startX, startY, 8, size / 2, {
            restitution: bounce,
            friction: 0.1,
            frictionAir: globalFrictionAir,
            render: { visible: false }
        });

        World.add(world, body);
        physicalItems.push({ id, window: itemWin, body: body, width: size, height: size, shapeType: 'octagon' });
        itemWin.on('closed', () => {
            World.remove(world, body);
            physicalItems = physicalItems.filter(i => i.id !== id);
        });
        return true;
    });

    // ---- IPC：拖拽开始 - 记录偏移并设为静态（冻结物理） ----
    ipcMain.on('physics-drag-start', (event, id) => {
        const item = physicalItems.find(i => i.id === id);
        if (item) {
            item.isDragging = true;
            draggingItemId = id;
            const cursor = screen.getCursorScreenPoint();
            dragOffset = {
                x: item.body.position.x - cursor.x,
                y: item.body.position.y - cursor.y
            };
            Matter.Body.setStatic(item.body, true);
        }
    });

    // ---- IPC：拖拽结束 - 恢复动态，施加拖拽速度 × 倍率作为投掷速度 ----
    ipcMain.on('physics-drag-end', (event, id) => {
        if (draggingItemId === id) {
            const item = physicalItems.find(i => i.id === id);
            if (item) {
                item.isDragging = false;
                Matter.Body.setStatic(item.body, false);
                const finalVelocity = {
                    x: dragVelocity.x * throwPowerMultiplier,
                    y: dragVelocity.y * throwPowerMultiplier
                };
                Matter.Body.setVelocity(item.body, finalVelocity);
            }
            draggingItemId = null;
        }
    });

    // ---- IPC：更新物理参数（重力 / FPS / 投掷力度 / 空气阻力） ----
    ipcMain.on('update-physics-params', (event, params) => {
        if (params.gravity !== undefined) {
            engine.gravity.y = params.gravity;
            physicsConfig.gravity = params.gravity;
        }
        if (params.fps !== undefined) {
            startPhysicsLoop(params.fps);
            physicsConfig.fps = params.fps;
        }
        if (params.throwPower !== undefined) {
            throwPowerMultiplier = params.throwPower;
            physicsConfig.throwPower = params.throwPower;
        }
        if (params.frictionAir !== undefined) {
            globalFrictionAir = params.frictionAir;
            physicsConfig.airFriction = params.frictionAir;
            physicalItems.forEach(item => {
                item.body.frictionAir = globalFrictionAir;
            });
        }
    });

    // ---- IPC：缩放道具尺寸，按比例缩放 Matter.js 碰撞体 ----
    ipcMain.on('resize-physics-item', (event, id, newSize) => {
        const item = physicalItems.find(i => i.id === id);
        if (item && !item.window.isDestroyed()) {
            const scaleFactor = newSize / item.width;
            item.width = newSize;
            item.height = newSize;
            Matter.Body.scale(item.body, scaleFactor, scaleFactor);
        }
    });

    // ---- IPC：移除单个物理道具（关闭窗口即触发 closed 事件清理） ----
    ipcMain.on('remove-physics-item', (event, id) => {
        const item = physicalItems.find(i => i.id === id);
        if (item && !item.window.isDestroyed()) item.window.close();
    });

    // ---- IPC：清除所有物理道具 ----
    ipcMain.on('clear-all-physics', () => {
        physicalItems.forEach(item => {
            if (!item.window.isDestroyed()) item.window.close();
        });
        physicalItems.length = 0;  // 保持引用不变，避免闭包问题
    });

    // ---- IPC：同步 UI 碰撞边界（渲染进程上报 UI 区域，主进程转为静态碰撞体） ----
    let uiBodies = {};

    ipcMain.on('update-ui-bodies', (event, boundsData) => {
        if (!win || win.isDestroyed()) return;
        const winBounds = win.getBounds();
        const currentIds = [];
        boundsData.forEach(data => {
            const { id, relX, relY, width, height } = data;
            if (width < 5 || height < 5 || isNaN(relX) || isNaN(relY)) return;
            currentIds.push(id);
            const absX = winBounds.x + relX;
            const absY = winBounds.y + relY;
            if (uiBodies[id]) {
                const body = uiBodies[id];
                if (Math.abs(body.customW - width) > 2 || Math.abs(body.customH - height) > 2) {
                    World.remove(world, body);
                    const newBody = Bodies.rectangle(absX, absY, width, height, {
                        isStatic: true,
                        friction: 0.1,
                        restitution: 0.5
                    });
                    newBody.customW = width;
                    newBody.customH = height;
                    uiBodies[id] = newBody;
                    World.add(world, newBody);
                } else {
                    Matter.Body.setPosition(body, { x: absX, y: absY });
                }
            } else {
                const newBody = Bodies.rectangle(absX, absY, width, height, {
                    isStatic: true,
                    friction: 0.1,
                    restitution: 0.5
                });
                newBody.customW = width;
                newBody.customH = height;
                uiBodies[id] = newBody;
                World.add(world, newBody);
            }
        });

        Object.keys(uiBodies).forEach(id => {
            if (!currentIds.includes(id)) {
                World.remove(world, uiBodies[id]);
                delete uiBodies[id];
            }
        });
    });

    // ---- IPC：切换物理道具形状（圆形 → 矩形 → 八边形 → 循环） ----
    const SHAPE_TYPES = ['circle', 'rectangle', 'octagon'];  // 支持的三类形状
    ipcMain.on('physics-change-shape', (event, id) => {
        const item = physicalItems.find(i => i.id === id);
        if (!item || !item.body) return;
        let currentIndex = SHAPE_TYPES.indexOf(item.shapeType || 'circle');
        let nextIndex = (currentIndex + 1) % SHAPE_TYPES.length;
        let nextShape = SHAPE_TYPES[nextIndex];
        item.shapeType = nextShape;
        const oldPos = item.body.position;
        const oldVel = item.body.velocity;
        const oldAngle = item.body.angle;
        const oldAngVel = item.body.angularVelocity;

        Matter.World.remove(world, item.body);

        let newBody;
        const size = item.width;
        const options = {
            restitution: item.body.restitution || 0.5,
            friction: item.body.friction || 0.1
        };
        if (nextShape === 'circle') {
            newBody = Matter.Bodies.circle(oldPos.x, oldPos.y, size / 2, options);
        } else if (nextShape === 'rectangle') {
            newBody = Matter.Bodies.rectangle(oldPos.x, oldPos.y, size * 0.9, size * 0.9, options);
        } else if (nextShape === 'octagon') {
            newBody = Matter.Bodies.polygon(oldPos.x, oldPos.y, 8, size / 2, options);
        }

        Matter.Body.setVelocity(newBody, oldVel);
        Matter.Body.setAngle(newBody, oldAngle);
        Matter.Body.setAngularVelocity(newBody, oldAngVel);
        item.body = newBody;
        Matter.World.add(world, newBody);
        if (item.window && !item.window.isDestroyed()) {
            item.window.webContents.send('flash-effect');
        }
        if (win && !win.isDestroyed()) {
            win.webContents.send('physics-shape-updated', id, nextShape);
        }
    });

    return {
        engine,
        world,
        physicalItems,
        uiBodies
    };
}

module.exports = { initPhysics };
