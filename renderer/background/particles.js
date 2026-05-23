/**
 * particles.js — Canvas 浮动粒子系统
 * 依赖：window.hexToRgb、window.drawStar（由 mouse-trail.js 暴露）
 */
(function () {
  'use strict';

  var pCanvas = document.getElementById('particle-canvas');
  var pCtx = pCanvas.getContext('2d');
  var particlesArray = [];
  var isAnimating = false;

  // 初始化粒子数组：根据设置生成 count 个 {x,y,size,speed,opacity,color,shape} 对象并启动动画
  function initParticles() {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    particlesArray = [];
    var count = parseInt(localStorage.getItem('p_count')) || 80;
    var baseSpeed = parseFloat(localStorage.getItem('p_speed')) || 1;
    var shape = localStorage.getItem('p_shape') || 'circle';
    var colorRgb = window.hexToRgb ? window.hexToRgb(localStorage.getItem('p_color') || '#ffb6c1') : '255, 182, 193';
    for (var i = 0; i < count; i++) {
      var size = Math.random() * 3 + 1;
      var x = Math.random() * pCanvas.width;
      var y = Math.random() * pCanvas.height;
      var speedY, speedX;
      if (shape === 'snow') {
        speedY = Math.random() * baseSpeed + (baseSpeed / 2);
        speedX = Math.random() * 2 - 1;
      } else {
        speedY = Math.random() * -baseSpeed - (baseSpeed / 2);
        speedX = Math.random() * baseSpeed - (baseSpeed / 2);
      }
      particlesArray.push({ x: x, y: y, size: size, speedY: speedY, speedX: speedX, opacity: Math.random(), color: colorRgb, shape: shape });
    }
    if (!isAnimating) {
      isAnimating = true;
      animateParticles();
    }
  }

  // requestAnimationFrame 循环：逐帧更新粒子位置/边界回绕、绘制圆形或星形
  function animateParticles() {
    var bgModeEl = document.getElementById('bg-mode');
    if (bgModeEl && bgModeEl.value !== 'particles') {
      isAnimating = false;
      return;
    }
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    for (var i = 0; i < particlesArray.length; i++) {
      var p = particlesArray[i];
      pCtx.fillStyle = 'rgba(' + p.color + ', ' + p.opacity + ')';
      if (p.shape === 'star' && window.drawStar) {
        window.drawStar(pCtx, p.x, p.y, 5, p.size * 2, p.size);
      } else {
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fill();
      }
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.shape === 'snow') {
        if (p.y > pCanvas.height) p.y = 0;
      } else {
        if (p.y < 0) p.y = pCanvas.height;
      }
      if (p.x < 0 || p.x > pCanvas.width) p.speedX *= -1;
    }
    requestAnimationFrame(animateParticles);
  }

  window.addEventListener('resize', function () {
    var modeEl = document.getElementById('bg-mode');
    if (modeEl && modeEl.value === 'particles') initParticles();
  });

  // ========== 暴露到全局 ==========
  window.initParticles = initParticles;
  window.animateParticles = animateParticles;

  console.log('[Renderer] particles.js 已就绪');
})();
