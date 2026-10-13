// ========== 合盘「当年走势」动态层 ==========
//
// 为什么必须与 160 分分开（这段是本模块存在的理由，改之前先读）：
//   合盘 160 分是**静态**的——两人出生那一刻就定死，任何时候打开都是同一个数，
//   档位 118/103/85 是在 400 对静态盘上按 p90/p55/p15 标定的。
//   一旦把"大运流年"塞进总分，分数就会随年份漂移：今天 112、明年 98，
//   用户读到的不是"今年要注意"，而是"我们是不是不合了"——
//   而且档位锚点每年都在动，hepanCalibration.test.ts 的区间断言必然失效。
//   所以动态层是**独立的一层**：只出"这一年的关系主题 / 风险点 / 契机点"，
//   不进总分、不改总分。
//
// 另一条硬约束：大运是**各人自己的**，两个人之间不存在中立的"关系盘"。
//   要压成单一分数，就得人为规定"A 的大运权重 × B 的大运权重"——
//   这个权数既无经典依据，样本上也标定不出来（2 人 × N 步大运，自由度爆炸）。
//   故本层只出**档位（顺 / 平 / 需留意）+ 双视角描述**，不出分数。
//
// 判据（都是"判据"而不是"分数"，因此可以用穷举测试钉死，不受分布漂移影响）：
//   1. 双方配偶宫（日支）被岁运如何引动：都合 / 都冲 / 一冲一合（节奏错位）；
//   2. 感情星：男命以财为妻星、女命以官杀为夫星——双方同时被引动即姻缘窗口；
//   3. 双方当前大运对各自命局是顺是逆（外部环境是否配合）；
//   4. 流年桃花（红鸾 / 天喜 / 咸池）是否正落在**对方**命局上。

import type { PillarData } from '../pages/Bazi';
import { ganZhiOfYear } from './liunianReading';
import {
  PEACH_TABLES,
  analyzeDayunFlow,
  analyzeLiunianFlow,
  type FlowInteraction,
} from './liunianInteraction';

export type FlowLevel = '顺' | '平' | '需留意';

/** 合盘动态层的单方输入（比 PersonChart 更窄：只要排盘结果与性别） */
export interface HePanFlowPartyInput {
  name: string;
  pillars: PillarData[];
  dayGan: string;
  dayWx: string;
  yongShen?: string[];
  strengthLevel?: string;
  /** 'male' | 'female' | '男' | '女' */
  gender?: string;
  /**
   * 当前大运干支（由 personChart.currentDayunOf 取得）。未起运时传 '' 或省略——
   * ⚠️ 不要在此处自行按周岁/虚岁去猜当前大运，端点口径见 dayunReading。
   */
  dayunGanZhi?: string;
}

export interface HePanFlowParty {
  name: string;
  /** 流年互动（含影响领域、冲合刑害、桃花、感情小结） */
  liunian: FlowInteraction;
  /** 当前大运互动（未起运时为 null） */
  dayun: FlowInteraction | null;
  dayunGanZhi: string;
  /** 该方这一年的头一句话 */
  summary: string;
}

export interface HePanFlowResult {
  year: number;
  ganZhi: string;
  level: FlowLevel;
  /** 年度主题短语 */
  theme: string;
  /** 双方各自的互动明细 */
  mine: HePanFlowParty;
  partner: HePanFlowParty;
  risks: string[];
  opportunities: string[];
  /** 双方同时被引动的点（共振） */
  resonance: string[];
  /** 必须展示给用户：本层不参与缘分总分 */
  notice: string;
}

const NOTICE =
  '这一层只看"今年怎么走"，不参与上方的缘分总分——总分是静态的，任何年份打开都是同一个数。';

function isMale(gender?: string): boolean {
  if (!gender) return false;
  const g = gender.toLowerCase();
  return g === 'male' || g === '男' || g === 'm';
}

/** 配偶宫被"扰动"（冲、刑、害、伏吟都算；合不算扰动） */
const DISTURBED = new Set(['六冲', '相刑', '相害', '伏吟']);

/** 该方在流年的"感情星"是否被引动：男命看财（妻星），女命看官杀（夫星） */
function loveStarActive(f: FlowInteraction, male: boolean): boolean {
  return male ? f.relation === 'cai' : f.relation === 'guansha';
}

/** 该方在流年的"自我优先"之气：男命比劫（争），女命食伤（挑剔） */
function frictionActive(f: FlowInteraction, male: boolean): boolean {
  return male ? f.relation === 'bijie' : f.relation === 'shishang';
}

/** 大运对自身命局的净方向：顺的领域数 − 需留意的领域数 */
function dayunTone(dy: FlowInteraction | null): number {
  if (!dy) return 0;
  const good = dy.domains.filter((d) => d.level === '顺').length;
  const bad = dy.domains.filter((d) => d.level === '需留意').length;
  return good - bad;
}

function buildParty(input: HePanFlowPartyInput, year: number, gz: string): HePanFlowParty {
  const chart = {
    pillars: input.pillars,
    dayGan: input.dayGan,
    dayWx: input.dayWx,
    yongShen: input.yongShen,
    strengthLevel: input.strengthLevel,
    gender: input.gender,
  };
  const liunian = analyzeLiunianFlow(year, chart, gz);
  const ganZhi = input.dayunGanZhi && input.dayunGanZhi !== '—' ? input.dayunGanZhi : '';
  const dayun = ganZhi ? analyzeDayunFlow(ganZhi, chart, '当前大运') : null;
  return {
    name: input.name,
    liunian,
    dayun,
    dayunGanZhi: ganZhi,
    summary: liunian.headline,
  };
}

/**
 * 合盘动态层：给定双方排盘结果与年份，输出这一年的关系走势。
 *
 * ⚠️ 阈值（±3）与各条加权的含义写在下面对应分支的注释里。若要改权重，
 * 请同时改 __tests__/hepanFlow.test.ts 的用例——那里刻意钉了"双方都合配偶宫 → 顺"
 * 与"双方配偶宫都被冲 → 需留意"两类边界。
 */
export function analyzeHePanFlow(input: {
  mine: HePanFlowPartyInput;
  partner: HePanFlowPartyInput;
  year: number;
}): HePanFlowResult {
  const { mine, partner, year } = input;
  const { zhi: yearZhi, ganZhi } = ganZhiOfYear(year);

  const m = buildParty(mine, year, ganZhi);
  const p = buildParty(partner, year, ganZhi);

  let score = 0;
  const risks: string[] = [];
  const opportunities: string[] = [];
  const resonance: string[] = [];

  // ---------- 1. 配偶宫（日支）被岁运如何引动 ----------
  const ms = m.liunian.spousePalace;
  const ps = p.liunian.spousePalace;
  const mDist = DISTURBED.has(ms);
  const pDist = DISTURBED.has(ps);

  if (ms === '六冲' && ps === '六冲') {
    score -= 2;
    risks.push('两人的配偶宫今年**同时被冲**——关系整体处在"要重新摆一次位置"的状态：搬迁、异地、家庭变动或必须做的决定，都容易挤在同一年。别把外部变动误读成感情本身出了问题。');
  } else if (mDist && ps === '六合') {
    score -= 1;
    risks.push('你这边被冲动、对方那边却被合住——一个想变、一个想稳，节奏会明显错位。先对齐"要不要动"，再谈怎么动。');
  } else if (ms === '六合' && pDist) {
    score -= 1;
    risks.push('对方那边被冲动、你这边被合住——同样是一冲一合的节奏错位，只是方向相反：对方更想改变现状，你更想维持原样，别把这种差异读成"不爱了"。');
  } else if (ms === '六合' && ps === '六合') {
    score += 2;
    opportunities.push('两人的配偶宫今年**同时被合**——这是合盘里最像"关系往前走一步"的组合：成家、同居、见家长、复合，都容易在这一年落定。');
  } else if (ms === '六合' || ps === '六合') {
    score += 1;
    opportunities.push('其中一方的配偶宫被合（姻缘被牵动），另一方顺着这股力回应，进展会比预想快。');
  } else if (mDist || pDist) {
    score -= 1;
    risks.push('一方的配偶宫被引动（冲/刑/害），情绪起伏与外界变动会多一些——另一方宜多给一点确定性（明确的时间、明确的答复），比安慰更有用。');
  } else {
    opportunities.push('双方配偶宫今年都没有直接冲合，关系主线是"维持节奏"——不折腾，就是最好的经营。');
  }

  // ---------- 2. 感情星（男看财、女看官杀） ----------
  const mMale = isMale(mine.gender);
  const pMale = isMale(partner.gender);
  const mStar = loveStarActive(m.liunian, mMale);
  const pStar = loveStarActive(p.liunian, pMale);
  if (mStar && pStar) {
    score += 2;
    opportunities.push('双方今年的**感情星同时被引动**（男命看财星、女命看官杀）——这是合盘里最接近"婚恋窗口"的年份组合，别只是顺其自然。');
    resonance.push('感情星双动：两人都在被"关系议题"推着走。');
  } else if (mStar || pStar) {
    score += 1;
    opportunities.push('一方的感情星今年被引动，那一方会明显更想推进关系，另一方的回应是这一年关系走势的关键。');
  }

  // ---------- 3. 自我优先之气（男比劫 / 女食伤） ----------
  if (frictionActive(m.liunian, mMale) && frictionActive(p.liunian, pMale)) {
    score -= 1;
    risks.push('两人今年都走"自我优先"的气（男命比劫、女命食伤）——嘴上容易赢，关系上容易输。吵架时留一步，比讲赢道理有用。');
  }

  // ---------- 4. 大运是否同向 ----------
  const mt = dayunTone(m.dayun);
  const pt = dayunTone(p.dayun);
  if (m.dayun && p.dayun) {
    if (mt > 0 && pt > 0) {
      score += 1;
      opportunities.push(`两人当前大运（你走${m.dayun.ganZhi}、对方走${p.dayun.ganZhi}）都对自身命局偏顺——外部环境配合，适合共同做长期决定（买房、结婚、换城市）。`);
      resonance.push('大运同向：外部环境同时支持两人。');
    } else if (mt < 0 && pt < 0) {
      score -= 1;
      risks.push(`两人当前大运都在自我调整期（你走${m.dayun.ganZhi}、对方走${p.dayun.ganZhi}）——各自的压力容易顺到关系上，别把"我最近很累"听成"我对你没兴趣"。`);
    } else if (mt !== pt && (mt < 0 || pt < 0)) {
      risks.push('两人大运一顺一逆：顺利的一方容易觉得"你不理解我"，吃力的一方容易觉得"你站着说话不腰疼"。这一年的功课是把各自的处境讲清楚，而不是比谁更累。');
    }
  }

  // ---------- 5. 流年桃花是否落在对方命局 ----------
  const hongLuanZhi = PEACH_TABLES.hongLuan[yearZhi] || '';
  const tianXiZhi = PEACH_TABLES.tianXi[yearZhi] || '';
  const xianChiZhi = PEACH_TABLES.xianChi[yearZhi] || '';
  const onPartner = (zhi: string) => !!zhi && partner.pillars.some((x) => x.diZhi === zhi);
  const onMine = (zhi: string) => !!zhi && mine.pillars.some((x) => x.diZhi === zhi);
  if (hongLuanZhi && (onPartner(hongLuanZhi) || onMine(hongLuanZhi))) {
    score += 1;
    opportunities.push(`今年红鸾落在${onPartner(hongLuanZhi) ? '对方' : '你'}命局（${hongLuanZhi}）——是"喜事位"，有推进打算的话，这一年提出来比往年顺。`);
  }
  if (tianXiZhi && (onPartner(tianXiZhi) || onMine(tianXiZhi))) {
    opportunities.push(`今年天喜落在${onPartner(tianXiZhi) ? '对方' : '你'}命局（${tianXiZhi}）——添丁、定亲、好消息一类的事，容易在这一年出现。`);
  }
  if (xianChiZhi && onPartner(xianChiZhi) && onMine(xianChiZhi)) {
    score -= 1;
    risks.push('今年咸池（桃花）同时落在两人命局——外缘旺，容易被外部的注意力分心。不是必然出事，但这一年的边界感要自己立。');
  }

  // ---------- 档位 ----------
  const level: FlowLevel = score >= 3 ? '顺' : score <= -3 ? '需留意' : '平';

  const themeMap: Record<FlowLevel, string> = {
    '顺': '推进之年',
    '平': '平稳之年',
    '需留意': '磨合之年',
  };
  const leadMap: Record<FlowLevel, string> = {
    '顺': '两人的节奏、外部环境与感情信号今年都偏正面，适合把关系往前推一步。',
    '平': '今年没有明显的大顺或大坎，重点在把日常的沟通与相处节奏稳住。',
    '需留意': '今年关系容易同时受到外部变动与情绪起伏的影响，务必把"人"和"事"分开谈。',
  };
  const theme = `${year} ${ganZhi}年 · ${themeMap[level]}`;

  return {
    year,
    ganZhi,
    level,
    theme,
    mine: m,
    partner: p,
    risks,
    opportunities: [leadMap[level], ...opportunities],
    resonance,
    notice: NOTICE,
  };
}
