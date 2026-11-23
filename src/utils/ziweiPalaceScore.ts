/**
 * 紫微宫位吉凶（宫位标签用）。
 *
 * 为什么从 `pages/Ziwei.tsx` 挪出来：这段是**判据**，不是排版。
 * 它带着自己的星曜吉凶名单和阈值，坐在页面里就等于第二个口径——
 * 而 `utils/ziweiAnalysis` 里另有 `isJiStar`（辅星吉星，供格局用），
 * 两套名单不同、用途不同，却都叫「吉星」，后人很容易拿错。
 *
 * ⚠️ 这里的 `吉/中/凶` 是**单个宫位的星曜组成**，与
 *    `divinationCore.verdictOf`（占卜 score ∈ [−10,10] 的五档刻度）**不是同一把尺子**，
 *    也不与 `ziweiGe` 的成格/破格判定互通。三者服务对象不同，不要互相换算。
 */

/**
 * 主星与辅星的吉凶归类（宫位层面）。
 *
 * 与 `ziweiGe.JI_STARS`（文昌/文曲/左辅/右弼/天魁/天钺，+禄存）的分工：
 *   · 那边判「三方四正会不会吉星」——只认辅星，因为古法讲「吉星会照」说的是辅星来会；
 *   · 这边判「这个宫本身长什么样」——主星必须算进去（紫微、天府本身即吉）。
 * 两者名字都叫 JI_STARS 容易误用，故本文件的常量加了 `PALACE_` 前缀。
 *
 * ⚠️ 天马在这里按吉论，是既有实现的口径（天马主机动、逢吉则吉），
 *    曾按"驿马中性"改判过一版，会让吉宫数量整体下移、页面标签连片变色，已回退。
 *    要动它，先跑一遍分布看变化幅度，别只看单个盘。
 */
export const PALACE_JI_STARS = new Set([
  '紫微', '天府', '天相', '天梁', '天同', '太阴', '太阳',
  '文昌', '文曲', '天魁', '天钺', '左辅', '右弼', '禄存', '天马',
]);

export const PALACE_XIONG_STARS = new Set([
  '七杀', '破军', '廉贞', '贪狼', '巨门',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
]);

export interface PalaceScore {
  level: '吉' | '中' | '凶';
  jiCount: number;
  xiongCount: number;
  sihuaGood: number;
  sihuaBad: number;
}

/**
 * 宫位吉凶：吉星数与吉化加分，凶星数与化忌减分。
 *
 * 阈值 ±2 / −1 沿用既有实现——它是**页面标签的分档**，不是统计锚点，
 * 但从别处搬过来时不能顺手改成对称的 ±0，否则大批宫位标签会翻。
 */
export function palaceScoreOf(gong: {
  majorStars?: { name: string }[];
  minorStars?: string[];
  minorStarDetails?: { name: string; sihua?: string | null }[];
}): PalaceScore {
  let jiCount = 0, xiongCount = 0, sihuaGood = 0, sihuaBad = 0;
  // 辅星优先使用带四化的完整信息（minorStarDetails），退回纯名称列表
  const minors: { name: string; sihua?: string | null }[] = gong.minorStarDetails
    || (gong.minorStars || []).map((s) => ({ name: s, sihua: null }));
  const stars: { name: string; sihua?: string | null }[] = [
    ...(gong.majorStars || []),
    ...minors,
  ];
  for (const s of stars) {
    if (PALACE_JI_STARS.has(s.name)) jiCount++;
    if (PALACE_XIONG_STARS.has(s.name)) xiongCount++;
    if (s.sihua === '禄' || s.sihua === '权' || s.sihua === '科') sihuaGood++;
    if (s.sihua === '忌') sihuaBad++;
  }
  const score = (jiCount + sihuaGood * 2) - (xiongCount + sihuaBad * 2);
  if (score >= 2) return { level: '吉', jiCount, xiongCount, sihuaGood, sihuaBad };
  if (score <= -1) return { level: '凶', jiCount, xiongCount, sihuaGood, sihuaBad };
  return { level: '中', jiCount, xiongCount, sihuaGood, sihuaBad };
}
