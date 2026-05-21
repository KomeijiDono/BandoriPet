let sovitsProcess = null;

function initSoVITSManager({ path, spawn, ipcMain, voiceConfigs }) {
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
            sovitsProcess.on('error', (err) => console.error(`[SoVITS 错误]`, err));
            sovitsProcess.on('close', (code) => {
                console.log(`[SoVITS] 进程退出 (code: ${code})`);
                sovitsProcess = null;
            });
        } catch (e) {
            console.error("唤醒语音引擎失败:", e);
        }
    }

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
