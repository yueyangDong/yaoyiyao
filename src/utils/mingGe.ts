// ========== 八字命格详细判定 ==========
// 判定顺序：特殊外格 → 禄刃格 → 普通八格 → 衍生格 → 层次
import type { PillarData } from '../pages/Bazi';

export interface MingGeDetailed {
  geName: string;
  geType: string;
  score: string;
  desc: string;
  details: string[];
  /** 判定依据链（分步推理：从月令/日主状态一路推到格名），让人看懂"为什么是这个格" */
  basis: string[];
  /** 要素 → 本盘取值 → 与格局的对应关系（表格展示） */
  keyFactors: { factor: string; value: string; meaning: string }[];
  /** 成败关键：这个格靠什么成、怕什么破（格局喜忌） */
  successKey: string;
}

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const TG_YIN_YANG: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
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

// 地支成局表：三会局 + 三合局（土用辰戌丑未取三）
const HUI: Record<string, string[]> = { '木': ['寅', '卯', '辰'], '火': ['巳', '午', '未'], '金': ['申', '酉', '戌'], '水': ['亥', '子', '丑'] };
const HE: Record<string, string[]> = { '木': ['亥', '卯', '未'], '火': ['寅', '午', '戌'], '金': ['巳', '酉', '丑'], '水': ['申', '子', '辰'] };

// ---------- 化气格（《三命通会》《滴天髓》通行口径） ----------
/** 天干五合：日干 → { 合神, 化神五行 }。只认日干与月干/时干相邻相合，年干隔位不论化 */
const TIAN_GAN_HE: Record<string, { he: string; hua: string }> = {
  '甲': { he: '己', hua: '土' }, '己': { he: '甲', hua: '土' },
  '乙': { he: '庚', hua: '金' }, '庚': { he: '乙', hua: '金' },
  '丙': { he: '辛', hua: '水' }, '辛': { he: '丙', hua: '水' },
  '丁': { he: '壬', hua: '木' }, '壬': { he: '丁', hua: '木' },
  '戊': { he: '癸', hua: '火' }, '癸': { he: '戊', hua: '火' },
};
/** 化神当令之月（含生扶之月：土兼巳午火生土、金兼巳申、水兼申亥、木兼寅亥、火兼寅巳） */
const HUA_MONTH: Record<string, string[]> = {
  '土': ['辰', '戌', '丑', '未', '巳', '午'],
  '金': ['巳', '酉', '丑', '申'],
  '水': ['申', '子', '辰', '亥'],
  '木': ['亥', '卯', '未', '寅'],
  '火': ['寅', '午', '戌', '巳'],
};
/** 克化神之五行（破化之字） */
const KE_HUA: Record<string, string> = { '土': '木', '金': '火', '水': '土', '木': '金', '火': '水' };
/** 生化神之五行（助化之字，行运所喜） */
const SHENG_HUA: Record<string, string> = { '土': '火', '金': '土', '水': '金', '木': '水', '火': '木' };
/** 化神性情（《滴天髓》化气十段锦的白话提炼） */
const HUA_XING: Record<string, string> = {
  '土': '厚重诚信、包容实干（甲己中正之合）',
  '金': '刚毅果决、有棱有角（乙庚仁义之合）',
  '水': '智巧流动、善于应变（丙辛威制之合）',
  '木': '仁直条达、能屈能伸（丁壬淫慝之合，主聪慧多变）',
  '火': '礼明踊跃、热忱外放（戊癸无情之合，主外冷内热）',
};

/** 四柱地支是否成某五行的三会/三合局（土取辰戌丑未 ≥3） */
function hasJu(dzList: string[], wx: string): boolean {
  if (wx === '土') {
    const tuCount = ['辰', '戌', '丑', '未'].filter(z => dzList.includes(z)).length;
    return tuCount >= 3;
  }
  const hui = (HUI[wx] || []).every(z => dzList.includes(z));
  const he = (HE[wx] || []).every(z => dzList.includes(z));
  return hui || he;
}

/** 特殊外格判定：返回格名/类型/解释/依据链 或 null */
function specialGe(pillars: PillarData[], dayGan: string, strengthLevel: string): { name: string; type: string; desc: string; basis: string[] } | null {
  const tgs = pillars.map(p => p.tianGan);
  const dayPillar = pillars[2];
  const timePillar = pillars[3];
  const monthZhi = pillars[1].diZhi;

  // 天元一气：四柱天干相同
  if (tgs.every(t => t === tgs[0])) {
    return {
      name: '天元一气格', type: '外格',
      desc: `四柱天干均为${tgs[0]}，一气呵成，气势纯一。这类命格个性极强、目标专一，做事有始有终，但易固执。`,
      basis: [`四柱天干依次为 ${tgs.join('、')}——四柱全同`, '天干一气、五行不杂，取外格之首「天元一气」（只看天干，地支不参与判定）'],
    };
  }
  // 魁罡
  if (['庚辰', '壬辰', '戊戌', '庚戌'].includes(dayPillar.ganZhi)) {
    return {
      name: '魁罡格', type: '外格',
      desc: `日柱${dayPillar.ganZhi}为魁罡。魁罡者聪明果断、胆识过人，性格刚强不服输，适合从事有挑战性的领域。`,
      basis: [`日柱干支为 ${dayPillar.ganZhi}`, '该干支属魁罡四位（庚辰/壬辰/戊戌/庚戌），且魁罡只论日柱、不论年月时 → 魁罡格'],
    };
  }
  // 日贵
  if (['丁酉', '丁亥', '癸巳', '癸卯'].includes(dayPillar.ganZhi)) {
    return {
      name: '日贵格', type: '外格',
      desc: `日柱${dayPillar.ganZhi}为日贵。日坐天乙贵人，一生多贵人相助，人缘好。`,
      basis: [`日柱干支为 ${dayPillar.ganZhi}`, '日支为日干之天乙贵人（丁酉/丁亥/癸巳/癸卯四组）→ 日贵格'],
    };
  }
  // 金神：时柱癸酉/己巳/乙丑，且日主为乙或己（《三命通会》：六乙日、六己日时逢之方为金神，其余日主不论）
  if (['癸酉', '己巳', '乙丑'].includes(timePillar.ganZhi) && ['乙', '己'].includes(dayGan)) {
    return {
      name: '金神格', type: '外格',
      desc: `日主${dayGan}生于${dayPillar.ganZhi}日，时柱${timePillar.ganZhi}为金神。金神主刚毅果决、才华外露，须火制伏方成大器（柱见丙丁/巳午为佳），适合技术或军警类职业。`,
      basis: [`时柱干支为 ${timePillar.ganZhi}，属金神三位（癸酉/己巳/乙丑）`, `日主为 ${dayGan}，《三命通会》限"六乙日、六己日"时逢方论（其余日主不算）→ 金神格`, '成器条件：柱中见丙丁或巳午火制伏，无火则才华难落地'],
    };
  }
  // 专旺格：日主强 + 月令当令 + 地支成三会/三合局 + 天干无克星破格
  if (strengthLevel === '身极强' || strengthLevel === '身强') {
    const monthWx = DZ_WX[monthZhi] || '';
    const dayWx = TG_WX[dayGan] || '';
    const seasonOk = (dayWx === '木' && ['寅', '卯', '辰'].includes(monthZhi))
      || (dayWx === '火' && ['巳', '午', '未'].includes(monthZhi))
      || (dayWx === '土' && ['辰', '戌', '丑', '未'].includes(monthZhi))
      || (dayWx === '金' && ['申', '酉', '戌'].includes(monthZhi))
      || (dayWx === '水' && ['亥', '子', '丑'].includes(monthZhi));
    // 地支成局：三会或三合（土取辰戌丑未 ≥3）
    const dzList = pillars.map(p => p.diZhi);
    const juOk = hasJu(dzList, dayWx);
    // 破格：天干透克星，或地支克星 ≥2（如润下格见戊己土官杀、地支戌土成势）
    const keWx: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
    const hasKeTou = pillars.some(p => TG_WX[p.tianGan] === keWx[dayWx]);
    const dzKeCount = dzList.filter(z => DZ_WX[z] === keWx[dayWx]).length;
    const broken = hasKeTou || dzKeCount >= 2;
    if (seasonOk && monthWx === dayWx && juOk && !broken) {
      const names: Record<string, string> = { '木': '曲直格', '火': '炎上格', '土': '稼穑格', '金': '从革格', '水': '润下格' };
      return {
        name: `专旺·${names[dayWx]}`, type: '外格',
        desc: `${dayGan}日主${dayWx}气专旺，生于${monthZhi}月当令，地支成${dayWx}局（三会/三合），无克星破格，为${names[dayWx]}。这类命格心志坚定、专注力强，适合深耕单一领域。`,
        basis: [
          `日主${dayGan}属${dayWx}，当前强弱为「${strengthLevel}」——身强是专旺的前提`,
          `月令${monthZhi}属${monthWx}，与日主同气（当令）`,
          `四柱地支 ${dzList.join('、')} 成${dayWx}局（三会或三合）`,
          `天干不透克星${keWx}${dzKeCount === 0 ? '' : `，地支克星仅 ${dzKeCount} 位（<2 不破）`} → 不破格`,
          `五项俱备 → 取专旺·${names[dayWx]}`,
        ],
      };
    }
  }
  // 化气格：日干与月干或时干相邻五合，化神当令，日主无根无助，弃本五行从化神。
  // 真/假分层：带根苗（比劫印绶）、化神力弱、有虚克 → 假化；争合（月干时干同为合神）不论化。
  // 化气优先于从格：身弱有合先论化，无合再论从。
  {
    const heInfo = TIAN_GAN_HE[dayGan];
    const monthGan = pillars[1].tianGan;
    const timeGan = pillars[3].tianGan;
    if (heInfo) {
      const adjHeCount = [monthGan, timeGan].filter((g) => g === heInfo.he).length;
      if (adjHeCount === 1 && (HUA_MONTH[heInfo.hua] || []).includes(monthZhi)) {
        const dayWx = TG_WX[dayGan] || '';
        const shengWx: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
        const dzList = pillars.map((p) => p.diZhi);
        // 根苗：地支本气比劫或印根；天干透比劫印绶
        const hasRoot = dzList.some((z) => DZ_WX[z] === dayWx || DZ_WX[z] === shengWx[dayWx]);
        const hasMiao = pillars.some((p) => ['比肩', '劫财', '正印', '偏印'].includes(p.shiShen));
        // 化神旺：地支化神 ≥2 或化神透干
        const huaZhiCount = dzList.filter((z) => DZ_WX[z] === heInfo.hua).length;
        const huaTou = pillars.some((p) => TG_WX[p.tianGan] === heInfo.hua);
        // 克破：克化神之字透年/月/时干（日干是合化主角，弃本从化，自身不算破字）
        const keWx = KE_HUA[heInfo.hua];
        const keTou = pillars.some((p, i) => i !== 2 && TG_WX[p.tianGan] === keWx);
        const huaName: Record<string, string> = { '土': '甲己化土', '金': '乙庚化金', '水': '丙辛化水', '木': '丁壬化木', '火': '戊癸化火' };
        const gName = huaName[heInfo.hua] || '化气';
        const huaStrong = huaZhiCount >= 2 || huaTou;
        if (huaStrong && !keTou && !hasRoot && !hasMiao) {
          return {
            name: `${gName}格`,
            type: '外格',
            desc: `日主${dayGan}与${heInfo.he}相邻相合，生于${monthZhi}月化神${heInfo.hua}当令，四柱无根无助，弃本五行而从${heInfo.hua}气，为真化。化气之人心性随化神——${HUA_XING[heInfo.hua]}。行运喜${heInfo.hua}与${SHENG_HUA[heInfo.hua]}生扶之地；大忌${keWx}克化之神，岁运逢之有"化神还原"之应（成败反复），宜未雨绸缪。`,
            basis: [
              `日干${dayGan}与${adjHeCount === 1 ? (monthGan === heInfo.he ? '月干' : '时干') : ''}${heInfo.he}相邻五合 → 化神为${heInfo.hua}（年干隔位不算化）`,
              `月令${monthZhi}属${heInfo.hua}当令（或生扶）之月`,
              `日主无根无助：地支${dzList.join('、')}无比劫印根，天干不透比劫印绶`,
              `化神旺：地支${heInfo.hua} ${huaZhiCount} 位${huaTou ? '，且化神透干' : ''}`,
              `年/月/时干不见克化之${keWx}字（日干是合化主角，不算破字）→ 五项俱备，真化成立`,
            ],
          };
        }
        // 假化：合化之意已成但带根苗/化神弱/有虚克，且日主整体偏弱方论假化（身强则合而不化，不论）
        if (strengthLevel === '身极弱' || strengthLevel === '身弱') {
          const why = hasRoot || hasMiao
            ? '日主带根苗（比劫印绶未净）'
            : keTou
              ? `天干透${keWx}克化神`
              : '化神力弱（地支无根不透）';
          return {
            name: `假${gName}格`,
            type: '外格',
            desc: `日主${dayGan}与${heInfo.he}相合且${heInfo.hua}气当令，有从化之意，但${why}，从化不纯为假化。假化之命多白手起家：行运走${heInfo.hua}与${SHENG_HUA[heInfo.hua]}之地则变假成真、一发而起；行运逆化（${keWx}地）则反复进退。宜顺势而为，不宜逆势强立。`,
            basis: [
              `日干${dayGan}与${monthGan === heInfo.he ? '月干' : ''}${timeGan === heInfo.he ? '时干' : ''}${heInfo.he}相邻五合 → 化神为${heInfo.hua}`,
              `月令${monthZhi}属${heInfo.hua}当令之月，从化之意已具`,
              `但${why} → 合化不纯`,
              `日主强弱为「${strengthLevel}」，未至无根 → 判假${gName}格（待行运助化则可变假成真）`,
            ],
          };
        }
      }
    }
  }
  // 从格：日主极弱，顺从月令旺神（财/官杀/食伤）
  // 注意：从格看月令（月支本气）十神，非月干十神
  if (strengthLevel === '身极弱') {
    const monthShiShenZhiArr = (pillars[1].shiShenZhi || '').split('/').filter(Boolean);
    const monthBenQiSS = monthShiShenZhiArr[0] || pillars[1].shiShen || '';
    const fromNames: Record<string, string> = {
      '正财': '从财格', '偏财': '从财格',
      '正官': '从官杀格', '七杀': '从官杀格',
      '食神': '从儿格', '伤官': '从儿格',
    };
    if (fromNames[monthBenQiSS]) {
      // 假从：日主有余气根（日支同气）或比劫帮身 → 从得不纯
      const dayZhi = pillars[2].diZhi;
      const dayWx2 = TG_WX[dayGan] || '';
      const hasRoot = DZ_WX[dayZhi] === dayWx2;
      const biJieTou = pillars.some(p => ['比肩', '劫财'].includes(p.shiShen));
      const jia = hasRoot || biJieTou;
      return {
        name: jia ? `假${fromNames[monthBenQiSS]}` : fromNames[monthBenQiSS],
        type: '外格',
        desc: `日主${dayGan}极弱，月令${monthZhi}本气${monthBenQiSS}成势，全局顺从旺神。${jia ? `日主有余气根（日支${dayZhi}同气）或比劫帮身，从得不纯，为假从——大运见印比易反复，宜顺势不可强扶` : '从得纯粹，为真从——大运喜顺从旺神，忌印比来犯'}。`,
        basis: [
          `日主${dayGan}强弱为「身极弱」——从格的前提`,
          `月令${monthZhi}本气十神为${monthBenQiSS}（从格看月支本气，不看月干）`,
          jia
            ? `但日主在日支${dayZhi}留有根气${biJieTou ? '、天干又见比劫帮身' : ''} → 从得不纯，判假从`
            : '四柱无根、无比劫帮身 → 从得纯粹，判真从',
        ],
      };
    }
  }
  return null;
}

/** 普通八格：月令藏干透干定格（本气透干 → 余气透干 → 月令本气） */
function baGe(pillars: PillarData[], dayGan: string): { name: string; type: string; desc: string; detail: string; basis: string[] } | null {
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
    return {
      name: geNames[benQiSS], type: '普通格',
      desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）透干，取${geNames[benQiSS]}。`,
      detail: `本气${benQiGan}透干 → ${geNames[benQiSS]}`,
      basis: [
        `月令${month.diZhi}藏干 ${cangGan.join('、')}，本气为${benQiGan}（十神：${benQiSS}）`,
        `本气${benQiGan}在天干透出（四柱天干 ${tgs.join('、')}）`,
        `${benQiSS}属八格范围，取「本气透干」这一优先路径 → ${geNames[benQiSS]}`,
      ],
    };
  }
  // 余气透干（无论本气是否为八格，都必须检查余气——杂气月辰戌丑未本气常为比劫，需看余气取格）
  for (let i = 1; i < cangGan.length; i++) {
    if (tgs.includes(cangGan[i])) {
      const ss = ssArr[i];
      if (ss && geNames[ss]) {
        return {
          name: geNames[ss], type: '普通格',
          desc: `月令${month.diZhi}本气未透，余气${cangGan[i]}（${ss}）透干，取${geNames[ss]}。`,
          detail: `余气${cangGan[i]}透干 → ${geNames[ss]}`,
          basis: [
            `月令${month.diZhi}本气${benQiGan}（${benQiSS || '非八格'}）未在天干透出`,
            `依次检视藏干余气：${cangGan[i]}（十神：${ss}）已透干`,
            `杂气月须看余气取格（本气常为比劫）→ ${geNames[ss]}`,
          ],
        };
      }
    }
  }
  // 本气未透且无余气透干：若本气是八格则取本气，否则月令杂气
  if (geNames[benQiSS]) {
    return {
      name: `${geNames[benQiSS]}（本气未透）`, type: '普通格',
      desc: `月令${month.diZhi}本气${benQiGan}（${benQiSS}）未透干，直接取月令本气为格。`,
      detail: `月令本气${benQiSS} → ${geNames[benQiSS]}`,
      basis: [
        `月令${month.diZhi}本气为${benQiGan}（十神：${benQiSS}）`,
        `本气与其余藏干均未在天干透出`,
        `本气属八格范围 → 依"本气未透则直取月令本气"取格：${geNames[benQiSS]}`,
      ],
    };
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
  // 比劫夺财须比劫成势（天干比肩劫财合计≥2）方论——身弱财旺时一个比劫帮身反为喜，
  // 仅一个比肩透干就判夺财会大面积误伤正财格身弱盘
  const biJieCount = shiShens.filter(x => x === '比肩' || x === '劫财').length;
  const hasShiShangTongGuan = shiShens.some(x => x === '食神' || x === '伤官');
  if (biJieCount >= 2 && has('正财') && !hasShiShangTongGuan) {
    return { name: '比劫夺财', score: '下等', detail: `比劫${biJieCount}透成势而财星无助（无食伤通关），比劫夺财，易破财竞争，是下等格局，需注意合伙与理财` };
  }
  if (has('正官') && has('七杀')) {
    return { name: '官杀混杂', score: '下等', detail: '正官七杀同现，官杀混杂，压力与机遇并存，需印星化解' };
  }
  return null;
}

/** 格局成败关键（喜忌）：这个格靠什么成、怕什么破 */
function successKeyOf(geName: string, geType: string): string {
  const g = geName;
  if (g.includes('化')) return '化气格靠"化神旺而纯粹"立命——行运喜走化神与生扶化神之地，忌克化神之字；岁运一逢克破即有"化神还原"之应，成败大起大落，宜顺势不宜强立。';
  if (g.includes('专旺')) return '专旺格靠"旺气一路到底"成立——喜顺势而为（食伤泄秀、印比助势），最忌官杀来犯、行运逆旺，逆势则格局立破。';
  if (g.includes('从')) return '从格靠"顺从旺神"成立——喜顺从所从之神（从财喜财与食伤，从官喜官与财），最忌印比来犯：运逢印比多有反复，是这类命最大的坎。';
  if (g.includes('天元一气')) return '天元一气靠"天干纯一、地支有根有泄"成立——喜地支通气不杂乱，忌地支互冲互战，气散则格败。';
  if (g.includes('魁罡')) return '魁罡靠"身旺有力"成立——喜运行身旺与财官之乡，最忌刑冲，罡逢冲则破（性格与运势都会走极端）。';
  if (g.includes('日贵')) return '日贵靠"贵人星不被破坏"成立——喜支中无刑冲、不见空亡，贵人星一破，贵气就打折。';
  if (g.includes('金神')) return '金神靠"火来制伏"成大器——柱见丙丁或巳午火则才华落地，无火则刚烈之气难以安放，宜走技术、军警、竞技类硬赛道。';
  if (g.includes('建禄')) return '建禄格身旺是本钱也是负担——喜财官食伤把旺气泄出去（做功），最忌再逢印比：旺而无出路，力气都耗在内耗与人争上。';
  if (g.includes('羊刃') || g.includes('禄格') && g.includes('刃')) return '羊刃格喜官杀制刃、喜财星化泄——刃有制则为权、为魄力；刃无制则冲动、伤身、易树敌。';
  if (g.includes('正官')) return '正官格喜财来生官、印来护官，身能任官则贵——最忌伤官见官（去官）与刑冲，官星一破，格就散了。';
  if (g.includes('七杀')) return '七杀格喜印星化杀或食神制杀，杀有制化即化为权柄——最忌杀重无制、身弱硬扛。';
  if (g.includes('正印') || g.includes('偏印')) return '印格喜官杀来生印、身弱赖印生扶——最忌财星坏印：印一被财伤，福基动摇。';
  if (g.includes('正财') || g.includes('偏财')) return '财格喜食伤生财、身强才能任财——忌比劫夺财，忌财多身弱（钱多但扛不住，反成负担）。';
  if (g.includes('食神')) return '食神格喜身强、喜财来承接，是"才艺生财"的路子——最忌偏印（枭神）夺食，才华被压住使不出来。';
  if (g.includes('伤官')) return '伤官格喜佩印约束或生财转化，才华方成器——最忌见官无制（伤官见官），是非与祸端多由此起。';
  return '格局不显时以用神为纲：用神有力则平中见顺，用神受伤则事倍功半——先护住用神，再谈提升。';
}

export function analyzeMingGeDetailed(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
  wxStats: Record<string, { count: number; level: string }>,
  yongShen: string[] = [],
): MingGeDetailed {
  const monthZhi = pillars[1].diZhi;
  const details: string[] = [];
  let geName = '';
  let geType = '';
  let score = '';
  let desc = '';
  let basis: string[] = [];

  /** 统一出口：补齐依据链 + 要素对应表 + 成败关键 */
  const build = (): MingGeDetailed => {
    const tgs = pillars.map(p => p.tianGan);
    const tss = pillars.map(p => p.shiShen || '—');
    const cangGan = pillars[1].cangGan || [];
    const ssArr = (pillars[1].shiShenZhi || '').split('/').filter(Boolean);
    const keyFactors = [
      {
        factor: '月令',
        value: `${monthZhi}${cangGan.length ? `（藏 ${cangGan.join('、')}）` : ''}`,
        meaning: `格局的发动机——本气十神为${ssArr[0] || pillars[1].shiShen || '—'}，八格/专旺/化气/从格都从月令取`,
      },
      {
        factor: '天干透出',
        value: tgs.map((t, i) => `${t}(${tss[i]})`).join(' '),
        meaning: '决定格能否直接成立——本气透干优先取本气，本气未透改看余气，杂气月尤其如此',
      },
      {
        factor: '日主强弱',
        value: strengthLevel,
        meaning: strengthLevel === '身强' || strengthLevel === '身极强'
          ? '身强 → 走「扶抑」路线：以财官食伤泄耗为用，忌再添印比'
          : strengthLevel === '身弱' || strengthLevel === '身极弱'
            ? '身弱 → 走「扶抑／从化」路线：先看有无合从，再以印比帮扶为用'
            : '中和 → 以调候与格局喜忌为纲，取用灵活',
      },
      ...(yongShen.length ? [{
        factor: '用神',
        value: yongShen.join('、'),
        meaning: '使格局运转的关键——用神有力、不被伤，格局才"活"；用神受伤则格局空有架子',
      }] : []),
      {
        factor: '格局',
        value: `${geName}（${geType}·${score}）`,
        meaning: '以上要素综合推出的结论——月令定"取材"，透干定"成格"，强弱定"路线"',
      },
    ];
    return {
      geName, geType, score, desc, details,
      basis: [...basis, `综合：月令取${ssArr[0] || pillars[1].shiShen || '—'}、天干${tgs.some(t => cangGan.includes(t)) ? '有透' : '不透'}、日主${strengthLevel} → ${geName}（${score}）`],
      keyFactors,
      successKey: successKeyOf(geName, geType),
    };
  };

  // 1) 特殊外格
  const sp = specialGe(pillars, dayGan, strengthLevel);
  if (sp) {
    geName = sp.name; geType = sp.type; desc = sp.desc; score = '中上'; basis = sp.basis;
    details.push(`特殊外格：${sp.name}`);
    return build();
  }

  // 2) 禄刃格
  if (LU[dayGan] === monthZhi) {
    // 建禄格；比劫旺（天干比劫≥2 或地支与日主同气≥2）→ 建禄月劫格
    const biJie = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen)).length;
    const dayWx2 = TG_WX[dayGan] || '';
    const dzTongQi = pillars.filter(p => DZ_WX[p.diZhi] === dayWx2).length;
    const yueJie = biJie >= 2 || dzTongQi >= 2;
    geName = yueJie ? '建禄月劫格' : '建禄格';
    geType = '禄格'; score = '中上';
    desc = yueJie
      ? `日主${dayGan}禄位在${monthZhi}，月令建禄，且比劫${biJie}透干、地支${dayWx2}${dzTongQi}位，比劫成势，为建禄月劫格。身极强，独立自主，但易与人争财，需印星化劫、财官为用。`
      : `日主${dayGan}禄位在${monthZhi}，月令建禄，自身有根基，独立自主，通常身强。`;
    basis = yueJie
      ? [
        `查禄位表：日主${dayGan}之禄在${monthZhi}，与月令相同`,
        `再查比劫：天干比劫 ${biJie} 位、地支与日主同气 ${dzTongQi} 位，已成势`,
        '禄格见比劫成势 → 由建禄升格为建禄月劫格',
      ]
      : [
        `查禄位表：日主${dayGan}之禄在${monthZhi}，与月令相同`,
        `天干比劫 ${biJie} 位、地支同气 ${dzTongQi} 位，未成势`,
        '取建禄格（禄格正格，不升月劫）',
      ];
    details.push(yueJie
      ? `月支${monthZhi} = ${dayGan}之禄位，比劫${biJie}透/地支同气${dzTongQi}位 → 建禄月劫格`
      : `月支${monthZhi} = ${dayGan}之禄位 → 建禄格`);
  } else if (YANG_REN[dayGan] === monthZhi && TG_YIN_YANG[dayGan] === '阳') {
    // 羊刃格只论阳干（甲丙戊庚壬）：阳干帝旺为羊刃；阴干不论正羊刃，走普通八格
    geName = '羊刃格'; geType = '禄格'; score = '中上';
    desc = `月令${monthZhi}为日主${dayGan}之羊刃（阳干帝旺之地），羊刃主刚烈果决、行动力强，但需注意冲动。`;
    basis = [
      `查羊刃表：日主${dayGan}之刃在${monthZhi}，与月令相同`,
      `日主${dayGan}属阳干（甲丙戊庚壬）——羊刃只论阳干，阴干不论正羊刃`,
      '羊刃当令 → 取羊刃格',
    ];
    details.push(`月支${monthZhi} = ${dayGan}（阳干）之羊刃 → 羊刃格`);
  } else {
    // 3) 普通八格
    const bg = baGe(pillars, dayGan);
    if (bg) {
      geName = bg.name; geType = bg.type; desc = bg.desc;
      details.push(bg.detail);
      basis = bg.basis;
      score = (geName.includes('正官') || geName.includes('正印')) ? '中上' : '中等';
    } else {
      geName = '月令杂气'; geType = '普通格'; score = '中等';
      desc = `月令${monthZhi}藏干透出情况不构成标准八格，按普通格局论。`;
      const cg = pillars[1].cangGan || [];
      basis = [
        `月令${monthZhi}藏干为 ${cg.length ? cg.join('、') : '（缺藏干数据）'}`,
        '本气与余气的十神均不落在八格范围，或透干情况不足',
        '不取标准八格，按普通格局（月令杂气）论',
      ];
    }
  }

  // 4) 衍生格（覆盖评分与格名）
  const ys = yanShengGe(pillars, geName);
  if (ys) {
    const base = geName.replace(/（本气未透）/, '');
    geName = `${base}·${ys.name}`;
    score = ys.score;
    basis = [...basis, `组合层检视：${ys.detail}`, `故在${base}之上叠加「${ys.name}」，层次定为${ys.score}`];
    details.push(ys.detail);
  }

  details.push(`格局层次：${score}`);
  return build();
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
