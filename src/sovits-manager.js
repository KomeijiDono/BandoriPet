// GPT-SoVITS 语音引擎生命周期管理器：负责 spawn/kill Python 子进程，处理角色切换
const { getConfig } = require('./config-loader');

let sovitsProcess = null;

// 初始化 SoVITS 管理器，注入依赖：path, spawn, ipcMain, voiceConfigs
// 返回 { getProcess, killProcess } 供外部控制进程生命周期
function initSoVITSManager({ path, spawn, ipcMain, voiceConfigs, ROOT, fs }) {
    // 从配置文件加载 SoVITS 参数
    const sovitsConfig = getConfig('sovits', {});
    const language = sovitsConfig.language || 'ja';
    const switchDelay = sovitsConfig.switchDelay || 1000;

    // 根据角色 ID 启动对应语音引擎：查找配置 → 拼接 Python 路径 → spawn 子进程
    function startSoVITS(charId) {
        const config = voiceConfigs[charId];
        if (!config) {
            console.log(`未找到 [${charId}] 的语音配置，无法启动对应声音！`);
            return;
        }

        const sovitsDir = path.join(ROOT, 'GPT-SoVITS'); 
        const pythonPath = path.join(sovitsDir, 'runtime', 'python.exe');
        
        const args = [
            'api.py',
            '-s', config.pth,
            '-g', config.ckpt,
            '-dr', config.refAudio,
            '-dt', config.refText,
            '-dl', language
        ];
        
        try {
            console.log(`正在后台唤醒 [${charId}] 的专属语音引擎...`);
            if (!fs.existsSync(pythonPath)) {
                console.error(`[SoVITS] Python 路径不存在: ${pythonPath}`);
                return;
            }
            sovitsProcess = spawn(pythonPath, args, {
                cwd: sovitsDir,     
                windowsHide: false   
            });
            sovitsProcess.stdout.on('data', (data) => {
                var msg = data.toString();
                console.log(`[SoVITS] ${msg}`);
                if (msg.includes('Uvicorn running')) {
                    if (ipcMain) ipcMain.emit('sovits-ready', null, charId);
                }
            });
            sovitsProcess.stderr.on('data', (data) => console.log(`[SoVITS 状态] ${data}`));
            sovitsProcess.on('error', (err) => {
                console.error(`[SoVITS 错误]`, err);
                sovitsProcess = null;
                if (ipcMain) ipcMain.emit('sovits-error', null, charId);
            });
            sovitsProcess.on('close', (code) => {
                console.log(`[SoVITS] 进程退出 (code: ${code})`);
                sovitsProcess = null;
            });
        } catch (e) {
            console.error("唤醒语音引擎失败:", e);
        }
    }

    // 监听渲染进程的角色切换请求：先 kill 旧进程，延迟后启动新角色引擎
    ipcMain.on('switch-character', (event, charId) => {
        console.log(`\n=== 收到切人指令: 准备切换到 ${charId} ===`);
        if (sovitsProcess && !sovitsProcess.killed) {
            console.log("正在关闭旧的语音引擎...");
            sovitsProcess.kill();
        }
        sovitsProcess = null;
        setTimeout(() => {
            startSoVITS(charId);
        }, switchDelay);
    });

    return {
        getProcess: () => sovitsProcess,
        killProcess: () => {
            if (sovitsProcess && !sovitsProcess.killed) {
                sovitsProcess.kill();
            }
            sovitsProcess = null;
        }
    };
}

module.exports = { initSoVITSManager };
