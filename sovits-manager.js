// GPT-SoVITS 语音引擎生命周期管理器：负责 spawn/kill Python 子进程，处理角色切换
let sovitsProcess = null;

// 初始化 SoVITS 管理器，注入依赖：path, spawn, ipcMain, voiceConfigs
// 返回 { getProcess, killProcess } 供外部控制进程生命周期
function initSoVITSManager({ path, spawn, ipcMain, voiceConfigs }) {
    // 根据角色 ID 启动对应语音引擎：查找配置 → 拼接 Python 路径 → spawn 子进程
    function startSoVITS(charId) {
        const config = voiceConfigs[charId];
        if (!config) {
            console.log(`未找到 [${charId}] 的语音配置，无法启动对应声音！`);
            return;
        }

        const sovitsDir = path.join(__dirname, 'GPT-SoVITS'); 
        const pythonPath = path.join(sovitsDir, 'runtime', 'python.exe');
        
        const args = [
            'api.py',
            '-s', config.pth,
            '-g', config.ckpt,
            '-dr', config.refAudio,
            '-dt', config.refText,
            '-dl', 'ja' 
        ];
        
        try {
            console.log(`正在后台唤醒 [${charId}] 的专属语音引擎...`);
            sovitsProcess = spawn(pythonPath, args, {
                cwd: sovitsDir,     
                windowsHide: false   
            });
            sovitsProcess.stdout.on('data', (data) => console.log(`[SoVITS] ${data}`));
            sovitsProcess.stderr.on('data', (data) => console.log(`[SoVITS 状态] ${data}`));
            // 监听子进程异常错误，防止未捕获异常导致进程泄漏
            sovitsProcess.on('error', (err) => console.error(`[SoVITS 错误]`, err));
            sovitsProcess.on('close', (code) => {
                // 进程退出时复位引用，避免后续操作已退出的进程
                console.log(`[SoVITS] 进程退出 (code: ${code})`);
                sovitsProcess = null;
            });
        } catch (e) {
            console.error("唤醒语音引擎失败:", e);
        }
    }

    // 监听渲染进程的角色切换请求：先 kill 旧进程，延迟 1 秒后启动新角色引擎
    ipcMain.on('switch-character', (event, charId) => {
        console.log(`\n=== 收到切人指令: 准备切换到 ${charId} ===`);
        if (sovitsProcess) {
            console.log("正在关闭旧的语音引擎...");
            sovitsProcess.kill();
            sovitsProcess = null;
        }
        setTimeout(() => {
            startSoVITS(charId);
        }, 1000);
    });

    return {
        getProcess: () => sovitsProcess,
        killProcess: () => {
            if (sovitsProcess) {
                sovitsProcess.kill();
                sovitsProcess = null;
            }
        }
    };
}

module.exports = { initSoVITSManager };
