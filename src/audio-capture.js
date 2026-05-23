// 音频采集模块：管理 sys_audio.exe 子进程，捕获系统音频并输出64元素FFT频谱数据
// deps: { ipcMain, spawn, fs, path, __dirname, win } → 返回 { getProcess, killProcess }
let audioProcess = null;

function initAudioCapture({ ipcMain, spawn, fs, path, __dirname, win, ROOT }) {
    ipcMain.on('toggle-cpp-audio', (event, enable) => {
        if (enable && !audioProcess) {
            let exePath = path.join(ROOT, 'native', 'sys_audio.exe');
            if (exePath.includes('app.asar')) {
                exePath = exePath.replace('app.asar', 'app.asar.unpacked');
            }
            
            if (!fs.existsSync(exePath)) {
                console.error("错误：找不到sys_audio.exe");
                return;
            }

            audioProcess = spawn(exePath);
            
            // 解析stdout：取最后一行逗号分隔的64个FFT值，发送到渲染进程
            audioProcess.stdout.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                const lastLine = lines[lines.length - 1]; 
                
                if (lastLine.includes(',')) {
                    const fftData = lastLine.split(',').map(Number);
                    if (fftData.length === 64 && win && !win.isDestroyed()) {
                        win.webContents.send('audio-fft', fftData);
                    }
                }
            });

            // 子进程异常/退出：日志记录并复位引用，防止对已退出进程kill
            audioProcess.on('error', (err) => console.error("启动失败:", err));
            audioProcess.on('close', (code) => {
                console.log(`[音频采集] 进程退出 (code: ${code})`);
                audioProcess = null;
            });
            
        } else if (!enable && audioProcess) {
            audioProcess.kill();
            audioProcess = null;
        }
    });

    return {              // 对外暴露进程引用和终止方法，供 main.js 统一清理
        getProcess: () => audioProcess,
        killProcess: () => {
            if (audioProcess) {
                audioProcess.kill();
                audioProcess = null;
            }
        }
    };
}

module.exports = { initAudioCapture };
