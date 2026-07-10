// 数据缓存工具
const CACHE_PREFIX = 'fortune_cache_';

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.expires && Date.now() > entry.expires) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data as T;
  } catch { return null; }
}

export function setCache<T>(key: string, data: T, ttlMs?: number) {
  try {
    const entry = {
      data,
      expires: ttlMs ? Date.now() + ttlMs : undefined,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

export function removeCache(key: string) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

export function hashParams(params: Record<string, any>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
