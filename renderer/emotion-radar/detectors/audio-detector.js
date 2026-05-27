/**
 * audio-detector.js — 系统音频检测器
 * 消费 BandoriIPC.on('audio-fft') 的 64 元素 FFT 数据
 * 输出信号：rms（音量均方根）, peakDetected, sustainedPeak
 */
(function () {
  'use strict';

  var lastRMS = 0;
  var peakStartTime = 0;
  var isSustained = false;
  var onUpdate = null;
  var fftHandler = null;

  function calcRMS(fftData) {
    var sum = 0;
    for (var i = 0; i < fftData.length; i++) {
      sum += fftData[i] * fftData[i];
    }
    return Math.sqrt(sum / fftData.length);
  }

  function start(callback) {
    if (typeof window.BandoriIPC === 'undefined') {
      console.warn('[AudioDetector] BandoriIPC 不可用');
      return;
    }

    onUpdate = callback;

    fftHandler = function (fftData) {
      if (!fftData || fftData.length < 64) return;

      var rms = calcRMS(fftData);
      var config = (window.EmotionConfig && window.EmotionConfig.detectors.audio) || {};

      var peakThreshold = config.peakThreshold || 0.55;
      var peakDuration = config.peakDuration || 3000;
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

      if (typeof onUpdate === 'function') {
        onUpdate({
          rms: rms,
          peakDetected: peakDetected,
          sustainedPeak: sustainedPeak
        });
      }

      lastRMS = rms;
    };

    window.BandoriIPC.on('audio-fft', fftHandler);
  }

  function stop() {
    if (window.BandoriIPC && fftHandler) {
      window.BandoriIPC.off('audio-fft', fftHandler);
    }
    onUpdate = null;
    fftHandler = null;
  }

  window.AudioDetector = {
    start: start,
    stop: stop
  };

  console.log('[AudioDetector] 已就绪');
})();
