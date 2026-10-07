// ========== 神煞「本局解释」生成器 ==========
//
// 解决的问题（两轮迭代）：
// 1. 旧版按名字取静态释义 → 同名煞在任何盘输出一字不差（已由 power 因子解决一半）。
// 2. 因盘而异之后仍显雷同：verdict 模板只按 吉/凶/平 × 喜忌 × 强弱 取短语，
//    同类型、同处境的 N 颗神煞，出的"本局解释"几乎一字不差，且通篇不提这颗煞本身是干什么的。
//
// 本轮修法：
// - 每颗煞先报家门：SHA_TRAIT 给出「主什么」（键集与 SHENSHA_PLAIN 严格一致，有覆盖测试）。
// - 措辞按煞的类目（SHA_CATEGORY：助力/才学/情缘/锋芒/动象/险滞/亲缘/禄食/空亡）分套——
//   同一处境下，天乙贵人说"庇护"，羊刃说"锋芒"，驿马说"动势"，主语与动词自然不同。
// - 盘面因子（落柱/长生/喜忌/强弱/制化/空亡）继续负责"换位置必须换话"。
//
// 与 shenShaPower 的分工不变：power 只出数字与档位，本模块只出人话，两者同源同参。

import type { PillarData } from '../pages/Bazi';
import { calcShenShaPower, type ShaPowerItem } from './shenShaPower';
import { SHENSHA_PLAIN } from './shenSha';

export interface ShaExplainInput {
  pillars: PillarData[];
  shenSha: { name: string; pillar: string; type?: '吉' | '凶' | '平' }[];
  /** '身强' | '身弱' | '中和' | '身极强' | '身极弱' */
  strengthLevel?: string;
  /** 用神五行，如 ['木','火'] */
  yongShen?: string[];
}

export interface ShaExplainItem {
  name: string;
  pillar: string;
  ganZhi: string;
  type: '吉' | '凶' | '平';
  level: '强' | '中' | '弱';
  power: number;
  /** 落点定位句（煞名本职 + 柱位干支 + 长生得地 + 力量档位） */
  positioning: string;
  /** 本局实际作用句（因盘而异的核心结论） */
  verdict: string;
  /** 定位 + 作用，拼成一段 */
  text: string;
}

/** 柱位人生阶段（与项目 PLAIN 口径一致） */
const PILLAR_STAGE: Record<string, string> = {
  年柱: '早年与祖上，是出身与起点的影响',
  月柱: '青年与父母兄弟，是性格成型的关键期',
  日柱: '中年与自我配偶，是人生最核心的一段',
  时柱: '晚年与子女，也主晚景与传承',
};

/** 同柱十神 → 这颗煞的作用领域偏向 */
const SHISHEN_FIELD: Record<string, string> = {
  正官: '名分、责任与体制内的上下关系',
  七杀: '压力、竞争与需要魄力去闯的场合',
  正财: '稳定收入与务实经营',
  偏财: '机会财、人脉与横向资源',
  正印: '学历、长辈庇护与系统学习',
  偏印: '专门技术、直觉与非常规思路',
  食神: '才艺、从容输出与生活品质',
  伤官: '才华表达与不服管的冲劲',
  比肩: '自我意志、同辈关系与自立',
  劫财: '竞争、分财与合伙',
};

/** 十二长生 → 得地描述 */
function deDiText(cs: string): string {
  if (!cs) return '';
  if (cs === '临官' || cs === '帝旺') return '正得地，气势最足';
  if (cs === '长生' || cs === '冠带') return '得地且气新，起步就有力';
  if (cs === '沐浴') return '得地但气杂，力量带着不稳';
  if (cs === '衰' || cs === '病') return '气已渐退，力量打了折';
  if (cs === '胎' || cs === '养') return '气在孕育，力量尚浅';
  return '处失气之地，先天力量弱';
}

/** 制化描述（取最强制化一档，与 power 模型同口径） */
const RELATION_TEXT: Record<string, string> = {
  冲: '此支逢冲——力量被打散，相关的事容易反复',
  合: '此支被合——力量被人情与关系牵走，不全是自己的',
  刑: '此支逢刑——过程有摩擦，慢半拍、多确认一次更稳',
  害: '此支被害——暗处有损耗，提防看不见的小麻烦',
};

// ========== 神煞本职（报家门） ==========
// 键集必须与 SHENSHA_PLAIN 完全一致（shenShaExplain.test.ts 有严格覆盖校验，
// 新增神煞时两边同步加，漏加测试会红）。

export const SHA_TRAIT: Record<string, string> = {
  '天乙贵人': '贵人提携、逢凶化吉',
  '文昌': '学业文采与考试运',
  '学堂': '求知欲与学习天赋',
  '桃花': '人缘魅力与异性缘',
  '红鸾': '婚姻喜事与正缘',
  '天喜': '添丁喜庆之事',
  '驿马': '奔波流动与出行之象',
  '羊刃': '极强个性与行动力',
  '阴刃': '内敛韧劲与暗藏爆发力',
  '将星': '统御决断之才',
  '华盖': '孤高清悟与玄学之缘',
  '禄神': '食禄俸禄与稳定收入',
  '天德': '上天庇佑、化险为夷',
  '天德贵人': '上天庇佑、化险为夷',
  '月德': '逢凶化吉、人缘和睦',
  '月德贵人': '逢凶化吉、人缘和睦',
  '金舆': '财富地位与优渥出行',
  '天医': '医缘与自愈之力',
  '魁罡': '聪明果断、刚强不群',
  '太极贵人': '智慧与玄学哲思天赋',
  '福星贵人': '一世安稳、少灾少难',
  '国印贵人': '诚信权威与体制之助',
  '天厨贵人': '口福饮食与生活享受',
  '德秀贵人': '聪明温厚、文业通达',
  '词馆': '文学口才与学术成就',
  '金神': '刚毅果决、才华外露',
  '天赦': '解灾赦过、百事可解',
  '红艳': '出众魅力与吸引力',
  '阴差阳错': '感情错位与沟通隔阂',
  '孤鸾煞': '感情孤独、聚少离多',
  '十恶大败': '禄空之忌、忌孤注一掷',
  '四废': '体弱散逸、有始无终',
  '劫煞': '破财意外与是非',
  '灾煞': '灾病横祸之警',
  '孤辰': '性孤缘迟之象',
  '寡宿': '清冷独处之象',
  '空亡': '有名无实、时机未至',
  '十灵日': '聪慧灵秀、悟性过人',
  '飞刃': '磕碰血光之警',
  '亡神': '深谋多虑、城府心机',
  '三奇贵人': '精神卓越、奇遇破格',
  '天罗地网': '纠缠约束、官非之阻',
  '六秀日': '聪明秀气、以才见长',
  '日德': '慈悲宽厚、积德之福',
  '进神日': '自强不息、节节攀升',
  '丧门': '孝服忧愁之事',
  '吊客': '丧服惊扰、小病小灾',
  '披麻': '伤心忧愁、长辈健康之虑',
  '六厄': '事业多阻、成果易被夺',
  '流霞': '失血产厄、血光之警',
  '元辰': '破耗不顺、钱财易散',
  '八专': '情欲偏旺、感情过投',
  '勾绞': '是非纠缠、拖泥带水',
};

/** 取某颗煞的本职短语（带兜底，不会因漏键而崩） */
function traitOf(name: string): string {
  return SHA_TRAIT[name] || '一种特殊命理标记';
}

// ========== 神煞类目（措辞基调分套） ==========
// 同一处境下不同类目的煞，主语与动词不同——这是"解释不雷同"的另一半。

type ShaCategory = 'assist' | 'talent' | 'romance' | 'edge' | 'motion' | 'hazard' | 'kin' | 'fortune' | 'void' | 'general';

const SHA_CATEGORY: Record<string, ShaCategory> = {
  天乙贵人: 'assist', 天德: 'assist', 天德贵人: 'assist', 月德: 'assist', 月德贵人: 'assist',
  天医: 'assist', 天赦: 'assist', 福星贵人: 'assist', 国印贵人: 'assist', 日德: 'assist',
  // 德秀主「聪明温厚、文业通达」，是气质才学型贵人而非庇护型——与文昌/学堂/词馆同组，
  // 措辞走「这份才气」：得用（落用神）则清贵倍增，失用则怀才不遇，见德秀专题研究。
  德秀贵人: 'talent',
  文昌: 'talent', 学堂: 'talent', 词馆: 'talent', 太极贵人: 'talent', 三奇贵人: 'talent',
  六秀日: 'talent', 十灵日: 'talent', 华盖: 'talent', 魁罡: 'talent', 金神: 'talent',
  桃花: 'romance', 红鸾: 'romance', 天喜: 'romance', 红艳: 'romance', 阴差阳错: 'romance',
  孤鸾煞: 'romance', 八专: 'romance',
  羊刃: 'edge', 飞刃: 'edge', 阴刃: 'edge', 将星: 'edge', 进神日: 'edge',
  驿马: 'motion', 亡神: 'motion', 勾绞: 'motion',
  劫煞: 'hazard', 灾煞: 'hazard', 流霞: 'hazard', 四废: 'hazard', 天罗地网: 'hazard',
  元辰: 'hazard', 十恶大败: 'hazard',
  孤辰: 'kin', 寡宿: 'kin', 丧门: 'kin', 吊客: 'kin', 披麻: 'kin', 六厄: 'kin',
  禄神: 'fortune', 金舆: 'fortune', 天厨贵人: 'fortune',
  空亡: 'void',
};

interface CategoryPhrases {
  /** 主语：这份庇护 / 这份才气 / 这股锋芒…… */
  subject: string;
  /** 落在用神上（吉/平向） */
  inYong: string;
  /** 不在用神上（吉/平向） */
  offYong: string;
  /** 凶煞落在用神上（化凶） */
  inYongBad: string;
  /** 凶煞不在用神上（凶性外显） */
  offYongBad: string;
  /** 身强交互 */
  strong: string;
  /** 身强交互（凶向） */
  strongBad: string;
  /** 身弱交互 */
  weak: string;
  /** 身弱交互（凶向） */
  weakBad: string;
}

const CATEGORY_PHRASES: Record<ShaCategory, CategoryPhrases> = {
  assist: {
    subject: '这份庇护',
    inYong: '正落在你的用神上，是实打实能兑现的福气',
    offYong: '不在你的用神上——援手会来，但接不接得住看你自己',
    inYongBad: '落在用神上，不利被化去几分，属于可控的波折',
    offYongBad: '不在用神上，波折多靠自渡，别指望总有转机',
    strong: '日主身强有力，这份庇护你接得住、也留得下',
    strongBad: '日主身强有力，风险多能自行化解，但别因此逞强涉险',
    weak: '日主偏弱，受庇护宜借力（贵人、平台、长辈），别一个人硬扛',
    weakBad: '日主偏弱，逢坎要避其锋芒，重大决定避开低谷期',
  },
  talent: {
    subject: '这份才气',
    inYong: '正对你的用神，学到的东西都能用在刀刃上',
    offYong: '不在用神上——才华要找到变现的出口，否则容易变成自嗨',
    inYongBad: '落在用神上，锋芒收得回来，聪明不外溢为麻烦',
    offYongBad: '不在用神上，才高易傲、锋芒外露，慎言慎行更稳',
    strong: '身强气足，才尽其用，正是持续输出的好底子',
    strongBad: '身强气足，傲气也足，多一分收敛少一分是非',
    weak: '日主偏弱，才气需借平台放大，单打独斗容易耗空',
    weakBad: '日主偏弱，心思重而气力薄，谨防思虑过度伤身',
  },
  romance: {
    subject: '这份情缘',
    inYong: '落在用神上——人缘即机会，魅力就是生产力',
    offYong: '不在用神上——感情的事是彩蛋不是主线，别让它消耗你的正事',
    inYongBad: '落在用神上，纠葛能转化为滋养，历练反而成就你',
    offYongBad: '不在用神上，感情功课要主动补课：多沟通、少想当然',
    strong: '身强者自带主场，聚人气不费力，你挑关系而不是关系挑你',
    strongBad: '身强者有底气消化波折，但硬碰硬会两败俱伤，学会服软',
    weak: '身弱者桃花易牵扯精力，聚人气不如先聚气血',
    weakBad: '身弱者感情内耗大，先立己再谈情，别在错的人身上耗',
  },
  edge: {
    subject: '这股锋芒',
    inYong: '落在用神上，正是能扛事、能拍板的底气',
    offYong: '不在用神上——气势有余而落点不足，别让果断变成武断',
    inYongBad: '落在用神上，凶性被化去几分，属于可控的爆发力',
    offYongBad: '不在用神上，锋芒会直接显现为冲动与硬碰硬，宜先设约束再出手',
    strong: '日主身强压得住它，是当家人的料——决断即担当',
    strongBad: '日主身强压得住它，当作磨刀石用，越磨越出成绩',
    weak: '日主偏弱，气场要靠位置撑——在能说了算的位置上才发挥得出来',
    weakBad: '日主偏弱，逢其锋要避实击虚，别正面硬刚',
  },
  motion: {
    subject: '这股动势',
    inYong: '恰逢用神，动中生财，越流动越旺',
    offYong: '不在用神上——动是常态但收益不稳，动身之前先算账',
    inYongBad: '落在用神上，变动虽多但方向是对的，越折腾越清楚自己要什么',
    offYongBad: '不在用神上，奔波易成空转——心机与算计要落到实事上',
    strong: '身强耐奔波，动中取胜就是你的节奏',
    strongBad: '身强者扛得住折腾，但聪明别用于算计，用于谋事',
    weak: '身弱忌过动，节奏放慢半拍，动中求稳',
    weakBad: '身弱者多思伤神，谋定而后动，别被心结拖垮',
  },
  hazard: {
    subject: '这则预警',
    inYong: '落在用神上，凶性被化掉一部分，属于可控的风险',
    offYong: '不在用神上，凶性会直接显现，宜提前设防而非事后补救',
    inYongBad: '落在用神上，凶性被化掉一部分，属于可控的风险',
    offYongBad: '不在用神上，凶性会直接显现，宜提前设防而非事后补救',
    strong: '日主身强有力，这类预警多半有惊无险，但别因此逞强涉险',
    strongBad: '日主身强有力，这类预警多半有惊无险，但别因此逞强涉险',
    weak: '日主偏弱，逢险滞信息要避其锋芒，重大决定避开低谷期',
    weakBad: '日主偏弱，逢险滞信息要避其锋芒，重大决定避开低谷期',
  },
  kin: {
    subject: '这份亲缘讯息',
    inYong: '落在用神上，家人之间能互相成全，亲缘是你的加分项',
    offYong: '不在用神上——亲缘的缺口要靠主动经营去补，别等对方先低头',
    inYongBad: '落在用神上，隔阂能化，多走动一次就近一分',
    offYongBad: '不在用神上，伦常之事讲究顺其自然，越强求越拧巴',
    strong: '身强的人自己就是家里的顶梁柱，缘薄也能撑起门庭',
    strongBad: '身强的人自己就是家里的顶梁柱，缘薄也能撑起门庭',
    weak: '身弱者先顾好自己再顾家，力不从心时硬撑两头都伤',
    weakBad: '身弱者先顾好自己再顾家，力不从心时硬撑两头都伤',
  },
  fortune: {
    subject: '这份禄食',
    inYong: '落在用神上，是稳稳的进账与口福',
    offYong: '不在用神上——有得吃有得用，但量入为出才守得住',
    inYongBad: '落在用神上，耗损可控，破小财免大灾',
    offYongBad: '不在用神上，禄食易散，忌大手大脚与孤注一掷',
    strong: '身强担财，禄食守得住',
    strongBad: '身强担财，但进得快也出得快，账要自己盯',
    weak: '身弱见禄，福分要细水长流地用，忌透支',
    weakBad: '身弱见禄，福分要细水长流地用，忌透支',
  },
  void: {
    subject: '这层"虚实落差"',
    inYong: '落在用神上——想要的东西要等时机，时机到了一拿一个准',
    offYong: '性质中性，实际走向要看你把它用在什么事上',
    inYongBad: '落在用神上——想要的要等时机，时机到了一拿一个准',
    offYongBad: '性质中性，实际走向要看你把它用在什么事上',
    strong: '身强者宜把"空"当留白，先布子后收网',
    strongBad: '身强者宜把"空"当留白，先布子后收网',
    weak: '身弱者忌求快，慢一步反而踩得实',
    weakBad: '身弱者忌求快，慢一步反而踩得实',
  },
  general: {
    subject: '这颗星',
    inYong: '落在你的用神上，是能用得上的助力',
    offYong: '不在你的用神上，好处要主动去接，不接就只是"看着好"',
    inYongBad: '落在用神上，凶性被化掉一部分，属于"可控的压力"',
    offYongBad: '不在用神上，凶性会直接显现，宜提前设防而不是事后补救',
    strong: '日主身强有力，这层助力你接得住、留得下',
    strongBad: '日主身强有力，这股煞气你担得起，当作磨刀石用反而出成绩',
    weak: '但日主偏弱，逢这股力量要借力（贵人、平台、团队），别独自硬撑',
    weakBad: '但日主偏弱，逢这股力量要避其锋芒，别硬碰',
  },
};

function phrasesOf(name: string): CategoryPhrases {
  return CATEGORY_PHRASES[SHA_CATEGORY[name] || 'general'];
}

/** 十神 → 领域句是否存在 */
function shiShenOf(p: PillarData | undefined): string {
  const s = p?.shiShen || '';
  return SHISHEN_FIELD[s] ? s : '';
}

/**
 * 本局解释核心句：类目措辞 × 盘面因子。
 * 吉煞看「接不接得住」，凶煞看「防不防得住」，平煞看「随什么而定」。
 */
function verdictOf(
  item: ShaPowerItem,
  type: '吉' | '凶' | '平',
  opts: { strengthLevel?: string; yongShen: string[]; inYong: boolean; shiShen: string; name: string },
): string {
  const { strengthLevel = '', inYong, shiShen, name } = opts;
  const isStrong = strengthLevel === '身强' || strengthLevel === '身极强';
  const isWeak = strengthLevel === '身弱' || strengthLevel === '身极弱';
  const ph = phrasesOf(name);
  const field = shiShen ? `作用点偏在${SHISHEN_FIELD[shiShen]}上` : '';
  const rel = item.factors.relationType;
  const kong = item.factors.kong < 1;

  const parts: string[] = [];

  // 1) 兑现条件（喜忌 × 类目措辞）
  const bad = type === '凶';
  if (inYong) {
    parts.push(bad ? ph.inYongBad : ph.inYong);
  } else {
    parts.push(bad ? ph.offYongBad : ph.offYong);
  }

  // 2) 强弱交互（类目措辞，凶煞走 Bad 套）
  if (isStrong) {
    parts.push(bad ? ph.strongBad : ph.strong);
  } else if (isWeak) {
    parts.push(bad ? ph.weakBad : ph.weak);
  }

  // 3) 落空提示（放最后，作为最强限定；空亡煞自身除外——自指无意义）
  if (kong && name !== '空亡') {
    parts.push('此支又落空亡，星是"虚"的——有名无实，别把希望全押在这一处');
  }

  // 4) 制化（若与空亡叠加则只保留更强的冲）
  if (rel && RELATION_TEXT[rel] && (!kong || rel === '冲')) {
    parts.push(RELATION_TEXT[rel]);
  }

  return (field ? `${ph.subject}，${field}——` : `${ph.subject}——`) + parts.join('；') + '。';
}

/**
 * 为每一处神煞落点生成「本局解释」。
 * 同名多柱各出一条（柱位不同则定位、阶段、强弱交互都不同），与 power 模型同构。
 */
export function explainShenSha(input: ShaExplainInput): ShaExplainItem[] {
  const { pillars, shenSha, strengthLevel, yongShen = [] } = input;
  const items = calcShenShaPower({ pillars, shenSha, strengthLevel, yongShen });
  const ZHI_WX: Record<string, string> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
  };

  // ---- 德秀专论（依德秀贵人专题研究结论，吉性不叠加、重见有力散之诫）----
  // ① 「吉神贵乎专精，重见则力散」：神煞是"象"的标记而非"量"的累加，
  //    三见以上不作叠加论，反提示某行之气过重、秀气不专（贵众则不贵）。
  //    触发率（严格口径 17290 张真实盘）：≥3 处占 6.2%、4 处占 2.6%——属"值得单独提醒"的少数派。
  //    ⚠️ 落点数结构上不会为 1（秀须成五合对 = 至少两干），故只有 0/2/3/4 处四档。
  // ② 申子辰月水土并德（水土长生同宫于申）：若壬癸与戊己同透，
  //    两德交战是为「相垢」，清气互战、秀气反浊。
  const dexiuCount = shenSha.filter((s) => s.name === '德秀贵人').length;
  const gans = pillars.map((p) => p.tianGan || '');
  const monthZhi = pillars[1]?.diZhi || '';
  const dexiuGou =
    ['申', '子', '辰'].includes(monthZhi) &&
    gans.some((g) => g === '壬' || g === '癸') &&
    gans.some((g) => g === '戊' || g === '己');

  return items.map((item) => {
    const idx = ['年柱', '月柱', '日柱', '时柱'].indexOf(item.pillar);
    const p = pillars[idx];
    const ganZhi = p?.ganZhi || '';
    const zhi = p?.diZhi || '';
    const cs = item.factors.changSheng;
    const stage = PILLAR_STAGE[item.pillar] || '';
    const shiShen = shiShenOf(p);
    const inYong = yongShen.includes(ZHI_WX[zhi] || '');

    // 定位句：先报家门（煞名本职），再报落点
    const levelWord = item.level === '强' ? '力量属强档' : item.level === '中' ? '力量中等' : '力量偏弱';
    const positioning = `${item.name}主${traitOf(item.name)}。落${item.pillar}${ganZhi ? `（${ganZhi}）` : ''}${cs ? `，此处为日主的${cs}之地，${deDiText(cs)}` : ''}，${levelWord}。`;

    // 作用句
    let verdict = verdictOf(item, item.type, { strengthLevel, yongShen, inYong, shiShen, name: item.name });

    // 德秀专论追加（全盘口径，每颗德秀落点都带上同一提醒）
    if (item.name === '德秀贵人') {
      const notes: string[] = [];
      if (dexiuCount >= 3) {
        notes.push(`本局德秀之气多见（${dexiuCount} 处）——秀气不专，力散而不聚，反不如一二处精纯来得有力`);
      }
      if (dexiuGou) {
        notes.push('水土两德并透，德秀相垢——清气互战，秀气反浊，文业之秀要打折扣');
      }
      if (notes.length) verdict += notes.join('；') + '。';
    }

    // 阶段句
    const stageText = stage ? `它主要在你${item.pillar}所主的阶段显威——${stage}，用法上要顺着这个时间段的重心来。` : '';

    return {
      name: item.name,
      pillar: item.pillar,
      ganZhi,
      type: item.type,
      level: item.level,
      power: item.power,
      positioning,
      verdict,
      text: positioning + (stageText ? stageText + verdict : verdict),
    };
  });
}

/** 取每一处神煞的本局解释（页面按 name|pillar 查用） */
export function explainShenShaMap(input: ShaExplainInput): Record<string, ShaExplainItem> {
  const out: Record<string, ShaExplainItem> = {};
  for (const it of explainShenSha(input)) out[`${it.name}|${it.pillar}`] = it;
  return out;
}
