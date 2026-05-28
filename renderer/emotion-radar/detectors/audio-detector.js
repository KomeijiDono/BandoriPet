/**
 * audio-detector.js — 统一音频检测器
 * 消费 BandoriIPC.on('audio-fft') 的 64 元素 FFT 数据
 * 合并原 audio-detector 和 music-detector 功能
 * 输出信号：rms, peakDetected, sustainedPeak, bassRatio, energy, spectralCentroid, isMusicPlaying, energyTrend
 */
(function () {
  'use strict';

  // 音量检测状态
  var lastRMS = 0;
  var peakStartTime = 0;
  var isSustained = false;

  // 音乐特征历史
  var bassHistory = [];
  var energyHistory = [];
  var historyMax = 20;

  // 回调和处理器
  var onUpdate = null;
  var fftHandler = null;

  // ---- 计算函数 ----

  function calcRMS(fftData) {
    var sum = 0;
    for (var i = 0; i < fftData.length; i++) {
      sum += fftData[i] * fftData[i];
    }
    return Math.sqrt(sum / fftData.length);
  }

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

  // ---- FFT 处理器 ----

  function handleFFT(fftData) {
    if (!fftData || fftData.length < 64) return;

    var audioConfig = (window.EmotionConfig && window.EmotionConfig.detectors.audio) || {};
    var musicConfig = (window.EmotionConfig && window.EmotionConfig.detectors.music) || {};

    // 音量检测
    var rms = calcRMS(fftData);
    var peakThreshold = audioConfig.peakThreshold || 0.55;
    var peakDuration = audioConfig.peakDuration || 3000;
    var peakDetected = rms > peakThreshold;

    if (peakDetected && !isSustained) {
      peakStartTime = Date.now();
      isSustained = true;
    }
    if (!peakDetected) {
      isSustained = false;
      peakStartTime = 0;
    }
    var sustainedPeak = isSustained && (Date.now() - peakStartTime) > peakDuration;

    // 音乐特征检测
    var bassStart = musicConfig.bassBinStart || 0;
    var bassEnd = musicConfig.bassBinEnd || 12;
    var bassRatio = calcBassRatio(fftData, bassStart, bassEnd);
    var energy = calcEnergy(fftData);
    var spectralCentroid = calcSpectralCentroid(fftData);

    // 更新历史
    bassHistory.push(bassRatio);
    energyHistory.push(energy);
    if (bassHistory.length > historyMax) bassHistory.shift();
    if (energyHistory.length > historyMax) energyHistory.shift();

    // 计算趋势
    var bassTrend = 0;
    var energyTrend = 0;
    if (bassHistory.length >= 3) {
      var recentBass = bassHistory.slice(-3);
      var recentEnergy = energyHistory.slice(-3);
      bassTrend = recentBass[2] - recentBass[0];
      energyTrend = recentEnergy[2] - recentEnergy[0];
    }

    // 判断是否有音乐播放
    var energyThreshold = musicConfig.energyThreshold || 0.3;
    var bassRatioThreshold = musicConfig.bassRatioThreshold || 0.35;
    var isMusicPlaying = energy > energyThreshold && bassRatio > bassRatioThreshold;

    lastRMS = rms;

    // 统一回调
    if (typeof onUpdate === 'function') {
      onUpdate({
        // 音量相关
        rms: rms,
        peakDetected: peakDetected,
        sustainedPeak: sustainedPeak,
        // 音乐特征相关
        bassRatio: bassRatio,
        energy: energy,
        spectralCentroid: spectralCentroid,
        bassTrend: bassTrend,
        energyTrend: energyTrend,
        isMusicPlaying: isMusicPlaying
      });
    }
  }

  // ---- 公共 API ----

  function start(callback) {
    if (typeof window.BandoriIPC === 'undefined') {
      console.warn('[AudioDetector] BandoriIPC 不可用');
      return;
    }

    onUpdate = callback;
    fftHandler = handleFFT;
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

  // 保持向后兼容：同时暴露 AudioDetector 和 MusicDetector
  var detector = {
    start: start,
    stop: stop
  };

  window.AudioDetector = detector;
  window.MusicDetector = detector;  // 向后兼容

  console.log('[AudioDetector] 已就绪（合并版）');
})();
