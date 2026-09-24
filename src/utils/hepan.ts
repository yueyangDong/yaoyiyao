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

const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // 我生
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };   // 我克
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
// 地支六合/三合/六冲——用于紫微命宫宫位的合冲合参（注意：与上面按生肖名的 LIU_HE/SAN_HE 是两套表，勿混用）
const DZ_LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};
const DZ_SAN_HE: Record<string, string[]> = {
  '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
  '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
  '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
  '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
};
const DZ_LIU_CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};
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

  // 1) 日主五行（20 分）——双向计算取均分（对称）
  const mWx = mine.dayWx, pWx = partner.dayWx;
  const wxAB = wxDirScore(mWx, pWx); // 我 → 对方
  const wxBA = wxDirScore(pWx, mWx); // 对方 → 我
  const wxScore = Math.round((wxAB + wxBA) / 2);
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
  items.push({ title: '日主五行', score: wxScore, desc: wxDesc });

  // 2) 地支关系（20 分）：合冲刑害统计（白话列出具体对，生活化解读）
  const myDz = mine.pillars.map(p => p.diZhi);
  const paDz = partner.pillars.map(p => p.diZhi);
  const posLabel = ['年', '月', '日', '时'];
  let heCount = 0, chongCount = 0;
  const hePairs: string[] = [];   // 具体合对（带柱位）
  const chongPairs: string[] = []; // 具体冲刑对
  for (let i = 0; i < myDz.length; i++) {
    for (let j = 0; j < paDz.length; j++) {
      const a = myDz[i], b = paDz[j];
      if (a === b) continue;
      if (LIU_HE[a] === b) { heCount += 2; hePairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}六合`); }
      else if ((SAN_HE[a] || []).includes(b)) { heCount += 1; hePairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}三合`); }
      if (LIU_CHONG[a] === b) { chongCount += 2; chongPairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}六冲`); }
      else if ((a === '寅' && ['巳', '申'].includes(b)) || (a === '巳' && ['申', '寅'].includes(b)) || (a === '申' && ['寅', '巳'].includes(b))) { chongCount += 1; chongPairs.push(`你的${posLabel[i]}支${a}与对方${posLabel[j]}支${b}相刑`); } // 三刑近似
    }
  }
  const dzScore = Math.max(0, Math.min(20, 10 + heCount - chongCount));
  const heShow = hePairs.slice(0, 3).join('；');
  const chongShow = chongPairs.slice(0, 3).join('；');
  let dzDesc = '';
  if (hePairs.length > 0) dzDesc += `相合：${heShow}${hePairs.length > 3 ? `等${hePairs.length}处` : ''}。`;
  if (chongPairs.length > 0) dzDesc += `冲刑：${chongShow}${chongPairs.length > 3 ? `等${chongPairs.length}处` : ''}。`;
  if (heCount > chongCount) {
    dzDesc += `合多于冲——你们的气场有天然的接口：想法容易对上，相处不容易内耗。地支相合，尤其是六合，意味着在某些特定场合你们会莫名地站在同一边，属于越处越顺的底子。`;
  } else if (chongCount > heCount) {
    dzDesc += `冲多于合——你们是节奏型差异的组合：不是三观不合，而是快慢、急缓、先说后做的直觉常常相反。冲的杀伤力不在吵架本身，而在日积月累的拧巴。对策就一条：分歧当场摊开说，别让小事在心里发酵成大事。`;
  } else if (heCount === 0 && chongCount === 0) {
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

  // 5) 喜用神互补（20 分）——按"受益方向"对称打分
  const partnerHelps = mine.yongShen.includes(partner.dayWx); // 对方补我（我受益）
  const mineHelps = partner.yongShen.includes(mine.dayWx);    // 我补对方（对方受益）
  let ysScore: number; let ysDesc: string;
  if (partnerHelps && mineHelps) {
    ysScore = 20; ysDesc = `互为喜用：对方日主${partner.dayWx}补你的用神，你的${mine.dayWx}也补对方，彼此是对方的贵人。` +
      `白话一点：你们是彼此的"补品"——你缺的对方恰好有，对方缺的你刚好补。这种组合过日子越久越舒服，是合婚里最实惠的一档。唯一提醒：别因为"旺"就懒得经营，再好的底子也怕消耗。`;
  } else if (partnerHelps) {
    ysScore = 15; ysDesc = `对方日主${partner.dayWx}正是你的喜用神，与你在一起你的运势有助益（你更受益）；而你的${mine.dayWx}不在对方喜用之列，记得在情感之外也给对方实际的支持。` +
      `白话一点：跟对方在一起，你会不知不觉变顺——这是"旺你"的缘分。但别只做受益方：对方累的时候、低落的时候，记得你也伸把手。只进不出的好运气，迟早会用完。`;
  } else if (mineHelps) {
    ysScore = 15; ysDesc = `你的日主${mine.dayWx}是对方的喜用神，你能旺对方（对方更受益）；但对方${partner.dayWx}非你喜用，别把"我对他好"当成关系好的全部保证。` +
      `白话一点：你是对方的贵人——TA跟你在一起后状态肉眼可见地变好。你旺对方不等于你吃亏，但要看清一件事：对方怎么对待你的付出，决定这段感情值不值得继续加码。`;
  } else {
    ysScore = 6; ysDesc = `双方日主都不在对方喜用神之列，互补性一般，需靠后天经营。` +
      `白话一点：五行上谁也不旺谁，属于"平缘"——好消息是你们的感情不受命理绑架，全凭真心换真心；坏消息是没有外挂，所有甜蜜都得靠两个人亲手挣。`;
  }
  items.push({ title: '喜用互补', score: ysScore, desc: ysDesc });

  // 6) 紫微命宫主星（20 分）——命宫主星配对 + 夫妻宫互参 + 命宫地支合冲（三项皆双向对称）
  // v3（2026-09-24）：由 10 分制升为 20 分制，与八字五项同权重，紫微不再只是"点缀分"。
  // 档位（20 分制）：同星 14 / 经典互补配对 16~20 / 异组 16 / 同组 12，夫妻宫互参命中 +4，命宫地支六合 +2、三合 +1、六冲 −4。
  // 兜底已取消：正常路径必定有双方紫微盘（合盘页 buildZiweiChart 排盘）；取不到时明确说明，不再含糊给"基础缘分分"。
  let zwScore = 10;
  let zwDesc = '未能取得双方紫微命宫主星（出生信息不足），本项按中性分计。补齐双方出生时辰后可获得完整比对。';
  const mZw = mine.ziwei, pZw = partner.ziwei;
  if (Array.isArray(mZw) && Array.isArray(pZw)) {
    const ms = zwPalaceStars(mZw, '命宫');
    const ps = zwPalaceStars(pZw, '命宫');
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
          pairText = `${a}与${b}是经典互补组合，一个主外一个主内，配合度高`;
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
      // 夫妻宫互参（方向性）：对方命宫主星落入我的夫妻宫＝正缘类型吻合
      const mSpouse = zwPalaceStars(mZw, '夫妻');
      const pSpouse = zwPalaceStars(pZw, '夫妻');
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
      zwDesc = `${pairText}。${spouseTexts.length > 0 ? spouseTexts.join('；') + '。' : ''}${brText ? brText + '。' : ''}` +
        `白话一点：你是${ZW_GROUP_NAMES[zwGroupOf(a)]}——${groupDesc[zwGroupOf(a)]}；对方是${ZW_GROUP_NAMES[zwGroupOf(b)]}——${groupDesc[zwGroupOf(b)]}。星性没有好坏，只有合不合拍：同一组的像同行者，不同组的像拼图。`;
    }
  }
  items.push({ title: '紫微命宫', score: zwScore, desc: zwDesc });

  // 7) 四化互动（20 分）——双方生年干四化是否引动对方命星（禄>科>权>忌，双向对称）
  // v3（2026-09-24）：由 10 分制升为 20 分制，与八字五项同权重；兜底取消，改用中性分 + 明确说明。
  let sihuaScore = 10;
  let sihuaDesc = '未能取得双方生年四化与命宫主星（出生信息不足），本项按中性分计。';
  const mStem = mine.pillars?.[0]?.tianGan;
  const pStem = partner.pillars?.[0]?.tianGan;
  if (Array.isArray(mZw) && Array.isArray(pZw) && mStem && pStem && STEM_SIHUA_TABLE[mStem] && STEM_SIHUA_TABLE[pStem]) {
    const mMing = zwPalaceStars(mZw, '命宫');
    const pMing = zwPalaceStars(pZw, '命宫');
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
      sihuaDesc = `${ab.text}；${ba.text}。${toneText}`;
    }
  }
  items.push({ title: '四化互动', score: sihuaScore, desc: sihuaDesc });

  const totalScore = items.reduce((s, i) => s + i.score, 0);
  // 满分口径（v3）：八字五项各 20 分 + 紫微两项各 20 分 = 140 分。
  // 档位阈值按原 120 分制（80/65/50）等比换算到 140 分制 → 93/76/58。
  const level = totalScore >= 93 ? '天作之合' : totalScore >= 76 ? '良缘' : totalScore >= 58 ? '平常' : '需磨合';
  const levelNote = totalScore >= 93
    ? '这个分数段意味着：你们先天的"合"远多于"冲"——不是不会有矛盾，而是矛盾总有化解的底子。别辜负这份出厂配置。'
    : totalScore >= 76
      ? '这个分数段意味着：底子是好的，磨合点也明确——知道坑在哪的情侣，比稀里糊涂的情侣走得远。'
      : totalScore >= 58
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
  const perspectives = {
    mine: `${mLabel}视角：${wxRelText(mWx, pWx, mLabel, pLabel)}；${partnerHelps ? `对方日主${pWx}正补${mLabel}的喜用神，${mLabel}在这段关系里运势更受益` : `对方日主${pWx}不在${mLabel}喜用之列，${mLabel}的获益更依赖日常经营`}。`,
    partner: `${pLabel}视角：${wxRelText(pWx, mWx, pLabel, mLabel)}；${mineHelps ? `对方日主${mWx}正补${pLabel}的喜用神，${pLabel}在这段关系里运势更受益` : `对方日主${mWx}不在${pLabel}喜用之列，${pLabel}的获益更依赖日常经营`}。`,
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
