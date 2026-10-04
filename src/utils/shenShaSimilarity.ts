// ========== 神煞相似度（加权版，替换「数共同神煞个数」的旧判据） ==========
//
// 旧口径的问题（已实测）：任意两张真实命盘平均命中 14.93 颗神煞、平均共享 6 颗，
// 「共同神煞 ≥ 3」会把 94.1% 的盘对判成高重合 → 判别力接近 0。
//
// 新口径：把每颗煞按 shenShaPower 的力量加权，用加权 Jaccard（Ruzicka）算相似度：
//
//     sim = Σ_name min(wA, wB) / Σ_name max(wA, wB)      （对两盘神煞名的并集求和）
//
// 性质：两盘都命中且力量都很强 → 逼近 1；只有一边命中、或命中但力量很弱 → 逼近 0。
// 这天然惩罚了「弱煞蹭相似度」的情况，也保留了「强煞共振」的判别力。

import { buildShaFingerprint, type ShaPowerInput } from './shenShaPower';

export interface ShaSimilarityResult {
  /** 加权 Jaccard，0~1 */
  score: number;
  level: '高' | '中' | '低';
  /** 共同神煞及其相似度贡献（weight = min(wA,wB)），按贡献降序 */
  shared: { name: string; weight: number }[];
  /** A 有 B 无（按 A 侧力量降序） */
  onlyA: string[];
  /** B 有 A 无（按 B 侧力量降序） */
  onlyB: string[];
  /** 旧判据对照：共同神煞个数（不含力量、不做归一化） */
  sharedCount: number;
}

/**
 * 相似度档位阈值——由 3000 张真实命盘两两配对（71,700 对，seed 20261004）标定：
 *   分布 p50 = 0.158、p90 = 0.264、p95 = 0.300、max = 0.815
 * 故取 high = 0.30（≈ 前 5%，真·高度重合）、medium = 0.22（≈ 前 21%）。
 *
 * 对照：同样这批盘对，旧判据「共同神煞 ≥ 3」会判出 93.9% 高重合——
 * 新口径在 0.30 处只判 5.0%，判别力提升约 19 倍。
 *
 * ⚠️ 这两个数是量纲锚点，改后必须同步测试里的占比/分位断言。
 */
export const SHENSHA_SIMILARITY_BANDS = { high: 0.3, medium: 0.22 } as const;

export function shaSimilarityLevel(score: number): '高' | '中' | '低' {
  if (score >= SHENSHA_SIMILARITY_BANDS.high) return '高';
  if (score >= SHENSHA_SIMILARITY_BANDS.medium) return '中';
  return '低';
}

/** 纯函数：两份指纹 → 加权 Jaccard。便于单测与复用。 */
export function fingerprintSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
): ShaSimilarityResult {
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  let inter = 0;
  let union = 0;
  const shared: { name: string; weight: number }[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];

  for (const name of names) {
    const wa = a[name] ?? 0;
    const wb = b[name] ?? 0;
    const lo = Math.min(wa, wb);
    const hi = Math.max(wa, wb);
    inter += lo;
    union += hi;
    if (lo > 0) shared.push({ name, weight: Number(lo.toFixed(4)) });
    else if (wa > 0) onlyA.push(name);
    else onlyB.push(name);
  }

  const score = union === 0 ? 1 : inter / union;
  shared.sort((x, y) => y.weight - x.weight);
  // 独有项按"自己这一侧的力量"降序（onlyA 看 a 的权重，onlyB 看 b 的权重）
  onlyA.sort((x, y) => (a[y] ?? 0) - (a[x] ?? 0));
  onlyB.sort((x, y) => (b[y] ?? 0) - (b[x] ?? 0));

  return {
    score: Number(score.toFixed(4)),
    level: shaSimilarityLevel(score),
    shared,
    onlyA,
    onlyB,
    sharedCount: shared.length,
  };
}

/** 端到端：两张命盘 → 相似度 */
export function compareShenShaCharts(a: ShaPowerInput, b: ShaPowerInput): ShaSimilarityResult {
  return fingerprintSimilarity(buildShaFingerprint(a), buildShaFingerprint(b));
}

/**
 * 合盘「神煞共振」项的 20 分制锚点：相似度 = 0.32 时给满分。
 *
 * 标定依据（300 对真实合盘，seed 20261004）：相似度 mean 0.1638、p50 0.163、p90 0.254、
 * p95 0.289、max 0.491。取 0.32（≈ p97）为满分锚点，于是——
 *   中位 0.163 → 10.2 分（沿用项目"中位即中性分 10"的既有约定，与紫微无引动、生肖无特殊关系一致）
 *   分布 p10 0.083 → 5.2 分；p95 0.289 → 18.1 分；≥0.32 → 封顶 20 分
 *
 * ⚠️ 不要改成"让新项均分等于旧项均分"的标法：那需要 SCALE≈0.0126，会让 p90 以上全部封顶 20，
 *    前 10% 的盘对失去区分度。高端不压平比均值对齐更重要。
 */
export const SHENSHA_HEPAN_SCALE = 0.32;

/** 相似度 → 合盘 0~20 分（供合盘项直接调用，避免重复计算指纹） */
export function resonanceScoreFrom(similarity: number): number {
  return Math.round(Math.max(0, Math.min(20, (similarity / SHENSHA_HEPAN_SCALE) * 20)));
}
