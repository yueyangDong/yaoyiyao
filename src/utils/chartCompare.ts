// ========== 两张命盘对比：可测的纯逻辑 ==========
//
// 与页面（pages/ChartCompare.tsx）分离，理由：页面的表单/渲染无法在 node 环境断言，
// 而这里的「出生信息 → 命盘 → 共振相似度」链路**必须**能被测试钉住。
//
// 排盘口径复用 utils/personChart.ts（与合盘同一入口），真太阳时复用 UserContext 的统一入口，
// 禁止在本文件内另写四柱构造 —— 项目曾因此出现"合盘与八字页结论不一致"。

import { getCityLng, correctSolarTime } from '../context/UserContext';
import { buildPerson, type PersonChart } from './personChart';
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
  /** 出生地（区划编码数组，省/市/区），用于真太阳时校正；不传按东八区 120°E */
  birthplace?: string[];
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

/** 出生信息 → 命盘（真太阳时校正走 UserContext 统一入口） */
export function formToChart(f: PersonForm): PersonChart {
  const bp = f.birthplace;
  const lng = bp && bp.length >= 2 ? getCityLng(bp[0], bp[1], bp[2]) : 120;
  const ts = correctSolarTime({
    year: f.year, month: f.month, day: f.day,
    hour: f.hour, minute: f.minute || 0, lng,
    calendar: f.calendar, isLeap: !!f.isLeap,
  });
  return buildPerson(
    f.year, f.month, f.day, ts.hour, ts.minute,
    f.gender === 'male' ? 'male' : 'female',
    ts.dayOffset || 0, f.calendar, !!f.isLeap, f.name,
  );
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
    { pillars: a.pillars, shenSha: a.shenSha, strengthLevel: a.strengthLevel, yongShen: a.yongShen },
    { pillars: b.pillars, shenSha: b.shenSha, strengthLevel: b.strengthLevel, yongShen: b.yongShen },
  );
  return { a, b, similarity };
}
