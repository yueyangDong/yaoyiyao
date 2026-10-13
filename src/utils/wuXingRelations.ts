// ========== 五行生克 / 十神判据 · 唯一出口 ==========
//
// 这几张五行表在项目里原本散落在 hepan.ts、dayunReading.ts、liunianReading.ts 各自一份，
// 每处都要手抄"生我/克我"的逆查表——抄错一个字就是静默判反（不报错，方向反了）。
// 现收口：任何模块需要五行生克或十神判定，一律 import 本文件。
//
// 本文件刻意**不**引入 React / 页面类型，保证 Bazi 页只需为它付极小的打包代价，
// 也便于 node 侧一次性脚本直接引用。

/** 五行相生：木→火→土→金→水→木（键生值 = "我生"） */
export const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
/** 五行相克（键克值 = "我克"） */
export const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
/** 逆查相生：值生键（印，生我者） */
export const WX_SHENG_ME: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
/** 逆查相克：值克键（官杀，克我者） */
export const WX_KE_ME: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

/** 十天干五行 */
export const GAN_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

/** 阳干（其余为阴干）；十神的"同性/异性"判定靠它 */
export const YANG_GAN = ['甲', '丙', '戊', '庚', '壬'];

/**
 * 由日主五行 + 旺衰档推导忌神五行（扶抑法，与 baziAnalysis.recommendYongShen 同口径）：
 *   身强（含身极强）→ 忌印（生我）、比劫（同我）
 *   身弱（含身极弱）→ 忌官杀（克我）、财（我克）、食伤（我生）
 *   中和 / 未传旺衰 → 无明显忌神，返回空数组（调用方据此退化为"不做喜忌定向"的旧行为）
 *
 * `yongShen` 是**可选**的第三参，用于把「调候优先于扶抑」落到实处：
 *   若某个扶抑忌神同时已经是该盘的用神（典型情形是调候神——冬水需火、夏火需水，
 *   而火/水在扶抑口径下恰好是财官食伤），那么按"特殊格局 > 调候 > 扶抑"的优先级，
 *   它应当**从忌神里剔除**，否则会出现"既是第一用神、又是忌神"的自相矛盾。
 *   recommendYongShen 产出的用神表里已经包含调候神（并在身强时按性质筛过），
 *   故直接拿它做减法即可，无需再抄一份 TIAOHOU_TABLE。
 *
 * ⚠️ 这是**轻量扶抑兜底**，不是完整口径：它拿不到月令、也拿不到全局五行统计，因此
 *    **既不认从格/从旺**（那里喜忌整个反转——如从财格以财为喜，本函数会把财当忌），
 *    **也不认破用变忌**（旺神克用神 → 由平转忌）。传了 `yongShen` 只能补上"调候剔除"这一层。
 *
 *    **完整忌神在 `baziAnalysis.recommendYongShen(...).xiShen`**，已由 `personChart.buildPerson`
 *    写进 `PersonChart.jiShen`。凡手里有完整命盘的调用方（合盘 / 岁运互动 / 流月流日 / 大运解读）
 *    一律优先用 `jiShen`，本函数只留给拿不到四柱的场景（或作为手工夹具的兜底）。
 *
 * ⚠️ 不传 `yongShen` 时行为与旧版完全一致（纯扶抑），保证既有调用方不受影响。
 */
export function deriveJiShen(dayWx: string, strengthLevel?: string, yongShen?: string[]): string[] {
  if (!dayWx || !strengthLevel) return [];
  let pool: string[];
  if (strengthLevel.includes('强')) pool = [WX_SHENG_ME[dayWx], dayWx].filter(Boolean);
  else if (strengthLevel.includes('弱')) pool = [WX_KE_ME[dayWx], WX_KE[dayWx], WX_SHENG[dayWx]].filter(Boolean);
  else return [];
  if (yongShen && yongShen.length > 0) {
    const inYong = new Set(yongShen);
    pool = pool.filter((wx) => !inYong.has(wx));
  }
  return [...new Set(pool)];
}

/**
 * 日主天干 `dayGan` 看另一个天干 `otherGan` 的十神名。
 * 判据：五行关系定大类，阴阳同异定正偏——同阴阳为偏（比肩/偏印/食神/七杀/偏财），
 * 异阴阳为正（劫财/正印/伤官/正官/正财）。任一天干非法时返回空串。
 *
 * ⚠️ 阴阳顺序容易记反：比肩是"同五行同阴阳"，劫财是"同五行异阴阳"；
 * 七杀是"克我且同阴阳"，正官是"克我且异阴阳"。
 */
export function tenGodOf(dayGan: string, otherGan: string): string {
  const dw = GAN_WX[dayGan];
  const ow = GAN_WX[otherGan];
  if (!dw || !ow) return '';
  const sameYinYang = YANG_GAN.includes(dayGan) === YANG_GAN.includes(otherGan);
  if (dw === ow) return sameYinYang ? '比肩' : '劫财';
  if (WX_SHENG_ME[dw] === ow) return sameYinYang ? '偏印' : '正印';
  if (WX_SHENG[dw] === ow) return sameYinYang ? '食神' : '伤官';
  if (WX_KE_ME[dw] === ow) return sameYinYang ? '七杀' : '正官';
  if (WX_KE[dw] === ow) return sameYinYang ? '偏财' : '正财';
  return '';
}

/** 十神 → 该十神在当前语境下的"管什么"（供文案取重心，键为十神全名） */
export const SHISHEN_DOMAIN: Record<string, string> = {
  '比肩': '同辈、合作与竞争，也指"自立门户"的念头',
  '劫财': '同辈与助力，也带"分我所得"的色彩（破财、被借力）',
  '正印': '学习、文书、长辈与庇护，也主名誉与安稳',
  '偏印': '偏门学问、灵感与独处，也主思虑过多、不易被理解',
  '食神': '才华的自然流露、口福与人缘，也主安逸',
  '伤官': '表达欲、技术与锋芒，也主不服管、口舌',
  '正财': '稳定收入、务实经营与家庭责任',
  '偏财': '流动财、机会财与人脉资源',
  '正官': '规则、职位、责任与名誉；女命亦为夫星',
  '七杀': '压力、竞争与魄力；女命亦为偏夫星',
};

/** 十神大类（归并为比劫/印/食伤/官杀/财），与 dayunReading.resolveRelation 同口径 */
export type RelationKind = 'bijie' | 'yin' | 'shishang' | 'guansha' | 'cai';

export function relationKindOfShiShen(shiShen: string): RelationKind | null {
  if (!shiShen) return null;
  if (shiShen === '比肩' || shiShen === '劫财') return 'bijie';
  if (shiShen === '正印' || shiShen === '偏印') return 'yin';
  if (shiShen === '食神' || shiShen === '伤官') return 'shishang';
  if (shiShen === '正官' || shiShen === '七杀') return 'guansha';
  if (shiShen === '正财' || shiShen === '偏财') return 'cai';
  return null;
}
