/**
 * 真太阳时 / 城市经度 —— 从 `context/UserContext` 拆出来的独立模块。
 *
 * ⚠️ 为什么必须拆（2026-11-23）：
 *   这两个函数原本定义在 `UserContext.tsx` 末尾。而 UserContext 是**首屏同步依赖**
 *   （`main → App → UserProvider`），于是：
 *     - `import { Lunar } from 'lunar-typescript'`  → lunar 整包进首屏
 *     - `import { getNameByCode } from 'cn-division'` → 全国行政区划表（~200 KB gzip）进首屏
 *   实测首屏 gzip 728 KB，其中 calendar-vendor 一项就 234 KB，而这些函数首屏一次都没调用过
 *   （首页只显示一行农历、Layout 只在「保存档案」时查经度）。
 *
 *   拆开后：谁用谁引。页面都是 `React.lazy`，所以农历/区划表随页面加载；首屏只剩框架与 UI。
 *
 * ⚠️ 调用点请直接从这里 import，**不要**再从 UserContext re-export——
 *   re-export 同样是静态依赖，会把整包重新拖回首屏。
 */

import { Lunar } from 'lunar-typescript';
import { getNameByCode } from 'cn-division';
import { CITY_LNG_MAP } from '../data/cityLng';

export { CITY_LNG_MAP };

/**
 * 城市 → 经度。
 * 兼容两种入参：区划编码（Cascader value:'c'）与中文名称——
 * `getNameByCode` 只认编码，传名称会返回 undefined，此时原样保留。
 */
export function getCityLng(province: string, city: string, district?: string): number {
  const p = getNameByCode(province) || province;
  const c = getNameByCode(city) || city;
  const d = district ? (getNameByCode(district) || district) : '';
  // 1) 精确3级匹配：省,市,区
  if (d) {
    const key3 = `${p},${c},${d}`;
    if (CITY_LNG_MAP[key3] !== undefined) return CITY_LNG_MAP[key3];
  }
  // 2) 2级匹配：省,市
  const key2 = `${p},${c}`;
  if (CITY_LNG_MAP[key2] !== undefined) return CITY_LNG_MAP[key2];
  // 3) 模糊匹配：key包含市名
  for (const [k, v] of Object.entries(CITY_LNG_MAP)) {
    if (k.includes(c)) return v;
  }
  return 120;
}

/**
 * 真太阳时校正：平太阳时（标准时 + 经度差 4 分钟/度）+ 均时差（Equation of Time，±16 分钟）。
 * 返回 dayOffset：校正跨越午夜时日历日的偏移（-1/0/1），调用方必须同步平移出生日期，
 * 否则日柱会排错一天（如乌鲁木齐 00:10 → 真太阳时为前一日 22:00 左右）。
 * 注意：必须先对总分钟数取整再拆 hour/minute——若先拆再对 minute 四舍五入，
 * 边界会产出 minute=60（如 11:59.6 → hour=11,minute=60），lunar-typescript 会抛 "wrong minute 60"。
 * @param date 公历出生日期（用于计算均时差；不传则忽略均时差，仅做经度校正）
 */
export function getTrueSolarHour(hour: number, minute: number, lng: number, date?: Date): { hour: number; minute: number; dayOffset: number } {
  const offsetMinutes = Math.round((lng - 120) * 4);
  // 均时差近似式（NOAA）：B = 2π(n-81)/364，EoT = 9.87·sin2B − 7.53·cosB − 1.5·sinB
  let eot = 0;
  if (date) {
    const start = Date.UTC(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000) + 1;
    const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
    eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }
  // 先取整再拆分：保证 hour/minute/dayOffset 三者永远自洽，minute ∈ [0,59]
  const total = Math.round(hour * 60 + minute + offsetMinutes + eot);
  const dayOffset = Math.floor(total / (24 * 60));
  const within = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { hour: Math.floor(within / 60), minute: within % 60, dayOffset };
}

/**
 * 真太阳时校正统一入口（八字/紫微/合盘共用，避免各页复制分叉）：
 * - 农历输入先换算为公历日再算均时差（EoT 只与公历日期有关，直接拿农历数字当公历会偏 1~3 分钟）；
 * - 均时差与经度无关，lng=120（或城市库未命中回退 120）只要调用本函数就会校正 EoT；
 * - 返回的 dayOffset 由调用方同步平移出生日期（Solar/Lunar.next(dayOffset)）。
 */
export function correctSolarTime(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  lng: number;
  calendar?: 'solar' | 'lunar';
  isLeap?: boolean;
}): { hour: number; minute: number; dayOffset: number } {
  const { year, month, day, hour, minute, lng, calendar = 'solar', isLeap = false } = params;
  let solarDate: Date;
  if (calendar === 'lunar') {
    const s = Lunar.fromYmdHms(year, isLeap ? -month : month, day, 12, 0, 0).getSolar();
    solarDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
  } else {
    solarDate = new Date(year, month - 1, day);
  }
  return getTrueSolarHour(hour, minute, lng, solarDate);
}
