/**
 * update-notice.js — 版本更新公告
 */
(function () {
  'use strict';

  var APP_VERSION = "2.1.3"; // 更新通知版本号

  // 对比localStorage版本号，不一致则显示本次更新公告
  function initUpdateNotice() {
    if (localStorage.getItem('last_version') !== APP_VERSION) {
      var noticeText = document.getElementById('notice-text');
      if (noticeText) {
        noticeText.innerHTML =
          '<b>居中轮盘菜单：</b> 快捷键一键唤出。<br>' +
          '<b>自定义：</b> 支持自定义唤出键，支持长按/单击模式切换，默认支持鼠标中键。<br>' +
          '<b>提示：</b> 如果你在其他窗口，自动降级为单击唤出模式。<br>';
      }
      var updateNotice = document.getElementById('update-notice');
      if (updateNotice) updateNotice.style.display = 'flex';
    }
  }

  // 确认已读：记录当前版本号并隐藏公告面板
  function confirmUpdate() {
    localStorage.setItem('last_version', APP_VERSION);
    var updateNotice = document.getElementById('update-notice');
    if (updateNotice) updateNotice.style.display = 'none';
  }

  window.initUpdateNotice = initUpdateNotice;
  window.confirmUpdate = confirmUpdate;

  document.addEventListener('DOMContentLoaded', function () {
    initUpdateNotice();
  });

  console.log('[Renderer] update-notice.js 已就绪');
})();
