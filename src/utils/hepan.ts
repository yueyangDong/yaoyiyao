// ========== 情侣合盘 ==========
// 八字合婚（日主五行/地支关系/纳音/生肖/喜用神）+ 紫微合盘（命宫主星/四化）
// desc 全部由具体数据生成，避免固定模板
import type { PillarData } from '../pages/Bazi';

export interface HePanInput {
  mine: {
    pillars: PillarData[];
    dayWx: string;
    zodiac: string;
    nayin: string;
    yongShen: string[];
    ziwei?: any[];
  };
  partner: {
    pillars: PillarData[];
    dayWx: string;
    zodiac: string;
    nayin: string;
    yongShen: string[];
    ziwei?: any[];
  };
}

export interface HePanItem {
  title: string;
  score: number;
  desc: string;
}

export interface HePanResult {
  totalScore: number;
  level: string;
  items: HePanItem[];
  summary: string;
}

const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // 我生
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };   // 我克
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

export function analyzeHePan(input: HePanInput): HePanResult {
  const { mine, partner } = input;
  const items: HePanItem[] = [];

  // 1) 日主五行（20 分）
  const mWx = mine.dayWx, pWx = partner.dayWx;
  let wxScore: number; let wxDesc: string;
  if (WX_SHENG[mWx] === pWx) {
    wxScore = 20; wxDesc = `你的日主${mWx}生对方${pWx}，你更愿意付出与滋养对方，相处自然顺遂。`;
  } else if (WX_SHENG[pWx] === mWx) {
    wxScore = 18; wxDesc = `对方日主${pWx}生你的${mWx}，对方更照顾你，你能感受到被滋养。`;
  } else if (mWx === pWx) {
    wxScore = 14; wxDesc = `两人日主同为${mWx}，同气比和，像朋友一样有默契，但少了互补。`;
  } else if (WX_KE[mWx] === pWx) {
    wxScore = 8; wxDesc = `你的日主${mWx}克对方${pWx}，你较强势，需多包容对方，否则易有摩擦。`;
  } else if (WX_KE[pWx] === mWx) {
    wxScore = 6; wxDesc = `对方日主${pWx}克你的${mWx}，相处中对方占上风，你需要更多表达自己。`;
  } else {
    wxScore = 12; wxDesc = `两人日主${mWx}与${pWx}无直接生克，关系平淡但有各自空间。`;
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

  // 3) 纳音（20 分）
  const mNy = NAYIN_WX[mine.nayin] || '', pNy = NAYIN_WX[partner.nayin] || '';
  let nyScore: number; let nyDesc: string;
  if (mNy && pNy && WX_SHENG[mNy] === pNy) {
    nyScore = 20; nyDesc = `你的纳音${mine.nayin}（${mNy}）生对方${partner.nayin}（${pNy}），年命相生，家宅安宁。`;
  } else if (mNy && pNy && WX_SHENG[pNy] === mNy) {
    nyScore = 18; nyDesc = `对方纳音${partner.nayin}（${pNy}）生你的${mine.nayin}（${mNy}），对方旺你，得助力。`;
  } else if (mNy && mNy === pNy) {
    nyScore = 14; nyDesc = `双方纳音同属${mine.nayin}，命韵相似，彼此懂对方的节奏。`;
  } else if (mNy && pNy && WX_KE[mNy] === pNy) {
    nyScore = 8; nyDesc = `你的纳音${mine.nayin}克对方${partner.nayin}，年命相克，宜多相让。`;
  } else {
    nyScore = 12; nyDesc = `纳音${mine.nayin}与${partner.nayin}无直接生克，平顺无大碍。`;
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

  // 5) 喜用神互补（20 分）
  const partnerHelps = mine.yongShen.includes(partner.dayWx);
  const mineHelps = partner.yongShen.includes(mine.dayWx);
  let ysScore: number; let ysDesc: string;
  if (partnerHelps && mineHelps) {
    ysScore = 20; ysDesc = `互为喜用：对方日主${partner.dayWx}补你的用神，你的${mine.dayWx}也补对方，彼此是对方的贵人。`;
  } else if (partnerHelps) {
    ysScore = 16; ysDesc = `对方日主${partner.dayWx}正是你的喜用神，与你在一起运势有助益。`;
  } else if (mineHelps) {
    ysScore = 14; ysDesc = `你的日主${mine.dayWx}是对方的喜用神，你能旺对方。`;
  } else {
    ysScore = 6; ysDesc = `双方日主都不在对方喜用神之列，互补性一般，需靠后天经营。`;
  }
  items.push({ title: '喜用互补', score: ysScore, desc: ysDesc });

  // 6) 紫微命宫主星（10 分）——简化：无 ziwei 数据给基础分
  let zwScore = 6; let zwDesc = '紫微命盘需双方都排盘后细化比对（当前以基础缘分分计）。';
  const mZw = mine.ziwei, pZw = partner.ziwei;
  if (Array.isArray(mZw) && Array.isArray(pZw)) {
    const mingStars = (g: any[]) => {
      const m = g.find(x => x.name === '命宫');
      return (m?.majorStars || []).map((s: any) => s.name);
    };
    const ms = mingStars(mZw), ps = mingStars(pZw);
    const commonJi = ['紫微', '天府', '天同', '天梁', '太阴', '太阳'].filter(s => ms.includes(s) && ps.includes(s)).length;
    zwScore = 4 + commonJi * 2;
    zwDesc = `双方命宫主星共有吉星 ${commonJi} 颗，${commonJi >= 2 ? '命盘气质相近，容易相互理解。' : '命盘风格各异，互补与新鲜感并存。'}`;
  }
  items.push({ title: '紫微命宫', score: zwScore, desc: zwDesc });

  // 7) 四化互动（10 分）——简化
  let sihuaScore = 6; let sihuaDesc = '四化互动需双方完整命盘比对（当前以基础缘分分计）。';
  items.push({ title: '四化互动', score: sihuaScore, desc: sihuaDesc });

  const totalScore = items.reduce((s, i) => s + i.score, 0);
  const level = totalScore >= 80 ? '天作之合' : totalScore >= 65 ? '良缘' : totalScore >= 50 ? '平常' : '需磨合';
  const summary = `综合 ${totalScore} 分（${level}）。${wxScore >= 14 ? '五行磁场相合，' : '五行上需要磨合，'}${dzScore >= 14 ? '地支缘分深厚，' : '地支冲合并存，'}${sxScore >= 14 ? '生肖彼此投缘。' : '生肖需多包容。'}合盘看的是趋势，最终经营在两人。`;

  return { totalScore, level, items, summary };
}
