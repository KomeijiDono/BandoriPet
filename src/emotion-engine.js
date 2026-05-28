/**
 * emotion-engine.js — 主进程情绪检测模块
 *
 * 职责：
 *   1. App Detector — PowerShell 持久子进程检测前台窗口进程名
 *   2. Idle Detector — powerMonitor.getSystemIdleTime() 检测系统空闲
 *   3. IPC 推送 — 每秒推送到渲染进程 (emotion-system-data)
 *
 * deps: { ipcMain, powerMonitor, getWin, spawn, ROOT } → { start, stop }
 */
const { spawn } = require('child_process');
const { getConfig } = require('./config-loader');

let systemTimer = null;
let psProcess = null;
let psBuffer = '';
let psReady = false;
let lastPsError = 0;

// 空闲检测阈值（秒）
const IDLE_THRESHOLD_LONELY = 300;   // 5 分钟
const IDLE_THRESHOLD_SLEEPY = 1800;  // 30 分钟

const currentState = {
  app: { processName: '', title: '', isGaming: false, isFocus: false, isMusic: false },
  idle: { idleTime: 0, isLonely: false, isSleepy: false }
};

// 从配置文件加载进程列表
const emotionConfig = getConfig('emotion', {});
const detectorsConfig = emotionConfig.detectors || {};

const gamingList = detectorsConfig.gamingProcesses || [
  'valorant', 'csgo', 'cs2', 'dota2', 'league of legends', 'lol',
  'genshinimpact', 'honkai', 'starrail', 'wuthering waves',
  'overwatch', 'apex', 'pubg', 'fortnite', 'minecraft',
  'elden ring', 'monster hunter', 'call of duty', 'steam',
  'battlefield', 'rainbow six', 'rocket league'
];

const focusList = detectorsConfig.focusProcesses || [
  'code', 'vscode', 'visual studio', 'devenv', 'intellij', 'idea64',
  'webstorm', 'pycharm', 'sublime_text', 'notepad++',
  'windows terminal', 'cmd', 'powershell',
  'chrome', 'firefox', 'msedge', 'obsidian', 'notion',
  'figma', 'photoshop', 'blender', 'unity', 'unreal',
  'winword', 'excel', 'powerpnt', 'outlook',
  'terminal', 'cursor', 'windsurf'
];

const musicList = detectorsConfig.musicProcesses || [
  'spotify', 'qqmusic', 'netease', 'cloudmusic', 'kwmusic',
  'foobar2000', 'aimp', 'musicbee', 'dopamine',
  'youtube music', 'apple music', 'amazon music',
  'tidal', 'deezer', 'soundcloud'
];

function classifyApp(processName, title) {
  var lowerName = processName.toLowerCase().replace('.exe', '');
  var lowerTitle = (title || '').toLowerCase();

  var isGaming = gamingList.some(function (p) { return lowerName.indexOf(p) !== -1; });
  var isFocus = focusList.some(function (p) { return lowerName.indexOf(p) !== -1; });
  var isMusic = musicList.some(function (p) { return lowerName.indexOf(p) !== -1; });

  if (!isGaming && !isFocus && !isMusic) {
    isGaming = gamingList.some(function (p) { return lowerTitle.indexOf(p) !== -1; });
    isFocus = focusList.some(function (p) { return lowerTitle.indexOf(p) !== -1; });
    isMusic = musicList.some(function (p) { return lowerTitle.indexOf(p) !== -1; });
  }

  return { isGaming: isGaming, isFocus: isFocus, isMusic: isMusic };
}

function startPsProcess() {
  if (psProcess) return;

  try {
    psProcess = spawn('powershell', ['-NoProfile', '-Command', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    psProcess.stderr.on('data', function (d) {
      // 静默忽略 PowerShell stderr
    });

    psProcess.stdout.on('data', function (data) {
      psBuffer += data.toString();
    });

    psProcess.on('error', function (err) {
      console.error('[主进程-情绪] PS 进程异常:', err.message);
      killPsProcess();
    });

    psProcess.on('close', function () {
      psProcess = null;
      psReady = false;
      psBuffer = '';
    });

    // 编译 C# Win32 API 包装器（一次性）
    var compileScript = [
      'Add-Type -Name FW -Namespace Temp @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'using System.Text;',
      'using System.Diagnostics;',
      'public class FW {',
      '  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();',
      '  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);',
      '  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);',
      '  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);',
      '  public static string Get() {',
      '    IntPtr h = GetForegroundWindow();',
      '    if (h == IntPtr.Zero) return "";',
      '    uint pid = 0;',
      '    GetWindowThreadProcessId(h, out pid);',
      '    int len = GetWindowTextLength(h);',
      '    StringBuilder sb = new StringBuilder(len + 1);',
      '    GetWindowText(h, sb, sb.Capacity);',
      '    try { return Process.GetProcessById((int)pid).ProcessName + "|" + sb.ToString(); }',
      '    catch { return "|" + sb.ToString(); }',
      '  }',
      '}',
      '"@',
      'Write-Host "PSREADY"',
      ''
    ].join('\n');

    psProcess.stdin.write(compileScript + '\n');

    // 等 PSREADY 信号
    var readyCheck = setInterval(function () {
      if (psBuffer.indexOf('PSREADY') !== -1) {
        psReady = true;
        psBuffer = '';
        clearInterval(readyCheck);
        console.log('[主进程-情绪] PowerShell AppDetector 就绪');
      }
    }, 200);

    // 5 秒超时
    setTimeout(function () {
      clearInterval(readyCheck);
      if (!psReady) {
        console.error('[主进程-情绪] PowerShell 启动超时，AppDetector 禁用');
        killPsProcess();
      }
    }, 5000);
  } catch (e) {
    console.error('[主进程-情绪] 无法启动 PowerShell:', e.message);
    killPsProcess();
  }
}

function killPsProcess() {
  if (psProcess) {
    try { psProcess.kill(); } catch (e) {
      console.warn('[情绪引擎] 终止 PowerShell 进程失败:', e.message);
    }
    psProcess = null;
  }
  psReady = false;
  psBuffer = '';
}

function pollApp() {
  if (!psProcess || !psReady) {
    var now = Date.now();
    if (now - lastPsError > 30000) {
      // 每 30s 重试启动 PowerShell
      startPsProcess();
      lastPsError = now;
    }
    return;
  }

  psBuffer = '';
  psProcess.stdin.write("[Temp.FW]::Get()\nWrite-Host 'PSEND'\n");

  // 200ms 后读取缓冲区（PowerShell 本地响应通常在 10ms 内）
  setTimeout(function () {
    var buf = psBuffer;
    // 提取 PSEND 之间的内容
    var idx = buf.lastIndexOf('PSEND');
    if (idx === -1) return;

    var beforeEnd = buf.substring(0, idx);
    // 取最后一行有效输出
    var lines = beforeEnd.split(/\r?\n/).filter(function (l) {
      return l.trim() && l.indexOf('PSREADY') === -1 && l.indexOf('PSEND') === -1;
    });

    var line = lines.length > 0 ? lines[lines.length - 1].trim() : '';
    if (!line) return;

    // 格式: processName|windowTitle
    var parts = line.split('|');
    var processName = parts[0] || '';
    var title = parts.slice(1).join('|') || '';

    var cls = classifyApp(processName, title);

    currentState.app = {
      processName: processName,
      title: title,
      isGaming: cls.isGaming,
      isFocus: cls.isFocus,
      isMusic: cls.isMusic
    };
  }, 200);
}

function detectIdle(powerMonitor) {
  try {
    var idleSeconds = powerMonitor.getSystemIdleTime();
    currentState.idle = {
      idleTime: idleSeconds,
      isLonely: idleSeconds > IDLE_THRESHOLD_LONELY,
      isSleepy: idleSeconds > IDLE_THRESHOLD_SLEEPY
    };
  } catch (e) {
    currentState.idle = { idleTime: 0, isLonely: false, isSleepy: false };
  }
}

function initEmotionEngine({ ipcMain, powerMonitor, getWin }) {

  function pushToRenderer() {
    var w = getWin ? getWin() : null;
    if (w && !w.isDestroyed()) {
      try {
        // 增量推送：仅在数据变化时才发送
        var newState = JSON.parse(JSON.stringify(currentState));
        if (JSON.stringify(newState) !== JSON.stringify(lastPushedState)) {
          w.webContents.send('emotion-system-data', newState);
          lastPushedState = newState;
        }
      } catch (e) {
        console.warn('[情绪引擎] 推送数据到渲染进程失败:', e.message);
      }
    }
  }

  // 上次推送的状态，用于增量推送
  var lastPushedState = null;

  function start() {
    if (systemTimer) return;

    startPsProcess();
    pollApp();
    if (powerMonitor) detectIdle(powerMonitor);
    pushToRenderer();

    // 轮询频率改为 3 秒
    systemTimer = setInterval(function () {
      pollApp();
      if (powerMonitor) detectIdle(powerMonitor);
      pushToRenderer();
    }, 3000);

    console.log('[主进程-情绪] 引擎已启动');
  }

  function stop() {
    if (systemTimer) {
      clearInterval(systemTimer);
      systemTimer = null;
    }
    killPsProcess();
    console.log('[主进程-情绪] 引擎已停止');
  }

  return {
    start: start,
    stop: stop
  };
}

module.exports = { initEmotionEngine };
