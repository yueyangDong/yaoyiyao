// 天气 API：open-meteo，无需 API Key
const CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

export interface WeatherData {
  temp: number;
  weatherCode: number;
  windSpeed: number;
  sunrise: string;
  sunset: string;
  city?: string;
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const WEATHER_ICONS: Record<string, string> = {
  '0': '☀️', '1': '🌤️', '2': '⛅', '3': '☁️',
  '45': '🌫️', '48': '🌫️',
  '51': '🌧️', '53': '🌧️', '55': '🌧️',
  '61': '🌧️', '63': '🌧️', '65': '🌧️',
  '71': '❄️', '73': '❄️', '75': '❄️', '77': '❄️',
  '80': '🌦️', '81': '🌦️', '82': '🌦️',
  '95': '⛈️', '96': '⛈️', '99': '⛈️',
};

const WEATHER_DESC: Record<string, string> = {
  '0': '晴', '1': '少云', '2': '多云', '3': '阴',
  '45': '雾', '48': '霜雾',
  '51': '小雨', '53': '小雨', '55': '小雨',
  '61': '雨', '63': '雨', '65': '大雨',
  '71': '小雪', '73': '中雪', '75': '大雪', '77': '雪',
  '80': '阵雨', '81': '阵雨', '82': '暴雨',
  '95': '雷暴', '96': '冰雹雷暴', '99': '强雷暴',
};

export function getWeatherIcon(code: number): string {
  return WEATHER_ICONS[String(code)] || '🌤️';
}

export function getWeatherDesc(code: number): string {
  return WEATHER_DESC[String(code)] || '多云';
}

function getCacheKey(lat: number, lng: number): string {
  return `${CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

function getCached(lat: number, lng: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(lat, lng));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_DURATION) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(lat: number, lng: number, data: WeatherData) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(lat, lng), JSON.stringify(entry));
  } catch { /* quota exceeded, ignore */ }
}

export async function getWeather(lat: number, lng: number): Promise<WeatherData> {
  const cached = getCached(lat, lng);
  if (cached) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=sunrise,sunset&timezone=auto&forecast_days=1`;

  const res = await fetch(url);
  const data = await res.json();

  const result: WeatherData = {
    temp: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
  };

  setCache(lat, lng, result);
  return result;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  city?: string;
}

export function getUserPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        // 反查城市名
        try {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=zh&format=json&latitude=${result.lat}&longitude=${result.lng}`;
          // open-meteo geocoding 不支持反向，用简单的数字判断
          // 使用中国主要城市近似判断
          result.city = await reverseGeocode(result.lat, result.lng);
        } catch {
          result.city = '未知';
        }
        resolve(result);
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 中国主要城市坐标近似判断
  const cities: [string, number, number][] = [
    ['北京', 39.9, 116.4], ['上海', 31.2, 121.5], ['广州', 23.1, 113.3],
    ['深圳', 22.5, 114.1], ['杭州', 30.3, 120.2], ['南京', 32.1, 118.8],
    ['成都', 30.6, 104.1], ['武汉', 30.6, 114.3], ['重庆', 29.6, 106.5],
    ['西安', 34.3, 108.9], ['天津', 39.1, 117.2], ['苏州', 31.3, 120.6],
    ['长沙', 28.2, 113.0], ['郑州', 34.8, 113.7], ['济南', 36.7, 117.0],
    ['青岛', 36.1, 120.4], ['大连', 38.9, 121.6], ['厦门', 24.5, 118.1],
    ['福州', 26.1, 119.3], ['昆明', 25.0, 102.7], ['哈尔滨', 45.8, 126.5],
    ['沈阳', 41.8, 123.4], ['长春', 43.9, 125.3],
  ];

  let closest = '北京';
  let minDist = Infinity;
  for (const [name, clat, clng] of cities) {
    const dist = Math.abs(lat - clat) + Math.abs(lng - clng);
    if (dist < minDist) { minDist = dist; closest = name; }
  }
  return minDist < 3 ? closest : '未知';
}
