/**
 * mouse-trail.js — 鼠标拖尾 + 点击特效
 * 从 index.html 内联脚本抽离
 */
(function () {
  'use strict';

  // ========== 工具函数 ==========
  function hexToRgb(hex) {
    var r, g, b;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substr(1, 2), 16);
      g = parseInt(hex.substr(3, 2), 16);
      b = parseInt(hex.substr(5, 2), 16);
    } else {
      return '255, 182, 193';
    }
    return r + ', ' + g + ', ' + b;
  }

  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    var rot = Math.PI / 2 * 3;
    var x = cx;
    var y = cy;
    var step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (var i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  // 暴露到全局，供粒子系统使用
  window.hexToRgb = hexToRgb;
  window.drawStar = drawStar;

  // ========== 鼠标特效 ==========
  var mtCanvas = document.getElementById('mouse-trail-canvas');
  var mtCtx = mtCanvas.getContext('2d');

  var trailParticles = [];
  var clickParticles = [];
  var tStyle = 'none';
  var cStyle = 'none';
  var tColor = '255, 182, 193';
  var mtDynamic = false;
  var effectHue = 0;

  function resizeMtCanvas() {
    mtCanvas.width = window.innerWidth;
    mtCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeMtCanvas);
  resizeMtCanvas();

  function applyMouseTrailSettings() {
    var styleEl = document.getElementById('mt-style');
    var clickEl = document.getElementById('mc-style');
    var colorEl = document.getElementById('mt-color');
    var dynamicEl = document.getElementById('mt-dynamic');

    if (styleEl) tStyle = styleEl.value;
    if (clickEl) cStyle = clickEl.value;
    if (colorEl) {
      var hexColor = colorEl.value;
      tColor = hexToRgb(hexColor);
    }
    if (dynamicEl) mtDynamic = dynamicEl.checked;

    localStorage.setItem('mt_style', tStyle);
    localStorage.setItem('mc_style', cStyle);
    if (colorEl) localStorage.setItem('mt_color', colorEl.value);
    localStorage.setItem('mt_dynamic', mtDynamic);

    if (tStyle === 'none') trailParticles = [];
    if (cStyle === 'none') clickParticles = [];
  }

  document.addEventListener('mousemove', function (e) {
    if (tStyle === 'none') return;
    if ((tStyle === 'stars' || tStyle === 'hearts' || tStyle === 'geometric') && Math.random() > 0.4) return;

    var shape = 'circle';
    if (tStyle === 'geometric') {
      var shapes = ['triangle', 'square', 'circle', 'cross'];
      shape = shapes[Math.floor(Math.random() * shapes.length)];
    }

    trailParticles.push({
      x: e.clientX, y: e.clientY,
      size: tStyle === 'hearts' ? Math.random() * 6 + 6 : (tStyle === 'geometric' ? Math.random() * 5 + 3 : Math.random() * 4 + 2),
      speedX: Math.random() * 2 - 1,
      speedY: tStyle === 'hearts' ? Math.random() * -2 - 1 : Math.random() * 2 - 0.5,
      life: 1.0,
      decay: tStyle === 'neon' ? 0.08 : (Math.random() * 0.015 + 0.01),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: Math.random() * 0.1 - 0.05,
      swingOffset: Math.random() * Math.PI * 2,
      shape: shape
    });
  });

  document.addEventListener('mousedown', function (e) {
    if (cStyle === 'none') return;

    if (cStyle === 'ripple') {
      clickParticles.push({ x: e.clientX, y: e.clientY, life: 1.0, type: 'ripple', maxRadius: 40 });
    }
    else if (cStyle === 'burst') {
      for (var i = 0; i < 8; i++) {
        var angle = (Math.PI * 2 / 8) * i;
        clickParticles.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(angle) * 2.2, vy: Math.sin(angle) * 2.2,
          life: 1.0, type: 'burst'
        });
      }
    }
    else if (cStyle === 'geometric') {
      var geoShapes = ['triangle', 'square', 'circle'];
      for (var j = 0; j < 6; j++) {
        var a = Math.random() * Math.PI * 2;
        var spd = Math.random() * 2 + 0.5;
        clickParticles.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 1.0, type: 'geo',
          shape: geoShapes[Math.floor(Math.random() * geoShapes.length)],
          size: Math.random() * 8 + 4,
          rot: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.2
        });
      }
    }
  });

  function animateMouseTrail() {
    requestAnimationFrame(animateMouseTrail);
    if (tStyle === 'none' && cStyle === 'none' && trailParticles.length === 0 && clickParticles.length === 0) return;

    mtCtx.clearRect(0, 0, mtCanvas.width, mtCanvas.height);
    effectHue = (effectHue + 1) % 360;

    if (tStyle === 'neon' && trailParticles.length > 1) {
      mtCtx.beginPath();
      mtCtx.moveTo(trailParticles[0].x, trailParticles[0].y);
      for (var i = 1; i < trailParticles.length; i++) mtCtx.lineTo(trailParticles[i].x, trailParticles[i].y);
      mtCtx.lineWidth = 4; mtCtx.lineCap = 'round'; mtCtx.lineJoin = 'round';
      mtCtx.shadowBlur = 15;
      mtCtx.shadowColor = mtDynamic ? 'hsl(' + effectHue + ', 100%, 65%)' : 'rgb(' + tColor + ')';
      mtCtx.strokeStyle = mtDynamic ? 'hsla(' + effectHue + ', 100%, 65%, 0.8)' : 'rgba(' + tColor + ', 0.8)';
      mtCtx.stroke();
      mtCtx.shadowBlur = 0;
    }

    for (var j = 0; j < trailParticles.length; j++) {
      var p = trailParticles[j];
      p.life -= p.decay;
      if (p.life <= 0) { trailParticles.splice(j, 1); j--; continue; }

      var fillStyleStr = mtDynamic ? 'hsla(' + effectHue + ', 100%, 65%, ' + p.life + ')' : 'rgba(' + tColor + ', ' + p.life + ')';
      mtCtx.fillStyle = fillStyleStr;

      if (tStyle === 'stars') {
        p.x += p.speedX; p.y += p.speedY; p.rot += p.rotSpeed;
        mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.rotate(p.rot);
        drawStar(mtCtx, 0, 0, 5, p.size * 2, p.size);
        mtCtx.restore();
      }
      else if (tStyle === 'hearts') {
        p.x += Math.sin(p.life * 10 + p.swingOffset) * 1.5; p.y += p.speedY;
        mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.scale(p.size / 10, p.size / 10);
        mtCtx.beginPath(); mtCtx.moveTo(0, 3);
        mtCtx.bezierCurveTo(0, -3, -10, -5, -10, -10); mtCtx.bezierCurveTo(-10, -15, 0, -15, 0, -10);
        mtCtx.bezierCurveTo(0, -15, 10, -15, 10, -10); mtCtx.bezierCurveTo(10, -5, 0, -3, 0, 3);
        mtCtx.fill(); mtCtx.restore();
      }
      else if (tStyle === 'geometric') {
        p.x += p.speedX; p.y += p.speedY; p.rot += p.rotSpeed;
        mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.rotate(p.rot);
        if (p.shape === 'square') mtCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        else if (p.shape === 'triangle') {
          mtCtx.beginPath(); mtCtx.moveTo(0, -p.size); mtCtx.lineTo(p.size * 0.866, p.size * 0.5); mtCtx.lineTo(-p.size * 0.866, p.size * 0.5); mtCtx.fill();
        }
        else if (p.shape === 'circle') {
          mtCtx.beginPath(); mtCtx.arc(0, 0, p.size / 1.5, 0, Math.PI * 2); mtCtx.fill();
        }
        else if (p.shape === 'cross') {
          mtCtx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2);
          mtCtx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2);
        }
        mtCtx.restore();
      }
      else if (tStyle === 'neon') {
        if (j === trailParticles.length - 1) {
          mtCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          mtCtx.beginPath(); mtCtx.arc(p.x, p.y, 3, 0, Math.PI * 2); mtCtx.fill();
        }
      }
    }

    for (var k = 0; k < clickParticles.length; k++) {
      var cp = clickParticles[k];
      cp.life -= 0.015;
      if (cp.life <= 0) { clickParticles.splice(k, 1); k--; continue; }

      var clickColor = mtDynamic ? 'hsla(' + effectHue + ', 100%, 65%, ' + cp.life + ')' : 'rgba(' + tColor + ', ' + cp.life + ')';

      if (cp.type === 'ripple') {
        mtCtx.strokeStyle = clickColor;
        mtCtx.lineWidth = 2;
        mtCtx.beginPath();
        mtCtx.arc(cp.x, cp.y, (1 - cp.life) * cp.maxRadius, 0, Math.PI * 2);
        mtCtx.stroke();
      }
      else if (cp.type === 'burst') {
        cp.x += cp.vx; cp.y += cp.vy;
        mtCtx.fillStyle = clickColor;
        mtCtx.beginPath();
        mtCtx.arc(cp.x, cp.y, 4 * cp.life, 0, Math.PI * 2);
        mtCtx.fill();
      }
      else if (cp.type === 'geo') {
        cp.x += cp.vx; cp.y += cp.vy; cp.rot += cp.rotSpeed;
        mtCtx.fillStyle = clickColor;
        mtCtx.save();
        mtCtx.translate(cp.x, cp.y);
        mtCtx.rotate(cp.rot);
        if (cp.shape === 'square') mtCtx.fillRect(-cp.size / 2, -cp.size / 2, cp.size, cp.size);
        else if (cp.shape === 'triangle') {
          mtCtx.beginPath(); mtCtx.moveTo(0, -cp.size); mtCtx.lineTo(cp.size * 0.866, cp.size * 0.5); mtCtx.lineTo(-cp.size * 0.866, cp.size * 0.5); mtCtx.fill();
        }
        else if (cp.shape === 'circle') {
          mtCtx.beginPath(); mtCtx.arc(0, 0, cp.size / 1.5, 0, Math.PI * 2); mtCtx.fill();
        }
        mtCtx.restore();
      }
    }
  }

  // ========== 初始化 ==========
  document.addEventListener('DOMContentLoaded', function () {
    var styleEl = document.getElementById('mt-style');
    var clickEl = document.getElementById('mc-style');
    var colorEl = document.getElementById('mt-color');
    var dynamicEl = document.getElementById('mt-dynamic');

    if (styleEl) styleEl.value = localStorage.getItem('mt_style') || 'none';
    if (clickEl) clickEl.value = localStorage.getItem('mc_style') || 'none';
    if (colorEl) colorEl.value = localStorage.getItem('mt_color') || '#ffb6c1';
    if (dynamicEl) dynamicEl.checked = localStorage.getItem('mt_dynamic') === 'true';

    applyMouseTrailSettings();
    animateMouseTrail();
  });

  window.applyMouseTrailSettings = applyMouseTrailSettings;

  console.log('[Renderer] mouse-trail.js 已就绪');
})();
