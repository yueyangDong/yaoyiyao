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

// ========== 排盘时间口径（全站唯一出口） ==========
//
// ⚠️ 背景（2026-11-26 修）：此前「只要填了出生地就静默做真太阳时校正」，而中国绝大多数城市在
//    东经 120° 以西（北京 116.4° → −14 分钟），于是 15:00 出生会被悄悄排成未时——
//    表单明明写着「15时(申时)」，结果却是辛未，页面上没有任何提示。
//    现改为：**默认按钟表时间（北京时间）排盘**；真太阳时是显式开关（默认关），
//    开启后若校正改动了时辰，必须在结果里明说「钟表属X时 / 真太阳时属Y时」。

const TRUE_SOLAR_KEY = 'fortune_app_true_solar';

/** 真太阳时开关的全局偏好（localStorage；档案驱动的页面——合盘我方、命盘旁参——也读它） */
export function isTrueSolarPref(): boolean {
  try {
    return localStorage.getItem(TRUE_SOLAR_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTrueSolarPref(on: boolean): void {
  try {
    if (on) localStorage.setItem(TRUE_SOLAR_KEY, '1');
    else localStorage.removeItem(TRUE_SOLAR_KEY);
  } catch {
    /* 隐私模式等写不进去：只影响本次会话之后的页面，不报错 */
  }
}

const DIZHI_12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 钟点 → 时支（与 lunar-typescript 的 computeTimeZhi 同式：⌊(hour+1)/2⌋ mod 12） */
export function zhiOfHour(hour: number): string {
  return DIZHI_12[Math.floor((Math.trunc(hour) + 1) / 2) % 12];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface ResolveBirthTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  calendar?: 'solar' | 'lunar';
  isLeap?: boolean;
  /** 出生地（区划编码数组，省/市/区）；与 lng 二选一 */
  birthplace?: string[] | null;
  /** 直接给经度（档案里存的）；优先于 birthplace 解析 */
  lng?: number | null;
}

export interface ResolvedBirthTime {
  hour: number;
  minute: number;
  dayOffset: number;
  lng: number;
  /** 是否真的做了真太阳时校正 */
  corrected: boolean;
  /** 校正后时支与钟表时支不同 */
  zhiChanged: boolean;
  /** 开了开关却没有出生地/经度（调用方据此提示） */
  missingPlace: boolean;
  /** 钟表时间的时支 */
  clockZhi: string;
  /** 面向用户的说明；无可说则空串 */
  note: string;
}

/**
 * 出生时间 → 实际排盘时间（八字页 / 紫微页 / 合盘 / 命盘对比 / 命盘旁参共用的唯一入口）。
 *
 * @param trueSolar 是否按真太阳时排盘（**默认应为 false**：钟表时间即排盘时间）
 *
 * 规则：
 *   - false：原样返回，dayOffset=0，不校正；
 *   - true 且能拿到经度：按 correctSolarTime 校正（经度差 + 均时差），跨午夜给 dayOffset；
 *   - true 但没有出生地/经度：不校正，`missingPlace=true`，由调用方提示。
 */
export function resolveBirthTime(input: ResolveBirthTimeInput, trueSolar: boolean): ResolvedBirthTime {
  const { year, month, day, hour, minute } = input;
  const clockZhi = zhiOfHour(hour);
  const base: ResolvedBirthTime = {
    hour, minute, dayOffset: 0, lng: 120, corrected: false, zhiChanged: false,
    missingPlace: false, clockZhi, note: '',
  };
  if (!trueSolar) return base;

  const bp = input.birthplace;
  let lng: number | null = null;
  if (typeof input.lng === 'number' && Number.isFinite(input.lng)) lng = input.lng;
  else if (bp && bp.length >= 2) lng = getCityLng(bp[0], bp[1], bp[2]);
  if (lng === null || lng === undefined) return { ...base, missingPlace: true };

  const ts = correctSolarTime({
    year, month, day, hour, minute: minute || 0, lng,
    calendar: input.calendar ?? 'solar', isLeap: !!input.isLeap,
  });
  const solarZhi = zhiOfHour(ts.hour);
  const zhiChanged = solarZhi !== clockZhi;
  let note = `已按真太阳时排盘：钟表时间 ${pad2(hour)}:${pad2(minute || 0)} 属${clockZhi}时；`;
  note += `出生地经度 ${lng.toFixed(1)}°E，真太阳时 ${pad2(ts.hour)}:${pad2(ts.minute)} 属${solarZhi}时`;
  note += zhiChanged
    ? `——两者不同，本盘按${solarZhi}时排。若按北京时间排则为${clockZhi}时，关闭上方「真太阳时」开关即可。`
    : '——时辰不变。';
  if (ts.dayOffset !== 0) note += ts.dayOffset > 0 ? '（校正后跨到次日）' : '（校正后跨回前一日）';
  return {
    hour: ts.hour, minute: ts.minute, dayOffset: ts.dayOffset || 0, lng,
    corrected: true, zhiChanged, missingPlace: false, clockZhi, note,
  };
}
