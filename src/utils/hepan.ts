// ========== 情侣合盘 ==========
// 八字合婚（日主五行/地支关系/纳音/生肖/喜用神）+ 紫微合盘（命宫主星/四化）
// desc 全部由具体数据生成，避免固定模板
//
// 【对称合盘 v2（2026-09-02）】
// 此前"日主五行/纳音/喜用互补"三项以 mine 为基准单向打分，
// 导致"男+女"与"女+男"输入顺序不同 → 总分不同（最多差 4~6 分，可能跨档）。
// v2 修复原则：
//   1. 互动层显式计算两个方向（A→B 与 B→A），分项得分 = 双向均分（对称聚合）；
//   2. 方向性差异不抹平，而是输出到 result.perspectives（"我视角/对方视角"双维度），
//      交换输入后 mine/partner 内容随"人"走、分数不变；
//   3. 交换不变性由单元测试保证（hepan.test.ts 交换输入用例）。
import type { PillarData } from '../pages/Bazi';
import { STEM_SIHUA_TABLE } from './ziweiAnalysis';
import { DAY_MASTER_ESSENCE, getDayMasterTitle } from './baziPersonality';
import { calcShenSha } from './shenSha';
import { compareShenShaCharts, resonanceScoreFrom } from './shenShaSimilarity';
// 地支关系走唯一出口（六合/三合/六冲三张表曾在本文件内各存一份，
// 与 shenShaPower / 流年互动引擎的表重复；见 diZhiRelations.ts 头部说明）。
import { DZ_CHONG as DZ_LIU_CHONG, DZ_HE as DZ_LIU_HE, DZ_SAN_HE, DZ_WX } from './diZhiRelations';
// 五行生克与忌神判据走唯一出口（本文件原先自留四张 WX_* 表，与 dayunReading / 流年引擎重复）。
// deriveJiShen 仍从本模块对外导出（下方 re-export），保持既有调用方与测试不受影响。
import { WX_KE, WX_KE_ME, WX_SHENG, WX_SHENG_ME, deriveJiShen } from './wuXingRelations';
export { deriveJiShen };

/**
 * 合盘满分（v6）：八字八项 + 紫微两项，共 10 项 × 20 分 = 200 分。
 * v6（2026-10-13）在原有的八字六项之外补了两项：
 *   · 「旺衰互动」——两人的旺衰放在一起比（双强硬碰硬 / 双弱互相给不上力 / 一强一弱互补）；
 *   · 「气候与用神」——月令季节是否同向 + 双方喜用五行的交集。
 * ⚠️ 改这里的每一项权重/项数，都要同步本文件末尾的档位阈值与 __tests__/hepanCalibration.test.ts。
 */
export const HEPAN_MAX_SCORE = 200;

// ========== 紫微合盘：星性分组与经典配对 ==========
// 中州派星性三分：领导贵气型 / 智谋支援型 / 开创行动型
const ZW_GROUP_NAMES = ['领导贵气型', '智谋支援型', '开创行动型'];
const ZW_GROUP_LEAD = ['紫微', '天府', '天相', '太阳', '天梁'];
const ZW_GROUP_SUPPORT = ['天机', '太阴', '天同', '巨门'];

function zwGroupOf(star: string): number {
  if (ZW_GROUP_LEAD.includes(star)) return 0;
  if (ZW_GROUP_SUPPORT.includes(star)) return 1;
  return 2;
}

/** 经典互补配对（钥匙按星名排序归一） */
const ZW_IDEAL_PAIRS: Record<string, number> = {
  '天府+紫微': 10, '太阳+太阴': 10, '天机+天梁': 9, '天同+太阴': 9,
  '天相+武曲': 9, '天同+天梁': 9, '天相+紫微': 8, '天府+廉贞': 8,
};

function zwPairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function zwPalaceStars(chart: any[], palace: string): string[] {
  const g = (chart || []).find((x: any) => x?.name === palace);
  return ((g?.majorStars) || []).map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
}

/** 取整个宫位对象（需要宫位地支等星名以外的字段时用） */
function zwPalaceOf(chart: any[], palace: string): any | undefined {
  return (chart || []).find((x: any) => x?.name === palace);
}

/** 十二宫对宫（借星论用）：命无正曜时借对宫主星安星论 */
const ZW_OPPOSITE_PALACE: Record<string, string> = {
  '命宫': '迁移', '迁移': '命宫',
  '兄弟': '交友', '交友': '兄弟',
  '夫妻': '官禄', '官禄': '夫妻',
  '子女': '田宅', '田宅': '子女',
  '财帛': '福德', '福德': '财帛',
  '疾厄': '父母', '父母': '疾厄',
};

/**
 * 取宫位主星；空宫按紫微斗数惯例借对宫主星论（与 ziweiAnalysis.ts / Ziwei 页同一口径）。
 *
 * ⚠️ 命宫不见十四主星（「命无正曜」）是**正常命盘状态**，实测在 1935–2005 年的
 * 1728 组出生数据中占 278 组（约 16%）——双方任一方空宫即约三成合盘会遇上。
 * 绝不可当成「出生信息不足」：曾经因为只判 `majorStars.length > 0`，
 * 把三成合盘误报为「补齐双方出生时辰后可获得完整比对」。
 *
 * @returns stars 主星名；borrowedFrom 借自哪个对宫（未借宫时为 undefined）
 */
function zwPalaceStarsBorrow(chart: any[], palace: string): { stars: string[]; borrowedFrom?: string } {
  const own = zwPalaceStars(chart, palace);
  if (own.length > 0) return { stars: own };
  const opp = ZW_OPPOSITE_PALACE[palace];
  if (!opp) return { stars: [] };
  const borrowed = zwPalaceStars(chart, opp);
  return borrowed.length > 0 ? { stars: borrowed, borrowedFrom: opp } : { stars: [] };
}

/** 借宫说明文案（未借宫返回空串） */
function zwBorrowNote(who: string, buddy: { stars: string[]; borrowedFrom?: string }): string {
  if (!buddy.borrowedFrom) return '';
  return `${who}的命宫是空宫（命无正曜），借对宫${buddy.borrowedFrom}宫主星${buddy.stars.join('、')}论——空宫不是空白，而是弹性大、可塑性强；`;
}

/**
 * 单向：A 的生年干四化对 B 命宫主星的引动。
 * v3（2026-09-24）：由 10 分制升为 20 分制，与八字五项同权重——紫微在合盘里不再只是"点缀分"。
 * 档位：化禄 20 / 化科 16 / 化权 14 / 无引动 10（中位）/ 化忌 6。
 */
function sihuaDirOnMing(fromStem: string, toMingStars: string[], fromLabel: string, toLabel: string): { score: number; text: string } {
  const t = STEM_SIHUA_TABLE[fromStem];
  if (!t || toMingStars.length === 0) return { score: 10, text: '' };
  if (toMingStars.includes(t.lu)) return { score: 20, text: `${fromLabel}的${fromStem}干${t.lu}化禄正坐${toLabel}命宫——${fromLabel}的存在本身就能旺${toLabel}，是天生的助力缘` };
  if (toMingStars.includes(t.ke)) return { score: 16, text: `${fromLabel}的${fromStem}干${t.ke}化科坐${toLabel}命宫——${fromLabel}能给${toLabel}带来名声、贵人与体面` };
  if (toMingStars.includes(t.quan)) return { score: 14, text: `${fromLabel}的${fromStem}干${t.quan}化权坐${toLabel}命宫——${fromLabel}能推动${toLabel}成长，但要注意别变成施压` };
  if (toMingStars.includes(t.ji)) return { score: 6, text: `${fromLabel}的${fromStem}干${t.ji}化忌坐${toLabel}命宫——${fromLabel}的执念容易变成${toLabel}的压力，相处宜多留空间` };
  return { score: 10, text: `${fromLabel}的生年四化未直接引动${toLabel}命星，这一方向的缘分靠日常经营` };
}

export interface HePanInput {
  mine: {
    name?: string;
    pillars: PillarData[];
    dayGan: string;
    dayWx: string;
    dayZhi?: string;
    zodiac: string;
    nayin: string;
    yongShen: string[];
    /** 日主强弱五档（身极强/身强/中和/身弱/身极弱），与八字页 analyzeDayMasterStrength 同口径 */
    strengthLevel?: string;
    /**
     * **完整忌神**（personChart.PersonChart.jiShen = recommendYongShen 的 xiShen，
     * 含从格/从旺 的喜忌反转与破用变忌）。传了就以此为准；不传则退化为
     * `deriveJiShen(dayWx, strengthLevel, yongShen)` 那套轻量扶抑兜底。
     */
    jiShen?: string[];
    /** 神煞落点（含吉凶类型）。缺省时由契约方按 pillars 自算，元辰/勾绞因无性别会跳过 */
    shenSha?: { name: string; pillar: string; type: '吉' | '凶' | '平' }[];
    ziwei?: any[];
  };
  partner: {
    name?: string;
    pillars: PillarData[];
    dayGan: string;
    dayWx: string;
    dayZhi?: string;
    zodiac: string;
    nayin: string;
    yongShen: string[];
    strengthLevel?: string;
    /** 完整忌神，见 mine.jiShen 的说明 */
    jiShen?: string[];
    shenSha?: { name: string; pillar: string; type: '吉' | '凶' | '平' }[];
    ziwei?: any[];
    birthInfo?: string;
    birthplace?: string[];
    longitude?: number;
  };
}

export interface HePanItem {
  title: string;
  score: number;
  desc: string;
}

export interface PartyLoveAdvice {
  mine: string;
  partner: string;
}

export interface HePanResult {
  totalScore: number;
  level: string;
  items: HePanItem[];
  summary: string;
  loveAdvice?: PartyLoveAdvice;
  /** 双向视角明细：分数对称（交换输入不变），文字视角随人走 */
  perspectives?: { mine: string; partner: string };
  /** 双方日主性格双画像 + 互动动力学 */
  personalityDuet?: {
    mineTitle: string;
    mineEssence: string;
    partnerTitle: string;
    partnerEssence: string;
    dynamic: string;
  };
  partnerDisplay?: {
    name: string;
    birth: string;
    dayWx: string;
    zodiac: string;
    nayin: string;
  };
}

const NAYIN_WX: Record<string, string> = {
  '海中金': '金', '剑锋金': '金', '白蜡金': '金', '沙中金': '金', '金箔金': '金', '钗钏金': '金',
  '大林木': '木', '杨柳木': '木', '松柏木': '木', '平地木': '木', '桑柘木': '木', '石榴木': '木',
  '涧下水': '水', '泉中水': '水', '长流水': '水', '天河水': '水', '大溪水': '水', '大海水': '水',
  '炉中火': '火', '山头火': '火', '霹雳火': '火', '山下火': '火', '覆灯火': '火', '天上火': '火',
  '壁上土': '土', '城头土': '土', '沙中土': '土', '路旁土': '土', '大驿土': '土', '屋上土': '土',
};
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const LIU_HE: Record<string, string> = { '鼠': '牛', '牛': '鼠', '虎': '猪', '猪': '虎', '兔': '狗', '狗': '兔', '龙': '鸡', '鸡': '龙', '蛇': '猴', '猴': '蛇', '马': '羊', '羊': '马' };
const SAN_HE: Record<string, string[]> = {
  '鼠': ['龙', '猴'], '牛': ['蛇', '鸡'], '虎': ['马', '狗'], '兔': ['羊', '猪'],
  '龙': ['鼠', '猴'], '蛇': ['牛', '鸡'], '马': ['虎', '狗'], '羊': ['兔', '猪'],
  '猴': ['鼠', '龙'], '鸡': ['牛', '蛇'], '狗': ['虎', '马'], '猪': ['兔', '羊'],
};
const LIU_CHONG: Record<string, string> = { '鼠': '马', '马': '鼠', '牛': '羊', '羊': '牛', '虎': '猴', '猴': '虎', '兔': '鸡', '鸡': '兔', '龙': '狗', '狗': '龙', '蛇': '猪', '猪': '蛇' };

// ========== 双向对称打分辅助（v2） ==========
// 单向关系分值：我生对方 20 / 对方生我 18 / 比和 14 / 我克对方 8 / 对方克我 6 / 无直接生克 12
// 分项得分 = round((A→B + B→A) / 2)，构造上对称：交换双方输入分项分不变。
// （五行相异的两两组合必然是一对方向互补关系：一方"生"另一方必"被生"，"克"对"被克"。）
function wxDirScore(from: string, to: string): number {
  if (WX_SHENG[from] === to) return 20; // from 生 to
  if (WX_SHENG[to] === from) return 18; // from 受 to 生
  if (from === to) return 14;           // 比和
  if (WX_KE[from] === to) return 8;     // from 克 to
  if (WX_KE[to] === from) return 6;     // from 受 to 克
  return 12;
}
function nyDirScore(from: string, to: string): number {
  if (!from || !to) return 12;
  if (WX_SHENG[from] === to) return 20;
  if (WX_SHENG[to] === from) return 18;
  if (from === to) return 14;
  if (WX_KE[from] === to) return 8;
  if (WX_KE[to] === from) return 6;
  return 12;
}
// 单向五行关系的一句话描述（供 desc 与 perspectives 复用，主语可换）
function wxRelText(fromWx: string, toWx: string, fromLabel: string, toLabel: string): string {
  if (WX_SHENG[fromWx] === toWx) return `${fromLabel}之${fromWx}生${toLabel}之${toWx}，${fromLabel}更愿意主动付出与滋养`;
  if (WX_SHENG[toWx] === fromWx) return `${toLabel}之${toWx}生${fromLabel}之${fromWx}，${fromLabel}更被照顾与滋养`;
  if (WX_KE[fromWx] === toWx) return `${fromLabel}之${fromWx}克${toLabel}之${toWx}，${fromLabel}相对占主导`;
  if (WX_KE[toWx] === fromWx) return `${toLabel}之${toWx}克${fromLabel}之${fromWx}，${fromLabel}需要更多表达自己`;
  if (fromWx === toWx) return `${fromLabel}与${toLabel}日主同为${fromWx}，比和相处、默契十足`;
  return `${fromLabel}与${toLabel}五行无直接生克，相处有各自空间`;
}

// ========== 喜忌判定（v5，2026-10-07）==========
//
// 为什么加这一层：v4 之前，「日主五行」只按生克定吉凶（相生一律给高分），
// 「喜用互补」只比"对方日主是否在我用神列表里"。两者都**不看日主强弱与忌神**，于是：
//   · 身强者被对方所生（印比助旺）也被判成"被滋养"——方向对、吉凶反；
//   · 对方日主正好是我的忌神时，最多只被写成"非你喜用"，不扣分。
// 现按扶抑法补出忌神，再做双向交叉判定。
// （deriveJiShen 的实现已移到 wuXingRelations.ts，本文件在顶部 re-export；
//   流年 / 大运互动引擎与合盘共用同一份判据，避免"两处各写一遍忌神"。）

/** 对方日主五行对我方的作用方向：+2 落在用神 / −2 落在忌神 / 0 中性
 *  ⚠️ 未传 strengthLevel 时一律返回 0——喜忌修正整体作为一个开关，
 *  保证 v4 的手工测试盘（不带旺衰）行为不变。 */
function xiJiAdjust(me: { yongShen?: string[]; dayWx: string; strengthLevel?: string; jiShen?: string[] }, otherWx: string): number {
  if (!otherWx || !me.strengthLevel) return 0;
  if ((me.yongShen || []).includes(otherWx)) return 2;
  const ji = me.jiShen ?? deriveJiShen(me.dayWx, me.strengthLevel, me.yongShen);
  if (ji.includes(otherWx)) return -2;
  return 0;
}

const clamp20 = (n: number) => Math.max(0, Math.min(20, n));

// ========== 跨盘地支成局（v5）==========
//
// v4 的「地支合冲」只做"我的每一支 × 对方的每一支"两两配对，**无法识别三合/三会局**。
// 于是"你的日支 + 我的年/时支凑成三会"这类结构会被整层漏掉，判成"无大合也无大冲"。
// 这里补上跨盘成局：三支齐为成局（三合/三会），两支含旺支（子午卯酉）为半合/半会。
// ⚠️ 跨盘成局的力量**低于**本盘内成局（是"两人补齐"而非自带的合力），故权重刻意取小。
const WANG_ZHI = ['子', '午', '卯', '酉'];
const SAN_HE_TRIPLE: Array<[string, string, string, string]> = [
  ['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金'],
];
const SAN_HUI_TRIPLE: Array<[string, string, string, string]> = [
  ['寅', '卯', '辰', '木'], ['巳', '午', '未', '火'], ['申', '酉', '戌', '金'], ['亥', '子', '丑', '水'],
];

interface CrossJu {
  kind: '三合' | '三会' | '半合' | '半会';
  wx: string;
  dzs: string[];
  /** 该局对双方的喜忌方向：共同用神 / 共同忌神 / 偏一方 / 中性 */
  verdict: '共用' | '共忌' | '偏用' | '偏忌' | '中性';
}

/** 识别跨盘成局（必须跨越双方，纯单盘内的局不计——那属于本盘结构，不归合盘管） */
function findCrossJu(mineDz: string[], partnerDz: string[], yongM: string[], yongP: string[], jiM: string[], jiP: string[]): CrossJu[] {
  const owned = [
    ...mineDz.map((dz) => ({ dz, mine: true })),
    ...partnerDz.map((dz) => ({ dz, mine: false })),
  ];
  const out: CrossJu[] = [];
  const groups: Array<{
    list: Array<[string, string, string, string]>;
    full: '三合' | '三会';
    half: '半合' | '半会';
  }> = [
    { list: SAN_HE_TRIPLE, full: '三合', half: '半合' },
    { list: SAN_HUI_TRIPLE, full: '三会', half: '半会' },
  ];
  for (const { list, full: fullKind, half: halfKind } of groups) {
    for (const [x, y, z, wx] of list) {
      const hits = [x, y, z].map((d) => owned.filter((o) => o.dz === d));
      const present = hits.filter((h) => h.length > 0);
      const spansBoth = hits.some((h) => h.some((o) => o.mine)) && hits.some((h) => h.some((o) => !o.mine));
      if (present.length === 3 && spansBoth) {
        out.push({ kind: fullKind, wx, dzs: [x, y, z], verdict: juVerdict(wx, yongM, yongP, jiM, jiP) });
      } else if (present.length === 2 && spansBoth && [x, y, z].some((d, i) => hits[i].length > 0 && WANG_ZHI.includes(d))) {
        const dzs = [x, y, z].filter((_d, i) => hits[i].length > 0);
        out.push({ kind: halfKind, wx, dzs, verdict: juVerdict(wx, yongM, yongP, jiM, jiP) });
      }
    }
  }
  return out;
}

function juVerdict(wx: string, yongM: string[], yongP: string[], jiM: string[], jiP: string[]): CrossJu['verdict'] {
  const goodM = yongM.includes(wx), goodP = yongP.includes(wx);
  const badM = jiM.includes(wx), badP = jiP.includes(wx);
  if (goodM && goodP) return '共用';
  if (badM && badP) return '共忌';
  if (goodM || goodP) return '偏用';
  if (badM || badP) return '偏忌';
  return '中性';
}

/** 成局对地支合冲分的增减：三合/三会成局权重 3，半合/半会权重 1 */
function juScoreDelta(ju: CrossJu): number {
  const w = ju.kind === '三合' || ju.kind === '三会' ? 3 : 1;
  if (ju.verdict === '共用') return w;
  if (ju.verdict === '共忌') return -w;
  if (ju.verdict === '偏用') return 1;
  if (ju.verdict === '偏忌') return -1;
  return 0;
}

const JU_VERDICT_TEXT: Record<CrossJu['verdict'], string> = {
  '共用': '正是你俩的共同用神，这一层是实打实的加分',
  '共忌': '却是你俩的共同忌神——合出来的正好是彼此都不需要的东西',
  '偏用': '对其中一方是用神',
  '偏忌': '对其中一方是忌神',
  '中性': '不在双方喜忌之内，属中性结构',
};

/**
 * 「日主五行」的喜忌补充层：把"相生/相克"的吉凶含义按双方旺衰与忌神校准。
 * 这是 v5 新增——旧版相生一律说"被滋养"，但身强者被生其实是助旺（忌）。
 *
 * ⚠️ 忌神侧的措辞必须**分旺衰**：v6.1 起忌神改用完整口径，其中含「从格/从旺」的喜忌反转——
 *    从财/从杀格日主**极弱**却以印比为忌，「本已偏旺、帮身过头」那套说法套上去就是满口错话。
 *    所以"身强被生"才说帮身过头，其余情形一律说"方向相反、用错了力的好意"。
 */
function wxXiJiNote(
  mine: HePanInput['mine'], partner: HePanInput['partner'], myJi: string[], paJi: string[],
): string {
  const mLabel = mine.name ? `「${mine.name}」` : '你';
  const pLabel = partner.name ? `「${partner.name}」` : '对方';
  const mYong = (mine.yongShen || []).includes(partner.dayWx);
  const pYong = (partner.yongShen || []).includes(mine.dayWx);
  const mJi = myJi.includes(partner.dayWx);
  const pJi = paJi.includes(mine.dayWx);
  const bits: string[] = [];
  if (mYong) bits.push(`${pLabel}之${partner.dayWx}正落在${mLabel}用神（${(mine.yongShen || []).join('、')}）上，这份助力实打实`);
  else if (mJi) {
    bits.push((mine.strengthLevel || '').includes('强')
      ? `${pLabel}之${partner.dayWx}正落在${mLabel}忌神（${myJi.join('、')}）上——${mLabel}本已偏旺，被生是"帮身过头"，舒服不等于有利`
      : `${pLabel}之${partner.dayWx}正落在${mLabel}忌神（${myJi.join('、')}）上——这一味与${mLabel}所需恰好相反，最需要提防的反而是"用错了力的好意"`);
  }
  if (pYong) bits.push(`${mLabel}之${mine.dayWx}正落在${pLabel}用神（${(partner.yongShen || []).join('、')}）上，${pLabel}也因此受益`);
  else if (pJi) {
    bits.push((partner.strengthLevel || '').includes('强')
      ? `${mLabel}之${mine.dayWx}正落在${pLabel}忌神（${paJi.join('、')}）上，${pLabel}会为此更耗力`
      : `${mLabel}之${mine.dayWx}正落在${pLabel}忌神（${paJi.join('、')}）上——对${pLabel}来说这不是助力而是消耗，付出前先看看对方真正缺什么`);
  }
  if (bits.length === 0) return '';
  return `按喜忌再核一层：${bits.join('；')}。`;
}

// 双向爱情建议生成（基于双方各自的十神配偶星 / 夫妻宫日支）
function genLoveAdviceForParty(
  whoLabel: string,
  dayGan: string,
  dayZhi: string,
  gender: 'male' | 'female',
  pillars: PillarData[],
  wx: string,
  partnerWx: string,
  wxScore: number
): string {
  // 配偶星
  const spouseStarName = gender === 'male' ? '正财' : '正官';
  const spouseStarAlt = gender === 'male' ? '偏财' : '七杀';
  const spousePillars = pillars.filter(p => p.shiShen === spouseStarName);
  const altPillars = pillars.filter(p => p.shiShen === spouseStarAlt);
  const dayWx = wx;

  // 五行关系定性
  const mutualText =
    WX_SHENG[dayWx] === partnerWx ? `${whoLabel}更倾向于主动付出与照顾对方，这是你的感情优势——记得别让对方"享受"得心安理得而不自知。` :
    WX_SHENG[partnerWx] === dayWx ? `${whoLabel}更像是被照顾的一方，享受对方对你的滋养。学会表达感激，让对方知道你看到了他的付出。` :
    dayWx === partnerWx ? `${whoLabel}与对方在性格与节奏上接近，默契十足；也因为太像，有些事反而缺少互补——刻意学一些"对方擅长而你不擅长"的事，能让关系更有层次。` :
    WX_KE[dayWx] === partnerWx ? `${whoLabel}相对强势（你的五行克对方），相处时记得把"主导"变成"引领"，少一些命令感、多一些商量。` :
    WX_KE[partnerWx] === dayWx ? `${whoLabel}在这段关系里更主动也更容易妥协；如果你觉得累，可以直接说出来——长久的委屈比一时的争执更伤感情。` :
    `${whoLabel}与对方五行无直接生克关系，相处有各自空间，关系更接近"独立个体"的深度联结。`;

  // 配偶星文案
  let spouseText = '';
  if (spousePillars.length > 0) {
    const sp = spousePillars[0];
    const stageLabelMap: Record<string, string> = { '年柱': '早年', '月柱': '青壮年', '日柱': '中年（婚姻主场）', '时柱': '中晚年' };
    spouseText = `你的${spouseStarName}在${sp.pillar}（${sp.ganZhi}），对应的缘分在${stageLabelMap[sp.pillar] || sp.pillar}最活跃。`;
  } else if (altPillars.length > 0) {
    const alt = altPillars[0];
    spouseText = `你命局中没有显${spouseStarName}，但${spouseStarAlt}在${alt.pillar}（${alt.ganZhi}），说明你的缘分来得不一定"按部就班"，反而可能通过意料之外的方式出现。`;
  } else {
    spouseText = `你命局中配偶星不显，姻缘偏晚——不是没有，而是来得更精细、更需要契机。耐心等比焦虑找更有效。`;
  }

  // 日支（夫妻宫）提示
  const dayZhiWx = DZ_WX[dayZhi] || '';
  const dayZhiDescMap: Record<string, string> = {
    '子': '你骨子里喜欢聪慧、灵活、能跟你聊到一块的人。',
    '丑': '你喜欢踏实稳重、能把日子过出滋味的人。',
    '寅': '你喜欢有冲劲、爱闯荡、和你一起看世界的人。',
    '卯': '你喜欢温柔体贴、不太强势但很有生活情调的人。',
    '辰': '你喜欢有主见、有资源、能撑起一个家的人。',
    '巳': '你喜欢聪明、反应快、懂得生活情趣的人。',
    '午': '你喜欢热情大方、愿意带你一起嗨的人。',
    '未': '你喜欢温厚纯良、能在背后默默支撑你的人。',
    '申': '你喜欢机敏有主见、能和你过招的人。',
    '酉': '你喜欢讲究美感、生活精致的人。',
    '戌': '你喜欢忠诚可靠、能一起扛事的人。',
    '亥': '你喜欢浪漫、有想象力的灵魂。',
  };

  // 三条金句
  const tags: string[] = [];
  if (wxScore >= 18) tags.push('这段缘分磁场非常合');
  else if (wxScore >= 14) tags.push('相处自然、值得慢慢经营');
  else if (wxScore >= 10) tags.push('互补为主，需要主动磨合');
  else tags.push('需要更多包容和沟通');

  return [
    `${whoLabel}的爱情建议：${spouseText}`,
    mutualText,
    `日支（夫妻宫）${dayZhi}的白话：${dayZhiDescMap[dayZhi] || '夫妻宫与你有独特共鸣。'}`,
    `行动建议：${tags[0]}。`,
    `彼此记住——你爱上的不只是"对方这一刻的样子"，还有"对方未来可能成为的样子"。给对方成长的时间。`,
  ].join('');
}

export function analyzeHePan(input: HePanInput): HePanResult {
  const { mine, partner } = input;
  const items: HePanItem[] = [];

  // 双方忌神——「日主五行 / 地支成局 / 喜用互补 / 气候与用神」四项共用。
  // 优先用调用方给的**完整口径**（PersonChart.jiShen = recommendYongShen 的 xiShen：
  // 从格/从旺的喜忌反转 ∪ 扶抑 ∪ 破用变忌，再减去用神）；
  // 手工构造的调用方（无 jiShen）才退化为 deriveJiShen 那套轻量扶抑兜底——
  // 后者不认从格/从旺（会把喜忌整个判反）、也不认破用变忌。
  const myJi = mine.jiShen ?? deriveJiShen(mine.dayWx, mine.strengthLevel, mine.yongShen);
  const paJi = partner.jiShen ?? deriveJiShen(partner.dayWx, partner.strengthLevel, partner.yongShen);

  // 1) 日主五行（20 分）——双向计算取均分（对称），再叠加双向喜忌修正
  const mWx = mine.dayWx, pWx = partner.dayWx;
  const wxAB = wxDirScore(mWx, pWx); // 我 → 对方
  const wxBA = wxDirScore(pWx, mWx); // 对方 → 我
  // 喜忌修正：相生不等于得利——身强者被对方所生（印比助旺）该扣分。
  const wxScore = clamp20(Math.round((wxAB + wxBA) / 2) + xiJiAdjust(mine, pWx) + xiJiAdjust(partner, mWx));
  let wxDesc: string;
  if (WX_SHENG[mWx] === pWx) {
    wxDesc = `你的日主${mWx}生对方${pWx}：你更愿意付出与滋养对方；反向看对方处于受生位，能安心接收你的好。单向流动明显，注意别让付出失衡。` +
      `生活里的样子：大事小事多半是你张罗、你惦记，对方在这段关系里活得比较舒展。这不是坏事——付出本来就是你的爱的语言，但要警惕时间久了付出变成理所当然。偶尔示个弱，把照顾你的机会留给对方，感情才是双向流动的活水。`;
  } else if (WX_SHENG[pWx] === mWx) {
    wxDesc = `对方日主${pWx}生你的${mWx}：对方更照顾你，你能感受到被滋养；记得及时回应，让流动双向。` +
      `生活里的样子：对方是那个记得你的口味、把你随口一提的心愿悄悄办到的人。被爱是福气，但福气最怕习以为常——你的每一句谢谢、每一次主动的拥抱，都是在给这段感情续费。`;
  } else if (mWx === pWx) {
    wxDesc = `两人日主同为${mWx}，同气比和，像朋友一样有默契，但少了互补。` +
      `生活里的样子：你们的笑点、雷点、消费观都惊人一致，几乎不用磨合就能同频。唯一的隐患是太像了——你冲动时对方也冲动，你低落时对方拉不动你。刻意培养一两个互补的习惯，日子会更有层次。`;
  } else if (WX_KE[mWx] === pWx) {
    wxDesc = `你的日主${mWx}克对方${pWx}：你较强势，对方易感压抑；相处时把"主导"变成"引领"，多商量、少命令。` +
      `生活里的样子：去哪吃饭、怎么过节、钱怎么花，多半是你拍板。对方看起来"都行、随便"，其实未必没有想法——只是懒得争。留几个领域让TA全权做主、真心夸TA的决定，你会发现TA其实很有主意。`;
  } else if (WX_KE[pWx] === mWx) {
    wxDesc = `对方日主${pWx}克你的${mWx}：相处中对方占上风，你需要更多表达自己，也别默默累积委屈。` +
      `生活里的样子：对方气场强、有主见，你更多在配合和包容。适度的让是爱，但每次都让就成了消耗。练习把"不舒服"温和地说出口——真正爱你的人，会愿意为你调低音量。`;
  } else {
    // 防御：五行相异的组合必有生克关系，正常不应到达此分支
    wxDesc = `两人日主${mWx}与${pWx}无直接生克，关系平淡但有各自空间。`;
  }
  // 喜忌补充层：把生克的吉凶含义按双方旺衰与忌神校准（v5）
  const xiJiNote = wxXiJiNote(mine, partner, myJi, paJi);
  if (xiJiNote) wxDesc += xiJiNote;
  items.push({ title: '日主五行', score: wxScore, desc: wxDesc });

  // 2) 地支关系（20 分）：合冲刑害统计（白话列出具体对，生活化解读）
  const myDz = mine.pillars.map(p => p.diZhi);
  const paDz = partner.pillars.map(p => p.diZhi);
  const posLabel = ['年', '月', '日', '时'];
  // ⚠️ 这里必须用 **DZ_ 前缀（地支键）** 的表。曾误用上面的 LIU_HE/SAN_HE/LIU_CHONG
  // ——那三张是**生肖键**的表（'鼠'→'牛' …），拿地支去查一律 undefined，
  // 于是六合/三合/六冲在这一层**全部静默失效**（不报错，只是 heCount/chongCount 恒为 0，
  // 「地支合冲」退化成常数 10 分 + 成局修正），而 desc 却照旧输出"无大合也无大冲"。
  // 症状与"没写这个功能"完全一样，无法从测试发现——除非夹具刻意造一对六冲。
  let heCount = 0, chongCount = 0;
  const hePairs: string[] = [];   // 具体合对（带柱位）
  const chongPairs: string[] = []; // 具体冲刑对
  for (let i = 0; i < myDz.length; i++) {
    for (let j = 0; j < paDz.length; j++) {
      const a = myDz[i], b = paDz[j];
      if (a === b) continue;
      if (DZ_LIU_HE[a] === b) { heCount += 2; hePairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}六合`); }
      else if ((DZ_SAN_HE[a] || []).includes(b)) { heCount += 1; hePairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}三合`); }
      if (DZ_LIU_CHONG[a] === b) { chongCount += 2; chongPairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}六冲`); }
      else if ((a === '寅' && ['巳', '申'].includes(b)) || (a === '巳' && ['申', '寅'].includes(b)) || (a === '申' && ['寅', '巳'].includes(b))) { chongCount += 1; chongPairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}相刑`); } // 三刑近似
    }
  }
  // 跨盘成局（v5）：三合/三会/半合/半会——单支两两配对看不出成局，会整层漏判
  const crossJu = findCrossJu(myDz, paDz, mine.yongShen || [], partner.yongShen || [], myJi, paJi);
  const juDelta = crossJu.reduce((s, j) => s + juScoreDelta(j), 0);
  const dzScore = clamp20(10 + heCount - chongCount + juDelta);
  const heShow = hePairs.slice(0, 3).join('；');
  const chongShow = chongPairs.slice(0, 3).join('；');
  let dzDesc = '';
  if (hePairs.length > 0) dzDesc += `相合：${heShow}${hePairs.length > 3 ? `等${hePairs.length}处` : ''}。`;
  if (chongPairs.length > 0) dzDesc += `冲刑：${chongShow}${chongPairs.length > 3 ? `等${chongPairs.length}处` : ''}。`;
  if (crossJu.length > 0) {
    dzDesc += `成局：${crossJu.map((j) => `${j.dzs.join('')}${j.kind}${j.wx}局（${JU_VERDICT_TEXT[j.verdict]}）`).join('；')}。成局的地支牵引力大于单支相合，这一层要单独算。`;
  }
  if (heCount === 0 && chongCount === 0 && crossJu.length > 0) {
    dzDesc += `单支层面没有合也没有冲，但上面的成局才是你们真正的地支结构——你们不是"互不干扰"，而是被某一行绑在一起：绑在共同用神上是天然的默契，绑在共同忌神上是一起犯同一个错。`;
  } else if (heCount > chongCount) {
    dzDesc += `合多于冲——你们的气场有天然的接口：想法容易对上，相处不容易内耗。地支相合，尤其是六合，意味着在某些特定场合你们会莫名地站在同一边，属于越处越顺的底子。`;
  } else if (chongCount > heCount) {
    dzDesc += `冲多于合——你们是节奏型差异的组合：不是三观不合，而是快慢、急缓、先说后做的直觉常常相反。冲的杀伤力不在吵架本身，而在日积月累的拧巴。对策就一条：分歧当场摊开说，别让小事在心里发酵成大事。`;
  } else if (heCount === 0 && chongCount === 0 && crossJu.length === 0) {
    dzDesc += `双方地支无大合也无大冲，气场各自独立、互不干扰——这样的组合少了一见如故的默契，但也少了先天的不对付，关系成色完全由后天相处决定。`;
  } else {
    dzDesc += `合冲相当——你们既有投缘的接口，也有要磨合的点，属于处得好是缘分、处不好是功课的组合。多在彼此投缘的领域共处，冲的部分提前知道对方的雷区，就能大事化小。`;
  }
  items.push({ title: '地支合冲', score: dzScore, desc: dzDesc });

  // 3) 纳音（20 分）——双向计算取均分（对称）
  const mNy = NAYIN_WX[mine.nayin] || '', pNy = NAYIN_WX[partner.nayin] || '';
  const nyAB = nyDirScore(mNy, pNy); // 我 → 对方
  const nyBA = nyDirScore(pNy, mNy); // 对方 → 我
  const nyScore = Math.round((nyAB + nyBA) / 2);
  let nyDesc: string;
  if (mNy && pNy && WX_SHENG[mNy] === pNy) {
    nyDesc = `你的纳音${mine.nayin}（${mNy}）生对方${partner.nayin}（${pNy}）：你的年命旺对方，家宅安宁；年命相生是传统合婚的吉兆。` +
      `白话一点：纳音看的是两个人的"底色"合不合——你的底色天然滋养对方的底色，像合适的土壤遇上对的种子。这种组合里，你的一句话、一个决定，常常在不经意间就把对方的运势带起来了。`;
  } else if (mNy && pNy && WX_SHENG[pNy] === mNy) {
    nyDesc = `对方纳音${partner.nayin}（${pNy}）生你的${mine.nayin}（${mNy}）：对方年命旺你，得助力；领受之余也多体谅对方的付出。` +
      `白话一点：和对方在一起，你会发现自己状态莫名变好——决策更准、人缘更顺。这不是玄学安慰，是两种底色在互相滋养。记得别把这份"顺"全归功于自己，对方是那个默默给你托底的人。`;
  } else if (mNy && mNy === pNy) {
    nyDesc = `双方纳音同属${mine.nayin}，命韵相似，彼此懂对方的节奏。` +
      `白话一点：你们像是同一种木头做的两把琴——频率天然一致，一个眼神就能接上对方的半句话。缺点是共鸣太强：对方emo你跟着emo。学着做彼此的"减震器"而不是"放大器"。`;
  } else if (mNy && pNy && WX_KE[mNy] === pNy) {
    nyDesc = `你的纳音${mine.nayin}（${mNy}）克对方${partner.nayin}（${pNy}）：你年命占强势位，宜多相让。` +
      `白话一点：底色相克不是"命里犯冲"的判死刑，而是提醒你气场天然压对方一头——你语气重三分，对方感受到的是十分。同样的意思换个软一点的说法，效果天差地别。`;
  } else if (mNy && pNy && WX_KE[pNy] === mNy) {
    nyDesc = `对方纳音${partner.nayin}（${pNy}）克你的${mine.nayin}（${mNy}）：对方年命占强势位，你需要更多话语权上的平衡。` +
      `白话一点：对方气场天然压你一头，你容易在不知不觉中让渡太多决定权。感情里可以示弱，但不可以失声——该坚持的底线温和而坚定地守住，对方反而更尊重你。`;
  } else {
    nyDesc = `纳音${mine.nayin}与${partner.nayin}无直接生克，平顺无大碍。` +
      `白话一点：底色互不干扰，各自安好——没有额外的加成，也没有先天的别扭，关系好坏全看日常怎么处。`;
  }
  items.push({ title: '纳音年命', score: nyScore, desc: nyDesc });

  // 4) 生肖（20 分）
  let sxScore: number; let sxDesc: string;
  if (LIU_HE[mine.zodiac] === partner.zodiac) {
    sxScore = 20; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}六合，天生一对，默契十足。` +
      `白话一点：六合是"暗合"——明面上你们的性格未必相似，但价值观和节奏天然合拍，越处越有默契。老一辈说的"天生一对"，多半指的就是这种组合：不轰烈，但省心。`;
  } else if ((SAN_HE[mine.zodiac] || []).includes(partner.zodiac)) {
    sxScore = 16; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}三合，志趣相投，易成良配。` +
      `白话一点：三合是大格局的合——你们看人生的大方向一致：什么值得花力气、什么不值得计较，这些底层判断惊人地相同。适合一起做长远打算的组合，越到大事上越显出合拍。`;
  } else if (LIU_CHONG[mine.zodiac] === partner.zodiac) {
    sxScore = 4; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}六冲，性格差异大，需要更多包容。` +
      `白话一点：六冲是"节奏差"——你对快慢、取舍的直觉和对方常常相反。但冲的组合感情反而不平淡：吸引力强、火花多，吵架也多。关键就一条：吵完架谁先转身。先转身的那个人，不是输了，是更爱。`;
  } else {
    sxScore = 10; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}无合无冲，随缘相处。` +
      `白话一点：属相平配，不好也不坏——缘分在人不在相。没有先天的加持或包袱，你们的感情成色百分之百由自己书写。`;
  }
  items.push({ title: '生肖配对', score: sxScore, desc: sxDesc });

  // 5) 喜用神互补（20 分）——v5：双向四象限（用神 × 忌神交叉）
  // 旧版只判"对方日主是否在我用神列表里"，于是"对方日主正好是我的忌神"这一最坏情况
  // 只会被写成"非你喜用"，不扣分，还会因为反向互补拿 15 分。现补上忌神一侧。
  const partnerHelps = (mine.yongShen || []).includes(partner.dayWx); // 对方补我（我受益）
  const mineHelps = (partner.yongShen || []).includes(mine.dayWx);    // 我补对方（对方受益）
  const partnerHurts = myJi.includes(partner.dayWx);                  // 对方日主是我的忌神
  const mineHurts = paJi.includes(mine.dayWx);                        // 我的日主是对方的忌神
  let ysScore = 8; // 基准：平缘（互不在喜忌之列）
  if (partnerHelps) ysScore += 6;
  if (mineHelps) ysScore += 6;
  if (partnerHurts) ysScore -= 6;
  if (mineHurts) ysScore -= 6;
  ysScore = clamp20(ysScore);
  let ysDesc: string;
  if (partnerHurts && mineHurts && !partnerHelps && !mineHelps) {
    ysDesc = `互为忌神：对方日主${partner.dayWx}正落在你的忌神（${myJi.join('、')}）上，而你的${mine.dayWx}也正落在对方的忌神（${paJi.join('、')}）上——两人是互相踩在对方的雷区上。` +
      `白话一点：这不是"缘分浅"，而是"互相加码"——你越靠近，对方越旺过头；对方越靠近，你也越旺过头。这类组合要过得好，靠的是后天建立的边界感：各自管好自己的节奏，别指望对方替你"泄火"，你们都不是彼此的泄火人。`;
  } else if (partnerHurts && mineHelps) {
    ysDesc = `一进一出：你的日主${mine.dayWx}正补对方的喜用神（${(partner.yongShen || []).join('、')}）——你确实在旺对方；但对方日主${partner.dayWx}落在你的忌神（${myJi.join('、')}）上，你这一侧的获益是打折的。` +
      `白话一点：这段关系里你是给出方、对方是收受方。你对TA加码，TA的状态会肉眼可见地变好；但TA对你的"好"，未必真能让你变好——要分清"被照顾的舒服"和"对自己真的有利"是两回事。`;
  } else if (partnerHelps && mineHurts) {
    ysDesc = `一进一出：对方日主${partner.dayWx}正补你的喜用神（${(mine.yongShen || []).join('、')}）——你在受益；但你的日主${mine.dayWx}落在对方的忌神（${paJi.join('、')}）上，对方为你承担了额外的消耗。` +
      `白话一点：你是受益的一方，对方是默默付出的那一方。别把这份"顺"当成理所当然——对方不是不累，只是没说出来。`;
  } else if (partnerHelps && mineHelps) {
    const cross = [
      partnerHurts ? `对方${partner.dayWx}也在你忌神（${myJi.join('、')}）上` : '',
      mineHurts ? `你的${mine.dayWx}也在对方忌神（${paJi.join('、')}）上` : '',
    ].filter(Boolean).join('，');
    ysDesc = `互为喜用：对方日主${partner.dayWx}补你的用神，你的${mine.dayWx}也补对方，彼此是对方的贵人；不过${cross}——互相有补，也互相有耗。` +
      `白话一点：你们是彼此的"补品"，你缺的对方恰好有，对方缺的你刚好补。这种组合过日子越久越舒服，是合婚里最实惠的一档。唯一提醒：别因为"旺"就懒得经营，再好的底子也怕消耗。`;
  } else if (partnerHelps) {
    ysDesc = `对方日主${partner.dayWx}正是你的喜用神，与你在一起你的运势有助益（你更受益）；而你的${mine.dayWx}不在对方喜用之列，记得在情感之外也给对方实际的支持。` +
      `白话一点：跟对方在一起，你会不知不觉变顺——这是"旺你"的缘分。但别只做受益方：对方累的时候、低落的时候，记得你也伸把手。只进不出的好运气，迟早会用完。`;
  } else if (mineHelps) {
    ysDesc = `你的日主${mine.dayWx}是对方的喜用神，你能旺对方（对方更受益）；但对方${partner.dayWx}不在你喜用之列，别把"我对他好"当成关系好的全部保证。` +
      `白话一点：你是对方的贵人——TA跟你在一起后状态肉眼可见地变好。你旺对方不等于你吃亏，但要看清一件事：对方怎么对待你的付出，决定这段感情值不值得继续加码。`;
  } else if (partnerHurts) {
    ysDesc = `对方日主${partner.dayWx}落在你的忌神（${myJi.join('、')}）上：与你在一起，对方的属性会持续助长你本已过头的那一行，不是滋养，是加压。` +
      `白话一点：你会觉得跟TA在一起很舒服、被托着，但状态上容易"越来越重"——拖延、依赖、下不了决心，都是这一行的典型表现。别把舒服当成合适。`;
  } else if (mineHurts) {
    ysDesc = `你的日主${mine.dayWx}落在对方的忌神（${paJi.join('、')}）上：你的存在会持续助长对方本已过头的那一行，对方未必说得出哪里不对，但会越来越累。` +
      `白话一点：你是付出型，但你的付出对TA未必是补——找对"给的方式"比给多少更重要：多给TA用神方向的东西（${(partner.yongShen || []).join('、')}），少用自己的方式硬给。`;
  } else {
    ysDesc = `双方日主都不在对方喜用神之列，互补性一般，需靠后天经营。` +
      `白话一点：五行上谁也不旺谁，属于"平缘"——好消息是你们的感情不受命理绑架，全凭真心换真心；坏消息是没有外挂，所有甜蜜都得靠两个人亲手挣。`;
  }
  items.push({ title: '喜用互补', score: ysScore, desc: ysDesc });

  // 6) 神煞共振（20 分）——用「加权 Jaccard」衡量双方神煞的实际共振强度
  // v4（2026-10-04）：旧口径是"神煞名集合求交集"，实测已被证伪——任意两张真实命盘平均命中
  // 14.9 颗神煞（去重名）、平均共享 6 颗，"共同神煞 ≥3 即高重合"会把 93.9% 的盘对判成高重合，
  // 判别力≈0。现按 shenShaPower 的力量（宫位×得地×空亡×制化×喜忌）加权后求相似度。
  // 口径与标定见 utils/shenShaSimilarity.ts；权重模型见 utils/shenShaPower.ts。
  const shaInputOf = (p: typeof mine) => ({
    pillars: p.pillars,
    // 缺 shenSha 时兜底自算（性别未知 → 元辰/勾绞按无性别跳过，不影响其余神煞）
    shenSha: p.shenSha ?? calcShenSha(p.pillars),
    yongShen: p.yongShen,
  });
  const shaCmp = compareShenShaCharts(shaInputOf(mine), shaInputOf(partner));
  const shaScore = resonanceScoreFrom(shaCmp.score);
  const shaMineLabel = mine.name ? `「${mine.name}」` : '你';
  const shaPartnerLabel = partner.name ? `「${partner.name}」` : '对方';
  const shaTop = shaCmp.shared.slice(0, 3).map((s) => s.name);
  const shaCommon = shaTop.length > 0 ? shaTop.join('、') : '';
  const mineOnly = shaCmp.onlyA.slice(0, 2).join('、');
  const partnerOnly = shaCmp.onlyB.slice(0, 2).join('、');
  let shaDesc: string;
  if (shaScore >= 17) {
    shaDesc = `神煞高度共振——你们命中的"触发点"${shaCommon ? `（${shaCommon}）` : ''}几乎重叠：一个人的顺境往往是另一个人的顺境，难关也容易撞在同一处。`
      + `好处是极度懂对方、不用解释太多；风险是缺互补，要刻意留一两个"和而不同"的空间。`;
  } else if (shaScore >= 13) {
    shaDesc = `神煞共振明显——${shaCommon ? `${shaCommon} 等关键星在两人盘里同时发力` : '双方的关键星多处呼应'}，日常相处容易"对上频道"，一个眼神就知道对方在想什么。`;
  } else if (shaScore >= 9) {
    shaDesc = `神煞共振一般——${shaCommon ? `共同的发力点是${shaCommon}，但数量不多` : '共同的关键星不多'}，默契更多是处出来的，不是天生带出来的。`;
  } else if (shaScore >= 5) {
    shaDesc = `神煞共振偏弱——两人的"触发点"大多不一样${shaCommon ? `（仅 ${shaCommon} 有交集）` : ''}：你在意的事对方可能无感，反之亦然。`
      + `这不是不合，是意味着"我以为你懂"最容易出岔子——多把话说出口。`;
  } else {
    shaDesc = `神煞几乎不共振——两颗盘的关键星各走各的${shaCommon ? `（仅 ${shaCommon} 有交集）` : ''}，敏感点、兴奋点、雷区基本不重叠。`
      + `好处是互不干扰、各自独立；代价是"感同身受"要靠主动去学，不能指望天生。`;
  }
  if (mineOnly || partnerOnly) {
    shaDesc += `各自的独有触发点是：${mineOnly ? `${shaMineLabel}带${mineOnly}` : ''}${mineOnly && partnerOnly ? '，' : ''}${partnerOnly ? `${shaPartnerLabel}带${partnerOnly}` : ''}——这部分不是"不合"，而是各自带着不同的课题进场。`;
  }
  items.push({ title: '神煞共振', score: shaScore, desc: shaDesc });

  // 7) 旺衰互动（20 分，v6 新增）
  // 为什么单列一项：v5 起"身强身弱"虽然已进合盘，但只以「忌神」的形式**间接**出现
  // （身强者被生 = 帮身过头 → 扣分），从来没有把**两人的旺衰放在一起比**。
  // 于是"双强"（谁都不肯让）与"双弱"（互相给不上力）在旧口径里与"一强一弱"同分，
  // 而这三类在现实里的相处难度完全不同。本项只看这一件事，不看五行生克（那是第 1 项的事）。
  const STRENGTH_AXIS: Record<string, number> = { '身极强': 2, '身强': 1, '中和': 0, '身弱': -1, '身极弱': -2 };
  const mA = mine.strengthLevel ? STRENGTH_AXIS[mine.strengthLevel] : undefined;
  const pA = partner.strengthLevel ? STRENGTH_AXIS[partner.strengthLevel] : undefined;
  const wsMine = mine.name ? `「${mine.name}」` : '你';
  const wsPartner = partner.name ? `「${partner.name}」` : '对方';
  let wsScore = 10;
  let wsDesc: string;
  if (mA === undefined || pA === undefined) {
    // 正常流程（合盘页 buildPerson）必定带旺衰档；只有手工构造的调用方会缺。
    wsScore = 10;
    wsDesc = '双方旺衰档未随盘传入，本项按中性分计——正常排盘流程不会走到这里，其余各项不受影响。';
  } else if (mA === 0 && pA === 0) {
    wsScore = 16;
    wsDesc = '两人都是中和——这是最"不挑"的旺衰组合：谁也不特别旺、谁也不特别弱，相处里的强弱拉扯最少，'
      + '谁也不需要长期"让着"谁。代价是少了强弱互补带来的张力，同频有余、互相拉扯成长的机会少，关系更多靠日常经营的默契。';
  } else if (mA === 0 || pA === 0) {
    // 一方中和 → 中和自带"百搭"属性（既能接住强的，也不至于被弱的拖住）
    wsScore = 15;
    const neutralSide = mA === 0 ? wsMine : wsPartner;
    const otherSide = mA === 0 ? wsPartner : wsMine;
    const otherLv = mA === 0 ? partner.strengthLevel : mine.strengthLevel;
    wsDesc = `${neutralSide}是中和——旺衰上属于"百搭"体质：既能接住强势的一方，也不至于被弱势的一方拖住，`
      + `${otherSide}的${otherLv}在这段关系里都能找到自己的位置。这一项因此主要由另一方定分：中和的一方更像关系里的稳定器，而不是发力点。`;
  } else if (mA * pA < 0) {
    // 一强一弱 → 互补
    wsScore = Math.abs(mA) + Math.abs(pA) >= 3 ? 20 : 18;
    const strongSide = mA > 0 ? wsMine : wsPartner;
    const weakSide = mA > 0 ? wsPartner : wsMine;
    const strongLv = mA > 0 ? mine.strengthLevel : partner.strengthLevel;
    const weakLv = mA > 0 ? partner.strengthLevel : mine.strengthLevel;
    const extreme = Math.abs(mA) === 2 && Math.abs(pA) === 2;
    wsDesc = `${strongSide}${strongLv}、${weakSide}${weakLv}——一个能撑、一个能软，是合盘里少见的"互补结构"：`
      + `${strongSide}天然给出方向与底气，${weakSide}带来细腻与回旋。`
      + (extreme
        ? '只是两侧都到了"极"，这个互补会走得很极端：强的一方压得住场，也容易压过头；弱的一方接得住宠，也容易退到没声音。'
          + '强的一方要刻意"往后半步"、弱的一方要刻意"往前半步"，这个结构才转得起来。'
        : '只要强的一方别把"照顾"演成"掌控"、弱的一方别把"依赖"当成理所当然，这一项是实打实的加分。')
      + '但互补不等于单方面供养——能撑的人也会累，别让"你比我强"变成"所以都该你来"。';
  } else if (mA > 0) {
    // 同强 → 硬碰硬
    wsScore = Math.abs(mA) + Math.abs(pA) >= 3 ? 7 : 10;
    wsDesc = `两人都偏强（${mine.strengthLevel} / ${partner.strengthLevel}）——两个人都能量足、主意正，谁都扛得住事，也谁都不太习惯让步。`
      + '这类组合的好处是"靠得住"，难处在"谁来先低头"这道题上天生拿不到分：两个发电机接在一起，火花是真的大，烧保险丝也真容易。'
      + '出路不是比谁更有道理，而是提前约定一条规矩——"谁更在意这件事，谁先开口"，把让步变成规则而不是输赢。';
  } else {
    // 同弱 → 互相给不上力
    wsScore = Math.abs(mA) + Math.abs(pA) >= 3 ? 7 : 10;
    wsDesc = `两人都偏弱（${mine.strengthLevel} / ${partner.strengthLevel}）——谁都需要被扶一把，而对方手里恰好也没有那把力气。`
      + '这类组合最怕"一起沉"：一方情绪落下去，另一方接不住，很容易被同一个浪打翻。'
      + '别指望对方当你的充电宝——你们更需要一起接电：稳定的作息、可信赖的朋友、共同的长期目标，都是你们共同的"补气"。';
  }
  items.push({ title: '旺衰互动', score: wsScore, desc: wsDesc });

  // 8) 气候与用神（20 分，v6 新增）
  // 两项内容合在一项里，因为它们是同一件事的两个侧面——"我们缺的是不是同一种东西"：
  //   ① 季节同向：月令所属气候是否同向。生于同一气候的人，怕冷怕热、作息节奏、
  //      对"热闹还是安静"的需要天生接近，日常摩擦天生就少；寒暖相对则相反。
  //   ② 用神交集：双方喜用五行的**重合度**。都需火的人天然同频，一方要火一方忌火则是拧着来。
  //      这与「喜用互补」不是同一件事：那一项看"对方这个**人**能不能补我"，
  //      这一项看"我们使劲的**方向**是不是同一个"。
  const SEASON_OF_ZHI: Record<string, string> = {
    寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏',
    申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬',
  };
  /** 气候组：寒暖是调候的根，跨季节也可同向（春与夏同属暖、秋与冬同属寒） */
  const CLIMATE_OF_SEASON: Record<string, string> = { 春: '暖', 夏: '暖', 秋: '寒', 冬: '寒' };
  const mMonthZhi = mine.pillars?.[1]?.diZhi || '';
  const pMonthZhi = partner.pillars?.[1]?.diZhi || '';
  const mSeason = SEASON_OF_ZHI[mMonthZhi] || '';
  const pSeason = SEASON_OF_ZHI[pMonthZhi] || '';
  const yongCross = (mine.yongShen || []).filter((wx) => (partner.yongShen || []).includes(wx));
  const jiCross = myJi.filter((wx) => paJi.includes(wx));
  let clScore = 10;
  let seasonText: string;
  if (mSeason && pSeason) {
    if (mSeason === pSeason) {
      clScore += 5;
      seasonText = `两人同生于${mSeason}季（${mMonthZhi}月 / ${pMonthZhi}月）——寒暖燥湿的体感、作息节奏、对"热闹还是安静"的需要都天生接近，`
        + '因为"你不觉得冷、我觉得热"这类小事起摩擦的概率天生就低';
    } else if (CLIMATE_OF_SEASON[mSeason] === CLIMATE_OF_SEASON[pSeason]) {
      clScore += 2;
      seasonText = `你生于${mMonthZhi}月（${mSeason}）、对方生于${pMonthZhi}月（${pSeason}）——虽不同季，`
        + `但同属气候上的"${CLIMATE_OF_SEASON[mSeason]}"（${mSeason}与${pSeason}），体感、作息与日常节奏谈不上冲突，大体同向`;
    } else {
      clScore -= 3;
      seasonText = `你生于${mMonthZhi}月（${mSeason}，气候偏${CLIMATE_OF_SEASON[mSeason]}）、`
        + `对方生于${pMonthZhi}月（${pSeason}，气候偏${CLIMATE_OF_SEASON[pSeason]}）——正好分处寒暖两端：`
        + '一方体感偏寒、一方体感偏暖，空调温度、作息早晚、连"什么时候想出门"都容易对不上。这不是三观问题，是体感问题，说开了就好办';
    }
  } else {
    seasonText = '双方月令未取到，季节这一层按中性计';
  }
  let yongText: string;
  if (yongCross.length >= 2) {
    clScore += 5;
    yongText = `喜用高度重合（都需${yongCross.join('、')}）——你们缺的是同一种东西、往同一个方向使劲，谁往前推都不会拆对方的台`;
  } else if (yongCross.length === 1) {
    clScore += 2;
    yongText = `喜用有一处重合（共同需要${yongCross[0]}）——同频的地方够你们互相确认，不同频的地方留出各自的空间就好`;
  } else {
    yongText = '双方喜用五行没有交集——各自缺的东西不一样，一方觉得"这样最舒服"的安排，另一方可能完全无感。'
      + '这一层不扣分，但提醒你们：照顾对方要用对方的方式，别用自己的舒适去揣度对方';
  }
  let jiText = '';
  if (jiCross.length >= 2) {
    clScore -= 3;
    jiText = `另外，${jiCross.join('、')}在你们双方盘里都是忌神——方向感一致是好事，但一起使劲时也要小心别把这股"共同的方向感"用在彼此都不需要的地方`;
  } else if (jiCross.length === 1) {
    clScore -= 1;
    jiText = `另外，${jiCross[0]}对你们双方都是忌神——共同不爱的东西，反而容易成为"一起躲开"的默契`;
  }
  const clDesc = `季节：${seasonText}。用神：${yongText}。${jiText}`;
  items.push({ title: '气候与用神', score: clamp20(clScore), desc: clDesc });

  // 6) 紫微命宫主星（20 分）——命宫主星配对 + 夫妻宫互参 + 命宫地支合冲（三项皆双向对称）
  // v3（2026-09-24）：由 10 分制升为 20 分制，与八字五项同权重，紫微不再只是"点缀分"。
  // 档位（20 分制）：同星 14 / 经典互补配对 16~20 / 异组 16 / 同组 12，夫妻宫互参命中 +4，命宫地支六合 +2、三合 +1、六冲 −4。
  // 兜底已取消：正常路径必定有双方紫微盘（合盘页 buildZiweiChart 排盘）；取不到时明确说明，不再含糊给"基础缘分分"。
  let zwScore = 10;
  let zwDesc = '未能取得双方紫微命盘（排盘未成功），本项按中性分计。';
  const mZw = mine.ziwei, pZw = partner.ziwei;
  if (Array.isArray(mZw) && Array.isArray(pZw)) {
    // 空宫借对宫主星论：命无正曜是正常命盘状态，不是出生信息缺失
    const mB = zwPalaceStarsBorrow(mZw, '命宫');
    const pB = zwPalaceStarsBorrow(pZw, '命宫');
    const ms = mB.stars, ps = pB.stars;
    if (ms.length > 0 && ps.length > 0) {
      const a = ms[0], b = ps[0];
      // 基础配对分（对称部分）
      let pair: number; let pairText: string;
      if (a === b) {
        pair = 14;
        pairText = `双方命宫同坐${a}——同类相吸、节奏一致，但要警惕把同样的短板一起放大`;
      } else {
        const ideal = ZW_IDEAL_PAIRS[zwPairKey(a, b)];
        if (ideal) {
          pair = ideal * 2; // 8/9/10 → 16/18/20
          pairText = `${a}与${b}是经典互补组合，一个向外拓、一个向内守，配合度高`;
        } else {
          const gA = zwGroupOf(a), gB = zwGroupOf(b);
          if (gA !== gB) {
            pair = 16;
            pairText = `${a}（${ZW_GROUP_NAMES[gA]}）配${b}（${ZW_GROUP_NAMES[gB]}），一刚一柔、一动一静，互补性好`;
          } else {
            pair = 12;
            pairText = `${a}与${b}同属${ZW_GROUP_NAMES[gA]}，风格相近——默契有余、互补不足，需要刻意引入不同视角`;
          }
        }
      }
      // 夫妻宫互参（方向性）：对方命宫主星落入我的夫妻宫＝正缘类型吻合（夫妻宫空宫同样借对宫论）
      const mSpouse = zwPalaceStarsBorrow(mZw, '夫妻').stars;
      const pSpouse = zwPalaceStarsBorrow(pZw, '夫妻').stars;
      const abBonus = mSpouse.some((s) => ps.includes(s)) ? 4 : 0;
      const baBonus = pSpouse.some((s) => ms.includes(s)) ? 4 : 0;
      // 命宫地支合冲（对称关系，双向同值）：这是紫微合盘里判断"宫位层面契合度"的标准一环
      const mBranch = zwPalaceOf(mZw, '命宫')?.branch;
      const pBranch = zwPalaceOf(pZw, '命宫')?.branch;
      let brScore = 0; let brText = '';
      if (mBranch && pBranch) {
        if (DZ_LIU_HE[mBranch] === pBranch) {
          brScore = 2;
          brText = `命宫地支${mBranch}${pBranch}六合——宫位层面天然相亲，相处自带默契，不费力`;
        } else if ((DZ_SAN_HE[mBranch] || []).includes(pBranch)) {
          brScore = 1;
          brText = `命宫地支${mBranch}${pBranch}三合——同属一局，大方向一致，遇事容易想到一处去`;
        } else if (DZ_LIU_CHONG[mBranch] === pBranch) {
          brScore = -4;
          brText = `命宫地支${mBranch}${pBranch}相冲——两人的核心诉求天然对撞，最容易"都在理、说不到一起"；凡事当面讲开，别赌气`;
        } else {
          brText = `命宫地支${mBranch}与${pBranch}无合无冲，宫位层面平顺不折腾`;
        }
      }
      const clamp = (n: number) => Math.max(0, Math.min(20, n));
      const ab = clamp(pair + abBonus + brScore);
      const ba = clamp(pair + baBonus + brScore);
      zwScore = Math.round((ab + ba) / 2);
      const spouseTexts: string[] = [];
      if (abBonus) spouseTexts.push('对方命宫主星正落你的夫妻宫，是你命中欣赏的类型');
      if (baBonus) spouseTexts.push('你的命宫主星正落对方夫妻宫，在对方眼里你是理想型');
      // 星性白话画像（按双方命宫首星所属分组）
      const groupDesc = ['有主见、要面子、习惯做决定的人', '细腻体贴、擅长出主意和打配合的人', '行动派、闲不住、敢想敢闯的人'];
      const borrowNote = zwBorrowNote('你', mB) + zwBorrowNote('对方', pB);
      zwDesc = `${pairText}。${spouseTexts.length > 0 ? spouseTexts.join('；') + '。' : ''}${brText ? brText + '。' : ''}` +
        `${borrowNote}` +
        `白话一点：你是${ZW_GROUP_NAMES[zwGroupOf(a)]}——${groupDesc[zwGroupOf(a)]}；对方是${ZW_GROUP_NAMES[zwGroupOf(b)]}——${groupDesc[zwGroupOf(b)]}。星性没有好坏，只有合不合拍：同一组的像同行者，不同组的像拼图。`;
    } else {
      // 命宫与对宫皆不见十四主星（空而无借）——概率极低，但确实存在，措辞不可写成"缺数据"
      zwDesc = '双方有一方命宫与对宫均不见十四主星（空而无借），该宫能量平和、没有先天定式，无主星组合可比对，本项按中性分计。';
    }
  }
  items.push({ title: '紫微命宫', score: zwScore, desc: zwDesc });

  // 7) 四化互动（20 分）——双方生年干四化是否引动对方命星（禄>科>权>忌，双向对称）
  // v3（2026-09-24）：由 10 分制升为 20 分制，与八字五项同权重；兜底取消，改用中性分 + 明确说明。
  let sihuaScore = 10;
  let sihuaDesc = '未能取得双方紫微命盘与生年四化（排盘未成功），本项按中性分计。';
  const mStem = mine.pillars?.[0]?.tianGan;
  const pStem = partner.pillars?.[0]?.tianGan;
  if (Array.isArray(mZw) && Array.isArray(pZw) && mStem && pStem && STEM_SIHUA_TABLE[mStem] && STEM_SIHUA_TABLE[pStem]) {
    // 命中宫借对宫主星论：四化引动的是"命宫所论之星"，空宫借星后照样成立
    const mMingB = zwPalaceStarsBorrow(mZw, '命宫');
    const pMingB = zwPalaceStarsBorrow(pZw, '命宫');
    const mMing = mMingB.stars;
    const pMing = pMingB.stars;
    if (mMing.length > 0 && pMing.length > 0) {
      const ab = sihuaDirOnMing(mStem, pMing, '你', '对方'); // 我年干四化 → 对方命宫
      const ba = sihuaDirOnMing(pStem, mMing, '对方', '你'); // 对方年干四化 → 我命宫
      sihuaScore = Math.round((ab.score + ba.score) / 2);
      // 四化档位白话：给这对组合的整体相处基调
      const tones: number[] = [ab.score, ba.score];
      const hasLu = tones.includes(20);
      const hasJi = tones.includes(6);
      let toneText = '';
      if (hasLu && !hasJi) toneText = '整体基调：你们的缘分自带"保底资产"——哪怕吵架冷战，感情的基本面很难真的塌。这种盘要珍惜：不是每对情侣都有这种先天护城河。';
      else if (hasLu && hasJi) toneText = '整体基调：又旺又有压力的一对——好的时候特别好，较劲的时候也特别较劲。秘诀是记住旺的时候多存感情本钱，较劲的时候才有得花。';
      else if (hasJi) toneText = '整体基调：对方的在意容易变成你的压力——TA越在乎越紧张，越紧张越想管。这不是"克你"，是TA表达爱的姿势不对。多给彼此留一点空间和信任，忌的伤害就会小很多。';
      else if (tones.includes(16) || tones.includes(14)) toneText = '整体基调：对方能带给你名声、贵人和体面——带TA出席你的重要场合，往往都是加分项。同时留意"为你好"式的推动，别让它悄悄变成施压。';
      else toneText = '整体基调：你们的四化互不引动，属于"干净的平缘"——没有先天的加持，也没有先天的债务，感情的每一分厚薄都是两个人亲手挣来的。';
      sihuaDesc = `${zwBorrowNote('你', mMingB)}${zwBorrowNote('对方', pMingB)}${ab.text}；${ba.text}。${toneText}`;
    } else {
      sihuaDesc = '双方有一方命宫与对宫均不见十四主星（空而无借），无命星可论四化引动，本项按中性分计。';
    }
  }
  items.push({ title: '四化互动', score: sihuaScore, desc: sihuaDesc });

  const totalScore = items.reduce((s, i) => s + i.score, 0);
  // 满分口径（v6）：八字八项各 20 分（日主五行/地支合冲/纳音年命/生肖配对/喜用互补/神煞共振/
  // 旺衰互动/气候与用神）+ 紫微两项各 20 分 = 200 分。
  //
  // 档位阈值（v6.1，2026-10-13）：**不是等比换算来的，是按实测分布分位数标定的**。
  // 400 对真实合盘（seed 20261006，与 hepanCalibration.test.ts 同一批）实测：
  // 10 项总分 mean 128.2、min 85、p15 113、p50 128、p55 130、p70 137、p90 147、max 160。
  // 取 p90 / p55 / p15 → **147 / 130 / 113**。
  // 档位占比：天作之合 10.5% / 良缘 36.8% / 平常 38.5% / 需磨合 14.2%
  // ——与 v5.1 的 11.5 / 34.8 / 40.3 / 13.5 基本一致，说明加项没有把档位语义打歪。
  //
  // ⚠️ v6 / v6.1 为什么连着重标两次（一轮里动了五处口径，分布必移）：
  //   ① 新增「旺衰互动」② 新增「气候与用神」→ 项数 8 → 10、满分 160 → 200；
  //   ③ 忌神改用**完整口径**（`PersonChart.jiShen` = `recommendYongShen` 的 `xiShen`：
  //      特殊格局(从格/从旺，喜忌反转) ∪ 扶抑 ∪ 破用变忌，再减去用神）。
  //      它把此前"轻量扶抑兜底"的口径补全了——实测 800 张真实盘有 **28.4%** 的忌神表发生变化
  //      （人均多 0.43 条、少 0.11 条），且**杜绝了"同一五行既是用神又是忌神"**（实测 0 例）；
  //      「喜用互补」的方差因此明显变大（mean 12.29 → 11.54、p15 8 → 2），判别力更强；
  //   ④ 「纳音年命」改用年柱纳音（personChart）——两口径分布同形，单独看不必重标；
  //   ⑤ `personChart.buildPerson` 改为把全局五行统计喂给 `recommendYongShen`
  //      （此前传 undefined）→ 合盘/对比页的用神与八字页彻底同口径（从旺格识别从"缺"变"有"）。
  //   ③⑤ 让分布整体小幅**下移**（mean 129.5 → 128.2、p15 115 → 113、p55 132 → 130、p90 148 → 147），
  //   故阈值随之下移 1~2 分——这正是"锚点是分布的函数"该有的动作，别把旧数字抄回来。
  //
  // ⚠️ 历史记录（供对照，别再把旧阈值抄回来）：
  //   v4 满分 140 → 档位 107/87/66；v5/v5.1 满分 160 → 档位 118/103/85；
  //   v6 满分 200 → 档位 148/132/115。
  //
  // ⚠️ 为什么不用"等比换算 160→200 = 148/129/106"：
  //   换算的前提是"新项分布与旧项同量纲"，而两个新项（旺衰互动均分 14.2、气候与用神 13.2）
  //   都**高于**旧 8 项的均分 12.9，前提不成立。所以照旧按分位数直接标定。
  //
  // ⚠️ **锚点是分布的函数、分布是分项口径的函数**——改任一分项口径都要回来重标，
  //   否则阈值会与分布脱节。改完同步 __tests__/hepanCalibration.test.ts 的区间与占比断言。
  const level = totalScore >= 147 ? '天作之合' : totalScore >= 130 ? '良缘' : totalScore >= 113 ? '平常' : '需磨合';
  const levelNote = totalScore >= 147
    ? '这个分数段意味着：你们先天的"合"远多于"冲"——不是不会有矛盾，而是矛盾总有化解的底子。别辜负这份出厂配置。'
    : totalScore >= 130
      ? '这个分数段意味着：底子是好的，磨合点也明确——知道坑在哪的情侣，比稀里糊涂的情侣走得远。'
      : totalScore >= 113
        ? '这个分数段意味着：先天缘分平平，既不算天造地设，也绝非无缘——这样的感情像白手起家，挣来的每一分都是自己的。'
        : '这个分数段意味着：先天的差异点多，要付出的功课也多——但请记住：合盘量的是"出厂配置"，量不出"两个人愿意为彼此改多少"。多少低分发盘过成了一流感情，靠的就是这件事。';
  const summary = `综合 ${totalScore} 分（${level}）。${wxScore >= 14 ? '五行磁场相合，' : '五行上需要磨合，'}${dzScore >= 14 ? '地支缘分深厚，' : '地支冲合并存，'}${sxScore >= 14 ? '生肖彼此投缘。' : '生肖需多包容。'}${levelNote}合盘看的是趋势，最终经营在两人。`;

  // 双方各自爱情建议（差异化）
  const mineGender: 'male' | 'female' = (mine as any).gender === 'female' || (mine as any).gender === '女' ? 'female' : 'male';
  const partnerGender: 'male' | 'female' = (partner as any).gender === 'female' || (partner as any).gender === '女' ? 'female' : 'male';
  const mineLabel = mine.name ? `「${mine.name}」` : '我';
  const partnerLabel = partner.name ? `「${partner.name}」` : '对方';
  const loveAdvice: PartyLoveAdvice = {
    mine: genLoveAdviceForParty(mineLabel, mine.dayGan, mine.dayZhi || '', mineGender, mine.pillars, mine.dayWx, partner.dayWx, wxScore),
    partner: genLoveAdviceForParty(partnerLabel, partner.dayGan, partner.dayZhi || '', partnerGender, partner.pillars, partner.dayWx, mine.dayWx, wxScore),
  };

  // 对方卡片展示信息
  const partnerDisplay = {
    name: partner.name || '对方',
    birth: partner.birthInfo || '',
    dayWx: partner.dayWx,
    zodiac: partner.zodiac,
    nayin: partner.nayin,
  };

  // 双向视角明细（v2）：分数已对称，此处的"方向性"作为独立信息输出。
  // 交换输入后 mine/partner 内容随"人"走（不是随输入位置走），总分解读不变。
  const mLabel = mine.name ? `「${mine.name}」` : '我';
  const pLabel = partner.name ? `「${partner.name}」` : '对方';
  // 视角里的喜忌判定分三层：补用神 / 落忌神 / 中性（v5 起把"落忌神"单列）
  const mxNote = partnerHelps
    ? `对方日主${pWx}正补${mLabel}的喜用神，${mLabel}在这段关系里运势更受益`
    : partnerHurts
      ? `对方日主${pWx}落在${mLabel}忌神（${myJi.join('、')}）上，${mLabel}的获益要靠自己从别处补`
      : `对方日主${pWx}不在${mLabel}喜用之列，${mLabel}的获益更依赖日常经营`;
  const pxNote = mineHelps
    ? `对方日主${mWx}正补${pLabel}的喜用神，${pLabel}在这段关系里运势更受益`
    : mineHurts
      ? `对方日主${mWx}落在${pLabel}忌神（${paJi.join('、')}）上，${pLabel}会为此更耗力`
      : `对方日主${mWx}不在${pLabel}喜用之列，${pLabel}的获益更依赖日常经营`;
  const perspectives = {
    mine: `${mLabel}视角：${wxRelText(mWx, pWx, mLabel, pLabel)}；${mxNote}。`,
    partner: `${pLabel}视角：${wxRelText(pWx, mWx, pLabel, mLabel)}；${pxNote}。`,
  };

  // 双方日主性格双画像 + 互动动力学
  let dynamicText: string;
  if (WX_SHENG[mWx] === pWx) {
    dynamicText = `${mLabel}的${mWx}生${pLabel}的${pWx}——这段关系里${mLabel}天然地想照顾${pLabel}，付出是${mLabel}表达爱的方式。好处是${pLabel}会被滋养得很舒服；风险是${mLabel}的付出久了容易变成"理所当然"。${pLabel}要记得：看见并回应这份好，是这段关系最重要的保养。`;
  } else if (WX_SHENG[pWx] === mWx) {
    dynamicText = `${pLabel}的${pWx}生${mLabel}的${mWx}——${pLabel}天生愿意滋养${mLabel}，和${pLabel}在一起，${mLabel}会有一种"被托住"的踏实。但${mLabel}要注意：被照顾是福气，不是权利。一句"谢谢你一直都在"，能让这份流动一直转下去。`;
  } else if (mWx === pWx) {
    dynamicText = `两人同为${mWx}——你们像照镜子：对方的优点你欣赏，因为那也是你；对方的毛病你着急，因为那也是你。同频让你们默契十足，但遇到分歧时容易"谁也不让谁"。记住：赢了争论，输的是气氛，你们是队友不是对手。`;
  } else if (WX_KE[mWx] === pWx) {
    dynamicText = `${mLabel}的${mWx}克${pLabel}的${pWx}——相处中${mLabel}相对强势，节奏和规矩多半由${mLabel}定。这不是坏事，${pLabel}很多时候也愿意被引领；但${mLabel}要警惕把"主导"过成"做主"——家是讲爱的地方，不是讲服从的地方。`;
  } else if (WX_KE[pWx] === mWx) {
    dynamicText = `${pLabel}的${pWx}克${mLabel}的${mWx}——这段关系里${pLabel}气场更强，${mLabel}更多时候在配合和包容。适度的让是爱，长久的委屈是伤。${mLabel}要学会把"不舒服"说出口——真正爱你的人，会愿意为你调低音量。`;
  } else {
    dynamicText = `两人的五行没有直接生克——你们更像两个独立的星球，各有轨道、彼此照亮。这种关系的好处是没有消耗，要注意的是别让"各自精彩"变成"渐行渐远"，刻意制造共同的节奏很重要。`;
  }

  const personalityDuet = {
    mineTitle: getDayMasterTitle(mine.dayGan),
    mineEssence: DAY_MASTER_ESSENCE[mine.dayGan] || '',
    partnerTitle: getDayMasterTitle(partner.dayGan),
    partnerEssence: DAY_MASTER_ESSENCE[partner.dayGan] || '',
    dynamic: dynamicText,
  };

  return { totalScore, level, items, summary, loveAdvice, partnerDisplay, perspectives, personalityDuet };
}
