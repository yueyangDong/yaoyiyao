/**
 * 六爻 → 分主题吉凶判读（唯一判据出口）。
 *
 * ⚠️ 为什么要有这一层：
 * 原页面把判据写在 `handleYongShenSelect` 里、把结论写在「综合断语」里、把意境写在
 * 「大师解读」里，三处各写一套——于是「用神月建得令，事情当前时机有利」和
 * 「变化对你有利」可以和「宜守不宜攻」同时出现在一屏。这里把
 * **盘面事实 → 分数 → 档位 → 白话** 收成一条链路，页面只负责渲染，不再自己判断。
 *
 * ⚠️ 极性（polarity）是这一层最关键的设计：
 * 同样是「官鬼旺」，问事业是吉（职位/权责在涨），问健康是凶（病势正盛）。
 * 所以「用神力量」与「对本题的吉凶」必须分开算：`strength` 只讲旺衰强弱，
 * 乘上主题极性之后才叫吉凶。任何把两者混在一起写的实现都会在健康题上判反。
 */

import { WX_SHENG, WX_KE } from './wuXingRelations';
import { DZ_WX, isChong } from './diZhiRelations';
import {
  type Theme, type ThemeReading, type Evidence, type Verdict,
  verdictOf, clampScore, sortEvidence, composeSummary, adviceOf, normalizeGender,
} from './divinationCore';

/* ------------------------------------------------------------------ *
 * 入参结构（只依赖 iching-shifa PanResult 的子集，便于测试造夹具）
 * ------------------------------------------------------------------ */

export interface YaoLike {
  position: number;
  yaoValue: number;
  isMoving: boolean;
  naJia: string;
  wuXing: string;
  liuQin: string;
  liuShou?: string;
  shiYing?: string;
}

export interface FuShenLike {
  fuLiuQin: string;
  fuNaJia: string;
  fuWuXing: string;
  hostPosition: number;
}

export interface GuaLike {
  guaName: string;
  yaoList: YaoLike[];
  fuShen?: FuShenLike[];
}

export interface LiuyaoChartLike {
  /** 形如「戊戌」的月建干支 */
  monthJian?: string;
  /** 形如「午未」的日空 */
  dayKong?: string;
  /** 形如「甲申」的日干支（对象或字符串都接受） */
  ganZhiDay?: { gz?: string } | string;
  benGua: GuaLike;
  zhiGua?: GuaLike;
  huGua?: GuaLike;
  dongYaoCount?: number;
}

/* ------------------------------------------------------------------ *
 * 基础表
 * ------------------------------------------------------------------ */

/** 旺相休囚死 → 力量分。月建是六爻第一权重，故给到 ±3 */
const MONTH_SCORE: Record<string, number> = { 旺: 3, 相: 2, 休: -1, 囚: -2, 死: -3 };

/** 五行墓库。土寄四季，四库皆可论墓（不另立一说） */
const MU_KU: Record<string, string[]> = {
  木: ['未'], 火: ['戌'], 土: ['辰', '戌', '丑', '未'], 金: ['丑'], 水: ['辰'],
};

/** 同类进退神的地支次序（土四库循环） */
const JIN_TUI: Record<string, string[]> = {
  木: ['寅', '卯'], 火: ['巳', '午'], 金: ['申', '酉'], 水: ['亥', '子'],
  土: ['辰', '未', '戌', '丑'],
};

/** 六冲卦：八纯卦 + 天雷无妄 + 雷天大壮。主「事易散、快而不久」 */
const LIU_CHONG_GUA = new Set(['乾', '坤', '坎', '离', '震', '艮', '巽', '兑', '无妄', '大壮']);
/** 六合卦：主「事易成、纠缠不清」 */
const LIU_HE_GUA = new Set(['泰', '否', '豫', '复', '困', '节', '贲', '旅']);

/** 三合局。⚠️ 只能用来自 `diZhiRelations` 的口径语义，不要在这里另立一套冲合表 */
const SAN_HE_JU = [
  { branches: ['申', '子', '辰'], wx: '水', name: '申子辰水局' },
  { branches: ['亥', '卯', '未'], wx: '木', name: '亥卯未木局' },
  { branches: ['寅', '午', '戌'], wx: '火', name: '寅午戌火局' },
  { branches: ['巳', '酉', '丑'], wx: '金', name: '巳酉丑金局' },
];

export interface SanHeHit {
  name: string;
  wx: string;
  /** 参与成局的支 */
  members: string[];
  /** 是否被冲散（局中一支被日/月冲） */
  broken: boolean;
  /** 来自发动之爻（本卦动爻 + 变出之爻）的支数，成局要求 ≥2 */
  fromMoving: number;
  /** 世爻地支（可能缺省） */
  shiZhi?: string;
  /** 世爻是否就在局中（原文「尤要世爻在局为美」） */
  shiInJu: boolean;
  /** 局神对世爻：生 / 克 / 同气 / 无关（世在局内时为 none，不重复算） */
  toShi: 'sheng' | 'ke' | 'same' | 'none';
}

/**
 * 三合局成局判定。
 *
 * 为什么需要：三合局是六爻里少见的「群体力量」——单爻再旺，也怕对面成局来克；
 * 单爻再弱，成局也能翻盘。原来的引擎只看单爻，遇到「用神临月建但忌神三合成局」
 * 这种盘会判得过于乐观。
 *
 * 口径依《增删卜易·三合章》：
 *   「此三合者有四：一卦之内有三爻动而合局者，一也。两爻动，一爻不动，亦成合局者，二也。
 *     有内卦初爻、三爻动，动而变出之爻成三合者，三也。有外卦四爻、六爻动，动而变出之爻成三合者，四也。」
 *   「三爻若只两爻动，不为成局。须待后来之月日补凑，合成其局，谓之虚一待用。」
 *
 * 因此成局条件（缺一不可）：
 *   1. 三支齐现于「本卦六爻（含静爻）/ 变爻 / 日支 / 月支」这个集合里
 *      —— 静爻可以充当第三支（第二条「一爻不动亦成合局」）；
 *   2. 其中**至少两支来自发动之爻**（本卦动爻或其变出之爻）
 *      —— 三爻全静不成局；只一爻发动、靠日月凑齐也不成局（虚一待用要求先有两动）；
 *   3. 局中任一支被日支或月支冲 → 破局（冲散则不成）。
 */
export function detectSanHeJu(chart: LiuyaoChartLike): SanHeHit | null {
  const monthZhi = (chart.monthJian || '').slice(-1);
  const dayGz = typeof chart.ganZhiDay === 'string' ? chart.ganZhiDay : chart.ganZhiDay?.gz || '';
  const dayZhi = dayGz.slice(-1);

  /** 发动之爻与变出之爻的地支——入局的主力 */
  const movingZhi: string[] = [];
  /** 本卦六爻地支（含静爻）——静爻可充第三支 */
  const guaZhi: string[] = [];
  for (const y of chart.benGua.yaoList) {
    const z = (y.naJia || '').slice(-1);
    if (!z) continue;
    guaZhi.push(z);
    if (!y.isMoving) continue;
    movingZhi.push(z);
    const bian = chart.zhiGua?.yaoList?.find((g) => g.position === y.position);
    const bz = (bian?.naJia || '').slice(-1);
    if (bz) movingZhi.push(bz);
  }

  const pool = new Set([...guaZhi, ...movingZhi, monthZhi, dayZhi].filter(Boolean));

  // 世爻：原文「尤要世爻在局为美……若世爻不在局内，亦须局生世爻，始以吉断；倘局克世爻，则以凶推」
  const shiYao = chart.benGua.yaoList.find((y) => y.shiYing === '世');
  const shiZhi = (shiYao?.naJia || '').slice(-1);
  const shiWx = DZ_WX[shiZhi];

  for (const ju of SAN_HE_JU) {
    if (!ju.branches.every((b) => pool.has(b))) continue;
    const inMoving = ju.branches.filter((b) => movingZhi.includes(b)).length;
    if (inMoving < 2) continue; // 全静不成局；只一爻发动靠日月凑齐也不成局
    // 破局：局中某支被日月冲（且不是日月自身那一支）
    const broken = ju.branches.some(
      (b) => (monthZhi !== b && isChong(monthZhi, b)) || (dayZhi !== b && isChong(dayZhi, b)),
    );
    // 世爻这一层：在局内为佳；不在局内则看局神生克
    const shiInJu = !!shiZhi && ju.branches.includes(shiZhi);
    const toShi: SanHeHit['toShi'] = !shiWx || shiInJu ? 'none'
      : ju.wx === shiWx ? 'same'
        : WX_SHENG[ju.wx] === shiWx ? 'sheng'
          : WX_KE[ju.wx] === shiWx ? 'ke' : 'none';
    return {
      name: ju.name, wx: ju.wx, members: ju.branches, broken,
      fromMoving: inMoving, shiZhi: shiZhi || undefined, shiInJu, toShi,
    };
  }
  return null;
}

export interface FuYinFanYinHit {
  kind: '伏吟' | '反吟';
  /** 内卦（初二三） / 外卦（四五上） / 全卦 */
  scope: '内卦' | '外卦' | '全卦';
}

/**
 * 卦变层的伏吟 / 反吟。
 *
 * ⚠️ 与八字层的「岁运同支＝伏吟」不是一回事，别混：
 *   这里是**本卦与变卦同一爻位**的地支比较——
 *     全同 = 伏吟（事情原地打转、反反复复、迟迟不动）；
 *     全冲 = 反吟（天克地冲之象，翻来覆去、事与愿违）。
 *   只比内卦或只比外卦时，标「内卦/外卦」，力度减半。
 */
export function detectFuYinFanYin(chart: LiuyaoChartLike): FuYinFanYinHit | null {
  const zhi = chart.zhiGua;
  if (!zhi || zhi.guaName === chart.benGua.guaName) return null;
  const pairs = chart.benGua.yaoList.map((y) => {
    const b = zhi.yaoList.find((z) => z.position === y.position);
    return { ben: (y.naJia || '').slice(-1), bian: (b?.naJia || '').slice(-1) };
  });
  if (pairs.some((p) => !p.ben || !p.bian)) return null;

  const judge = (slice: typeof pairs): '伏吟' | '反吟' | null => {
    if (slice.every((p) => p.ben === p.bian)) return '伏吟';
    if (slice.every((p) => isChong(p.ben, p.bian))) return '反吟';
    return null;
  };

  const all = judge(pairs);
  if (all) return { kind: all, scope: '全卦' };
  const inner = judge(pairs.slice(0, 3));
  if (inner) return { kind: inner, scope: '内卦' };
  const outer = judge(pairs.slice(3, 6));
  if (outer) return { kind: outer, scope: '外卦' };
  return null;
}

/* ------------------------------------------------------------------ *
 * 用神配置：一题可能不止一个主角，且各自主角对吉凶的方向可能相反
 * ------------------------------------------------------------------ */

export interface ProbeSpec {
  liuQin: string;
  /** +1 = 该爻越旺越吉；-1 = 该爻越旺越凶（只用于健康题的病神） */
  polarity: 1 | -1;
  weight: number;
  /** 展示用主语，说明「这一爻在本题里扮演谁」 */
  role: string;
}

/**
 * 主题 → 用神。这是「六亲取用」的唯一真源。
 * ⚠️ 爱情题必须分性别：男以妻财为另一半、女以官鬼为另一半。
 * 未设置性别时**不得默认男命**——两星各半同看，并在 note 里说明。
 */
export function probesOf(theme: Theme, gender?: string | null): { probes: ProbeSpec[]; note?: string } {
  const g = normalizeGender(gender);
  switch (theme) {
    case '事业':
      return { probes: [{ liuQin: '官鬼', polarity: 1, weight: 1, role: '用神·官鬼（职位、规则、上司）' }] };
    case '财运':
      return { probes: [{ liuQin: '妻财', polarity: 1, weight: 1, role: '用神·妻财（进项、钱财）' }] };
    case '爱情': {
      if (g === 'female') {
        return { probes: [{ liuQin: '官鬼', polarity: 1, weight: 1, role: '用神·官鬼（女命以官鬼为伴侣）' }] };
      }
      if (g === 'male') {
        return { probes: [{ liuQin: '妻财', polarity: 1, weight: 1, role: '用神·妻财（男命以妻财为伴侣）' }] };
      }
      return {
        probes: [
          { liuQin: '妻财', polarity: 1, weight: 0.5, role: '伴侣星·妻财（男命口径）' },
          { liuQin: '官鬼', polarity: 1, weight: 0.5, role: '伴侣星·官鬼（女命口径）' },
        ],
        note: '未设置性别，感情题按男女两种取星各半合看；补上性别后判读会更准。',
      };
    }
    case '亲情':
      return {
        probes: [
          { liuQin: '父母', polarity: 1, weight: 0.7, role: '用神·父母（长辈、家宅根基）' },
          { liuQin: '兄弟', polarity: 1, weight: 0.3, role: '用神·兄弟（手足、平辈）' },
        ],
      };
    case '健康':
      return {
        probes: [
          { liuQin: '官鬼', polarity: -1, weight: 1, role: '病神·官鬼（病势本身，越旺越凶）' },
          { liuQin: '子孙', polarity: 1, weight: 0.8, role: '解神·子孙（药、恢复力）' },
        ],
        note: '健康题看两星：官鬼是病势（旺则凶）、子孙是药与恢复力（旺则吉），两者反向计分。',
      };
    case '学业':
      return {
        probes: [
          { liuQin: '父母', polarity: 1, weight: 1, role: '用神·父母（文书、学业）' },
          { liuQin: '官鬼', polarity: 1, weight: 0.5, role: '用神·官鬼（名次、功名）' },
        ],
      };
  }
}

/* ------------------------------------------------------------------ *
 * 措辞表：[0] = 对本题有利，[1] = 对本题不利
 * 病神（polarity=-1）另有一套——「病势得令」在健康题里是坏消息，
 * 如果和普通用神共用一张表，就会写出「病势得令 → 事情当前时机有利」这种满口错话。
 * ------------------------------------------------------------------ */

type Factor = 'month' | 'day' | 'kong' | 'mu' | 'shi' | 'fu';

const CLAUSE: Record<'normal' | 'disease', Record<Factor, [string, string]>> = {
  normal: {
    month: ['月令帮它，这件事本身有底气', '月令不帮它，这件事先天就弱'],
    day: ['日辰当下扶它，有人有事搭手', '日辰当下压它，处处受限'],
    kong: ['它已经出空、落到实处，事情是实的', '它逢空——目前是虚的，说的还不算数'],
    mu: ['它没被关住，力量使得出来', '它入墓——力量被关起来，暂时使不上'],
    shi: ['它就在你身上（持世），主动权在你', '它落在对方或环境那边（临应），主动权不在你'],
    fu: ['它已经上卦，事情摆在明面上', '它不上卦、伏在别爻之下，事情还没露头'],
  },
  disease: {
    month: ['病势被月令压住，起不来', '病势得月令，正当时'],
    day: ['日辰压住病势，当下能扛', '日辰助起病势，眼下最难受'],
    kong: ['病势逢空，多半是虚惊', '病势落了实，不是错觉'],
    mu: ['病势入墓被关住，是好事', '病势卡在里头，出不来也压得人难受'],
    shi: ['病没落在你身上，多半是外因', '病就在你身上，躲不开'],
    fu: ['病势未成形，还没坐实', '病根藏得深，查不出来却一直在'],
  },
};

function clause(factor: Factor, good: boolean, disease: boolean): string {
  const pair = CLAUSE[disease ? 'disease' : 'normal'][factor];
  return good ? pair[0] : pair[1];
}

/** 动化方向对本题的后果：与五行生克方向无关，只与「对谁有利」有关 */
function huaConsequence(good: boolean, disease: boolean): string {
  if (disease) return good ? '病势因此被削弱，是好事。' : '病势因此更实，不是好消息。';
  return good ? '这件事因此多一分把握。' : '这件事因此多一分阻力。';
}

function zhiOfYao(yao: YaoLike): string {
  return (yao.naJia || '').slice(-1);
}

interface AnalyzedProbe {
  spec: ProbeSpec;
  strength: number;
  evidence: Evidence[];
  /** 用神自身的五行，供三合局等「局级」判据比对 */
  probeWx?: string;
  flags: { yuePo?: boolean; riPo?: boolean; kong?: boolean; mu?: boolean; hua?: string; fu?: boolean };
}

function analyzeProbe(spec: ProbeSpec, chart: LiuyaoChartLike): AnalyzedProbe {
  const ev: Evidence[] = [];
  const flags: AnalyzedProbe['flags'] = {};
  const disease = spec.polarity === -1;
  let strength = 0;

  const benYaoList = chart.benGua.yaoList;
  const sameQin = benYaoList.filter((y) => y.liuQin === spec.liuQin);
  // 用神多现：舍静取动 → 持世优先 → 取初现（与《增删卜易》取用顺序一致）
  const yao =
    sameQin.find((y) => y.isMoving) ||
    sameQin.find((y) => y.shiYing === '世') ||
    sameQin[0];

  const monthZhi = (chart.monthJian || '').slice(-1);
  const monthWx = monthZhi ? DZ_WX[monthZhi] : '';
  const dayGz = typeof chart.ganZhiDay === 'string' ? chart.ganZhiDay : chart.ganZhiDay?.gz || '';
  const dayZhi = dayGz.slice(-1);
  const dayWx = dayZhi ? DZ_WX[dayZhi] : '';
  const kong = chart.dayKong || '';

  /* ---------- 用神不上卦：走伏神，力量按「伏藏」打折 ---------- */
  if (!yao) {
    const fu = (chart.benGua.fuShen || []).find((f) => f.fuLiuQin === spec.liuQin);
    flags.fu = true;
    if (fu) {
      const host = benYaoList.find((y) => y.position === fu.hostPosition);
      let v = -4;
      let extra = '';
      if (host) {
        if (WX_SHENG[host.wuXing] === fu.fuWuXing) { v += 1; extra = '飞神生伏神，还有一线生机'; }
        else if (WX_KE[host.wuXing] === fu.fuWuXing) { v -= 1; extra = '飞神克伏神，压得更死'; }
      }
      strength += v;
      ev.push({
        label: `${spec.role}·伏神`,
        detail: `「${spec.liuQin}」不上卦，伏在第${fu.hostPosition}爻飞神之下（${fu.fuNaJia}，属${fu.fuWuXing}）。${extra || '伏而不出'}。${clause('fu', v * spec.polarity > 0, disease)}。`,
        weight: v * spec.polarity,
      });
      return { spec, strength, evidence: ev, probeWx: fu?.fuWuXing, flags };
    }
    strength -= 4;
    ev.push({
      label: `${spec.role}·缺`,
      detail: `本卦六爻里没有「${spec.liuQin}」，伏神表里也没有——这一题在盘面上没有落点，只能按「事未成形」看。`,
      weight: -4 * spec.polarity,
    });
    return { spec, strength, evidence: ev, flags };
  }

  const yaoWx = yao.wuXing;
  const yaoZhi = zhiOfYao(yao);

  if (sameQin.length > 1) {
    ev.push({
      label: '用神多现',
      detail: `「${spec.liuQin}」在本卦出现${sameQin.length}次（第${sameQin.map((y) => y.position).join('、')}爻）。按「舍静取动」取第${yao.position}爻为主，其余只作旁证。`,
      weight: 0,
    });
  }

  /* ---------- 1. 月建（第一权重）与月破 ---------- */
  if (monthZhi && monthWx) {
    if (isChong(monthZhi, yaoZhi)) {
      flags.yuePo = true;
      strength -= 4;
      ev.push({
        label: `${spec.role}·月破`,
        detail: `月建${monthZhi}与用神${yaoZhi}相冲，这叫「月破」——根基被当令之气冲散，旺相也当弱看。${clause('month', false, disease)}。`,
        weight: -4 * spec.polarity,
      });
    } else {
      const rel = monthWx === yaoWx ? '旺'
        : WX_SHENG[monthWx] === yaoWx ? '相'
          : WX_SHENG[yaoWx] === monthWx ? '休'
            : WX_KE[yaoWx] === monthWx ? '囚' : '死';
      const v = MONTH_SCORE[rel];
      strength += v;
      ev.push({
        label: `${spec.role}·月建`,
        detail: `月建${monthZhi}属${monthWx}，用神属${yaoWx}，处「${rel}」地（${v > 0 ? '+' : ''}${v}）。${clause('month', v * spec.polarity > 0, disease)}。`,
        weight: v * spec.polarity,
      });
    }
  }

  /* ---------- 2. 日辰：当下的生克与冲合 ---------- */
  if (dayZhi && dayWx) {
    if (isChong(dayZhi, yaoZhi)) {
      // 旺相被冲为「暗动」，衰弱被冲为「日破」——两者吉凶相反，不能混用一句
      if (strength >= 1) {
        flags.hua = flags.hua || '暗动';
        strength += 1;
        ev.push({
          label: `${spec.role}·暗动`,
          detail: `日辰${dayZhi}冲用神${yaoZhi}，但用神当令有力，这是「暗动」——表面不动，底下已经在动，事情会突然起变化。`,
          weight: 1 * spec.polarity,
        });
      } else {
        flags.riPo = true;
        strength -= 2;
        ev.push({
          label: `${spec.role}·日破`,
          detail: `日辰${dayZhi}冲用神${yaoZhi}，而用神自身无力，这叫「日破」——当天就被冲散，办了也落空。`,
          weight: -2 * spec.polarity,
        });
      }
    } else {
      let v = 0;
      let why = '';
      if (dayWx === yaoWx) { v = 2; why = '日辰同气'; }
      else if (WX_SHENG[dayWx] === yaoWx) { v = 2; why = '日辰生扶'; }
      else if (WX_SHENG[yaoWx] === dayWx) { v = -1; why = '用神生日辰，力量外泄'; }
      else if (WX_KE[yaoWx] === dayWx) { v = -1; why = '用神克日辰，反耗自身'; }
      else { v = -2; why = '日辰克制'; }
      strength += v;
      ev.push({
        label: `${spec.role}·日辰`,
        detail: `日辰${dayZhi}属${dayWx}，${why}（${v > 0 ? '+' : ''}${v}）。${clause('day', v * spec.polarity > 0, disease)}。`,
        weight: v * spec.polarity,
      });
    }
  }

  /* ---------- 2.5 三合局：群体力量（单爻再旺也怕对面成局） ---------- */
  const ju = detectSanHeJu(chart);
  if (ju) {
    if (ju.broken) {
      ev.push({
        label: `三合局·${ju.name}`,
        detail: `${ju.name}三支齐现（${ju.members.join('、')}），但局中一支被日辰或月建冲散，成局不成——这种「半合」只算有势，不算有力。`,
        weight: 0,
      });
    } else if (ju.wx === yaoWx) {
      strength += 3;
      ev.push({
        label: `三合局·${ju.name}`,
        detail: `${ju.name}成局，局神正是用神的${yaoWx}——三支之力都归到它身上，这是六爻里最强的一种「得势」。${huaConsequence(3 * spec.polarity > 0, disease)}`,
        weight: 3 * spec.polarity,
      });
    } else if (WX_SHENG[ju.wx] === yaoWx) {
      strength += 2;
      ev.push({
        label: `三合局·${ju.name}`,
        detail: `${ju.name}成局，局神${ju.wx}生用神${yaoWx}——等于有一队人在旁边供着，不是单打独斗。${huaConsequence(2 * spec.polarity > 0, disease)}`,
        weight: 2 * spec.polarity,
      });
    } else if (WX_KE[ju.wx] === yaoWx) {
      strength -= 3;
      ev.push({
        label: `三合局·${ju.name}`,
        detail: `${ju.name}成局，局神${ju.wx}克用神${yaoWx}——成局的这一队是来压它的，个人的旺相顶不住群体的克。${huaConsequence(-3 * spec.polarity > 0, disease)}`,
        weight: -3 * spec.polarity,
      });
    } else {
      ev.push({
        label: `三合局·${ju.name}`,
        detail: `${ju.name}成局，但局神${ju.wx}与用神${yaoWx}不生不克——只说明局面被一群人左右，方向上帮不上也压不住。`,
        weight: 0,
      });
    }

    /* ---------- 2.6 世爻这一层（原文：「尤要世爻在局为美」） ----------
     * 三合局讲的是「一群人」，但这一群人是冲着事来的还是冲着你来的，是两回事：
     *   世在局内   → 你本人就是这股合力的一部分；
     *   世不在局内 → 局生世可借力，局克世则是「冲你来的」。
     * ⚠️ 这一层的分数与「用神旺衰」无关，方向是固定的，所以要乘 polarity 再进 strength
     *    （strength 最终会再乘一次 polarity），否则健康题上会把「克世」读成好事。
     */
    if (!ju.broken) {
      const shiNote = ju.shiZhi ? `世爻${ju.shiZhi}` : '世爻';
      if (ju.shiInJu) {
        strength += 1 * spec.polarity;
        ev.push({
          label: '三合局·世在局',
          detail: `${ju.name}里正含着${shiNote}——你本人就在这股合力当中，不是旁观者。原文所谓「尤要世爻在局为美」。`,
          weight: 1,
        });
      } else if (ju.toShi === 'sheng') {
        strength += 1 * spec.polarity;
        ev.push({
          label: '三合局·生世',
          detail: `${shiNote}不在局内，但局神${ju.wx}生世爻——这股势在外面，方向朝你，能借。`,
          weight: 1,
        });
      } else if (ju.toShi === 'ke') {
        strength += -2 * spec.polarity;
        ev.push({
          label: '三合局·克世',
          detail: `${shiNote}不在局内，而局神${ju.wx}克世爻——这股合力是冲着「你」来的，不只是事本身难办。原文：「倘局克世爻，则以凶推」。`,
          weight: -2,
        });
      }
    }
  }

  /* ---------- 3. 旬空 / 入墓 ---------- */
  if (kong && kong.includes(yaoZhi)) {
    flags.kong = true;
    strength -= 2;
    ev.push({
      label: `${spec.role}·旬空`,
      detail: `用神${yaoZhi}正落旬空（${kong}）。${clause('kong', -2 * spec.polarity > 0, disease)}。出空（填实或冲空）之前，事情都停留在「说了不算」的阶段。`,
      weight: -2 * spec.polarity,
    });
  }

  if ((MU_KU[yaoWx] || []).includes(yaoZhi)) {
    flags.mu = true;
    strength -= 1;
    ev.push({
      label: `${spec.role}·入墓`,
      detail: `用神${yaoZhi}是${yaoWx}的墓库，这叫「入墓」——有力量但被关着。${clause('mu', -1 * spec.polarity > 0, disease)}。要等冲开墓库（冲${yaoZhi}之日）才见分晓。`,
      weight: -1 * spec.polarity,
    });
  }

  /* ---------- 4. 动爻与动化：变化的走向 ---------- */
  if (yao.isMoving) {
    const bianYao = chart.zhiGua?.yaoList?.find((z) => z.position === yao.position);
    if (bianYao) {
      const toWx = bianYao.wuXing;
      const toZhi = zhiOfYao(bianYao);
      let v = 0;
      let label = '动化';
      let detail = '';
      if (WX_SHENG[toWx] === yaoWx) {
        v = 2; label = '动化·回头生';
        detail = `用神动而化出${bianYao.naJia}（属${toWx}），回头生用神——越变越有依靠。`;
      } else if (WX_KE[toWx] === yaoWx) {
        v = -2; label = '动化·回头克';
        detail = `用神动而化出${bianYao.naJia}（属${toWx}），回头克用神——变化的方向反过来伤自己，第一反应该是止损，不是加码。`;
      } else if (toWx === yaoWx) {
        const order = JIN_TUI[yaoWx] || [];
        const iFrom = order.indexOf(yaoZhi);
        const iTo = order.indexOf(toZhi);
        const n = order.length;
        if (iFrom >= 0 && iTo >= 0 && n > 1 && iTo === (iFrom + 1) % n) {
          v = 1; label = '动化·进神';
          detail = `用神由${yaoZhi}化${toZhi}，同类顺进为「化进神」——势头在往上走。`;
        } else if (iFrom >= 0 && iTo >= 0 && n > 1 && iTo === (iFrom - 1 + n) % n) {
          v = -1; label = '动化·退神';
          detail = `用神由${yaoZhi}化${toZhi}，同类后退为「化退神」——不是失败，是降档。`;
        } else {
          v = 0; label = '动化·比和';
          detail = `用神由${yaoZhi}化${toZhi}，同气但不成进退——变化平缓，按常规推进即可。`;
        }
      } else if (WX_SHENG[yaoWx] === toWx) {
        v = -1; label = '动化·泄气';
        detail = `用神动而生出${bianYao.naJia}（属${toWx}）——力量被抽走一部分，事能推进但成本变高。`;
      } else {
        v = 0; label = '动化·用克变';
        detail = `用神动而克变爻${bianYao.naJia}（属${toWx}）——费力但控得住，属中性偏耗。`;
      }
      if (v !== 0) flags.hua = label;
      strength += v;
      ev.push({
        label: `${spec.role}·${label}`,
        detail: `${detail}${v !== 0 ? huaConsequence(v * spec.polarity > 0, disease) : ''}`,
        weight: v * spec.polarity,
      });

      /* 忌神 / 原神 同动 */
      const others = benYaoList.filter((y) => y.isMoving && y.position !== yao.position);
      const jiDong = others.find((y) => WX_KE[y.wuXing] === yaoWx);
      const yuanDong = others.find((y) => WX_SHENG[y.wuXing] === yaoWx);
      if (jiDong) {
        strength -= 2;
        ev.push({
          label: '忌神发动',
          detail: `另有第${jiDong.position}爻「${jiDong.liuQin}/${jiDong.naJia}」发动，五行${jiDong.wuXing}克用神${yaoWx}——忌神动了，阻力是主动找上门的。`,
          weight: -2 * spec.polarity,
        });
      } else if (yuanDong) {
        strength += 1;
        ev.push({
          label: '原神发动',
          detail: `另有第${yuanDong.position}爻「${yuanDong.liuQin}/${yuanDong.naJia}」发动，五行${yuanDong.wuXing}生用神${yaoWx}——有人或有事在帮你，源头是活的。`,
          weight: 1 * spec.polarity,
        });
      }
    }
  } else {
    ev.push({
      label: `${spec.role}·静爻`,
      detail: '用神不动，短期维持原状；要等日辰或月建来冲动它，才会起变化。',
      weight: 0,
    });
  }

  /* ---------- 5. 世应：主动权在谁手里 ---------- */
  const shi = benYaoList.find((y) => y.shiYing === '世');
  const ying = benYaoList.find((y) => y.shiYing === '应');
  if (yao.shiYing === '世') {
    strength += 2;
    ev.push({
      label: `${spec.role}·持世`,
      detail: `用神持世——这件事的主动权在你手上，成败主要看你自己使不使劲。${clause('shi', true, disease)}。`,
      weight: 2 * spec.polarity,
    });
  } else if (yao.shiYing === '应') {
    strength -= 1;
    ev.push({
      label: `${spec.role}·临应`,
      detail: `用神临应——关键在对方或外部环境，你再急也推不动。${clause('shi', false, disease)}。`,
      weight: -1 * spec.polarity,
    });
  }
  if (shi && ying) {
    const shiWx = shi.wuXing;
    const yingWx = ying.wuXing;
    if (WX_SHENG[yingWx] === shiWx) {
      strength += 1;
      ev.push({
        label: '世应·应生世',
        detail: `应爻（${ying.naJia}，${yingWx}）生世爻（${shi.naJia}，${shiWx}）——外部条件是帮你的，别单打独斗。`,
        weight: 1 * spec.polarity,
      });
    } else if (WX_KE[yingWx] === shiWx) {
      strength -= 2;
      ev.push({
        label: '世应·应克世',
        detail: `应爻（${ying.naJia}，${yingWx}）克世爻（${shi.naJia}，${shiWx}）——外部环境压着你，硬顶不如换路或等时机。`,
        weight: -2 * spec.polarity,
      });
    } else if (WX_SHENG[shiWx] === yingWx) {
      strength -= 1;
      ev.push({
        label: '世应·世生应',
        detail: `世爻生应爻——你在往外付出，成败取决于你愿不愿意继续投。`,
        weight: -1 * spec.polarity,
      });
    }
  }

  return { spec, strength, evidence: ev, probeWx: yaoWx, flags };
}

/* ------------------------------------------------------------------ *
 * 主题判读
 * ------------------------------------------------------------------ */

function guaShort(guaName: string): string {
  return guaName.includes('为') ? guaName[0] : guaName.slice(2);
}

export function buildLiuyaoReading(
  chart: LiuyaoChartLike,
  theme: Theme,
  gender?: string | null,
): ThemeReading {
  const { probes, note } = probesOf(theme, gender);
  const analyzed = probes.map((p) => analyzeProbe(p, chart));

  // 加权平均：各主角按权重摊；正负极性已体现在 strength 与 evidence.weight
  const wSum = probes.reduce((s, p) => s + Math.abs(p.weight), 0) || 1;
  let score = analyzed.reduce((s, a) => s + a.strength * a.spec.polarity * a.spec.weight, 0) / wSum;

  const rawEvidence: Evidence[] = analyzed.flatMap((a) => a.evidence);
  // 全局因子（三合局、世应、卦体）会被每个用神各算一次，展示时同一事实只留一条
  // ⚠️ 只去重展示，不去重计分——分数已经是加权平均，不能被去重二次影响
  const seen = new Map<string, Evidence>();
  for (const e of rawEvidence) {
    const prev = seen.get(e.label);
    if (!prev || Math.abs(e.weight) > Math.abs(prev.weight)) seen.set(e.label, e);
  }
  const evidence: Evidence[] = [...seen.values()];

  /* ---------- 卦体合冲：关系类主题权重最高 ---------- */
  const shortName = guaShort(chart.benGua.guaName || '');
  const isChongGua = LIU_CHONG_GUA.has(shortName);
  const isHeGua = LIU_HE_GUA.has(shortName);
  if (theme === '爱情' || theme === '亲情') {
    if (isHeGua) {
      score += 2;
      evidence.push({ label: '卦体·六合', detail: `${chart.benGua.guaName}属六合卦——关系本身缠得住，只要有一方肯留就散不了。`, weight: 2 });
    } else if (isChongGua) {
      score -= 2;
      evidence.push({ label: '卦体·六冲', detail: `${chart.benGua.guaName}属六冲卦——冲主散，关系里容易「一冲就散、散了难合」，遇事别用激将法。`, weight: -2 });
    }
  } else if (isChongGua) {
    score -= 1;
    evidence.push({ label: '卦体·六冲', detail: `${chart.benGua.guaName}属六冲卦——冲主快而不久，事情起得快落得也快，别把长期规划押在这一卦上。`, weight: -1 });
  } else if (isHeGua) {
    score += 1;
    evidence.push({ label: '卦体·六合', detail: `${chart.benGua.guaName}属六合卦——合主纠缠，事情容易成但成得慢、收尾麻烦。`, weight: 1 });
  }

  /* ---------- 卦变伏吟 / 反吟：事情「原地打转」还是「翻来覆去」 ---------- */
  const fy = detectFuYinFanYin(chart);
  if (fy) {
    const full = fy.scope === '全卦';
    const v = full ? -2 : -1;
    score += v;
    evidence.push({
      label: `卦变·${fy.scope}${fy.kind}`,
      detail: fy.kind === '伏吟'
        ? `本卦变卦同位地支全同（${fy.scope}），这叫「伏吟」——事情在原地打转，看着一直在动，实际没往前挪。这时候最该做的是先停一下，而不是加大力气。`
        : `本卦变卦同位地支相冲（${fy.scope}），这叫「反吟」——翻来覆去、事与愿违，按下葫芦浮起瓢。别指望一次就定局，留好回手余地。`,
      weight: v,
    });
  }

  score = clampScore(score);
  const verdict: Verdict = verdictOf(score);

  const subject = probes.map((p) => p.role).join(' ／ ');
  const summary = composeSummary(
    theme,
    verdict,
    buildHeadline(theme, verdict, analyzed, chart),
    buildTail(verdict, chart, theme),
  );

  const extraNote = [
    note,
    analyzed.some((a) => a.flags.fu) ? '本题用神不上卦，已按伏神论——底子是有的，只是还没露头。' : '',
  ].filter(Boolean).join(' ');

  return {
    theme,
    verdict,
    score,
    subject,
    summary,
    evidence: sortEvidence(evidence),
    advice: adviceOf(theme, verdict),
    note: extraNote || undefined,
  };
}

/** 结论前半句：只讲一类主因，避免把六条依据堆成一段术语雨 */
function buildHeadline(
  theme: Theme,
  verdict: Verdict,
  analyzed: AnalyzedProbe[],
  chart: LiuyaoChartLike,
): string {
  const a = analyzed[0];
  if (!a) return '盘面上找不到可用的落点，只能按「事未成形」看。';
  const f = a.flags;
  const dongCount = chart.dongYaoCount ?? chart.benGua.yaoList.filter((y) => y.isMoving).length;

  if (theme === '健康') {
    const bing = analyzed.find((x) => x.spec.polarity === -1);
    const yao = analyzed.find((x) => x.spec.polarity === 1);
    const bingStrong = (bing?.strength || 0) > 1;
    const yaoStrong = (yao?.strength || 0) > 1;
    if (bingStrong && !yaoStrong) return '病势比恢复力强——症状是真的，别扛，该查就查';
    if (!bingStrong && yaoStrong) return '病势不强而恢复力在线——多半是小毛病，调一调就过去';
    if (bingStrong && yaoStrong) return '病势和恢复力都不弱——会难受一阵，但扛得过去，关键是别中断调治';
    return '病势与恢复力都不强——更多是状态问题，不是病本身的问题';
  }

  if (f.yuePo) return '用神被月令冲散（月破），根基不稳，推什么都是逆水';
  if (f.riPo) return '用神当天就被冲散（日破），今天办不成，换个日子再说';
  if (f.kong) return '用神落空——看着有，实际还没落地，现在下结论太早';
  if (f.fu) return '这件事的主角还没上台，只在暗处，要等一个「露头」的时间点';
  const fy = detectFuYinFanYin(chart);
  if (fy && fy.scope === '全卦') {
    return fy.kind === '伏吟'
      ? '本卦变卦同支（伏吟）——事情在原地打转，动了很多但没往前走，先停下来理清楚再推'
      : '本卦变卦全冲（反吟）——翻来覆去、事与愿违，别指望一次定局，要留回手余地';
  }
  if (f.hua && /回头克/.test(f.hua)) return '动爻回头克——越折腾越伤自己，收手比加码划算';
  if (f.hua && /进神/.test(f.hua)) return '化进神——势头正在往上走，加一档力度正当时';
  if (f.hua && /退神/.test(f.hua)) return '化退神——势头在降档，先保住已经拿到的';
  if (dongCount >= 3) return '动爻太多，局面正在剧烈翻动，最终结果要看变卦而不是现在这一面';
  if (dongCount === 0) return '全卦安静，事情短期不会自己变，你不动它就不动';
  if (verdict === '大吉' || verdict === '吉') return '用神得月令与日辰两头帮衬，这件事的底盘是硬的';
  if (verdict === '小凶' || verdict === '凶') return '用神失令又受制，眼下的力气花在这上面，回报很低';
  return '用神有扶有制、两头扯平——成不成，取决于你接下来怎么使力';
}

/** 结论后半句：动爻与变卦决定「会往哪走」，这层不能省，否则结论变成静态标签 */
function buildTail(verdict: Verdict, chart: LiuyaoChartLike, theme: Theme): string {
  const dongCount = chart.dongYaoCount ?? chart.benGua.yaoList.filter((y) => y.isMoving).length;
  const zhiName = chart.zhiGua?.guaName;
  const benName = chart.benGua.guaName;
  if (dongCount > 0 && zhiName && zhiName !== benName) {
    const move = dongCount === 1 ? '单爻独动，方向很明确' : dongCount <= 2 ? '两个动爻在推，力量有两股' : '多爻齐动，是根本性的翻转';
    const dir = verdict === '大吉' || verdict === '吉'
      ? '顺着这个变化走，比守着原样更有胜算。'
      : '别急着跟变化对抗，先看清它把你带到哪，再决定接不接。';
    return `${move}，事从「${benName}」走向「${zhiName}」。${dir}`;
  }
  if (dongCount === 0) return '无动爻，事情的性质已经定了：守住现状、把细节做扎实，就是最好的策略。';
  return adviceOf(theme, verdict);
}

/** 一次算满六个主题，页面切主题不用重算盘面 */
export function buildAllLiuyaoReadings(chart: LiuyaoChartLike, gender?: string | null): ThemeReading[] {
  return (['事业', '爱情', '亲情', '财运', '健康', '学业'] as Theme[]).map((t) =>
    buildLiuyaoReading(chart, t, gender),
  );
}
