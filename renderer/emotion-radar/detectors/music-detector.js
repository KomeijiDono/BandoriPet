/**
 * music-detector.js — 音乐特征检测器
 * 消费 BandoriIPC.on('audio-fft') 的 64 元素 FFT 数据
 * 分析 bass（低频能量占比）、energy（总能量）、spectralCentroid（频谱重心）
 * 输出信号：bassRatio, energy, spectralCentroid, isMusicPlaying
 */
(function () {
  'use strict';

  var bassHistory = [];
  var energyHistory = [];
  var historyMax = 20;
  var onUpdate = null;
  var fftHandler = null;

  function calcBassRatio(fftData, bassStart, bassEnd) {
    var bassSum = 0;
    var totalSum = 0;
    bassStart = bassStart || 0;
    bassEnd = bassEnd || 12;

    for (var i = 0; i < fftData.length; i++) {
      var val = fftData[i] * fftData[i];
      totalSum += val;
      if (i >= bassStart && i < bassEnd) {
        bassSum += val;
      }
    }
    return totalSum > 0 ? bassSum / totalSum : 0;
  }

  function calcEnergy(fftData) {
    var sum = 0;
    for (var i = 0; i < fftData.length; i++) {
      sum += fftData[i] * fftData[i];
    }
    return sum;
  }

  function calcSpectralCentroid(fftData) {
    var weightedSum = 0;
    var totalSum = 0;
    for (var i = 0; i < fftData.length; i++) {
      var mag = Math.abs(fftData[i]);
      weightedSum += mag * i;
      totalSum += mag;
    }
    return totalSum > 0 ? weightedSum / totalSum : 0;
  }

  function start(callback) {
    if (typeof window.BandoriIPC === 'undefined') {
      console.warn('[MusicDetector] BandoriIPC 不可用');
      return;
    }

    onUpdate = callback;

    fftHandler = function (fftData) {
      if (!fftData || fftData.length < 64) return;

      var config = (window.EmotionConfig && window.EmotionConfig.detectors.music) || {};
      var bassStart = config.bassBinStart || 0;
      var bassEnd = config.bassBinEnd || 12;

      var bassRatio = calcBassRatio(fftData, bassStart, bassEnd);
      var energy = calcEnergy(fftData);
      var spectralCentroid = calcSpectralCentroid(fftData);

      bassHistory.push(bassRatio);
      energyHistory.push(energy);
      if (bassHistory.length > historyMax) bassHistory.shift();
      if (energyHistory.length > historyMax) energyHistory.shift();

      var bassTrend = 0;
      var energyTrend = 0;
      if (bassHistory.length >= 3) {
        var recentBass = bassHistory.slice(-3);
        var recentEnergy = energyHistory.slice(-3);
        bassTrend = recentBass[2] - recentBass[0];
        energyTrend = recentEnergy[2] - recentEnergy[0];
      }

      var energyThreshold = config.energyThreshold || 0.3;
      var bassRatioThreshold = config.bassRatioThreshold || 0.35;
      var isMusicPlaying = energy > energyThreshold && bassRatio > bassRatioThreshold;

      if (typeof onUpdate === 'function') {
        onUpdate({
          bassRatio: bassRatio,
          energy: energy,
          spectralCentroid: spectralCentroid,
          bassTrend: bassTrend,
          energyTrend: energyTrend,
          isMusicPlaying: isMusicPlaying
        });
      }
    };

    window.BandoriIPC.on('audio-fft', fftHandler);
  }

  function stop() {
    if (window.BandoriIPC && fftHandler) {
      window.BandoriIPC.off('audio-fft', fftHandler);
    }
    onUpdate = null;
    fftHandler = null;
    bassHistory = [];
    energyHistory = [];
  }

  window.MusicDetector = {
    start: start,
    stop: stop
  };

  console.log('[MusicDetector] 已就绪');
})();
