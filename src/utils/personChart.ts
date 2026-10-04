// ========== 出生信息 → 命盘（合盘与命盘对比共用的唯一排盘入口） ==========
//
// 为什么要抽到这里：
//   项目里原本存在两套并行的四柱构造 —— Bazi.tsx 的 handleCalc（页面内联、带真太阳时/
//   晚子时/大运）与 HePan.tsx 的 buildPerson（合盘双方）。MEMORY.md 已标注这是隐患：
//   改口径（真太阳时、十神）必须两处同步，否则合盘与八字页结论不一致。
//   命盘对比页若再写第三套，隐患会翻倍 —— 所以把 buildPerson 提到 utils 共用。
//
// ⚠️ 本文件是「合盘 / 对比」这条链路的排盘口径；Bazi.tsx 的 handleCalc 仍独立存在
//   （它多出大运、起运、晚子时流派开关等页面专属逻辑）。两处若改口径需同步。

import { Lunar, Solar } from 'lunar-typescript';
import { ziwei } from '@ziweijs/core';
import type { PillarData } from '../pages/Bazi';
import { calcShenSha, type ShenShaItem } from './shenSha';
import { analyzeDayMasterStrength, recommendYongShen } from './baziAnalysis';

export const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

export interface PersonChart {
  name: string;
  gender: string;
  dayGan: string;
  dayWx: string;
  dayZhi: string;
  pillars: PillarData[];
  /** 神煞落点（含吉凶类型），供合盘神煞共振 / 力量模型使用 */
  shenSha: ShenShaItem[];
  zodiac: string;
  nayin: string;
  strengthLevel: string;
  yongShen: string[];
  ziwei?: any[];
  birthInfo: string;
}

/**
 * 为合盘/对比双方排紫微命盘（轻量版：只保留需要的宫位名/宫位地支/主星/生年四化）。
 * 排盘失败时返回 undefined —— 调用方对该项按中性分计并明确说明，
 * 不用"基础缘分分"这类含糊兜底（见 MEMORY.md：兜底文案不得写成"用户缺数据"）。
 */
export function buildZiweiChart(solar: any, gender: string): any[] | undefined {
  try {
    const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), 0);
    const result = ziwei.bySolar({
      name: '',
      gender: gender === 'male' ? 'male' : 'female',
      date,
      language: 'zh-CN',
    } as any);
    return (result.palaces || []).map((p: any) => ({
      name: p.name,
      branch: p.branch, // 命宫地支合冲合参需要（紫微合盘标准判法的一环）
      majorStars: (p.majorStars || []).map((s: any) => ({
        name: s.name,
        sihua: s.YT?.name || null,
      })),
    }));
  } catch {
    return undefined;
  }
}

/**
 * 从出生信息生成命盘。
 * @param calendar 出生日期的历法；@param isLeap 农历闰月；
 * @param dayOffset 真太阳时校正跨午夜时的日历日偏移；
 * @param name 展示名，缺省按性别取「男方/女方」
 */
export function buildPerson(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: string,
  dayOffset = 0,
  calendar: 'solar' | 'lunar' = 'solar',
  isLeap = false,
  name?: string,
): PersonChart {
  let solar = calendar === 'lunar'
    ? Lunar.fromYmdHms(year, isLeap ? -month : month, day, hour, minute, 0).getSolar()
    : Solar.fromYmdHms(year, month, day, hour, minute, 0);
  if (dayOffset !== 0) solar = solar.next(dayOffset);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const pillars: PillarData[] = [
    { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
    { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
    { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
    { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
  ];
  const dayGan = ec.getDayGan();
  const dayWx = TG_WX[dayGan] || '';
  // 身强身弱与八字页完全同一口径：analyzeDayMasterStrength 五维评分（月令/根气/印星/比劫/克泄）五档，
  // recommendYongShen 据此取用神。校准：旧版"比劫≥2 即身强"不看月令根气，
  // 且身弱喜用误取 WX_SHENG（我生者=食伤，泄身之物），应为印星（生我者）。
  const strength = analyzeDayMasterStrength(dayGan, pillars[1].diZhi, pillars);
  const yongRec = recommendYongShen(dayWx, strength.level, undefined, dayGan, pillars[1].diZhi);
  return {
    name: name || (gender === 'male' ? '男方' : '女方'),
    gender,
    dayGan,
    dayWx,
    dayZhi: pillars[2].diZhi,
    pillars,
    shenSha: calcShenSha(pillars, gender === 'female' ? 'female' : 'male'),
    zodiac: lunar.getYearShengXiao(),
    nayin: ec.getDayNaYin(),
    strengthLevel: strength.level,
    yongShen: yongRec.yongShen,
    ziwei: buildZiweiChart(solar, gender),
    birthInfo: `${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, '0')}`,
  };
}
