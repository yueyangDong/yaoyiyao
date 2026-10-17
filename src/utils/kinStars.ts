/**
 * 六亲取星（按性别）的唯一真源。
 *
 * ⚠️ 为什么必须收口：`analyzeFamily` 曾把「正印＝母、偏财＝父」写死（男命口径），
 * 而 `baziDomainDeep` 已按性别分档（女命偏印＝母、正财＝父）。同一张女命盘上，
 * 深读段说「母星（偏印）」，紧接着 `analyzeFamily` 说「正印代表母亲」，两段直接对打。
 * 「同一个判据两处各写一遍」是性别错位的主要来源，凡六亲星一律从这里取。
 *
 * 口径（与传统子平一致，也与 baziDomainDeep 既有分档一致）：
 *   父  —— 男命偏财 / 女命正财
 *   母  —— 男命正印 / 女命偏印
 *   配偶 —— 男命正财 / 女命正官（正配不显时：男命偏财 / 女命七杀）
 */

export type KinGender = 'male' | 'female';

/**
 * 归一化性别入参：同时接受 'male'|'female' 与 '男'|'女'。
 * ⚠️ 只用 `g === 'male'` 判断会把 '男' 判成女命（合盘层的入参就允许中文）。
 * 无法识别时返回 undefined —— **不要在这里默认男命**，由调用方决定降级方式。
 */
export function normGender(g?: string): KinGender | undefined {
  if (g === 'male' || g === '男') return 'male';
  if (g === 'female' || g === '女') return 'female';
  return undefined;
}

export interface KinStars {
  father: string;
  mother: string;
  spouse: string;
  /** 正配星不显时的替代星（偏财 / 七杀） */
  secondarySpouse: string;
}

/** 未知性别返回 null —— 调用方应走中性文案，而不是替用户认定一个性别。 */
export function kinStarsOf(g?: string): KinStars | null {
  const gender = normGender(g);
  if (!gender) return null;
  const male = gender === 'male';
  return {
    father: male ? '偏财' : '正财',
    mother: male ? '正印' : '偏印',
    spouse: male ? '正财' : '正官',
    secondarySpouse: male ? '偏财' : '七杀',
  };
}
