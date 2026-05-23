// 媒体控制模块：通过PowerShell模拟媒体按键，实现播放/暂停、上一首、下一首
// deps: { ipcMain, exec(child_process.exec) }
function registerMediaControl({ ipcMain, exec }) {
    ipcMain.on('media-control', (event, action) => {
        // 虚拟键码：VK_MEDIA_PLAY_PAUSE=0xB3(179), VK_MEDIA_NEXT_TRACK=0xB0(176), VK_MEDIA_PREV_TRACK=0xB1(177)
        let vk = 0;
        if (action === 'play-pause') vk = 179; 
        if (action === 'next') vk = 176;      
        if (action === 'prev') vk = 177;      
        
        if (vk) {
            // 通过PowerShell C#内联代码调用user32.dll的keybd_event，模拟按键按下(0)与释放(2)
            const cmd = `powershell -NoProfile -Command "$c='[DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte v,byte s,uint f,int i);'; $k=Add-Type -MemberDefinition $c -Name 'K' -PassThru; $k::keybd_event(${vk},0,0,0); $k::keybd_event(${vk},0,2,0);"`;
            exec(cmd);
        }
    });
}

module.exports = registerMediaControl;
