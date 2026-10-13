// ========== 地支关系 · 全站唯一出口 ==========
//
// 为什么要把这几张表抽出来：
//   地支两两关系（冲 / 合 / 害 / 刑 / 三合 / 三会）在本项目里曾被写成多份互不相同的表——
//     · shenShaPower.ts —— tuple 数组形式，供神煞力量模型的「制化系数」使用；
//     · hepan.ts        —— Record 形式（DZ_LIU_HE / DZ_SAN_HE / DZ_LIU_CHONG），供合盘地支分与紫微命宫合参；
//     · 流年 / 大运互动引擎（liunianInteraction.ts）又需要同一批判据。
//   多份表付出过真实代价：hepan.ts 曾拿「生肖键」的 LIU_HE 当「地支键」的表来查，
//   六合 / 三合 / 六冲 **静默失效**（不报错，只是恒为 undefined），
//   而 desc 仍照旧输出"无大合也无大冲"——症状和"这个功能没写"完全一样，靠肉眼看不出来。
//   故此处收口为唯一出口：任何模块判定地支关系，一律 import 本文件，不要再抄第二份。
//
// ⚠️ 键一律是**地支**（'子'…'亥'），**不是**生肖（'鼠'…'猪'）。
//   生肖键的表（LIU_HE / SAN_HE / LIU_CHONG）是"生肖配对"语义，留在 hepan.ts 内部，两者不可互换。

export const DZ_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 地支五行（本气） */
export const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 四正（旺支）：子午卯酉。半合 / 半会时旺支参与，力量明显更强 */
export const DZ_WANG = ['子', '午', '卯', '酉'];

/** 六冲（对宫相隔六位）：子午、丑未、寅申、卯酉、辰戌、巳亥 */
export const DZ_CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

/** 六合：子丑、寅亥、卯戌、辰酉、巳申、午未 */
export const DZ_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};

/** 六害（相穿）：子未、丑午、寅巳、卯辰、申亥、酉戌 */
export const DZ_HAI: Record<string, string> = {
  '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉',
};

/**
 * 相刑（两两相见即成刑）：
 *   子卯（无礼之刑）、寅巳申（无恩之刑，三支两两皆刑）、丑戌未（恃势之刑，三支两两皆刑）。
 *
 * ⚠️ 自刑（辰 / 午 / 酉 / 亥 见本支重复）**不在此表内**，判据是"同一地支在四柱中出现两次"，
 * 用 DZ_SELF_XING 判断；若写成 `DZ_XING[x].includes(x)`，会让单支出现也被判成刑。
 */
export const DZ_XING: Record<string, string[]> = {
  '子': ['卯'], '卯': ['子'],
  '寅': ['巳', '申'], '巳': ['寅', '申'], '申': ['寅', '巳'],
  '丑': ['戌', '未'], '戌': ['丑', '未'], '未': ['丑', '戌'],
};

/** 自刑支：此四支在四柱（或与岁运）中重复出现即构成自刑 */
export const DZ_SELF_XING = ['辰', '午', '酉', '亥'];

/** 三合局元数据：局内三支、合化五行、局名 */
export const SAN_HE_JU: { branches: string[]; wx: string; name: string }[] = [
  { branches: ['申', '子', '辰'], wx: '水', name: '申子辰水局' },
  { branches: ['亥', '卯', '未'], wx: '木', name: '亥卯未木局' },
  { branches: ['寅', '午', '戌'], wx: '火', name: '寅午戌火局' },
  { branches: ['巳', '酉', '丑'], wx: '金', name: '巳酉丑金局' },
];

/** 三合：某支 → 同局另两支（三支齐为全合，任两支为半合） */
export const DZ_SAN_HE: Record<string, string[]> = {
  '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
  '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
  '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
  '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
};

/** 三会方元数据：方内三支、会方五行（力量强于三合） */
export const SAN_HUI_FANG: { branches: string[]; wx: string; name: string }[] = [
  { branches: ['寅', '卯', '辰'], wx: '木', name: '寅卯辰东方木' },
  { branches: ['巳', '午', '未'], wx: '火', name: '巳午未南方火' },
  { branches: ['申', '酉', '戌'], wx: '金', name: '申酉戌西方金' },
  { branches: ['亥', '子', '丑'], wx: '水', name: '亥子丑北方水' },
];

/** 三会：某支 → 同方另两支 */
export const DZ_SAN_HUI: Record<string, string[]> = {
  '寅': ['卯', '辰'], '卯': ['寅', '辰'], '辰': ['寅', '卯'],
  '巳': ['午', '未'], '午': ['巳', '未'], '未': ['巳', '午'],
  '申': ['酉', '戌'], '酉': ['申', '戌'], '戌': ['申', '酉'],
  '亥': ['子', '丑'], '子': ['亥', '丑'], '丑': ['亥', '子'],
};

/** a 与 b 是否六冲 */
export function isChong(a: string, b: string): boolean {
  return !!a && !!b && DZ_CHONG[a] === b;
}

/** a 与 b 是否六合 */
export function isLiuHe(a: string, b: string): boolean {
  return !!a && !!b && DZ_HE[a] === b;
}

/** a 与 b 是否相害 */
export function isHai(a: string, b: string): boolean {
  return !!a && !!b && DZ_HAI[a] === b;
}

/** a 与 b 是否相刑（不含自刑） */
export function isXing(a: string, b: string): boolean {
  return !!a && !!b && (DZ_XING[a] || []).includes(b);
}

/** 该支所属的三合局（不在局中返回 null） */
export function sanheGroupOf(zhi: string): { branches: string[]; wx: string; name: string } | null {
  return SAN_HE_JU.find((j) => j.branches.includes(zhi)) ?? null;
}

/** 该支所属的三会方（不在方中返回 null） */
export function sanhuiGroupOf(zhi: string): { branches: string[]; wx: string; name: string } | null {
  return SAN_HUI_FANG.find((j) => j.branches.includes(zhi)) ?? null;
}
