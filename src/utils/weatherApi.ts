import { Geolocation } from '@capacitor/geolocation';
import { COUNTY_GEO } from '../data/countyGeo';
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
        // 反查城市名（县区级，open-meteo geocoding 不支持反向，用内置坐标库）
        try {
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

/**
 * 系统定位（统一 API）：Android/iOS 走 Capacitor 原生定位（自动请求运行时权限），
 * Web 走该插件内置的浏览器 navigator.geolocation 实现。
 */
export async function getPositionNative(): Promise<GeoPosition> {
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 10000,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** 定位 + 城市反查（近似判断） */
export async function getPositionWithCity(): Promise<GeoPosition> {
  const pos = await getPositionNative();
  const city = await reverseGeocode(pos.lat, pos.lng);
  return { ...pos, city };
}

/** Haversine 球面距离（km） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 模块级缓存 entries，避免每次反查重复 Object.entries
const COUNTY_ENTRIES: [string, number, number][] = Object.entries(COUNTY_GEO).map(([k, [lng, lat]]) => [k, lng, lat]);
const MAX_MATCH_KM = 30;

/** 经纬度 → 区县（最近邻，30km 阈值）。返回 '省,市,区县' 或 '未知'。 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const [key, clng, clat] of COUNTY_ENTRIES) {
    const d = haversineKm(lat, lng, clat, clng);
    if (d < bestDist) { bestDist = d; bestKey = key; }
  }
  return bestKey && bestDist <= MAX_MATCH_KM ? bestKey : '未知';
}

const CITY_SUFFIX = /(市|自治州|地区|盟)$/;
const COUNTY_SUFFIX = /(市辖区|自治县|自治旗|县|区|旗|市)$/;

function stripSuffix(name: string, suffix: RegExp): string {
  const cleaned = name.replace(suffix, '');
  return cleaned || name;
}

/** '省,市,区县' → '市·区县' 紧凑显示名；'未知' 与非法输入原样返回。 */
export function formatCountyName(key: string): string {
  if (!key || key === '未知') return key;
  const parts = key.split(',');
  if (parts.length !== 3) return key;
  return `${stripSuffix(parts[1], CITY_SUFFIX)}·${stripSuffix(parts[2], COUNTY_SUFFIX)}`;
}
