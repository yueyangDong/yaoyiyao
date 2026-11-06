/**
 * 梅花易数 → 分主题吉凶判读（唯一判据出口）。
 *
 * 判据链：体用生克（主判）→ 时令旺衰（加权）→ 变卦（定结局）→ 互卦（看过程）→ 卦象（描述处境）。
 *
 * ⚠️ 与六爻的一处关键差异：
 * 六爻的用神可能是「病神」（官鬼），旺了反而凶，所以要乘极性；
 * 梅花的「体卦」恒代表求测者本人，旺就是身体/底气足，**不需要极性反转**。
 * 两板块看起来判据不同，但落到 `verdictOf` 的刻度上是同一把尺子。
 *
 * ⚠️ 原页面只有体用与变卦两层，没有时令：
 * 于是「用克体」在春天和冬天给出一样的话，而六爻同一时间会因月建判出旺衰，
 * 两板块对着看就会觉得「一个说凶一个说吉」。时令这一层是必须补上的。
 */

import { GUA_NAMES, GUA_WUXING, monthZhiOf, type MeiHuaResult } from './meihuaUtils';
import { WX_SHENG, WX_KE } from './wuXingRelations';
import { DZ_WX } from './diZhiRelations';
import {
  type Theme, type ThemeReading, type Evidence, type Verdict,
  verdictOf, clampScore, sortEvidence, composeSummary, adviceOf,
} from './divinationCore';

/** 阳卦：乾、震、坎、艮 */
const YANG_GUA = new Set([1, 4, 6, 7]);

/**
 * 体用五关系 → 基础分，**按主题分档**。
 *
 * ⚠️ 为什么不能只用一张表：
 * 「体克用」在梅花里是五种关系中最「中性」的一种（能控但要自己出手），
 * 可它对**求财**恰恰是最好的——我克者为财，体克用就是「钱在我手里」；
 * 反过来对**感情**，体克用意味着你在压对方，是减分项。
 * 一张不分主题的表会把这两件事写成同一句话，用户一眼就看出是模板。
 */
const RELATION_SCORE_BY_THEME: Record<Theme, Record<string, number>> = {
  事业: { 用生体: 4, 体克用: 3, 体用比和: 2, 体生用: -1, 用克体: -4 },
  学业: { 用生体: 3, 体用比和: 3, 体克用: 1, 体生用: -1, 用克体: -3 },
  爱情: { 体用比和: 4, 用生体: 3, 体生用: 0, 体克用: -1, 用克体: -4 },
  亲情: { 体用比和: 4, 用生体: 3, 体生用: 0, 体克用: -1, 用克体: -4 },
  财运: { 体克用: 4, 用生体: 3, 体用比和: 2, 体生用: -2, 用克体: -3 },
  健康: { 用生体: 3, 体用比和: 2, 体克用: 1, 体生用: -2, 用克体: -4 },
};

function relationScore(theme: Theme, rel: string): number {
  return RELATION_SCORE_BY_THEME[theme]?.[rel] ?? 0;
}

/** 主题下的关系定性：同一个「体克用」在求财与感情里意义相反，措辞必须跟着主题走 */
function relationPlainForTheme(rel: string, theme: Theme, tiWx: string, yongWx: string): string {
  if (rel === '体克用') {
    if (theme === '财运') return `你（${tiWx}）克外部（${yongWx}）——我克者为财，钱是能拿到手的`;
    if (theme === '爱情' || theme === '亲情') return `你（${tiWx}）克外部（${yongWx}）——你在压着对方，赢了道理会伤关系`;
  }
  if (rel === '体用比和' && (theme === '爱情' || theme === '亲情')) {
    return `你和对方同为${tiWx}——同气不冲，关系是和的`;
  }
  return relationPlain(rel, tiWx, yongWx);
}

const MONTH_SCORE: Record<string, number> = { 旺: 2, 相: 1, 休: -1, 囚: -1, 死: -2 };

/** 八卦类象对各主题的偏向：只给 ±1，避免盖过体用主判 */
const XIANG: Record<Theme, { plus: number[]; minus: number[]; plusWhy: string; minusWhy: string }> = {
  事业: {
    plus: [1, 4, 5], minus: [6],
    plusWhy: '乾为君、震为动、巽为命令文书，都是「往前推」的卦',
    minusWhy: '坎为险陷，事情里带着坑',
  },
  学业: {
    plus: [5, 3], minus: [7],
    plusWhy: '巽为文书、离为文明，是读书考试的卦',
    minusWhy: '艮为止，容易卡住、停摆',
  },
  爱情: {
    plus: [2, 5, 3], minus: [6],
    plusWhy: '兑为悦、巽为长女、离为丽，都是「有人气」的卦',
    minusWhy: '坎为险陷，感情里带着不安',
  },
  亲情: {
    plus: [0, 1, 4, 5], minus: [2],
    plusWhy: '坤为母、乾为父、震为长男、巽为长女，一家人各在其位',
    minusWhy: '兑为口舌，家里容易拌嘴',
  },
  健康: { plus: [], minus: [6], plusWhy: '', minusWhy: '坎为水、为险，主虚耗与旧疾' },
  财运: { plus: [], minus: [], plusWhy: '', minusWhy: '' },
};

function relOfMonth(monthWx: string, wx: string): string {
  if (monthWx === wx) return '旺';
  if (WX_SHENG[monthWx] === wx) return '相';
  if (WX_SHENG[wx] === monthWx) return '休';
  if (WX_KE[wx] === monthWx) return '囚';
  return '死';
}

/** 五行关系的中性描述（体用/变卦共用一张说法，避免两处措辞不一致） */
function relationPlain(rel: string, tiWx: string, yongWx: string): string {
  switch (rel) {
    case '用生体': return `外部（${yongWx}）生你（${tiWx}）——事情在给你送力`;
    case '体用比和': return `你和外部同为${tiWx}——同频，不冲不耗`;
    case '体克用': return `你（${tiWx}）克外部（${yongWx}）——你能控住，但要自己出手`;
    case '体生用': return `你（${tiWx}）生外部（${yongWx}）——你在往外耗`;
    case '用克体': return `外部（${yongWx}）克你（${tiWx}）——你被压着`;
    default: return `体${tiWx}与用${yongWx}无明显生克`;
  }
}

function guaName(i: number): string {
  return GUA_NAMES[i] || '?';
}

export function buildMeihuaReading(
  result: MeiHuaResult,
  theme: Theme,
  monthZhi: string = monthZhiOf(),
): ThemeReading {
  const evidence: Evidence[] = [];
  const tiWx = result.tiWuxing;
  const yongWx = result.yongWuxing;

  /* ---------- 1. 体用：主判 ---------- */
  let score = relationScore(theme, result.relation);
  evidence.push({
    label: `体用·${result.relation}`,
    detail: `体卦${guaName(result.tiGua)}（${tiWx}）、用卦${guaName(result.yongGua)}（${yongWx}）。${relationPlainForTheme(result.relation, theme, tiWx, yongWx)}（基础分${score > 0 ? '+' : ''}${score}）。`,
    weight: score,
  });

  /* ---------- 2. 时令：给体卦加权 ---------- */
  const monthWx = monthZhi ? DZ_WX[monthZhi] : '';
  if (monthZhi && monthWx) {
    const rel = relOfMonth(monthWx, tiWx);
    const v = MONTH_SCORE[rel];
    score += v;
    evidence.push({
      label: '时令·体卦旺衰',
      detail: `起卦在${monthZhi}月（属${monthWx}），体卦${tiWx}处「${rel}」地（${v > 0 ? '+' : ''}${v}）。${v > 0 ? '你自身状态在旺头上，扛得住也推得动' : '你自身状态偏弱，同样的事要比别人多花力气'}。`,
      weight: v,
    });
  }

  /* ---------- 3. 变卦：定结局 ---------- */
  if (result.bianRelation) {
    const v = relationScore(theme, result.bianRelation);
    // 变卦只承担一半权重——它是「结局倾向」，不是当下格局
    const half = Math.round(v / 2);
    score += half;
    evidence.push({
      label: `变卦·${result.bianRelation}`,
      detail: `动爻在第${result.dongYao}爻，用卦变出${result.bianYongWuxing}。${relationPlainForTheme(result.bianRelation, theme, tiWx, result.bianYongWuxing)}。这是结局的倾向，按半权重计入（${half > 0 ? '+' : ''}${half}）。`,
      weight: half,
    });
  }

  /* ---------- 4. 互卦：看过程 ---------- */
  const huShangWx = GUA_WUXING[result.huShang];
  const huXiaWx = GUA_WUXING[result.huXia];
  let huTi: number, huYong: number;
  if (huShangWx === tiWx && huXiaWx !== tiWx) { huTi = result.huShang; huYong = result.huXia; }
  else if (huXiaWx === tiWx && huShangWx !== tiWx) { huTi = result.huXia; huYong = result.huShang; }
  else { huTi = result.huXia; huYong = result.huShang; }
  const huTiWx = GUA_WUXING[huTi];
  const huYongWx = GUA_WUXING[huYong];
  let huV = 0;
  let huWhy = '';
  if (WX_SHENG[huYongWx] === huTiWx) { huV = 1; huWhy = '过程中有人接力，越走越顺'; }
  else if (WX_KE[huYongWx] === huTiWx) { huV = -1; huWhy = '过程中有硬阻力，要过一次卡点'; }
  else if (WX_KE[huTiWx] === huYongWx) { huV = 1; huWhy = '过程中的阻力你能压得住'; }
  else if (WX_SHENG[huTiWx] === huYongWx) { huV = -1; huWhy = '过程中你在持续消耗，容易后劲不足'; }
  else { huV = 0; huWhy = '过程平顺，没有明显的推或阻'; }
  score += huV;
  evidence.push({
    label: `互卦·${result.huGuaName}`,
    detail: `互卦${guaName(result.huShang)}${guaName(result.huXia)}，取${guaName(huTi)}（${huTiWx}）为互体、${guaName(huYong)}（${huYongWx}）为互用。${huWhy}（${huV > 0 ? '+' : ''}${huV}）。`,
    weight: huV,
  });

  /* ---------- 5. 卦象：只描述处境，给一点偏向 ---------- */
  const x = XIANG[theme];
  let xiangV = 0;
  let xiangWhy = '';
  if (x.plus.includes(result.yongGua)) { xiangV = 1; xiangWhy = `${guaName(result.yongGua)}卦——${x.plusWhy}。`; }
  else if (x.minus.includes(result.yongGua)) { xiangV = -1; xiangWhy = `${guaName(result.yongGua)}卦——${x.minusWhy}。`; }
  if (theme === '爱情' && YANG_GUA.has(result.tiGua) && YANG_GUA.has(result.yongGua)) {
    xiangV -= 1;
    xiangWhy += '体用两卦都是阳卦，刚多柔少，容易各执一端。';
  }
  if (xiangWhy) {
    score += xiangV;
    evidence.push({
      label: `卦象·${guaName(result.yongGua)}`,
      detail: `${xiangWhy}（卦象层只作倾向参考，权重最低：${xiangV > 0 ? '+' : ''}${xiangV}）`,
      weight: xiangV,
    });
  }

  score = clampScore(score);
  const verdict: Verdict = verdictOf(score);

  const subject = `体卦${guaName(result.tiGua)}（${tiWx}）／用卦${guaName(result.yongGua)}（${yongWx}）`;
  const summary = composeSummary(
    theme,
    verdict,
    buildHeadline(result, theme, verdict, tiWx, yongWx, monthZhi, monthWx),
    buildTail(result, verdict),
  );

  return {
    theme,
    verdict,
    score,
    subject,
    summary,
    evidence: sortEvidence(evidence),
    advice: adviceOf(theme, verdict),
    note: '梅花以「体=你、用=所问之事」取象：体卦旺、用卦来生，最省力；用卦克体，再努力也逆风。卦辞与六十四卦意象只描述处境，不单独定吉凶。',
  };
}

function buildHeadline(
  result: MeiHuaResult,
  theme: Theme,
  verdict: Verdict,
  tiWx: string,
  yongWx: string,
  monthZhi: string,
  monthWx: string,
): string {
  const rel = result.relation;
  const weak = monthZhi && monthWx ? MONTH_SCORE[relOfMonth(monthWx, tiWx)] < 0 : false;

  if (rel === '用克体') {
    return weak
      ? `外部（${yongWx}）压着你，而你自身正处在不当令的时候——这时候硬推，等于逆水又背风`
      : `外部（${yongWx}）压着你，但你自身状态不弱——扛得住，只是要换个打法，不要硬撞`;
  }
  if (rel === '体生用') {
    return `你（${tiWx}）一直在往外部（${yongWx}）输送——事情能成，但成本在你身上，属于「出力多、拿得少」`;
  }
  if (rel === '用生体') {
    return `外部（${yongWx}）在生你（${tiWx}）——这是最省力的一种格局，有人、有条件在托着你`;
  }
  if (rel === '体克用') {
    if (theme === '财运') return `你（${tiWx}）克外部（${yongWx}）——我克者为财，这一档是求财里最实惠的：钱能拿到，但要你主动去收`;
    if (theme === '爱情' || theme === '亲情') return `你（${tiWx}）克外部（${yongWx}）——你能压住局面，但压出来的顺从不是亲近，方式要软`;
    return `你（${tiWx}）能克住外部（${yongWx}）——事情握在你手里，但要你自己动手去拿，不会自动掉下来`;
  }
  // 比和
  if (theme === '爱情' || theme === '亲情') {
    return `你和对方同气（都是${tiWx}）——不冲不耗，关系是稳的，但也缺少推力，谁都不肯先动`;
  }
  return `你和外部同气（都是${tiWx}）——顺，但不推不动，属于「维持容易、突破要自己加力」`;
}

function buildTail(result: MeiHuaResult, verdict: Verdict): string {
  const good = verdict === '大吉' || verdict === '吉';
  const bian = `过程走${result.huGuaName}，结局落在${result.bianGuaName}`;
  if (good) {
    return `${bian}。既然结局是用卦变出的${result.bianYongWuxing}在帮你，就别在中途因为一时的卡顿掉头。`;
  }
  if (verdict === '平') {
    return `${bian}。结局没有明显偏向，说明成败主要取决于中间这一段你怎么走——把互卦提示的那个卡点处理掉，就往上走。`;
  }
  return `${bian}。结局这一头不占优，越往后越要收：先保住已经拿到的，别为了翻本再加注。`;
}

export function buildAllMeihuaReadings(result: MeiHuaResult, monthZhi?: string): ThemeReading[] {
  return (['事业', '爱情', '亲情', '财运', '健康', '学业'] as Theme[]).map((t) =>
    buildMeihuaReading(result, t, monthZhi),
  );
}

/* ------------------------------------------------------------------ *
 * 方位 · 应期 · 观物取象
 *
 * 梅花与六爻最大的差别在「取象」：六爻靠六亲与月日推力量，梅花靠八卦类象直接
 * 把世界映射成卦。所以梅花这一层不该再算分数，而该回答三个六爻答不了的问题：
 *   往哪个方向使力有利、什么时候见分晓、眼下该留意什么物象。
 *
 * ⚠️ 「外应」是现场观察，本模块**不代为编造**：只给出该卦的类象清单，
 * 由用户自己对照眼前所见。凡是替用户编一句「你今日必见红衣人」的，都是假外应。
 * ------------------------------------------------------------------ */

/** 后天八卦方位 */
const GUA_DIRECTION: Record<number, string> = {
  0: '西南', 1: '西北', 2: '西', 3: '南', 4: '东', 5: '东南', 6: '北', 7: '东北',
};

/** 先天卦数（乾1兑2离3震4巽5坎6艮7坤8），应期取数用 */
const GUA_XIAN_TIAN_NUM: Record<number, number> = {
  0: 8, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
};

/** 八卦类象：给用户一张「对照表」，而不是替他断言看到了什么 */
const GUA_XIANG: Record<number, string[]> = {
  0: ['布帛棉麻', '方形器物', '母亲或一群人', '牛', '田野空地'],
  1: ['金属器物', '圆形之物', '长辈或掌权者', '马', '高亢的声响'],
  2: ['小件金属', '有口的器物', '少女', '羊', '笑语或争执'],
  3: ['火与灯火', '文书字画', '干燥之物', '中女', '雉鸟'],
  4: ['竹木器物', '会响的东西', '长子', '雷声或车鸣', '正在动的事物'],
  5: ['绳索与长物', '扇子与风', '长发之人', '鸡', '香气'],
  6: ['水与酒', '鱼与水产', '险处暗处', '中年男子', '车轮'],
  7: ['石头与门径', '土石之物', '少年', '狗', '山与高楼'],
};

/**
 * 应期。
 *
 * 《梅花易数·卷二·先天后天论》：「又先天之卦，定事应之期，则取之卦气，如乾、兑则应庚辛及申金之日……
 *   后天则以卦数加时数，总之而分行卧坐立之迟速，以为事应之期。」
 *
 * 本项目三路起卦（时间 / 数字）都是**先天起卦**，所以正法是**取卦气**——用卦五行对应的干支日。
 * 但卦气只给「哪一类日子」，不给「几天」，实际使用时仍需要一个可感知的数字，
 * 所以同时给「卦数」作参考。卦数的取法按传统讲义分主题：
 *   测生意（财运）   → 主卦上下卦数相加
 *   测病（健康）     → 主、互、变三组卦数相加
 *   测行人、寻人（爱情/亲情）→ 主卦数加动爻数
 *   其余             → 主卦数加动爻数（通行基础法）
 *
 * ⚠️ 这两条是并列的参考，不是「精确到某天」的预言——文案必须说清「数字是节奏参考」。
 */
const WX_QI: Record<string, string> = {
  木: '甲、乙日（或寅、卯日）',
  火: '丙、丁日（或巳、午日）',
  土: '戊、己日（或辰、戌、丑、未日）',
  金: '庚、辛日（或申、酉日）',
  水: '壬、癸日（或亥、子日）',
};

export interface MeihuaExtras {
  /** 有利方位（生体之卦所在方） */
  luckyDirections: { dir: string; why: string }[];
  /** 回避方位（克体之卦所在方） */
  avoidDirections: { dir: string; why: string }[];
  /** 应期：卦气（哪类日子）+ 卦数（节奏参考） */
  timing: { number: number; unit: '日' | '月'; text: string; qi: string };
  /** 观物取象对照（体/用/互/变） */
  xiang: { role: string; gua: string; items: string[] }[];
  note: string;
}

export function buildMeihuaExtras(result: MeiHuaResult, theme?: Theme): MeihuaExtras {
  const lucky: MeihuaExtras['luckyDirections'] = [];
  const avoid: MeihuaExtras['avoidDirections'] = [];

  const push = (
    rel: string | undefined,
    gua: number,
    label: string,
  ) => {
    const dir = GUA_DIRECTION[gua];
    if (!dir || !rel) return;
    if (rel === '用生体' || rel === '体用比和') {
      lucky.push({ dir, why: `${label}${guaName(gua)}（${GUA_WUXING[gua]}）在此方，对你是生扶或同气` });
    } else if (rel === '用克体') {
      avoid.push({ dir, why: `${label}${guaName(gua)}（${GUA_WUXING[gua]}）在此方，克你，重大事情绕着走` });
    }
  };

  push(result.relation, result.yongGua, '用卦');
  push(result.bianRelation, dongYongGua(result), '变卦用卦');

  /* ---------- 应期：卦气（正法）+ 卦数（节奏参考） ---------- */
  const shangN = GUA_XIAN_TIAN_NUM[result.shangGua];
  const xiaN = GUA_XIAN_TIAN_NUM[result.xiaGua];
  const huN = GUA_XIAN_TIAN_NUM[result.huShang] + GUA_XIAN_TIAN_NUM[result.huXia];
  const bianN = GUA_XIAN_TIAN_NUM[result.bianShang] + GUA_XIAN_TIAN_NUM[result.bianXia];

  let num: number;
  let formula: string;
  if (theme === '财运') {
    num = shangN + xiaN;                       // 测生意：主卦上下卦数相加
    formula = `上卦${shangN} + 下卦${xiaN} = ${num}`;
  } else if (theme === '健康') {
    num = shangN + xiaN + huN + bianN;         // 测病：主、互、变总数
    formula = `主卦${shangN + xiaN} + 互卦${huN} + 变卦${bianN} = ${num}`;
  } else {
    num = shangN + xiaN + result.dongYao;      // 行人/寻人与其余：主卦数加动爻
    formula = `上卦${shangN} + 下卦${xiaN} + 动爻${result.dongYao} = ${num}`;
  }
  const unit: '日' | '月' = num <= 10 ? '日' : '月';
  const yongWx = GUA_WUXING[result.yongGua];
  const qi = `按先天起卦的正法，应期取「卦气」：用卦${guaName(result.yongGua)}属${yongWx}，应期落在${WX_QI[yongWx] || '与其五行相应的日辰'}这类日子上。`;
  const timing = {
    number: num,
    unit,
    text: `《梅花易数》讲「先天之卦定事应之期，取之卦气」，所以先看上面那句。数字只是节奏参考：${formula}，按近事应「日」、远事应「月」看，约 ${num} ${unit}内会见分晓。两者对不上时以卦气为准——日子不对，就是还没到时候，不必硬催。`,
    qi,
  };

  const xiang: MeihuaExtras['xiang'] = [
    { role: '体（你）', gua: guaName(result.tiGua), items: GUA_XIANG[result.tiGua] || [] },
    { role: '用（所问之事）', gua: guaName(result.yongGua), items: GUA_XIANG[result.yongGua] || [] },
    { role: '互（过程）', gua: `${guaName(result.huShang)}${guaName(result.huXia)}`, items: [...(GUA_XIANG[result.huShang] || []).slice(0, 3), ...(GUA_XIANG[result.huXia] || []).slice(0, 2)] },
    { role: '变（结局）', gua: result.bianGuaName, items: GUA_XIANG[dongYongGua(result)] || [] },
  ];

  return {
    luckyDirections: lucky,
    avoidDirections: avoid,
    timing,
    xiang,
    note: '「外应」讲的是起卦当下眼前真实见到的东西，本工具不替你编造。请拿上面这张类象对照表，自己看当时身边出现了什么——对上了哪一格，就是这一卦给你的额外提示。',
  };
}

/** 变卦中「用卦变出之卦」的索引：动爻在下卦看变卦下卦，否则看变卦上卦 */
function dongYongGua(result: MeiHuaResult): number {
  return result.dongYao <= 3 ? result.bianXia : result.bianShang;
}
