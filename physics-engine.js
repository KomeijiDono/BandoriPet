const Matter = require('matter-js');
const { Engine, World, Bodies } = Matter;

function initPhysics({ BrowserWindow, ipcMain, screen, fs, path, __dirname, win }) {
    const physicsItemsDir = path.join(__dirname, 'physics_items');
    if (!fs.existsSync(physicsItemsDir)) {
        fs.mkdirSync(physicsItemsDir, { recursive: true });
    }

    const engine = Engine.create();
    const world = engine.world;
    engine.gravity.y = 1.5;

    let physicalItems = [];
    let physicsTimer = null;
    let throwPowerMultiplier = 1.2;
    let globalFrictionAir = 0.01;

    let draggingItemId = null;
    let dragOffset = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };

    function startPhysicsLoop(fps) {
        if (physicsTimer) clearInterval(physicsTimer);
        const intervalMs = 1000 / fps;

        physicsTimer = setInterval(() => {
            Engine.update(engine, intervalMs);

            if (draggingItemId) {
                const item = physicalItems.find(i => i.id === draggingItemId);
                if (item) {
                    const cursor = screen.getCursorScreenPoint();
                    const targetX = cursor.x + dragOffset.x;
                    const targetY = cursor.y + dragOffset.y;

                    dragVelocity = {
                        x: (targetX - item.body.position.x) * 0.4,
                        y: (targetY - item.body.position.y) * 0.4
                    };

                    Matter.Body.setPosition(item.body, { x: targetX, y: targetY });
                    Matter.Body.setVelocity(item.body, { x: 0, y: 0 });
                }
            }

            physicalItems.forEach(item => {
                if (!item.window || item.window.isDestroyed()) return;
                const { x, y } = item.body.position;

                if (Number.isNaN(x) || Number.isNaN(y) || y > 5000 || y < -5000 || x > 10000 || x < -5000) {
                    item.window.close();
                    return;
                }
                const speed = Matter.Vector.magnitude(item.body.velocity);
                const angularSpeed = Math.abs(item.body.angularVelocity);
                if (!item.isDragging && speed < 0.1 && angularSpeed < 0.01) {
                    return;
                }
                try {
                    item.window.setBounds({
                        x: Math.round(x - item.width / 2),
                        y: Math.round(y - item.height / 2),
                        width: Math.round(item.width),
                        height: Math.round(item.height)
                    });
                    if (item.window.webContents) {
                        item.window.webContents.send('sync-angle', item.body.angle);
                    }
                } catch (err) {
                }
            });
        }, intervalMs);
    }
    startPhysicsLoop(60);

    // ---- 物理墙壁 ----
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

    // ---- 图片管理 ----
    ipcMain.handle('get-physics-images', () => {
        const files = fs.readdirSync(physicsItemsDir);
        return files.filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => {
            return { name: f, path: path.join(physicsItemsDir, f) };
        });
    });

    ipcMain.handle('save-physics-image', (event, sourcePath, fileName) => {
        const destPath = path.join(physicsItemsDir, fileName);
        fs.copyFileSync(sourcePath, destPath);
        return { name: fileName, path: destPath };
    });

    // ---- 生成物理道具 ----
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

    // ---- 拖拽 ----
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

    // ---- 参数 ----
    ipcMain.on('update-physics-params', (event, params) => {
        if (params.gravity !== undefined) engine.gravity.y = params.gravity;
        if (params.fps !== undefined) startPhysicsLoop(params.fps);
        if (params.throwPower !== undefined) throwPowerMultiplier = params.throwPower;
        if (params.frictionAir !== undefined) {
            globalFrictionAir = params.frictionAir;
            physicalItems.forEach(item => {
                item.body.frictionAir = globalFrictionAir;
            });
        }
    });

    ipcMain.on('resize-physics-item', (event, id, newSize) => {
        const item = physicalItems.find(i => i.id === id);
        if (item && !item.window.isDestroyed()) {
            const scaleFactor = newSize / item.width;
            item.width = newSize;
            item.height = newSize;
            Matter.Body.scale(item.body, scaleFactor, scaleFactor);
        }
    });

    ipcMain.on('remove-physics-item', (event, id) => {
        const item = physicalItems.find(i => i.id === id);
        if (item && !item.window.isDestroyed()) item.window.close();
    });

    ipcMain.on('clear-all-physics', () => {
        physicalItems.forEach(item => {
            if (!item.window.isDestroyed()) item.window.close();
        });
        physicalItems = [];
    });

    // ---- UI 碰撞箱 ----
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

    // ---- 形状切换 ----
    const SHAPE_TYPES = ['circle', 'rectangle', 'octagon'];
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
