/**
 * weather.js — 天气 API 获取
 * 依赖：fetchWeather 函数 + DOM 元素 weather-text
 */
(function () {
  'use strict';

  // 从配置文件加载天气 API URL
  var geoApiUrl = window.ConfigLoader ? window.ConfigLoader.get('external.geoApiUrl', 'https://get.geojs.io/v1/ip/geo.json') : 'https://get.geojs.io/v1/ip/geo.json';
  var weatherApiUrl = window.ConfigLoader ? window.ConfigLoader.get('external.weatherApiUrl', 'https://api.open-meteo.com/v1/forecast') : 'https://api.open-meteo.com/v1/forecast';
  var weatherInterval = window.ConfigLoader ? window.ConfigLoader.get('external.weatherInterval', 3600000) : 3600000;

  // 通过IP地理定位获取经纬度 → 调用Open-Meteo免费天气API → 渲染天气信息
  async function fetchWeather() {
    var weatherEl = document.getElementById('weather-text');
    if (!weatherEl) return;
    try {
      var ipRes = await fetch(geoApiUrl);
      if (!ipRes.ok) throw new Error("IP请求失败");
      var ipData = await ipRes.json();

      var latitude = ipData.latitude;
      var longitude = ipData.longitude;
      var city = ipData.city || ipData.country || "未知位置";

      if (!latitude || !longitude) {
        weatherEl.innerText = "IP经纬度解析失败";
        return;
      }

      var weatherRes = await fetch(weatherApiUrl + '?latitude=' + latitude + '&longitude=' + longitude + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
      var weatherData = await weatherRes.json();

      var temp = weatherData.current.temperature_2m;
      var humidity = weatherData.current.relative_humidity_2m;
      var wind = weatherData.current.wind_speed_10m;
      var code = weatherData.current.weather_code;

      var svgStart = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; flex-shrink: 0;">';
      var svgEnd = '</svg>';

      // WMO天气码 → SVG图标 + 中文描述映射
      var desc = "未知";
      var svgIcon = "";

      if (code === 0) {// 晴朗
        desc = "晴朗";
        svgIcon = svgStart + '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' + svgEnd;
      }
      else if (code === 1 || code === 2 || code === 3) {// 多云/阴天
        desc = code === 3 ? "阴天" : "多云";
        svgIcon = svgStart + '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>' + svgEnd;
      }
      else if (code === 45 || code === 48) {
        desc = "有雾";
        svgIcon = svgStart + '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path><line x1="8" y1="23" x2="16" y2="23"></line><line x1="6" y1="20" x2="18" y2="20"></line>' + svgEnd;
      }
      else if (code >= 51 && code <= 67) {
        desc = (code === 65 || code === 67) ? "大雨" : "降雨";
        svgIcon = svgStart + '<path d="M16 13v8"></path><path d="M8 13v8"></path><path d="M12 15v8"></path><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>' + svgEnd;
      }
      else if (code >= 71 && code <= 86) {
        desc = "降雪";
        svgIcon = svgStart + '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line>' + svgEnd;
      }
      else if (code >= 95) {
        desc = "雷暴";
        svgIcon = svgStart + '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>' + svgEnd;
      }

      weatherEl.innerHTML = '<span style="display: flex; align-items: center; justify-content: center;">' + city + ' <span style="margin: 0 6px; opacity: 0.5;">|</span> ' + svgIcon + ' ' + desc + ' <span style="margin: 0 6px; opacity: 0.5;">|</span> ' + temp + '°C <span style="margin: 0 6px; opacity: 0.5;">|</span> 湿度 ' + humidity + '% <span style="margin: 0 6px; opacity: 0.5;">|</span> 风速 ' + wind + 'km/h</span>';

    } catch (error) {
      console.error("天气获取失败:", error);
      weatherEl.innerText = "网络异常，请检查连接";
    }
  }

  fetchWeather();
  setInterval(fetchWeather, weatherInterval);

  window.fetchWeather = fetchWeather;

  console.log('[Renderer] weather.js 已就绪');
})();
