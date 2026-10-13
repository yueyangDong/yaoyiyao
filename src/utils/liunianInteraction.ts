// ========== 岁运（流年 / 大运）与命局的互动 · 判据层 ==========
//
// 补的是什么：
//   liunianReading.ts 只做「流年天干五行 vs 日主」的生克——天干大方向有了，
//   **地支一个字都没参与判断**。于是"丙午年冲子""午与未合""卯酉冲月支"
//   这类用户问得最多、也最有实操意义的互动根本算不出来。
//   本模块补上地支层（冲 / 合 / 三合 / 三会 / 刑 / 害）与伏吟 / 反吟 / 天干五合，
//   并把每个互动落到「命局哪一柱 → 哪个人生领域」，再按用神 / 忌神定向吉凶。
//
// 与谁共用：
//   · 冲合刑害与三合三会判据 → diZhiRelations（地支关系**唯一出口**）；
//   · 忌神推导             → wuXingRelations.deriveJiShen（与合盘同一份，扶抑法）；
//   · 十神                 → wuXingRelations.tenGodOf。
//   八字页「流年（十年）」卡片与合盘「今年关系走势」共用本模块，避免两套口径。
//
// ⚠️ 本模块只出**判据与文字**，不出分数。合盘 160 分的档位是静态分布的锚点，
//   不能被"随年份变动"的量污染——理由见 docs/liunian-interaction.md。
//
// ⚠️ 大运与流年用**同一个函数**（analyzeGanZhiInteraction）：二者对命局的作用机制相同，
//   区别只在时间跨度（十年 vs 一年）与是否"当令"。不要为大运另写一套。

import type { PillarData } from '../pages/Bazi';
import {
  DZ_WANG,
  DZ_WX,
  isChong,
  isHai,
  isLiuHe,
  isXing,
  sanheGroupOf,
  sanhuiGroupOf,
} from './diZhiRelations';
import {
  GAN_WX,
  SHISHEN_DOMAIN,
  WX_KE,
  deriveJiShen,
  relationKindOfShiShen,
  tenGodOf,
  type RelationKind,
} from './wuXingRelations';

export type Tone = 'good' | 'bad' | 'neutral';

export type InteractionKind =
  | '六冲'
  | '六合'
  | '三合'
  | '三会'
  | '相刑'
  | '相害'
  | '伏吟'
  | '反吟'
  | '天干五合';

/** 柱位 → 人生领域。键必须与 PillarData.pillar 的值严格一致 */
export const PILLAR_DOMAIN: Record<string, string> = {
  '年柱': '长辈与外部环境',
  '月柱': '事业与家庭根基',
  '日柱': '自身与配偶宫',
  '时柱': '子女与居所',
};

export interface FlowHit {
  kind: InteractionKind;
  /** 命局侧柱位（'年柱'…'时柱'；三合/三会跨柱时用 '/' 连接） */
  pillar: string;
  /** 命局侧的字（地支或天干；多个用 '/' 连接） */
  char: string;
  /** 影响领域（取自 PILLAR_DOMAIN） */
  domain: string;
  /** 是否落在配偶宫（日柱）——感情的第一指标 */
  spousePalace: boolean;
  /** 相对用神/忌神的方向；'neutral' 表示该字既非用神也非忌神 */
  tone: Tone;
  text: string;
}

export interface DomainImpact {
  domain: string;
  level: '顺' | '平' | '需留意';
  notes: string[];
}

export interface PeachHit {
  name: '红鸾' | '天喜' | '咸池';
  /** 该桃花星在流年所落的地支（合盘要拿它去比对**对方**命局，故必须带上） */
  branch: string;
  /** 落在自己命局哪一柱（未落柱时为空串） */
  pillar: string;
  tone: Tone;
  text: string;
}

export interface FlowInteraction {
  ganZhi: string;
  label: string;
  /** 该结果对应的时间尺度（供调用方选择措辞，如"这一年/这个月/这一天"） */
  era: FlowEra;
  /** 岁运天干对日主的十神（正官/七杀/正财…） */
  shiShen: string;
  /** 十神大类 */
  relation: RelationKind | null;
  /** 该十神管什么 */
  shiShenDomain: string;
  hits: FlowHit[];
  domains: DomainImpact[];
  peach: PeachHit[];
  /** 配偶宫（日支）今年被如何引动 */
  spousePalace: '六冲' | '六合' | '相刑' | '相害' | '伏吟' | '无';
  /** 感情向总结（含性别相关的夫星/妻星口径） */
  loveNote: string;
  /** 一句话总览 */
  headline: string;
}

export interface FlowChartLike {
  pillars: PillarData[];
  dayGan: string;
  dayWx: string;
  /** 用神五行列表（baziAnalysis.recommendYongShen 口径） */
  yongShen?: string[];
  /** 旺衰档（身强/身弱/中和…），缺省时不做喜忌定向 */
  strengthLevel?: string;
  /** 'male' | 'female' | 中文字面量 */
  gender?: string;
}

/**
 * 时间尺度。决定文案里的时间词（今年 / 这十年 / 本月 / 今日）。
 * ⚠️ 必须区分——直接把流年文案套到大运上会写出"这步运今年最动"这种说不通的句子；
 *   套到流日上更荒谬（"流日甲木为财，今年感情机会与家庭议题容易同时出现"）。
 */
export type FlowEra = 'year' | 'decade' | 'month' | 'day';

export interface FlowInteractionInput extends FlowChartLike {
  /** 岁运干支，如 '丙午'（大运与流年同构；流月/流日同理） */
  ganZhi: string;
  /** 文案前缀，如 '2026年' / '当前大运' / '2026年10月' / '2026年10月13日' */
  label?: string;
  /** 时间尺度，默认 'year'（合盘动态层与流年卡是主要调用方）。 */
  era?: FlowEra;
}

/** 天干五合：甲己、乙庚、丙辛、丁壬、戊癸 */
const GAN_HE: Record<string, string> = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙',
  '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊',
};

/**
 * 流年桃花表（口诀，按**流年地支**起）。
 * 红鸾：子年卯、丑年寅、寅年丑、卯年子……（自卯位起、逆行）；
 * 天喜：红鸾的对冲位（子年酉、午年卯）；
 * 咸池（桃花）：按年支三合局取——申子辰见酉、寅午戌见卯、巳酉丑见午、亥卯未见子。
 */
const HONG_LUAN: Record<string, string> = {
  '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
  '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};
const TIAN_XI: Record<string, string> = {
  '子': '酉', '丑': '申', '寅': '未', '卯': '午', '辰': '巳', '巳': '辰',
  '午': '卯', '未': '寅', '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
};
const XIAN_CHI: Record<string, string> = {
  '申': '酉', '子': '酉', '辰': '酉',
  '寅': '卯', '午': '卯', '戌': '卯',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子',
};

/** 流年桃花表对外导出：合盘要拿"某一年的红鸾/天喜/咸池落什么地支"去比对**对方**命局 */
export const PEACH_TABLES = { hongLuan: HONG_LUAN, tianXi: TIAN_XI, xianChi: XIAN_CHI };

const PILLAR_ORDER = ['年柱', '月柱', '日柱', '时柱'];

/**
 * 四种时间尺度的时间词。放在一处，是因为「把流年措辞套到大运/流月/流日上」是本模块
 * 最容易出的错，而且错得很显眼（"这步运今年最动"）。四张表必须成组维护。
 */
const ERA_TIME_WORD: Record<FlowEra, string> = {
  year: '今年', decade: '这十年', month: '本月', day: '今日',
};
const ERA_SPAN_WORD: Record<FlowEra, string> = {
  year: '属平顺之年', decade: '属平顺的十年', month: '属平顺之月', day: '属平顺之日',
};
const ERA_NAME: Record<FlowEra, string> = {
  year: '流年', decade: '大运', month: '流月', day: '流日',
};
const ERA_PERIOD: Record<FlowEra, string> = {
  year: '这一年', decade: '这十年', month: '这个月', day: '这一天',
};

function isMale(gender?: string): boolean {
  if (!gender) return false;
  const g = gender.toLowerCase();
  return g === 'male' || g === '男' || g === 'm';
}

/** 合并同柱同类的多条互动，避免一张大运盘刷出十几行重复句式 */
function mergeHits(hits: FlowHit[]): FlowHit[] {
  const map = new Map<string, FlowHit>();
  for (const h of hits) {
    const key = `${h.kind}|${h.pillar}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, h);
      continue;
    }
    if (prev.char !== h.char && !prev.char.includes(h.char)) prev.char = `${prev.char}/${h.char}`;
  }
  return [...map.values()];
}

/**
 * 岁运（大运或流年）干支 × 命局四柱 → 互动清单。
 * 判据全部来自 diZhiRelations / wuXingRelations，本函数不含任何自留表。
 */
export function analyzeGanZhiInteraction(input: FlowInteractionInput): FlowInteraction {
  const { pillars, dayGan, dayWx, ganZhi, label = '', yongShen = [], strengthLevel, gender, era = 'year' } = input;
  const flowGan = ganZhi.charAt(0);
  const flowZhi = ganZhi.charAt(1);
  // 时间词全部集中在这里，避免 10 余处文案各写各的；把流年措辞套到别的尺度上会立刻露馅。
  const TW = ERA_TIME_WORD[era];
  const SPAN = ERA_SPAN_WORD[era];
  // 岁运本身的称呼（流年 / 大运 / 流月 / 流日），用于"流年甲木为财"这类句子
  const YU = ERA_NAME[era];
  // 该尺度下"一段时间"的说法，用于伏吟这类主"反复"的句子
  const PERIOD = ERA_PERIOD[era];
  const jiShen = deriveJiShen(dayWx, strengthLevel);

  const toneOf = (wx: string): Tone => {
    if (!wx) return 'neutral';
    if (yongShen.includes(wx)) return 'good';
    if (jiShen.includes(wx)) return 'bad';
    return 'neutral';
  };
  /**
   * 破坏性作用（冲 / 刑 / 害）的吉凶要**取反**：
   * 冲掉忌神是好事（去掉不利因素），冲伤用神才是坏事。
   * 若直接沿用 toneOf，"午冲子"在子水为忌神的盘上会被判成凶——方向是反的。
   * 合（六合/三合/三会）是牵引性作用，不取反：合住用神得助为吉，合住忌神被牵制为凶。
   */
  const brokenToneOf = (wx: string): Tone => {
    const t = toneOf(wx);
    return t === 'good' ? 'bad' : t === 'bad' ? 'good' : 'neutral';
  };

  const hits: FlowHit[] = [];
  const push = (
    kind: InteractionKind,
    pillar: string,
    char: string,
    tone: Tone,
    text: string,
  ) => {
    hits.push({
      kind,
      pillar,
      char,
      domain: PILLAR_DOMAIN[pillar] || '整体运势',
      spousePalace: pillar === '日柱',
      tone,
      text,
    });
  };

  // ---------- 地支层：逐柱比对 ----------
  // ⚠️ 这是一条 **else-if 链**：一柱地支只出**一条**最强关系，优先级
  //   冲 > 合 > 刑 > 害（与 shenShaPower 的制化系数顺序一致）。
  //   为什么必须定优先级：地支里确实存在"既冲又刑""既合又刑"的组合——
  //   丑未 / 寅申（六冲 + 三刑）、巳申（六合 + 三刑）、寅巳（相刑 + 相害）。
  //   两条一起输出会让"这一柱被怎样引动"变得含糊（冲是动、刑是磨，处理方式不同）。
  //   判据（哪一对该出哪一条）由 __tests__/liunianInteraction.test.ts 全量 12×12 扫描钉死。
  for (const p of pillars) {
    const zhi = p.diZhi;
    if (!zhi) continue;
    const pillar = p.pillar;
    if (isChong(flowZhi, zhi)) {
      push('六冲', pillar, zhi, brokenToneOf(DZ_WX[zhi]), `${label}${flowZhi}冲${zhi}（${pillar}）——${PILLAR_DOMAIN[pillar]}这块${TW}最"动"：容易有位置变动、关系张力，或必须表态的事。`);
    } else if (isLiuHe(flowZhi, zhi)) {
      push('六合', pillar, zhi, toneOf(DZ_WX[zhi]), `${label}${flowZhi}与${zhi}六合（${pillar}）——${PILLAR_DOMAIN[pillar]}有人牵、有人帮，事情容易"绑在一起"；利合作，也怕被绑定。`);
    } else if (isXing(flowZhi, zhi)) {
      push('相刑', pillar, zhi, brokenToneOf(DZ_WX[zhi]), `${label}${flowZhi}与${zhi}相刑（${pillar}）——${PILLAR_DOMAIN[pillar]}摩擦增多，多是口舌、细节上的不顺心，不至于伤筋动骨。`);
    } else if (isHai(flowZhi, zhi)) {
      push('相害', pillar, zhi, brokenToneOf(DZ_WX[zhi]), `${label}${flowZhi}与${zhi}相害（${pillar}）——${PILLAR_DOMAIN[pillar]}容易有膈应的小事，多半来自误解或暗处的人事。`);
    }
  }

  // 伏吟：岁运与命局某柱**地支相同**（干支全同 = 全伏吟；仅地支同 = 支伏吟）。
  // ⚠️ 这不是"自刑"——自刑指命局四柱内部同支重复（判据在 shenShaPower.branchRelationsOf），
  //   岁运与命局同支传统上归"伏吟"（主反复、旧事重演）。两者语义不同，不要合并。
  for (const p of pillars) {
    if (!p.diZhi || p.diZhi !== flowZhi) continue;
    const full = p.tianGan === flowGan;
    push('伏吟', p.pillar, p.tianGan + p.diZhi, full ? 'bad' : 'neutral', full
      ? `${label}${ganZhi}与${p.pillar}${p.tianGan}${p.diZhi}完全相同（伏吟）——${PILLAR_DOMAIN[p.pillar]}上容易旧事重演、原地打转，宜守不宜大动。`
      : `${label}${flowZhi}与${p.pillar}${p.diZhi}同支（支伏吟）——${PILLAR_DOMAIN[p.pillar]}上同一类问题会再出现一次，趁这次处理干净。`);
  }

  // ---------- 三合 / 三会：以"局"论 ----------
  const branchHitsOf = (branches: string[]) =>
    branches
      .map((b) => {
        const p = pillars.find((x) => x.diZhi === b);
        return p ? { branch: b, pillar: p.pillar } : null;
      })
      .filter(Boolean) as { branch: string; pillar: string }[];

  const sanhe = sanheGroupOf(flowZhi);
  if (sanhe) {
    const found = branchHitsOf(sanhe.branches.filter((b) => b !== flowZhi));
    const wx = sanhe.wx;
    if (found.length >= 2) {
      const pillarsStr = [flowZhi, ...found.map((f) => f.branch)].join('');
      push('三合', found.map((f) => f.pillar).join('/'), found.map((f) => f.branch).join('/'), toneOf(wx),
        `${label}${flowZhi}补齐命局${found.map((f) => f.branch).join('、')}，${pillarsStr}全合${sanhe.name}——${wx}的力量${TW}被显著放大，${found.map((f) => PILLAR_DOMAIN[f.pillar]).join('、')}随这个五行主题起落。`);
    } else if (found.length === 1) {
      const other = found[0].branch;
      const wang = DZ_WANG.includes(flowZhi) || DZ_WANG.includes(other);
      push('三合', found[0].pillar, other, toneOf(wx),
        `${label}${flowZhi}与命局${other}成半合（${sanhe.name}）——${wang ? '旺支参与，力量不弱' : '缺旺支，力量偏轻'}，${PILLAR_DOMAIN[found[0].pillar]}上会有一股向${wx}聚拢的势。`);
    }
  }

  const sanhui = sanhuiGroupOf(flowZhi);
  if (sanhui) {
    const found = branchHitsOf(sanhui.branches.filter((b) => b !== flowZhi));
    const wx = sanhui.wx;
    if (found.length >= 2) {
      push('三会', found.map((f) => f.pillar).join('/'), found.map((f) => f.branch).join('/'), toneOf(wx),
        `${label}${flowZhi}与命局${found.map((f) => f.branch).join('、')}成${sanhui.name}——三会方是地支最强的抱团，${wx}之力压过全局，${found.map((f) => PILLAR_DOMAIN[f.pillar]).join('、')}首当其冲。`);
    } else if (found.length === 1) {
      push('三会', found[0].pillar, found[0].branch, toneOf(wx),
        `${label}${flowZhi}与命局${found[0].branch}同方（${sanhui.name}），已具抱团之势——${PILLAR_DOMAIN[found[0].pillar]}会往${wx}的方向偏。`);
    }
  }

  // ---------- 天干层：反吟 / 天干五合 ----------
  // （伏吟已在上面按"地支相同"统一处理，此处不再重复判）
  for (const p of pillars) {
    const gan = p.tianGan;
    const zhi = p.diZhi;
    if (!gan) continue;
    // 反吟：天克地冲——冲的极值，单列为一条，不再另算六冲（见下方过滤）
    const gw = GAN_WX[flowGan];
    const pw = GAN_WX[gan];
    const ganKe = !!gw && !!pw && (WX_KE[gw] === pw || WX_KE[pw] === gw);
    if (zhi && isChong(flowZhi, zhi) && ganKe) {
      push('反吟', p.pillar, gan + zhi, 'bad', `${label}${ganZhi}与${p.pillar}${gan}${zhi}天克地冲（反吟）——${PILLAR_DOMAIN[p.pillar]}是${TW}变动最剧烈的一块，宜提前安排，别等临事仓促。`);
      continue;
    }
    if (GAN_HE[flowGan] === gan) {
      push('天干五合', p.pillar, gan, 'neutral', `${label}天干${flowGan}与${p.pillar}${gan}相合——${PILLAR_DOMAIN[p.pillar]}上人事牵绊加重，机会与约束同时到来。`);
    }
  }

  // 反吟本身就是"天克地冲"，同一柱再列一条"六冲"只是重复，去掉。
  const fanyinPillars = new Set(hits.filter((h) => h.kind === '反吟').map((h) => h.pillar));
  const mergedHits = mergeHits(hits.filter((h) => !(h.kind === '六冲' && fanyinPillars.has(h.pillar))));

  // ---------- 按领域归并 ----------
  const domainMap = new Map<string, DomainImpact>();
  for (const h of mergedHits) {
    const cur = domainMap.get(h.domain) || { domain: h.domain, level: '平' as const, notes: [] };
    cur.notes.push(h.text);
    domainMap.set(h.domain, cur);
  }
  const domains = [...domainMap.values()].map((d) => {
    const related = mergedHits.filter((h) => h.domain === d.domain);
    const level: DomainImpact['level'] = related.some((h) => h.tone === 'bad')
      ? '需留意'
      : related.some((h) => h.tone === 'good')
        ? '顺'
        : '平';
    return { ...d, level };
  });

  // ---------- 桃花 ----------
  // 桃花按**岁运地支**起（口诀法）。流年与大运是常规口径；流月/流日颗粒度过细
  // ——一个月/一天里"红鸾落哪柱"没有实务意义，硬输出只会变成噪声。故限定前两者。
  const peach: PeachHit[] = [];
  if (era === 'year' || era === 'decade') {
    const peachTargets: { name: PeachHit['name']; branch: string; note: string }[] = [
      { name: '红鸾', branch: HONG_LUAN[flowZhi] || '', note: '主婚恋喜庆、关系落定' },
      { name: '天喜', branch: TIAN_XI[flowZhi] || '', note: '主喜事、添丁与好消息' },
      { name: '咸池', branch: XIAN_CHI[flowZhi] || '', note: '桃花与人缘，也主感情上的诱惑与分心' },
    ];
    for (const t of peachTargets) {
      if (!t.branch) continue;
      const p = pillars.find((x) => x.diZhi === t.branch);
      if (!p) continue;
      peach.push({
        name: t.name,
        branch: t.branch,
        pillar: p.pillar,
        tone: t.name === '咸池' ? 'neutral' : 'good',
        text: `${label}${t.name}落在${p.pillar}（${t.branch}）——${t.note}，体现在${PILLAR_DOMAIN[p.pillar]}上。`,
      });
    }
  }

  // ---------- 配偶宫状态 ----------
  const dayZhi = pillars[2]?.diZhi || '';
  let spousePalace: FlowInteraction['spousePalace'] = '无';
  if (dayZhi) {
    if (isChong(flowZhi, dayZhi)) spousePalace = '六冲';
    else if (isLiuHe(flowZhi, dayZhi)) spousePalace = '六合';
    else if (isXing(flowZhi, dayZhi)) spousePalace = '相刑';
    else if (isHai(flowZhi, dayZhi)) spousePalace = '相害';
    else if (flowZhi === dayZhi) spousePalace = '伏吟';
  }

  // ---------- 感情总结 ----------
  const shiShen = tenGodOf(dayGan, flowGan);
  const relation = relationKindOfShiShen(shiShen);
  const male = isMale(gender);
  const spouseText: Record<FlowInteraction['spousePalace'], string> = {
    '六冲': '配偶宫被冲：关系容易起波澜，也可能伴随搬迁、两地或"必须做个决定"。冲不全是坏事——冲代表必须表态，拖着反而更耗。',
    '六合': '配偶宫被合：姻缘被牵动，是成家、复合或把关系往前推一步的好时机。',
    '相刑': '配偶宫相刑：多为主观感受上的磨——互相觉得"你不懂我"。少讲道理，多讲感受。',
    '相害': '配偶宫相害：容易有说不清的隔阂与误会，多来自第三方或家人。有话当面讲。',
    '伏吟': `配偶宫伏吟（${YU}与日支同支）：${PERIOD}关系议题会反复回到台面上——同一种争执、同一个纠结，别指望拖过去，正面谈一次反而能了结。`,
    '无': `配偶宫${TW}无直接冲合，感情主线是"维持节奏"——不折腾就是最好的经营。`,
  };
  // 性别相关的星：男命以财为妻星，女命以官杀为夫星
  let starNote = '';
  if (shiShen) {
    if (male) {
      if (relation === 'cai') starNote = `${YU}${shiShen}为财——对男命而言财亦为妻星，${TW}感情机会与家庭议题容易同时出现`;
      else if (relation === 'bijie') starNote = `${YU}${shiShen}为比劫——同辈竞争感强，男命宜留意"争"的念头（争财亦争人）`;
      else if (relation === 'shishang') starNote = `${YU}${shiShen}为食伤——表达欲旺，男命食伤生财，主动表达反而利于感情`;
    } else {
      if (relation === 'guansha') starNote = `${YU}${shiShen}为官杀——对女命而言官杀亦为夫星，易出现感情机会、也被推着谈责任与承诺`;
      else if (relation === 'shishang') starNote = `${YU}${shiShen}为食伤——女命食伤克官杀，表达欲强、也容易挑剔对方，注意"话赶话"伤感情`;
      else if (relation === 'cai') starNote = `${YU}${shiShen}为财——女命财生官杀，实务上利于把关系落到房子、家用等具体安排`;
    }
  }
  const peachNote = peach.length
    ? `另有${peach.map((p) => p.name).join('、')}临${peach.map((p) => p.pillar).join('、')}，是${TW}的"外缘"信号。`
    : '';
  const loveNote = [spouseText[spousePalace], starNote, peachNote].filter(Boolean).join(' ');

  // ---------- 一句话总览 ----------
  const kinds = [...new Set(mergedHits.map((h) => h.kind))];
  const badDomains = domains.filter((d) => d.level === '需留意').map((d) => d.domain);
  const goodDomains = domains.filter((d) => d.level === '顺').map((d) => d.domain);
  const headline = [
    `岁运${ganZhi}对日主为${shiShen || '无直接十神'}。`,
    kinds.length ? `与命局构成${kinds.join('、')}${mergedHits.length ? `（共 ${mergedHits.length} 处）` : ''}。` : `与命局地支无冲无合，${SPAN}。`,
    badDomains.length ? `需留意：${badDomains.join('、')}。` : '',
    goodDomains.length ? `相对顺势：${goodDomains.join('、')}。` : '',
  ].filter(Boolean).join('');

  return {
    ganZhi,
    label,
    era,
    shiShen,
    relation,
    shiShenDomain: SHISHEN_DOMAIN[shiShen] || '',
    hits: mergedHits,
    domains,
    peach,
    spousePalace,
    loveNote,
    headline,
  };
}

/** 便捷入口：按公历年份分析流年互动（干支由 liunianReading.ganZhiOfYear 提供） */
export function analyzeLiunianFlow(year: number, chart: FlowChartLike, ganZhi: string): FlowInteraction {
  return analyzeGanZhiInteraction({ ...chart, ganZhi, label: `${year}年` });
}

/** 便捷入口：按大运干支分析（文案用"这十年"时态，前缀默认「当前大运」） */
export function analyzeDayunFlow(ganZhi: string, chart: FlowChartLike, label = '当前大运'): FlowInteraction {
  return analyzeGanZhiInteraction({ ...chart, ganZhi, label, era: 'decade' });
}

export { PILLAR_ORDER };
