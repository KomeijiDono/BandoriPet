let audioProcess = null;

function initAudioCapture({ ipcMain, spawn, fs, path, __dirname, win }) {
    ipcMain.on('toggle-cpp-audio', (event, enable) => {
        if (enable && !audioProcess) {
            let exePath = path.join(__dirname, 'sys_audio.exe');
            if (exePath.includes('app.asar')) {
                exePath = exePath.replace('app.asar', 'app.asar.unpacked');
            }
            
            if (!fs.existsSync(exePath)) {
                console.error("错误：找不到sys_audio.exe");
                return;
            }

            audioProcess = spawn(exePath);
            
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

    return {
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
