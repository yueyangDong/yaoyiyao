// ========== 两张命盘对比：可测的纯逻辑 ==========
//
// 与页面（pages/ChartCompare.tsx）分离，理由：页面的表单/渲染无法在 node 环境断言，
// 而这里的「出生信息 → 命盘 → 共振相似度」链路**必须**能被测试钉住。
//
// 排盘口径复用 utils/personChart.ts（与合盘同一入口），真太阳时复用 UserContext 的统一入口，
// 禁止在本文件内另写四柱构造 —— 项目曾因此出现"合盘与八字页结论不一致"。

import { resolveBirthTime } from './solarTime';
import { buildPerson, normalizeWanZi, type PersonChart, type WanZiSect } from './personChart';
import { compareShenShaCharts, type ShaSimilarityResult } from './shenShaSimilarity';
import { isValidSolarDate, isSolarFuture, isValidLunarDate, isLunarFuture } from './dateValidation';

export interface PersonForm {
  calendar: 'solar' | 'lunar';
  isLeap?: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: 'male' | 'female';
  name?: string;
/** 出生地（区划编码数组，省/市/区），仅在 trueSolar=true 时用于真太阳时校正；否则不参与排盘 */
  birthplace?: string[];
  /**
   * 晚子时（23:00–23:59）日柱归属流派：1=算次日 / 2=算当天（缺省 2）。
   * 只影响晚子时出生者；八字与紫微两侧同取此值，避免同一张盘里两套口径。
   */
  ziShiSect?: WanZiSect;
  /** 按真太阳时排盘（默认 false = 按钟表时间；true 时才会用 birthplace 做经度校正） */
  trueSolar?: boolean;
}

/** 表单校验：返回错误文案，null = 通过 */
export function validatePersonForm(f: PersonForm): string | null {
  if (!f || !f.year || !f.month || !f.day || f.hour === undefined || f.hour === null) {
    return '请填写完整的出生信息（年/月/日/时）';
  }
  if (f.calendar === 'lunar') {
    if (!isValidLunarDate(f.year, f.month, f.day, !!f.isLeap)) return '农历日期不存在（请检查月份天数或闰月设置）';
    if (isLunarFuture(f.year, f.month, f.day, !!f.isLeap)) return '农历生日不能晚于今天';
  } else {
    if (!isValidSolarDate(f.year, f.month, f.day)) return '公历日期不存在';
    if (isSolarFuture(f.year, f.month, f.day)) return '生日不能晚于今天';
  }
  return null;
}

/** 出生信息 → 命盘（排盘时间口径走 solarTime.resolveBirthTime：默认钟表时间，显式开启才校正） */
export function formToChart(f: PersonForm): PersonChart {
  const ts = resolveBirthTime(
    {
      year: f.year, month: f.month, day: f.day,
      hour: f.hour, minute: f.minute || 0, birthplace: f.birthplace,
      calendar: f.calendar, isLeap: !!f.isLeap,
    },
    f.trueSolar === true,
  );
  const chart = buildPerson(
    f.year, f.month, f.day, ts.hour, ts.minute,
    f.gender === 'male' ? 'male' : 'female',
    ts.dayOffset, f.calendar, !!f.isLeap, f.name,
    normalizeWanZi(f.ziShiSect),
  );
  if (ts.note) chart.timeNote = ts.note;
  return chart;
}

export interface ChartCompareResult {
  a: PersonChart;
  b: PersonChart;
  similarity: ShaSimilarityResult;
}

/** 两张盘 → 对比结果。任一侧校验失败时抛错（文案可直接展示）。 */
export function comparePersons(fa: PersonForm, fb: PersonForm): ChartCompareResult {
  const ea = validatePersonForm(fa);
  if (ea) throw new Error(`第一张盘：${ea}`);
  const eb = validatePersonForm(fb);
  if (eb) throw new Error(`第二张盘：${eb}`);
  const a = formToChart(fa);
  const b = formToChart(fb);
  const similarity = compareShenShaCharts(
    { pillars: a.pillars, shenSha: a.shenSha, yongShen: a.yongShen },
    { pillars: b.pillars, shenSha: b.shenSha, yongShen: b.yongShen },
  );
  return { a, b, similarity };
}
