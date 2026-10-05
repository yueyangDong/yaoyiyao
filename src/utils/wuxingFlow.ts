// ========== 五行流通分析 ==========
//
// 解决的问题：页面此前只有「五行旺衰统计」（静态数量），没有「生克与流通」分析——
// 命局之气是否周流、在哪一行断掉、两行相战有没有通关，用户完全看不到。
//
// 口径说明：
// - 计数与页面原 calcWuxingStats 完全同源（天干+1、地支本气+1、每个藏干+1）。
//   该函数已从 Bazi.tsx 迁移至此，页面改为 import 本模块——消除双实现漂移风险。
// - 流通是「全局视角」，与用神（日主视角）互补：断点补行若恰是用神，会显式提示同向。
//
// 判定规则（阈值皆为经验值，改前先跑 wuxingFlow.test.ts）：
// - 相生环按 木→火→土→金→水→木 逐链评估，四态：畅通 / 偏弱 / 壅塞 / 断链。
//   · 源头行为 0 → 断链（无源）；承接行为 0 → 断链（气无处泄）。
//   · 源头占比 ≥40% 且承接 ≤8% → 壅塞（气堵在源头一行）。
//   · 任一端占比 ≤8% → 偏弱（生路走得细）。
// - 相克看「两强相战」：两行都在且合计占比够高（≥25%/≥20%）才入场；
//   通关行 = 源头所生之行（木克土→火通关，土克水→金通关……恒成立）。
//   通关行有力 → 贪生忘克（战局化生）；缺或太薄 → 克性直接落地。
// - 归聚点：最旺一行占比 ≥45% 才成立，并与日主（生/克/被克）给关系结论。

import type { PillarData } from '../pages/Bazi';

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
export const WX_ORDER = ['木', '火', '土', '金', '水'] as const;
export const SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
export const KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

/**
 * 五行旺衰统计（自 Bazi.tsx 原样迁移，口径不变）。
 * 返回每行 { count, level(旺/适中/弱/缺), desc }。
 */
export function calcWuxingStats(pillars: PillarData[]): Record<string, { count: number; level: string; desc: string }> {
  const wxCount: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

  for (const p of pillars) {
    const tg = p.tianGan;
    const dz = p.diZhi;
    if (TG_WX[tg]) wxCount[TG_WX[tg]]++;
    if (DZ_WX[dz]) wxCount[DZ_WX[dz]]++;
    if (p.cangGan) {
      for (const cg of p.cangGan) {
        const gan = cg.charAt(0);
        if (TG_WX[gan]) wxCount[TG_WX[gan]]++;
      }
    }
  }

  const counts = Object.values(wxCount);
  const total = counts.reduce((a, b) => a + b, 0);
  const avg = total / 5;
  const maxCount = Math.max(...counts, 1);
  const result: Record<string, { count: number; level: string; desc: string }> = {};
  for (const [wx, count] of Object.entries(wxCount)) {
    let level = '适中';
    let desc = '';
    if (count === 0) { level = '缺'; desc = `命局中缺${wx}，不代表没有${wx}的能量，而是在大运流年中遇到${wx}时会特别明显。`; }
    // 旧阈值 count >= maxCount*0.7 会让「五行均衡」的盘全部判旺；改为与全局均值比较。
    else if (count === maxCount && count > avg * 1.2) { level = '旺'; desc = `${wx}比较旺，注意不要过犹不及，追求平衡。`; }
    else if (count < avg * 0.7) { level = '弱'; desc = `${wx}偏弱，需要对应的五行来补充和扶持。`; }
    result[wx] = { count, level, desc };
  }
  return result;
}

export type FlowLinkState = '畅通' | '偏弱' | '壅塞' | '断链';

export interface WuxingFlowLink {
  from: string;
  to: string;
  state: FlowLinkState;
  note: string;
}

export interface WuxingFlowBridge {
  /** 主动克方 */
  a: string;
  /** 被克方 */
  b: string;
  /** 通关行（a 生 via、via 生 b，恒等于 SHENG[a]） */
  via: string;
  state: '通关' | '通关乏力';
  note: string;
}

export interface WuxingFlowResult {
  rating: '周流不息' | '流通顺畅' | '基本流通' | '局部受阻' | '严重断流';
  summary: string;
  links: WuxingFlowLink[];
  bridges: WuxingFlowBridge[];
  /** 归聚点（最旺一行占比 ≥45% 才成立）与日主的关系解读 */
  converge: { wx: string; note: string } | null;
  /** 命局中完全缺失的五行（按木火土金水顺序），供大运应期等下游消费 */
  missing: string[];
  tips: string[];
}

/**
 * 五行流通分析：生克链路评估 + 相战通关 + 归聚点 + 疏通建议。
 * @param pillars 四柱
 * @param dayWx 日主五行
 * @param yongShen 用神五行（可选）——断点补行与用神同向时显式提示
 */
export function analyzeWuxingFlow(pillars: PillarData[], dayWx: string, yongShen?: string[]): WuxingFlowResult {
  const stats = calcWuxingStats(pillars);
  const counts: Record<string, number> = {};
  for (const [wx, s] of Object.entries(stats)) counts[wx] = s.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const share = (wx: string) => counts[wx] / total;
  const present = WX_ORDER.filter((w) => counts[w] > 0);
  const missing = WX_ORDER.filter((w) => counts[w] === 0);

  // ---- 相生环逐链评估（顺序即循环顺序：木→火→土→金→水→木）----
  const links: WuxingFlowLink[] = WX_ORDER.map((from) => {
    const to = SHENG[from];
    const cA = counts[from];
    const cB = counts[to];
    if (cA === 0) {
      return { from, to, state: '断链' as const, note: `全局无${from}，${from}生${to}这条线是虚设` };
    }
    if (cB === 0) {
      return { from, to, state: '断链' as const, note: `${from}（${cA}个）想生${to}，但全局${to}几乎不见——气行至${from}就囤住，泄不下去` };
    }
    const sA = share(from);
    const sB = share(to);
    if (sA >= 0.4 && sB <= 0.08) {
      return { from, to, state: '壅塞' as const, note: `${from}独大（占比${Math.round(sA * 100)}%），${to}（${cB}个）承接不动，气堵在${from}一行` };
    }
    if (sB <= 0.08) {
      return { from, to, state: '偏弱' as const, note: `${to}仅${cB}个（多为藏干余气），承接偏弱，这条生路走得细` };
    }
    if (sA <= 0.08) {
      return { from, to, state: '偏弱' as const, note: `${from}源头仅${cA}个，生${to}的力度不足` };
    }
    return { from, to, state: '畅通' as const, note: `${from}（${cA}）生${to}（${cB}）一路无阻` };
  });

  // ---- 主流通链（最长连续畅通段，不跨环）----
  let bestRun: string[] = [];
  for (let i = 0; i < links.length; i++) {
    if (links[i].state !== '畅通') continue;
    const run = [links[i].from, links[i].to];
    let j = i + 1;
    while (j < links.length && links[j].state === '畅通') {
      run.push(links[j].to);
      j++;
    }
    if (run.length > bestRun.length) bestRun = run;
  }
  const mainPath = bestRun.length >= 2 ? bestRun.join('→') : '';

  // ---- 相克通关（只取合计占比最高的前两对，避免噪声）----
  const pairs = WX_ORDER
    .map((a) => ({ a, b: KE[a] }))
    .filter(({ a, b }) => counts[a] > 0 && counts[b] > 0 && share(a) >= 0.25 && share(b) >= 0.2)
    .sort((x, y) => (share(y.a) + share(y.b)) - (share(x.a) + share(x.b)))
    .slice(0, 2);
  const bridges: WuxingFlowBridge[] = [];
  for (const { a, b } of pairs) {
    const via = SHENG[a]; // a 生 via、via 生 b（五行环恒成立）
    if (counts[via] === 0) {
      bridges.push({
        a, b, via, state: '通关乏力',
        note: `${a}克${b}（两行合计占${Math.round((share(a) + share(b)) * 100)}%），通关要靠${via}，但全局无${via}——克性直接落地；行${via}运（大运流年见${via}）是化战为生的窗口期`,
      });
    } else if (share(via) <= 0.1) {
      bridges.push({
        a, b, via, state: '通关乏力',
        note: `${a}与${b}相战，${via}虽在但力量太薄（${counts[via]}个），通关不畅，${a}克${b}仍会显形`,
      });
    } else {
      bridges.push({
        a, b, via, state: '通关',
        note: `${a}与${b}两强相见，${via}居中通关（贪生忘克）——克战化为相生，全局反而因战得流`,
      });
    }
  }

  // ---- 归聚点与日主关系 ----
  const maxWx = WX_ORDER.reduce((m, w) => (counts[w] > counts[m] ? w : m), '木' as string);
  const maxShare = share(maxWx);
  let converge: WuxingFlowResult['converge'] = null;
  if (maxShare >= 0.45) {
    let role: string;
    if (maxWx === dayWx) {
      role = `气聚日主${dayWx}——主观能动性强，命局主动权在你手里，但要防一旺独大、听不进人言`;
    } else if (SHENG[maxWx] === dayWx) {
      role = `气聚${maxWx}而生你（${dayWx}）——大环境顺势喂到嘴边，接住即可`;
    } else if (KE[maxWx] === dayWx) {
      role = `气聚${maxWx}而克你（${dayWx}）——全局压力偏向你这边，宜借势化解而非硬顶`;
    } else if (KE[dayWx] === maxWx) {
      role = `气聚${maxWx}，由你（${dayWx}）所克——全局资源池归你调度，能不能用好看身板`;
    } else {
      role = `气聚${maxWx}、由你（${dayWx}）所生——你不断向外输出，记得留一点给自己`;
    }
    converge = { wx: maxWx, note: `五行之气最终汇聚于「${maxWx}」（占比${Math.round(maxShare * 100)}%）。${role}` };
  }

  // ---- 总评 ----
  const brokenN = links.filter((l) => l.state === '断链').length;
  const weakN = links.filter((l) => l.state === '偏弱' || l.state === '壅塞').length;
  let rating: WuxingFlowResult['rating'];
  if (missing.length >= 2) rating = '严重断流';
  else if (missing.length === 1) rating = '局部受阻';
  else if (weakN === 0) rating = maxShare <= 0.35 ? '周流不息' : '流通顺畅';
  else rating = '基本流通';

  const missText = missing.length ? `缺${missing.join('、')}` : `五行齐全（${present.join('、')}俱在）`;
  const blockText = brokenN ? `，断点${brokenN}处` : weakN ? `，承接偏弱${weakN}处` : '';
  const pathText = mainPath ? `主流通路线：${mainPath}。` : '相生环上没有一段完整畅通的路线。';
  const summary = `命局${missText}${blockText}。${pathText}${converge ? converge.note + '。' : ''}综合评级：${rating}。`;

  // ---- 疏通建议 ----
  const ys = yongShen || [];
  const tips: string[] = [];
  for (const l of links) {
    if (l.state === '断链' && counts[l.from] > 0 && counts[l.to] === 0) {
      const same = ys.includes(l.to);
      tips.push(
        same
          ? `补「${l.to}」最能疏通命局——${l.from}之气有了去处，且${l.to}正是你的用神，顺势补即可`
          : `补「${l.to}」最能疏通命局：让${l.from}的气有处可泄（注意与用神方向权衡，以用神为先）`,
      );
    } else if (l.state === '壅塞') {
      tips.push(`「${l.from}」一行壅塞：宜补「${l.to}」分洪泄秀，或以「${KE[l.from]}」适度修剪其势`);
    }
  }
  for (const b of bridges) {
    if (b.state === '通关乏力') {
      tips.push(`「${b.a}」克「${b.b}」缺通关：${b.via}是化战为和的关键一行，逢${b.via}运宜主动布局`);
    }
  }
  if (tips.length === 0) {
    tips.push('五行流通尚顺，无断点无壅塞——大运流年顺其自然走，不必刻意补泄');
  }

  return { rating, summary, links, bridges, converge, missing, tips };
}

// ========== 大运应期：流通断点何时补上 ==========

export interface DayunFlowAnnotation {
  /** 与 steps 逐项对齐：该步大运的流通注记（无注记为空数组，每步至多 2 条） */
  stepNotes: string[][];
  /** 断点/战局的第一个补上时点汇总（供流通卡「大运应期」展示） */
  firstFix: string[];
}

/**
 * 把命局的流通断点（缺行断链 / 通关乏力 / 壅塞）映射到各步大运：
 * - 缺行见之于大运干支 → 该运是「补齐断链、流通激活」的窗口期；
 * - 通关行见之于大运干支 → 该运「通关得力」，相战化于生；
 * - 壅塞行再现于大运干支 → 提示「壅塞可能加剧」。
 */
export function annotateDayunFlow(
  steps: { ganZhi: string; startAge?: number; endAge?: number }[],
  flow: WuxingFlowResult,
): DayunFlowAnnotation {
  const wxOf = (gz: string): string[] => {
    const out: string[] = [];
    if (TG_WX[gz[0]]) out.push(TG_WX[gz[0]]);
    if (DZ_WX[gz[1]] && DZ_WX[gz[1]] !== TG_WX[gz[0]]) out.push(DZ_WX[gz[1]]);
    return out;
  };
  const weakBridges = flow.bridges.filter((b) => b.state === '通关乏力');
  const jammed = flow.links.filter((l) => l.state === '壅塞').map((l) => l.from);
  const rangeOf = (s: { startAge?: number; endAge?: number }) =>
    s.startAge !== undefined && s.endAge !== undefined ? `${s.startAge}~${s.endAge}岁` : '';

  const stepNotes = steps.map((s) => {
    const wxs = wxOf(s.ganZhi || '');
    const notes: string[] = [];
    for (const wx of wxs) {
      if (flow.missing.includes(wx)) {
        notes.push(`见${wx}，补齐断链——流通激活的窗口期`);
        break;
      }
    }
    for (const b of weakBridges) {
      if (wxs.includes(b.via)) {
        notes.push(`见${b.via}，通关得力——${b.a}克${b.b}之战争化于生`);
        break;
      }
    }
    if (notes.length < 2) {
      for (const wx of wxs) {
        if (jammed.includes(wx)) {
          notes.push(`再逢${wx}，壅塞可能加剧——${wx}所主之事过犹不及`);
          break;
        }
      }
    }
    return notes.slice(0, 2);
  });

  const firstFix: string[] = [];
  for (const wx of flow.missing) {
    const idx = steps.findIndex((s) => wxOf(s.ganZhi || '').includes(wx));
    firstFix.push(
      idx >= 0
        ? `「${wx}」断链：${steps[idx].ganZhi}运（${rangeOf(steps[idx])}）见${wx}，是流通激活的窗口期`
        : `「${wx}」断链：这几步大运中未见补齐，宜主动补${wx}`,
    );
  }
  for (const b of weakBridges) {
    const idx = steps.findIndex((s) => wxOf(s.ganZhi || '').includes(b.via));
    firstFix.push(
      idx >= 0
        ? `「${b.a}克${b.b}」之战争：${steps[idx].ganZhi}运（${rangeOf(steps[idx])}）逢${b.via}通关，战局化生的窗口期`
        : `「${b.a}克${b.b}」之战争：这几步大运中未见通关，宜主动以${b.via}调和`,
    );
  }

  return { stepNotes, firstFix };
}
