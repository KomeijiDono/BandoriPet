function registerMediaControl({ ipcMain, exec }) {
    ipcMain.on('media-control', (event, action) => {
        let vk = 0;
        if (action === 'play-pause') vk = 179; 
        if (action === 'next') vk = 176;      
        if (action === 'prev') vk = 177;      
        
        if (vk) {
            const cmd = `powershell -NoProfile -Command "$c='[DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte v,byte s,uint f,int i);'; $k=Add-Type -MemberDefinition $c -Name 'K' -PassThru; $k::keybd_event(${vk},0,0,0); $k::keybd_event(${vk},0,2,0);"`;
            exec(cmd);
        }
    });
}

module.exports = registerMediaControl;
