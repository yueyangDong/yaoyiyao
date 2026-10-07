// ========== 出生信息 → 命盘（全站唯一排盘入口） ==========
//
// 为什么要抽到这里：
//   项目里原本存在三套并行的四柱构造 —— Bazi.tsx 的 handleCalc（页面内联、带真太阳时/
//   晚子时/大运）、HePan.tsx 的 buildPerson（合盘双方）、以及命盘对比页。MEMORY.md 已标注
//   这是隐患：改口径（真太阳时、十神、晚子时）必须逐处同步，否则各页结论不一致。
//
//   现已收口为两层：
//     ① buildRawChart()  ← **唯一**构造四柱的地方（Solar/Lunar + dayOffset + 八字符 + PillarData）
//     ② buildPerson()    ← 在 ① 之上补「合盘/对比」需要的派生（神煞、旺衰、用神、紫微、生肖纳音）
//   Bazi.tsx 直接消费 ①，页面内只留「大运/起运、命格、空亡、地势、自坐」等页面专属逻辑。
//
// ⚠️ 新增任何「需要四柱」的功能，一律从这两个函数取；**不要再出现第四处 `lunar.getEightChar()`**。

import { Lunar, Solar, type EightChar } from 'lunar-typescript';
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
 * 晚子时（23:00–23:59）日柱归属流派，三处排盘入口（八字页 / 合盘页 / 命盘对比页）共用同一取值：
 *   1 = 日柱算次日（`lunar-typescript` 的 sect=1；也是紫微底层 core 的原生口径）
 *   2 = 日柱算当天（`lunar-typescript` 默认 sect=2）——**本项目默认**，与 Bazi.tsx 表单默认值一致
 * 选 1 或 2 只影响 23:00–23:59 出生者；其他时辰两档结果完全相同。
 */
export type WanZiSect = 1 | 2;
export const WAN_ZI_DEFAULT: WanZiSect = 2;

/** 表单/档案里读到的流派值归一化（非法值一律回落到默认 2） */
export function normalizeWanZi(sect?: number | null): WanZiSect {
  return sect === 1 ? 1 : WAN_ZI_DEFAULT;
}

/**
 * 为合盘/对比双方排紫微命盘（轻量版：只保留需要的宫位名/宫位地支/主星/生年四化）。
 * 排盘失败时返回 undefined —— 调用方对该项按中性分计并明确说明，
 * 不用"基础缘分分"这类含糊兜底（见 MEMORY.md：兜底文案不得写成"用户缺数据"）。
 *
 * ⚠️ 晚子时口径对齐（ziShiSect）：紫微底层 core 的换日行为**固定为「算次日」**——
 * `fixLateZiHour` 在 `_dayDivision='normal'`（GlobalConfigs 默认值）下把农历日 +1，
 * 而 GlobalConfigs 未从包内导出、`bySolar` 也不接受配置项，无法直接切换。
 * 因此「算当天」这一档靠**前移一天**来借用 core 自己的 +1：传入 D-1 的 23:xx，
 * core 换日后正好落回出生日 D，时支仍为子，农历日/月/年也由 core 的 `next(1)` 正确进位
 * （跨月末、年末均可）。副作用：core 回显的 `lunisolarDate` 字段在该档位下是前移后的日期，
 * **不要用它展示**（本函数只取 palaces；页面文案自行由出生信息生成）。
 */
export function buildZiweiChart(solar: any, gender: string, ziShiSect: WanZiSect = WAN_ZI_DEFAULT): any[] | undefined {
  try {
    const hour = solar.getHour();
    // 「算当天」档 + 晚子时 → 前移一天，让 core 的 +1 落回出生日
    const dayShift = ziShiSect === 2 && hour === 23 ? -1 : 0;
    const date = new Date(
      solar.getYear(), solar.getMonth() - 1, solar.getDay() + dayShift,
      hour, solar.getMinute(), 0,
    );
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
 * 排盘「原料」——四柱与八字符本体，供各页各自派生（八字页要大运/命格，合盘页要神煞/紫微）。
 * 这是全站**唯一**构造四柱的地方：任何页面都不应再自己 `Solar.fromYmdHms(...).getLunar().getEightChar()`。
 */
export interface RawChart {
  /** 真太阳时校正后的公历对象（展示/生肖/起运等都用它） */
  solar: Solar;
  /** 与 solar 对应的农历对象 */
  lunar: Lunar;
  /** 八字符本体：页面可直接 getYun / getXunKong / getDiShi（晚子时流派已在此设置完毕） */
  eightChar: EightChar;
  /** 年/月/日/时四柱（时柱的 unknown 标记由调用方自行补，见 Bazi.tsx） */
  pillars: PillarData[];
  dayGan: string;
  dayWx: string;
}

/**
 * 构造四柱（全站唯一入口）。
 *
 * @param dayOffset 真太阳时校正跨午夜时的日历日偏移（**必须传**，否则日柱会错一天）
 * @param calendar  'solar' | 'lunar'；@param isLeap 农历闰月
 * @param ziShiSect 晚子时流派，必须在取柱/起运之前设置（1=日柱算次日 / 2=算当天，默认 2）
 *
 * 历法等价性：农历输入等价于 `Lunar → Solar → next(dayOffset) → Lunar`，
 * 与公历输入的 `Solar → next(dayOffset) → Lunar` 走同一结果（此前 Bazi.tsx 的两条分支已合并到此）。
 */
export function buildRawChart(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  dayOffset = 0,
  calendar: 'solar' | 'lunar' = 'solar',
  isLeap = false,
  ziShiSect: WanZiSect = WAN_ZI_DEFAULT,
): RawChart {
  let solar = calendar === 'lunar'
    ? Lunar.fromYmdHms(year, isLeap ? -month : month, day, hour, minute, 0).getSolar()
    : Solar.fromYmdHms(year, month, day, hour, minute, 0);
  if (dayOffset !== 0) solar = solar.next(dayOffset);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  // 晚子时流派：必须在取柱/起运之前设置
  if (ziShiSect === 1) ec.setSect(1);

  const pillars: PillarData[] = [
    { pillar: '年柱', ganZhi: ec.getYear(), tianGan: ec.getYearGan(), diZhi: ec.getYearZhi(), cangGan: ec.getYearHideGan(), shiShen: ec.getYearShiShenGan(), shiShenZhi: (ec.getYearShiShenZhi() || []).join('/'), nayin: ec.getYearNaYin() },
    { pillar: '月柱', ganZhi: ec.getMonth(), tianGan: ec.getMonthGan(), diZhi: ec.getMonthZhi(), cangGan: ec.getMonthHideGan(), shiShen: ec.getMonthShiShenGan(), shiShenZhi: (ec.getMonthShiShenZhi() || []).join('/'), nayin: ec.getMonthNaYin() },
    { pillar: '日柱', ganZhi: ec.getDay(), tianGan: ec.getDayGan(), diZhi: ec.getDayZhi(), cangGan: ec.getDayHideGan(), shiShen: ec.getDayShiShenGan(), shiShenZhi: (ec.getDayShiShenZhi() || []).join('/'), nayin: ec.getDayNaYin() },
    { pillar: '时柱', ganZhi: ec.getTime(), tianGan: ec.getTimeGan(), diZhi: ec.getTimeZhi(), cangGan: ec.getTimeHideGan(), shiShen: ec.getTimeShiShenGan(), shiShenZhi: (ec.getTimeShiShenZhi() || []).join('/'), nayin: ec.getTimeNaYin() },
  ];
  const dayGan = ec.getDayGan();
  return { solar, lunar, eightChar: ec, pillars, dayGan, dayWx: TG_WX[dayGan] || '' };
}

/**
 * 从出生信息生成命盘。
 * @param calendar 出生日期的历法；@param isLeap 农历闰月；
 * @param dayOffset 真太阳时校正跨午夜时的日历日偏移；
 * @param name 展示名，缺省按性别取「男方/女方」；
 * @param ziShiSect 晚子时流派（1=日柱算次日 / 2=日柱算当天，默认 2）。八字与紫微两侧同取此值，
 *        保证「同一张盘里的八字结论与紫微结论」用的是同一个「日」。
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
  ziShiSect: WanZiSect = WAN_ZI_DEFAULT,
): PersonChart {
  const { solar, lunar, eightChar: ec, pillars, dayGan, dayWx } = buildRawChart(
    year, month, day, hour, minute, dayOffset, calendar, isLeap, ziShiSect,
  );
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
    ziwei: buildZiweiChart(solar, gender, ziShiSect),
    birthInfo: `${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, '0')}`,
  };
}
