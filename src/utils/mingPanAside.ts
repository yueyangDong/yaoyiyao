/**
 * 命盘旁参（**展示层**，不产判据）
 *
 * 用途：占卜页面（六爻 / 梅花 / 灵签 / 大六壬）回答的是「这一问」，
 * 而用户自己的四柱回答的是「我这个人」。这一层把后者摆出来并列对照，
 * 让人自己看出「盘面说的和我这个人像不像」。
 *
 * ⚠️ 三条硬边界（改之前先读）
 * 1. **不产分数、不进任何判据**。占卜吉凶仍由 `divinationCore.verdictOf` 决定；
 *    这一层连 score 字段都没有——不是「值为 0」，是压根没有。
 *    （`docs/divination-consistency.md` §7.0：判据层一律不接用户八字）
 * 2. **不做判词**。只陈述盘面事实（你是乙木、偏弱、喜火土、现在走戊寅运），
 *    绝不写「所以你该……」。要给建议去八字页，那里有完整引用链。
 *    强弱只是结构，不分好坏——「偏弱」不等于命差，页面必须说清这点。
 * 3. **四柱必须走 `personChart.buildRawChart`**（全站唯一构造四柱的出口）。
 *    真太阳时校正与晚子时流派由调用方算好传进来，本文件不再自己 `getEightChar()`，
 *    也不 import `UserContext`（那会把 React 拉进 utils，跑脚本时会炸）。
 */

import { buildRawChart, currentDayunOf, type WanZiSect } from './personChart';
import { analyzeDayMasterStrength, recommendYongShen } from './baziAnalysis';
import { calcWuxingStats } from './wuxingFlow';
import { ganZhiOfYear } from './liunianReading';
import { GAN_WX } from './wuXingRelations';
import { DZ_WX } from './diZhiRelations';
import { normalizeGender } from './divinationCore';

/** 五行 → 主题色（CSS 变量）。与八字页 `WX_COLORS` 同源，改色只改这里再同步页面 */
const WX_COLOR: Record<string, string> = {
  木: 'var(--wx-wood)',
  火: 'var(--wx-fire)',
  土: 'var(--wx-earth)',
  金: 'var(--wx-metal)',
  水: 'var(--wx-water)',
};

/** 强弱五档 → 白话。⚠️ 只是描述结构，不带褒贬，别写成「旺就好」 */
const STRENGTH_PLAIN: Record<string, string> = {
  身极强: '很旺',
  身强: '偏旺',
  中和: '中和',
  身弱: '偏弱',
  身极弱: '很弱',
};

export interface AsidePillar {
  label: '年' | '月' | '日' | '时';
  ganZhi: string;
  gan: string;
  zhi: string;
  ganColor: string;
  zhiColor: string;
  /** 只有时柱可能为 true：出生时辰没填，按午时推定 */
  guessed: boolean;
}

export interface MingPanAside {
  pillars: AsidePillar[];
  dayGan: string;
  dayWx: string;
  /** 原始档位（身强/身弱/中和/身极强/身极弱） */
  strengthLevel: string;
  /** 白话档位（偏旺/偏弱/中和…） */
  strengthPlain: string;
  yongShen: string[];
  jiShen: string[];
  /** 未起运 / 性别未知时为 null（不写「你没填」） */
  dayun: { ganZhi: string; startAge: number; endAge: number } | null;
  liunian: { year: number; ganZhi: string; wx: string };
  /** 时柱是否按午时推定 */
  hourGuessed: boolean;
}

export interface MingPanAsideInput {
  year: number;
  month: number;
  day: number;
  /** 出生时辰；缺省 = 不知时辰，按午时推定且不做真太阳时校正 */
  hour?: number | null;
  minute?: number | null;
  gender?: string | null;
  calendar?: 'solar' | 'lunar';
  /** 农历闰月出生。⚠️ 只在 calendar='lunar' 时生效，漏传会整体错一个月 */
  isLeap?: boolean;
  ziShiSect?: WanZiSect;
  /** 调用方用 correctSolarTime 算好的真太阳时；不知时辰时会被忽略 */
  trueSolar?: { hour: number; minute: number; dayOffset: number } | null;
  currentYear?: number;
}

/**
 * 构造旁参数据。出生信息不全（缺年月日）返回 null——页面据此**整块不显示**，
 * 不写「请先填写出生信息」那种空状态：占卜页的主角是卦，不是档案。
 */
export function buildMingPanAside(input: MingPanAsideInput): MingPanAside | null {
  const { year, month, day } = input;
  if (!year || !month || !day) return null;
  if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear()) return null;

  const currentYear = input.currentYear ?? new Date().getFullYear();
  const hourGuessed = input.hour == null || !Number.isFinite(input.hour);
  const h = hourGuessed ? 12 : Math.trunc(input.hour as number);
  const mi = hourGuessed ? 0 : Math.trunc(input.minute ?? 0);

  // ⚠️ 时辰本身是推定的，就不要再做真太阳时校正——基准值是假的，再校正只是制造假精确
  //    （与 Bazi.tsx 的 hourUnknown 分支同口径）
  const ts = !hourGuessed && input.trueSolar
    ? input.trueSolar
    : { hour: h, minute: mi, dayOffset: 0 };

  const { eightChar, pillars, dayGan, dayWx } = buildRawChart(
    year, month, day, ts.hour, ts.minute, ts.dayOffset,
    input.calendar ?? 'solar', (input.calendar ?? 'solar') === 'lunar' && input.isLeap === true,
    input.ziShiSect ?? 2,
  );

  const strength = analyzeDayMasterStrength(dayGan, pillars[1].diZhi, pillars);
  const rec = recommendYongShen(
    dayWx, strength.level, calcWuxingStats(pillars), dayGan, pillars[1].diZhi, pillars,
  );

  // 性别未知就不给大运：大运顺逆由「年干阴阳 × 性别」决定，猜错整排反着走
  // （与 kinStars / 神煞的分档纪律一致：未知走中性，不默认男命）
  const g = normalizeGender(input.gender);
  const dy = g ? currentDayunOf(eightChar, g, year, currentYear) : null;

  const ln = ganZhiOfYear(currentYear);
  const labels = ['年', '月', '日', '时'] as const;

  return {
    pillars: pillars.map((p, i) => ({
      label: labels[i],
      ganZhi: p.ganZhi,
      gan: p.tianGan,
      zhi: p.diZhi,
      ganColor: WX_COLOR[GAN_WX[p.tianGan] || ''] || 'var(--text-primary)',
      zhiColor: WX_COLOR[DZ_WX[p.diZhi] || ''] || 'var(--text-primary)',
      guessed: i === 3 && hourGuessed,
    })),
    dayGan,
    dayWx,
    strengthLevel: strength.level,
    strengthPlain: STRENGTH_PLAIN[strength.level] || strength.level,
    yongShen: rec.yongShen || [],
    jiShen: rec.xiShen || [],
    dayun: dy && !dy.isPreStart
      ? { ganZhi: dy.ganZhi, startAge: dy.startAge, endAge: dy.endAge }
      : null,
    liunian: { year: currentYear, ganZhi: ln.ganZhi, wx: ln.wx },
    hourGuessed,
  };
}
