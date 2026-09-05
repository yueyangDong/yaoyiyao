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

/** 单向：A 的生年干四化对 B 命宫主星的引动（禄>科>权>忌，无引动为中平） */
function sihuaDirOnMing(fromStem: string, toMingStars: string[], fromLabel: string, toLabel: string): { score: number; text: string } {
  const t = STEM_SIHUA_TABLE[fromStem];
  if (!t || toMingStars.length === 0) return { score: 5, text: '' };
  if (toMingStars.includes(t.lu)) return { score: 10, text: `${fromLabel}的${fromStem}干${t.lu}化禄正坐${toLabel}命宫——${fromLabel}的存在本身就能旺${toLabel}，是天生的助力缘` };
  if (toMingStars.includes(t.ke)) return { score: 8, text: `${fromLabel}的${fromStem}干${t.ke}化科坐${toLabel}命宫——${fromLabel}能给${toLabel}带来名声、贵人与体面` };
  if (toMingStars.includes(t.quan)) return { score: 7, text: `${fromLabel}的${fromStem}干${t.quan}化权坐${toLabel}命宫——${fromLabel}能推动${toLabel}成长，但要注意别变成施压` };
  if (toMingStars.includes(t.ji)) return { score: 3, text: `${fromLabel}的${fromStem}干${t.ji}化忌坐${toLabel}命宫——${fromLabel}的执念容易变成${toLabel}的压力，相处宜多留空间` };
  return { score: 5, text: `${fromLabel}的生年四化未直接引动${toLabel}命星，这一方向的缘分靠日常经营` };
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
    wxDesc = `你的日主${mWx}生对方${pWx}：你更愿意付出与滋养对方；反向看对方处于受生位，能安心接收你的好。单向流动明显，注意别让付出失衡。`;
  } else if (WX_SHENG[pWx] === mWx) {
    wxDesc = `对方日主${pWx}生你的${mWx}：对方更照顾你，你能感受到被滋养；记得及时回应，让流动双向。`;
  } else if (mWx === pWx) {
    wxDesc = `两人日主同为${mWx}，同气比和，像朋友一样有默契，但少了互补。`;
  } else if (WX_KE[mWx] === pWx) {
    wxDesc = `你的日主${mWx}克对方${pWx}：你较强势，对方易感压抑；相处时把"主导"变成"引领"，多商量、少命令。`;
  } else if (WX_KE[pWx] === mWx) {
    wxDesc = `对方日主${pWx}克你的${mWx}：相处中对方占上风，你需要更多表达自己，也别默默累积委屈。`;
  } else {
    // 防御：五行相异的组合必有生克关系，正常不应到达此分支
    wxDesc = `两人日主${mWx}与${pWx}无直接生克，关系平淡但有各自空间。`;
  }
  items.push({ title: '日主五行', score: wxScore, desc: wxDesc });

  // 2) 地支关系（20 分）：合冲刑害统计
  const myDz = mine.pillars.map(p => p.diZhi);
  const paDz = partner.pillars.map(p => p.diZhi);
  let heCount = 0, chongCount = 0;
  for (const a of myDz) {
    for (const b of paDz) {
      if (a === b) continue;
      if (LIU_HE[a] === b) heCount += 2;
      if ((SAN_HE[a] || []).includes(b)) heCount += 1;
      if (LIU_CHONG[a] === b) chongCount += 2;
      if ((a === '寅' && ['巳', '申'].includes(b)) || (a === '巳' && ['申', '寅'].includes(b)) || (a === '申' && ['寅', '巳'].includes(b))) chongCount += 1; // 三刑近似
    }
  }
  const dzScore = Math.max(0, Math.min(20, 10 + heCount - chongCount));
  const dzDesc = `双方地支合${heCount}处、冲刑${chongCount}处。${heCount > chongCount ? '合的缘分多于冲撞，彼此能互相成就。' : chongCount > 0 ? '冲撞多于相合，需要更多磨合与体谅。' : '地支关系平稳，无大合大冲。'}`;
  items.push({ title: '地支合冲', score: dzScore, desc: dzDesc });

  // 3) 纳音（20 分）——双向计算取均分（对称）
  const mNy = NAYIN_WX[mine.nayin] || '', pNy = NAYIN_WX[partner.nayin] || '';
  const nyAB = nyDirScore(mNy, pNy); // 我 → 对方
  const nyBA = nyDirScore(pNy, mNy); // 对方 → 我
  const nyScore = Math.round((nyAB + nyBA) / 2);
  let nyDesc: string;
  if (mNy && pNy && WX_SHENG[mNy] === pNy) {
    nyDesc = `你的纳音${mine.nayin}（${mNy}）生对方${partner.nayin}（${pNy}）：你的年命旺对方，家宅安宁；年命相生是传统合婚的吉兆。`;
  } else if (mNy && pNy && WX_SHENG[pNy] === mNy) {
    nyDesc = `对方纳音${partner.nayin}（${pNy}）生你的${mine.nayin}（${mNy}）：对方年命旺你，得助力；领受之余也多体谅对方的付出。`;
  } else if (mNy && mNy === pNy) {
    nyDesc = `双方纳音同属${mine.nayin}，命韵相似，彼此懂对方的节奏。`;
  } else if (mNy && pNy && WX_KE[mNy] === pNy) {
    nyDesc = `你的纳音${mine.nayin}（${mNy}）克对方${partner.nayin}（${pNy}）：你年命占强势位，宜多相让。`;
  } else if (mNy && pNy && WX_KE[pNy] === mNy) {
    nyDesc = `对方纳音${partner.nayin}（${pNy}）克你的${mine.nayin}（${mNy}）：对方年命占强势位，你需要更多话语权上的平衡。`;
  } else {
    nyDesc = `纳音${mine.nayin}与${partner.nayin}无直接生克，平顺无大碍。`;
  }
  items.push({ title: '纳音年命', score: nyScore, desc: nyDesc });

  // 4) 生肖（20 分）
  let sxScore: number; let sxDesc: string;
  if (LIU_HE[mine.zodiac] === partner.zodiac) {
    sxScore = 20; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}六合，天生一对，默契十足。`;
  } else if ((SAN_HE[mine.zodiac] || []).includes(partner.zodiac)) {
    sxScore = 16; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}三合，志趣相投，易成良配。`;
  } else if (LIU_CHONG[mine.zodiac] === partner.zodiac) {
    sxScore = 4; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}六冲，性格差异大，需要更多包容。`;
  } else {
    sxScore = 10; sxDesc = `生肖${mine.zodiac}与${partner.zodiac}无合无冲，随缘相处。`;
  }
  items.push({ title: '生肖配对', score: sxScore, desc: sxDesc });

  // 5) 喜用神互补（20 分）——按"受益方向"对称打分
  const partnerHelps = mine.yongShen.includes(partner.dayWx); // 对方补我（我受益）
  const mineHelps = partner.yongShen.includes(mine.dayWx);    // 我补对方（对方受益）
  let ysScore: number; let ysDesc: string;
  if (partnerHelps && mineHelps) {
    ysScore = 20; ysDesc = `互为喜用：对方日主${partner.dayWx}补你的用神，你的${mine.dayWx}也补对方，彼此是对方的贵人。`;
  } else if (partnerHelps) {
    ysScore = 15; ysDesc = `对方日主${partner.dayWx}正是你的喜用神，与你在一起你的运势有助益（你更受益）；而你的${mine.dayWx}不在对方喜用之列，记得在情感之外也给对方实际的支持。`;
  } else if (mineHelps) {
    ysScore = 15; ysDesc = `你的日主${mine.dayWx}是对方的喜用神，你能旺对方（对方更受益）；但对方${partner.dayWx}非你喜用，别把"我对他好"当成关系好的全部保证。`;
  } else {
    ysScore = 6; ysDesc = `双方日主都不在对方喜用神之列，互补性一般，需靠后天经营。`;
  }
  items.push({ title: '喜用互补', score: ysScore, desc: ysDesc });

  // 6) 紫微命宫主星（10 分）——星性分组 + 经典配对 + 夫妻宫互参（双向对称）
  let zwScore = 6; let zwDesc = '紫微命盘需双方都排盘后细化比对（当前以基础缘分分计）。';
  const mZw = mine.ziwei, pZw = partner.ziwei;
  if (Array.isArray(mZw) && Array.isArray(pZw)) {
    const ms = zwPalaceStars(mZw, '命宫');
    const ps = zwPalaceStars(pZw, '命宫');
    if (ms.length > 0 && ps.length > 0) {
      const a = ms[0], b = ps[0];
      // 基础配对分（对称部分）
      let pair: number; let pairText: string;
      if (a === b) {
        pair = 7;
        pairText = `双方命宫同坐${a}——同类相吸、节奏一致，但要警惕把同样的短板一起放大`;
      } else {
        const ideal = ZW_IDEAL_PAIRS[zwPairKey(a, b)];
        if (ideal) {
          pair = ideal;
          pairText = `${a}与${b}是经典互补组合，一个主外一个主内，配合度高`;
        } else {
          const gA = zwGroupOf(a), gB = zwGroupOf(b);
          if (gA !== gB) {
            pair = 8;
            pairText = `${a}（${ZW_GROUP_NAMES[gA]}）配${b}（${ZW_GROUP_NAMES[gB]}），一刚一柔、一动一静，互补性好`;
          } else {
            pair = 6;
            pairText = `${a}与${b}同属${ZW_GROUP_NAMES[gA]}，风格相近——默契有余、互补不足，需要刻意引入不同视角`;
          }
        }
      }
      // 夫妻宫互参（方向性）：对方命宫主星落入我的夫妻宫＝正缘类型吻合
      const mSpouse = zwPalaceStars(mZw, '夫妻');
      const pSpouse = zwPalaceStars(pZw, '夫妻');
      const abBonus = mSpouse.some((s) => ps.includes(s)) ? 2 : 0;
      const baBonus = pSpouse.some((s) => ms.includes(s)) ? 2 : 0;
      const ab = Math.min(10, pair + abBonus);
      const ba = Math.min(10, pair + baBonus);
      zwScore = Math.round((ab + ba) / 2);
      const spouseTexts: string[] = [];
      if (abBonus) spouseTexts.push('对方命宫主星正落你的夫妻宫，是你命中欣赏的类型');
      if (baBonus) spouseTexts.push('你的命宫主星正落对方夫妻宫，在对方眼里你是理想型');
      zwDesc = `${pairText}。${spouseTexts.length > 0 ? spouseTexts.join('；') + '。' : '夫妻宫互参无直接对应，缘分靠相处养成。'}`;
    }
  }
  items.push({ title: '紫微命宫', score: zwScore, desc: zwDesc });

  // 7) 四化互动（10 分）——双方生年干四化是否引动对方命星（禄>科>权>忌，双向对称）
  let sihuaScore = 6; let sihuaDesc = '四化互动需双方完整命盘比对（当前以基础缘分分计）。';
  const mStem = mine.pillars?.[0]?.tianGan;
  const pStem = partner.pillars?.[0]?.tianGan;
  if (Array.isArray(mZw) && Array.isArray(pZw) && mStem && pStem && STEM_SIHUA_TABLE[mStem] && STEM_SIHUA_TABLE[pStem]) {
    const mMing = zwPalaceStars(mZw, '命宫');
    const pMing = zwPalaceStars(pZw, '命宫');
    if (mMing.length > 0 && pMing.length > 0) {
      const ab = sihuaDirOnMing(mStem, pMing, '你', '对方'); // 我年干四化 → 对方命宫
      const ba = sihuaDirOnMing(pStem, mMing, '对方', '你'); // 对方年干四化 → 我命宫
      sihuaScore = Math.round((ab.score + ba.score) / 2);
      sihuaDesc = `${ab.text}；${ba.text}。`;
    }
  }
  items.push({ title: '四化互动', score: sihuaScore, desc: sihuaDesc });

  const totalScore = items.reduce((s, i) => s + i.score, 0);
  const level = totalScore >= 80 ? '天作之合' : totalScore >= 65 ? '良缘' : totalScore >= 50 ? '平常' : '需磨合';
  const summary = `综合 ${totalScore} 分（${level}）。${wxScore >= 14 ? '五行磁场相合，' : '五行上需要磨合，'}${dzScore >= 14 ? '地支缘分深厚，' : '地支冲合并存，'}${sxScore >= 14 ? '生肖彼此投缘。' : '生肖需多包容。'}合盘看的是趋势，最终经营在两人。`;

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

  return { totalScore, level, items, summary, loveAdvice, partnerDisplay, perspectives };
}
