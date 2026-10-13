// ========== 流年（单年 + 十年列表）计算 ==========
//
// 为什么抽到这里：原先这段是 pages/Bazi.tsx 的模块级私有函数（仅页面内使用）。
// 现在「一句话看懂你的八字」结论卡也要引用今年流年，而结论文案属于 utils 层
// （项目纪律：解读文案不进页面组件）。故提取为共用模块，Bazi.tsx 改为 import。
//
// 【2026-10-13 改版】desc 白话化 + 接喜忌
//   旧 desc 长这样：「流年「丙(火)」生日主——印绶之年！利学业考证、贵人相助，适合进修深造。」
//   两个问题：
//     ① 术语密度过高（日主 / 印绶 / 食伤 / 官杀 / 比和），普通用户读不懂；
//     ② **只看天干五行 vs 日主，完全不看喜忌**——于是同一张流年卡上出现两套说法打架：
//        上面 desc 写「官杀之年！有压力有挑战」（对任何盘都这么说），
//        下面按用神/忌神算出来的领域标签却可能写「事业 · 顺」。
//   现在：主题取「年干对日主的十神大类」，基调取「年干五行 ∈ 用神 / 忌神」，
//   句式统一为「{定性}的一年，{动作}。」，不含任何命理术语。
//
// ⚠️ 分工必须写清楚，别把 desc 当成完整判定：
//   · 本文件的 desc 只吃**流年天干五行**，回答的是"这一年整体什么调性"；
//   · 地支层（冲/合/刑/害/伏吟/反吟 → 落命局哪一柱 → 哪个人生领域 → 喜忌定向）
//     在 utils/liunianInteraction，由页面挂在卡片下方的领域标签与弹窗里。
//   一个说"什么调性"，一个说"动到哪一块"，两层互补、不重复。
//
// ⚠️ 五行表已收口到 utils/wuXingRelations：本文件原先自留 TG_WX + wxSheng/wxKe 副本，
//   而"自留副本抄错一个字就是静默判反（不报错、方向反了）"，故一律走唯一出口。

import {
  GAN_WX,
  deriveJiShen,
  relationKindOfShiShen,
  tenGodOf,
  type RelationKind,
} from './wuXingRelations';

// 天干/地支**序列**（不是五行表）——ganZhiOfYear 的取模需要，故留在本地。
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface LiuNianItem {
  year: number;
  ganZhi: string;
  wx: string;
  desc: string;
}

export interface LiuNianOpts {
  /** 用神五行列表（baziAnalysis.recommendYongShen 口径）——给了 desc 才有吉凶基调 */
  yongShen?: string[];
  /**
   * **完整忌神**（PersonChart.jiShen）。传了就以此为准；
   * 不传则退化为 `deriveJiShen(dayWx, strengthLevel, yongShen)` 轻量扶抑兜底
   * ——那套不认从格/从旺（喜忌反转）与破用变忌。
   */
  jiShen?: string[];
  /** 旺衰档，仅在没给 jiShen 时用于兜底推导 */
  strengthLevel?: string;
}

/** 吉凶基调 */
type Tone = 'good' | 'bad' | 'neutral';

/**
 * (十神大类, 吉凶基调) → 一句白话。
 * 基调由「年干五行 ∈ 用神 / 忌神」决定；未传喜忌时一律 neutral
 * （= 只讲这一年的主题、不下吉凶判断），所以**永远不会说反**。
 * ⚠️ 这 15 条是页面卡片上给用户看的第一句话，最长 26 字——加长会顶破
 *    plainConclusion 的 240 字上限（结论卡直接引用本 desc）。
 */
const LIUNIAN_PLAIN: Record<RelationKind, Record<Tone, string>> = {
  yin: {
    good: '有靠山的一年，适合进修考试、找贵人，把基础打厚。',
    bad: '容易被好意绊住的一年，帮忙要量力，别替人扛事。',
    neutral: '适合蓄力的一年，多学多看，别急着做大动作。',
  },
  bijie: {
    good: '同辈给力的一年，结伴做事比单干快，先谈好规矩。',
    bad: '竞争感偏强的一年，合作前先把规矩谈清楚。',
    neutral: '按部就班的一年，与同伴同行最省力。',
  },
  shishang: {
    good: '点子最容易出成果的一年，把想法做成看得见的东西。',
    bad: '容易想多做少的一年，收一收，专注一两件事。',
    neutral: '表达欲平平的一年，照常做，不必强求输出。',
  },
  cai: {
    good: '进账有路的一年，主动去谈、去争取，等不来。',
    bad: '花钱的地方偏多的一年，守好现金流，别撑面子。',
    neutral: '收支平稳的一年，该收的收，该省的省。',
  },
  guansha: {
    good: '责任加身的一年，扛住就是升级，值得拼一把。',
    bad: '压力偏大的一年，规矩变多，宜守不宜攻。',
    neutral: '守住本分的一年，不出头，也不躲事。',
  },
};

/** 十神算不出来时（缺日干等）的兜底，只讲基调不讲主题 */
const FALLBACK_PLAIN: Record<Tone, string> = {
  good: '走得顺的一年，顺着势头往前推，别错过机会。',
  bad: '偏逆的一年，守住基本盘，别硬冲。',
  neutral: '平稳的一年，按部就班往前走。',
};

/**
 * 公历年份 → 干支与天干五行。
 * 甲子起于公元 4 年，故以 (year − 4) 取模；负数年份按模 10/12 归一。
 * 全站需要"某年是什么干支"时一律走这里（大运/流年互动引擎、流月、结论卡共用）。
 */
export function ganZhiOfYear(year: number): { gan: string; zhi: string; ganZhi: string; wx: string } {
  const tgIdx = (((year - 4) % 10) + 10) % 10;
  const dzIdx = (((year - 4) % 12) + 12) % 12;
  const gan = TIAN_GAN[tgIdx];
  const zhi = DI_ZHI[dzIdx];
  return { gan, zhi, ganZhi: gan + zhi, wx: GAN_WX[gan] || '' };
}

/**
 * 流年天干五行的吉凶基调。
 * 用神 → good；忌神 → bad；都沾不上 → neutral（不下判断）。
 * 忌神优先用调用方给的完整口径，否则退化为轻量扶抑兜底。
 */
function toneOfYearWx(wx: string, dayWx: string, opts: LiuNianOpts): Tone {
  if (!wx) return 'neutral';
  const { yongShen, jiShen, strengthLevel } = opts;
  if ((yongShen || []).includes(wx)) return 'good';
  const ji = jiShen ?? deriveJiShen(dayWx, strengthLevel, yongShen);
  if (ji.includes(wx)) return 'bad';
  return 'neutral';
}

/**
 * 单年流年：干支 + 天干五行 + 一句白话（主题 + 吉凶基调）。
 *
 * @param year 公历年
 * @param dayGan 日主天干——十神（主题）与日主五行（喜忌兜底）都由它推出来
 * @param opts 用神 / 忌神 / 旺衰档；不传则 desc 只讲主题、不下吉凶
 */
export function calcLiuNianItem(year: number, dayGan: string, opts: LiuNianOpts = {}): LiuNianItem {
  const { gan: yearGan, zhi: yearZhi, wx: yearWx } = ganZhiOfYear(year);
  const dayWx = GAN_WX[dayGan] || '';
  const relation = relationKindOfShiShen(tenGodOf(dayGan, yearGan));
  const tone = toneOfYearWx(yearWx, dayWx, opts);
  const desc = relation ? LIUNIAN_PLAIN[relation][tone] : FALLBACK_PLAIN[tone];
  return { year, ganZhi: yearGan + yearZhi, wx: yearWx, desc };
}

/** 从 startYear 起连续 10 年 */
export function buildLiuNianList(
  startYear: number,
  dayGan: string,
  opts: LiuNianOpts = {},
): LiuNianItem[] {
  return Array.from({ length: 10 }, (_, i) => calcLiuNianItem(startYear + i, dayGan, opts));
}
