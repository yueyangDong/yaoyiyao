// ========== 八字命格详细判定 ==========
// 判定顺序：特殊外格 → 禄刃格 → 普通八格 → 衍生格 → 层次
import type { PillarData } from '../pages/Bazi';

export interface MingGeDetailed {
  geName: string;
  geType: string;
  score: string;
  desc: string;
  details: string[];
}

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const LU: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
};
const YANG_REN: Record<string, string> = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
};

/** 特殊外格判定：返回格名/类型/解释或 null */
function specialGe(pillars: PillarData[], dayGan: string, strengthLevel: string): { name: string; type: string; desc: string } | null {
  const tgs = pillars.map(p => p.tianGan);
  const dayPillar = pillars[2];
  const timePillar = pillars[3];
  const monthZhi = pillars[1].diZhi;

  // 天元一气：四柱天干相同
  if (tgs.every(t => t === tgs[0])) {
    return { name: '天元一气格', type: '外格', desc: `四柱天干均为${tgs[0]}，一气呵成，气势纯一。这类命格个性极强、目标专一，做事有始有终，但易固执。` };
  }
  // 魁罡
  if (['庚辰', '壬辰', '戊戌', '庚戌'].includes(dayPillar.ganZhi)) {
    return { name: '魁罡格', type: '外格', desc: `日柱${dayPillar.ganZhi}为魁罡。魁罡者聪明果断、胆识过人，性格刚强不服输，适合从事有挑战性的领域。` };
  }
  // 日贵
  if (['丁酉', '丁亥', '癸巳', '癸卯'].includes(dayPillar.ganZhi)) {
    return { name: '日贵格', type: '外格', desc: `日柱${dayPillar.ganZhi}为日贵。日坐天乙贵人，一生多贵人相助，人缘好。` };
  }
  // 金神：时柱癸酉/己巳/乙丑
  if (['癸酉', '己巳', '乙丑'].includes(timePillar.ganZhi)) {
    return { name: '金神格', type: '外格', desc: `时柱${timePillar.ganZhi}为金神。金神主刚毅果决、才华外露，适合技术或军警类职业。` };
  }
  // 专旺格：日主强 + 月令当令 + 月令与日主同气
  if (strengthLevel === '身极强' || strengthLevel === '身强') {
    const monthWx = DZ_WX[monthZhi] || '';
    const dayWx = TG_WX[dayGan] || '';
    const seasonOk = (dayWx === '木' && ['寅', '卯', '辰'].includes(monthZhi))
      || (dayWx === '火' && ['巳', '午', '未'].includes(monthZhi))
      || (dayWx === '土' && ['辰', '戌', '丑', '未'].includes(monthZhi))
      || (dayWx === '金' && ['申', '酉', '戌'].includes(monthZhi))
      || (dayWx === '水' && ['亥', '子', '丑'].includes(monthZhi));
    if (seasonOk && monthWx === dayWx) {
      const names: Record<string, string> = { '木': '曲直格', '火': '炎上格', '土': '稼穑格', '金': '从革格', '水': '润下格' };
      return { name: `专旺·${names[dayWx]}`, type: '外格', desc: `${dayGan}日主${dayWx}气专旺，生于${monthZhi}月当令，全局气势专注一行，为${names[dayWx]}。这类命格心志坚定、专注力强，适合深耕单一领域。` };
    }
  }
  return null;
}

/** 普通八格：月令藏干透干定格（本气透干 → 余气透干 → 月令本气） */
function baGe(pillars: PillarData[], dayGan: string): { name: string; type: string; desc: string; detail: string } | null {
  const month = pillars[1];
  const cangGan = month.cangGan || [];
  if (cangGan.length === 0) return null;
  const ssArr = (month.shiShenZhi || '').split('/').filter(Boolean);
  const tgs = pillars.map(p => p.tianGan);
  const geNames: Record<string, string> = {
    '正官': '正官格', '七杀': '七杀格', '正印': '正印格', '偏印': '偏印格',
    '正财': '正财格', '偏财': '偏财格', '食神': '食神格', '伤官': '伤官格',
  };

  const benQiSS = ssArr[0] || '';
  const benQiGan = cangGan[0];
  // 本气透干
  if (geNames[benQiSS] && tgs.includes(benQiGan)) {
    return { name: geNames[benQiSS], type: '普通格', desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）透干，取${geNames[benQiSS]}。`, detail: `本气${benQiGan}透干 → ${geNames[benQiSS]}` };
  }
  // 余气透干
  if (geNames[benQiSS]) {
    for (let i = 1; i < cangGan.length; i++) {
      if (tgs.includes(cangGan[i])) {
        const ss = ssArr[i] || benQiSS;
        if (geNames[ss]) {
          return { name: geNames[ss], type: '普通格', desc: `月令${month.diZhi}本气未透，余气${cangGan[i]}（${ss}）透干，取${geNames[ss]}。`, detail: `余气${cangGan[i]}透干 → ${geNames[ss]}` };
        }
      }
    }
    // 本气未透：取月令本气
    return { name: `${geNames[benQiSS]}（本气未透）`, type: '普通格', desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）未透干，直接取月令本气为格。`, detail: `月令本气${benQiSS} → ${geNames[benQiSS]}` };
  }
  return null;
}

/** 衍生格 + 层次（互斥，优先级从高到低） */
function yanShengGe(pillars: PillarData[], geName: string): { name: string; score: string; detail: string } | null {
  const shiShens = pillars.map(p => p.shiShen);
  const has = (s: string) => shiShens.some(x => x === s);
  const hasTou = (s: string) => shiShens.some(x => x === s);
  if (has('七杀') && hasTou('正印') || (has('七杀') && hasTou('偏印'))) {
    return { name: '杀印相生', score: '上等', detail: '七杀与印星并见，杀印相生，化压力为助力，是上等格局' };
  }
  if (has('伤官') && hasTou('正印')) {
    return { name: '伤官配印', score: '上等', detail: '伤官配印，才华有约束而能成器，是上等格局' };
  }
  if (has('正官') && hasTou('正印')) {
    return { name: '正官佩印', score: '上等', detail: '正官佩印，官印相生，稳重有靠，是上等格局' };
  }
  if (has('食神') && (hasTou('正财') || hasTou('偏财'))) {
    return { name: '食神生财', score: '中等', detail: '食神生财，才华可化为财富，是中上格局' };
  }
  if (has('正财') && hasTou('正官')) {
    return { name: '财官相生', score: '中等', detail: '财官相生，财生官旺，利事业财运，是中等偏上格局' };
  }
  if (has('比肩') && hasTou('正财')) {
    return { name: '比劫夺财', score: '下等', detail: '比劫旺而财星弱，易破财竞争，是下等格局，需注意合伙与理财' };
  }
  if (has('正官') && has('七杀')) {
    return { name: '官杀混杂', score: '下等', detail: '正官七杀同现，官杀混杂，压力与机遇并存，需印星化解' };
  }
  return null;
}

export function analyzeMingGeDetailed(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
  wxStats: Record<string, { count: number; level: string }>,
): MingGeDetailed {
  const monthZhi = pillars[1].diZhi;
  const details: string[] = [];
  let geName = '';
  let geType = '';
  let score = '';
  let desc = '';

  // 1) 特殊外格
  const sp = specialGe(pillars, dayGan, strengthLevel);
  if (sp) {
    geName = sp.name; geType = sp.type; desc = sp.desc; score = '中上';
    details.push(`特殊外格：${sp.name}`);
    return { geName, geType, score, desc, details };
  }

  // 2) 禄刃格
  if (LU[dayGan] === monthZhi) {
    geName = '建禄格'; geType = '禄格'; score = '中上';
    desc = `日主${dayGan}禄位在${monthZhi}，月令建禄，自身有根基，独立自主，通常身强。`;
    details.push(`月支${monthZhi} = ${dayGan}之禄位 → 建禄格`);
  } else if (YANG_REN[dayGan] === monthZhi) {
    geName = '羊刃格'; geType = '禄格'; score = '中上';
    desc = `月令${monthZhi}为日主${dayGan}之羊刃，羊刃主刚烈果决、行动力强，但需注意冲动。`;
    details.push(`月支${monthZhi} = ${dayGan}之羊刃 → 羊刃格`);
  } else {
    // 3) 普通八格
    const bg = baGe(pillars, dayGan);
    if (bg) {
      geName = bg.name; geType = bg.type; desc = bg.desc;
      details.push(bg.detail);
      score = (geName.includes('正官') || geName.includes('正印')) ? '中上' : '中等';
    } else {
      geName = '月令杂气'; geType = '普通格'; score = '中等';
      desc = `月令${monthZhi}藏干透出情况不构成标准八格，按普通格局论。`;
    }
  }

  // 4) 衍生格（覆盖评分与格名）
  const ys = yanShengGe(pillars, geName);
  if (ys) {
    geName = `${geName.replace(/（本气未透）/, '')}·${ys.name}`;
    score = ys.score;
    details.push(ys.detail);
  }

  details.push(`格局层次：${score}`);
  return { geName, geType, score, desc, details };
}

/** 用神/忌神透干分析：返回 details 行（含柱位） */
export function analyzeTouGan(pillars: PillarData[], yongShen: string[], jiShen: string[]): string[] {
  const ganOfPillar = ['年干', '月干', '日干', '时干'];
  const lines: string[] = [];
  for (const wx of yongShen) {
    const hit = pillars.map((p, i) => TG_WX[p.tianGan] === wx ? ganOfPillar[i] : '').filter(Boolean);
    lines.push(hit.length > 0 ? `用神${wx}透干（${hit.join('、')}）` : `用神${wx}不透干`);
  }
  for (const wx of jiShen) {
    const hit = pillars.map((p, i) => TG_WX[p.tianGan] === wx ? ganOfPillar[i] : '').filter(Boolean);
    lines.push(hit.length > 0 ? `忌神${wx}透干（${hit.join('、')}）` : `忌神${wx}不透干`);
  }
  return lines;
}
