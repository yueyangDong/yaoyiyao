// ========== 神煞「力量模型」（power model） ==========
//
// 目的：修掉旧口径的硬伤——旧版 calcShenSha 是纯布尔命中（0/1），
// 下游文案按「名字」索引，导致两张只共享一个弱煞的盘会输出同一句话（假性重合）。
//
// 本模块给每一处神煞落点算一个 power ∈ [0,1]，表示「这颗煞在盘里到底有多发力」，
// 再供 shenShaSimilarity.ts 做加权相似度，替换掉「数共同神煞个数」的判据。
//
// power = clamp( 宫位权重 × 得地系数 × 空亡系数 × 制化系数 × 喜忌系数 , 0, 1 )
//
// 各因子口径（均为乘性、各自独立可解释）：
//   1. 宫位权重  palace   —— 月支/日支 = 1.0（命局重心），年支/时支 = 0.6（本气轻）
//   2. 得地系数  deDi     —— 该柱地支对日干的十二长生宫，临官/帝旺 = 1.0，绝地 = 0.3
//   3. 空亡系数  kong     —— 该柱地支落本旬空亡 = 0.35（有名无实）
//   4. 制化系数  relation —— 该柱地支被冲 = 0.40、被合 = 0.55、被刑 = 0.75、被害 = 0.80
//                            （取最强制化，不用连乘，避免过度归零）
//   5. 喜忌系数  xiJi     —— 吉煞落用神五行 = 1.0，未落 = 0.70；
//                            凶煞落用神 = 0.85（得用则凶性稍减），未落 = 1.0
//
// ⚠️ 刻意【不】建模的东西（避免伪精度，别当成漏做）：
//   - 不引入「忌神」概念：项目里 yongShen 只是一组五行（baziAnalysis 的 getYongShen 口径），
//     没有权威的忌神列表，硬推会让系数看起来精确、实际是臆造。
//   - 不做「岁运引动」：原局自带 vs 流年引动是两种性质，但本项目神煞引擎只跑原局。
//   - 不做「透干加成」：绝大多数神煞本就是支位判定，透干不构成加成依据。
//
// ⚠️ 空亡自身不参与空亡系数（自指），否则「空亡」这颗星会被自己打成 0.35，语义错乱。
//
// 阈值 SHENSHA_POWER_BANDS 由 3000 张真实命盘（1935–2005，lunar-typescript 排盘）
// 的 power 分布分位数标定，见 __tests__/shenShaSimilarity.test.ts。

import type { PillarData } from '../pages/Bazi';
import { getKongWang } from './shenSha';

export interface ShaPowerItem {
  name: string;
  pillar: string;
  type: '吉' | '凶' | '平';
  /** 实际发力强度 0~1（不含吉凶方向，方向由 type 承载） */
  power: number;
  /** 按 SHENSHA_POWER_BANDS 归的档位 */
  level: '强' | '中' | '弱';
  /** 逐因子明细，供调试与展示 */
  factors: {
    palace: number;
    deDi: number;
    kong: number;
    relation: number;
    xiJi: number;
    /** 命中该柱的制化类型（无则空） */
    relationType: string;
    /** 该柱地支对日干的十二长生宫名 */
    changSheng: string;
  };
}

export interface ShaPowerInput {
  pillars: PillarData[];
  shenSha: { name: string; pillar: string; type?: '吉' | '凶' | '平' }[];
  /** '身强' | '身弱' | '中和' | '身极强' | '身极弱'，缺省时不做身强修正 */
  strengthLevel?: string;
  /** 用神五行，如 ['木','火']，缺省时喜忌系数按未命中处理 */
  yongShen?: string[];
}

const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const PILLARS = ['年柱', '月柱', '日柱', '时柱'];

/** 各干长生支 */
const CHANG_SHENG_START: Record<string, string> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅',
  己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};
const YANG_GAN = ['甲', '丙', '戊', '庚', '壬'];
const CHANG_SHENG_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
/** 十二长生 → 得地系数 */
const CHANG_SHENG_FACTOR: Record<string, number> = {
  长生: 0.9, 沐浴: 0.8, 冠带: 0.9, 临官: 1.0, 帝旺: 1.0, 衰: 0.7,
  病: 0.6, 死: 0.4, 墓: 0.5, 绝: 0.3, 胎: 0.6, 养: 0.7,
};

const ZHI_WX: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 宫位权重 */
export const PALACE_WEIGHT = { 年柱: 0.6, 月柱: 1.0, 日柱: 1.0, 时柱: 0.6 } as const;

/** 制化系数（取最强一档，不连乘） */
export const RELATION_FACTOR: Record<string, number> = { 冲: 0.4, 合: 0.55, 刑: 0.75, 害: 0.8 };

/** 喜忌系数：[用神命中, 用神未命中] */
export const XIJI_FACTOR: Record<'吉' | '凶' | '平', [number, number]> = {
  吉: [1.0, 0.7],
  凶: [0.85, 1.0],
  平: [0.85, 0.85],
};

/** 空亡系数 */
export const KONG_FACTOR = 0.35;

/**
 * 力量档位阈值——由 3000 张真实命盘（1935–2005，seed 20261004）的 power 分布**分位数**标定：
 *   p30 = 0.20、p50 = 0.28、p70 = 0.40
 * 故取 strong = p70、medium = p30 → 强/中/弱 约为 30% / 40% / 30%。
 * ⚠️ 不要凭直觉改这两个数：它们是分布量纲的锚点，
 *    改后必须同步 __tests__/shenShaSimilarity.test.ts 的分位断言。
 */
export const SHENSHA_POWER_BANDS = { strong: 0.4, medium: 0.2 } as const;

export function powerLevel(power: number): '强' | '中' | '弱' {
  if (power >= SHENSHA_POWER_BANDS.strong) return '强';
  if (power >= SHENSHA_POWER_BANDS.medium) return '中';
  return '弱';
}

/** 天干对地支的十二长生宫名 */
export function changShengOf(gan: string, zhi: string): string {
  const startZhi = CHANG_SHENG_START[gan];
  const si = DZ.indexOf(startZhi);
  const zi = DZ.indexOf(zhi);
  if (si < 0 || zi < 0) return '';
  const offset = YANG_GAN.includes(gan) ? (zi - si + 12) % 12 : (si - zi + 12) % 12;
  return CHANG_SHENG_NAMES[offset];
}

/** 地支两两关系（六冲/六合/六害/相刑） */
const CHONG: [string, string][] = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const HE: [string, string][] = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const HAI: [string, string][] = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
const XING: [string, string][] = [
  ['子', '卯'], ['寅', '巳'], ['巳', '申'], ['寅', '申'],
  ['丑', '戌'], ['戌', '未'], ['丑', '未'],
  ['辰', '辰'], ['午', '午'], ['酉', '酉'], ['亥', '亥'],
];

function hasPair(list: [string, string][], a: string, b: string): boolean {
  return list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** 某柱地支与其他三柱的关系类型集合（不看天干，只看地支之间的作用） */
export function branchRelationsOf(pillars: PillarData[], idx: number): string[] {
  const self = pillars[idx]?.diZhi;
  if (!self) return [];
  const out: string[] = [];
  for (let j = 0; j < pillars.length; j++) {
    if (j === idx) {
      // 自刑：辰午酉亥见本支重复（四柱中出现同支）
      if (XING.some(([x, y]) => x === y && x === self)) out.push('刑');
      continue;
    }
    const other = pillars[j]?.diZhi;
    if (!other) continue;
    if (hasPair(CHONG, self, other)) out.push('冲');
    if (hasPair(HE, self, other)) out.push('合');
    if (hasPair(XING, self, other)) out.push('刑');
    if (hasPair(HAI, self, other)) out.push('害');
  }
  return [...new Set(out)];
}

/** 取最强制化：冲 > 合 > 刑 > 害 */
function strongestRelation(types: string[]): { factor: number; type: string } {
  let best = { factor: 1, type: '' };
  for (const t of types) {
    const f = RELATION_FACTOR[t];
    if (f !== undefined && f < best.factor) best = { factor: f, type: t };
  }
  return best;
}

/**
 * 计算每处神煞落点的实际力量。
 * 同名多柱会各自出一条（柱位不同、力量不同），聚合交给 fingerprint。
 */
export function calcShenShaPower(input: ShaPowerInput): ShaPowerItem[] {
  const { pillars, shenSha, yongShen = [] } = input;
  const kongWang = pillars[2]?.ganZhi ? getKongWang(pillars[2].ganZhi) : [];
  const dayGan = pillars[2]?.tianGan || '';

  return shenSha.map((item) => {
    const idx = Math.max(0, PILLARS.indexOf(item.pillar));
    const zhi = pillars[idx]?.diZhi || '';
    const type = item.type || '平';

    const palace = PALACE_WEIGHT[item.pillar as keyof typeof PALACE_WEIGHT] ?? 0.6;

    const cs = changShengOf(dayGan, zhi);
    const deDi = CHANG_SHENG_FACTOR[cs] ?? 1;

    // 空亡自身不参与空亡系数（自指）
    const kong = item.name !== '空亡' && kongWang.includes(zhi) ? KONG_FACTOR : 1;

    const rel = strongestRelation(branchRelationsOf(pillars, idx));

    const inYong = yongShen.includes(ZHI_WX[zhi] || '');
    const xiJi = XIJI_FACTOR[type][inYong ? 0 : 1];

    const power = Math.min(1, Math.max(0, palace * deDi * kong * rel.factor * xiJi));

    return {
      name: item.name,
      pillar: item.pillar,
      type,
      power: Number(power.toFixed(4)),
      level: powerLevel(power),
      factors: {
        palace, deDi, kong, relation: rel.factor, xiJi,
        relationType: rel.type, changSheng: cs,
      },
    };
  });
}

/**
 * 命盘神煞指纹：神煞名 → 该盘最強一处的力量。
 * 同名多柱取 max（而非求和），避免「同名出现两次」被当成两倍相似度。
 */
export function buildShaFingerprint(input: ShaPowerInput): Record<string, number> {
  const fp: Record<string, number> = {};
  for (const it of calcShenShaPower(input)) {
    fp[it.name] = Math.max(fp[it.name] ?? 0, it.power);
  }
  return fp;
}

/** 力量档位 → 展示色（沿用项目的吉凶配色习惯：吉煞偏青、凶煞偏红） */
export function powerLevelColor(level: '强' | '中' | '弱'): string {
  return level === '强' ? '#d46b08' : level === '中' ? '#8c8c8c' : '#bfbfbf';
}
