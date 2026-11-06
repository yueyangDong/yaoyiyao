/**
 * 灵签（观音 / 关帝 / 诸葛）→ 分主题吉凶判读（唯一判据出口）。
 *
 * ⚠️ 原页面最刺眼的一处自相矛盾：
 * 「白话详解」里贴着这一签自己的注解（第1签写着「事业运势极佳，适合创业开拓」），
 * 而下面的「分维度解读」完全按签等套模板——所有上上签都是同一段话，
 * 连签文都没读。同一屏上下两段，一段是「本签如此」，一段是「上上签都如此」，
 * 用户当然会问「到底哪个算」。
 *
 * 这里的判据链：签等定基调（主判）→ 本签分项断语（微调 ±1 档）→ 签诗语气（最低权重）。
 * ⚠️ 硬约束：下签与下下签**永远读不出「吉」**，上上签**也不会被读成「凶」**。
 * 这条不变量写在 `clampByLevel` 里，并有测试钉住——它是「不自相矛盾」的最后一道闸。
 */

import {
  type Theme, type ThemeReading, type Evidence, type Verdict,
  verdictOf, clampScore, sortEvidence, composeSummary, adviceOf, JUDGE_RULE, bandOf,
} from './divinationCore';

export interface LotReadingInput {
  lotType: 'guanyin' | 'guandi' | 'zhuge';
  /** '上上' | '上' | '中' | '下' | '下下'；诸葛神数传统不分等级，传空串 */
  level: string;
  poem: string;
  explanation?: string;
  interpretation?: string;
  /** 观音的结构化分项（事业/感情/财运/健康） */
  interpretations?: Record<string, string>;
  /** 仙机：家宅/自身/求财/交易/婚姻/六甲/行人/寻人/公讼/疾病… */
  guide?: Record<string, string>;
  story?: string;
}

/** 签等 → 基调分。上上 6 / 上 4 / 中 1 / 下 -3 / 下下 -6，与统一刻度一一对应 */
const LEVEL_SCORE: Record<string, number> = {
  上上: 6, 上: 4, 中: 1, 下: -3, 下下: -6,
};

/** 主题 → 本签的「分项断语」键（观音 interpretations / 关帝 interpretation 行） */
const DOMAIN_KEYS: Record<Theme, string[]> = {
  事业: ['事业'],
  爱情: ['感情', '婚姻'],
  亲情: ['亲情', '家宅'],
  财运: ['财运'],
  健康: ['健康', '疾病'],
  学业: ['学业', '功名'],
};

/** 主题 → 仙机键（传统十五项，各签系键名不完全一致，按覆盖顺序取） */
const GUIDE_KEYS: Record<Theme, string[]> = {
  事业: ['自身', '交易', '公讼'],
  爱情: ['婚姻', '行人'],
  亲情: ['家宅', '六甲', '寻人'],
  财运: ['求财', '交易', '失物'],
  健康: ['疾病', '自身'],
  学业: ['功名', '自身', '公讼'],
};

/**
 * 签诗意象词表。
 *
 * 为什么需要：观音灵签的十五项仙机里**没有「功名/学业」这一项**（传统签谱分的是
 * 家宅、自身、求财、交易、婚姻、六甲、行人、田蚕、六畜、寻人、公讼、移徙、失物、
 * 疾病、山坟）。学业题在观音签上历来靠「签诗里有没有功名意象」来断——
 * 金榜、丹桂、雁塔、登科这些词出现在签诗里，本身就是这一签在讲功名。
 *
 * ⚠️ 这是**降级判据**，必须显式标注「本签无学业专项断语」，不能伪装成仙机原文。
 */
const POEM_IMAGERY: Partial<Record<Theme, { label: string; words: string[] }>> = {
  学业: {
    label: '功名',
    words: ['金榜', '登科', '丹桂', '蟾宫', '雁塔', '夺标', '魁', '甲第', '青云', '龙门', '折桂', '题名', '读书', '文章', '笔', '书'],
  },
  事业: { label: '功名仕途', words: ['官', '仕', '朝', '升', '迁', '爵', '印', '衙', '公卿'] },
  爱情: { label: '姻缘', words: ['姻缘', '鸾', '凤', '琴瑟', '并蒂', '连理', '佳期', '红', '妆', '嫁', '娶'] },
  财运: { label: '财禄', words: ['财', '金', '玉', '宝', '丰', '盈', '利', '仓', '粟'] },
  亲情: { label: '家门', words: ['家', '亲', '团圆', '兄弟', '父母', '门庭', '骨肉'] },
};

/** 在签诗里数某主题的意象词，返回命中的词（去重、保序） */
export function imageryHits(poem: string, theme: Theme): string[] {
  const cfg = POEM_IMAGERY[theme];
  if (!cfg || !poem) return [];
  const hits: string[] = [];
  for (const w of cfg.words) {
    if (poem.includes(w) && !hits.some((h) => h.includes(w) || w.includes(h))) hits.push(w);
  }
  return hits;
}

/**
 * 取出签诗里含这些词的整句，用于「引用原文」。
 * ⚠️ 只甩一个「金榜」不算引证——用户看不出它在诗里是什么语气，必须带上整句。
 */
export function imageryQuote(poem: string, words: string[], maxLines = 2): string {
  if (!poem || !words.length) return '';
  const lines = poem.split(/[\n，,。；;、]/).map((s) => s.trim()).filter(Boolean);
  const picked: string[] = [];
  for (const line of lines) {
    if (words.some((w) => line.includes(w)) && !picked.includes(line)) picked.push(line);
    if (picked.length >= maxLines) break;
  }
  return picked.join('／');
}

/* ------------------------------------------------------------------ *
 * 语气词表：只用于「没有分项断语」时的兜底，权重低于签等与仙机
 * ------------------------------------------------------------------ */

const POS_WORDS = [
  '大吉', '上吉', '吉', '亨通', '顺利', '顺遂', '兴旺', '兴盛', '可成', '必成', '成全',
  '和顺', '和睦', '圆满', '康复', '痊愈', '平安', '有余', '获利', '胜诉', '佳音', '有望',
  '易成', '丰厚', '增长', '贵人', '高中', '喜', '得', '成',
];
const NEG_WORDS = [
  '不吉', '凶', '不利', '不宜', '难成', '不成', '坎坷', '阻滞', '迟滞', '破财', '损', '散',
  '病', '灾', '争', '讼', '口舌', '孤独', '迟', '欠', '薄', '虚', '空', '退', '阻', '忧',
  '困', '险', '失', '无', '莫', '休', '防',
];

function countHits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    let idx = text.indexOf(w);
    while (idx >= 0) { n += 1; idx = text.indexOf(w, idx + w.length); }
  }
  return n;
}

/** 语气分：-2 ~ +2。先扣掉否定式，避免「不吉」被算成两个「吉」 */
export function toneScore(text: string): number {
  if (!text) return 0;
  let cleaned = text;
  for (const w of NEG_WORDS) cleaned = cleaned.split(w).join('　');
  const pos = countHits(cleaned, POS_WORDS);
  const neg = countHits(text, NEG_WORDS);
  const diff = pos - neg;
  if (diff === 0) return 0;
  return Math.sign(diff) * Math.min(2, Math.abs(diff) > 1 ? 2 : 1);
}

/** 取首句/首个短语，用于引述原话（不整段搬，避免「念签」） */
function firstClause(text: string, max = 26): string {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const m = s.split(/[。；;！!？?，,、\n]/).map((x) => x.trim()).filter(Boolean);
  const pick = m[0] || s;
  return pick.length > max ? `${pick.slice(0, max)}…` : pick;
}

/** 关帝的 interpretation 是「事业：xxx\n财运：xxx」的行文本，按行拆成结构化 */
function parseInlineDomains(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  const re = /(事业|财运|感情|婚姻|健康|功名|学业|家宅)\s*[：:]\s*([^\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!out[m[1]]) out[m[1]] = m[2].trim();
  }
  return out;
}

interface DomainHit {
  text: string;
  label: string;
  /** 判据层级：结构化分项 > 仙机 > 签诗意象 > 整段解签 */
  kind?: 'structured' | 'guide' | 'imagery' | 'explain';
}

/**
 * 按优先级找这一主题的「本签原话」。
 *
 * 学业题的顺序特意不同：观音签没有「功名」仙机项，若直接退到「仙机·自身」，
 * 会得到一句「诸事顺遂」式的泛论——所以把**签诗功名意象**提到「自身」之前，
 * 并标明这是降级判据。
 */
function findDomain(input: LotReadingInput, theme: Theme): DomainHit | null {
  const structured = { ...(input.interpretations || {}), ...parseInlineDomains(input.interpretation || '') };
  for (const k of DOMAIN_KEYS[theme]) {
    if (structured[k]) return { text: structured[k], label: `签文分项·${k}`, kind: 'structured' };
  }

  const guide = input.guide || {};
  const img = imageryHits(input.poem || '', theme);
  const cfg = POEM_IMAGERY[theme];
  const quote = imageryQuote(input.poem || '', img);
  const imageryText = quote
    ? `签诗原句「${quote}」（命中${cfg?.label || '主题'}意象：${img.join('、')}）`
    : img.join('、');

  // 学业：先看有没有「功名」这种正经仙机键，再退到签诗意象
  if (theme === '学业') {
    if (guide['功名']) return { text: guide['功名'], label: '仙机·功名', kind: 'guide' };
    if (img.length) {
      return {
        text: imageryText,
        label: `签诗${cfg?.label || '功名'}意象（本签无学业专项断语）`,
        kind: 'imagery',
      };
    }
  }

  for (const k of GUIDE_KEYS[theme]) {
    if (guide[k]) return { text: guide[k], label: `仙机·${k}`, kind: 'guide' };
  }

  // 其余主题：仙机也没有时，用签诗意象兜一层（权重最低）
  if (img.length) {
    return {
      text: imageryText,
      label: `签诗${cfg?.label || '主题'}意象（本签无分项断语）`,
      kind: 'imagery',
    };
  }

  // 诸葛神数没有分项，只有整段解签白话——退一层，但明确告知这是降级
  if (input.explanation) {
    return { text: input.explanation, label: '解签白话（无分项断语，按整段解签推）', kind: 'explain' };
  }
  return null;
}

/**
 * 自洽硬约束：签等是基调，分项只能在一档内微调。
 * ⚠️ 这条不是审美选择，而是「下下签不能读成大吉」的底线，改它等于放开矛盾。
 */
export function clampByLevel(score: number, level: string): number {
  let s = score;
  if (level === '下下') s = Math.min(s, -3.01);   // 最宽只到「小凶」
  if (level === '下') s = Math.min(s, 1);         // 最宽只到「平」
  if (level === '上上') s = Math.max(s, 3);       // 最窄不低于「吉」
  return s;
}

export function buildLotReading(input: LotReadingInput, theme: Theme): ThemeReading {
  const level = (input.level || '').replace('签', '').trim();
  const graded = !!LEVEL_SCORE[level];
  const evidence: Evidence[] = [];

  /* ---------- 1. 签等：基调 ---------- */
  let base: number;
  if (graded) {
    base = LEVEL_SCORE[level];
    evidence.push({
      label: `签等·${level}`,
      detail: `${level}签定基调（${base > 0 ? '+' : ''}${base}）——这是主判，后面所有分项都只能在它上下浮动一档。`,
      weight: base,
    });
  } else {
    // 诸葛神数传统不分等级：只能按签文语气推定，且必须说明这是推定
    const kw = toneScore(`${input.explanation || ''}${input.poem || ''}`);
    base = kw * 2.5;
    evidence.push({
      label: '签等·未分级',
      detail: `本签传统不分上中下等，按签文语气推定基调（${base > 0 ? '+' : ''}${base.toFixed(1)}）——这是推定，不是原签自带的等级。`,
      weight: base,
    });
  }

  /* ---------- 2. 本签分项：微调 ---------- */
  const hit = findDomain(input, theme);
  let offset = 0;
  if (hit) {
    const t = toneScore(hit.text);
    // 分项断语是原签自带的一档（0.5）；签诗意象只是降级证据，力度更低（0.3）
    const cap = hit.kind === 'imagery' ? 0.3 : 0.5;
    offset = t * cap;
    evidence.push({
      label: hit.label,
      detail: `本签对这一项的原话是「${firstClause(hit.text)}」——语气${t > 0 ? '偏顺' : t < 0 ? '偏阻' : '中性'}（${offset > 0 ? '+' : ''}${offset.toFixed(1)}）。${hit.kind === 'imagery' ? '⚠️ 这是从签诗意象推的，不是原签分项，权重已相应调低。' : ''}`,
      weight: offset,
    });
  } else {
    evidence.push({
      label: '本签无分项',
      detail: '这一签没有针对该项的断语，只能按签诗与签等合看，判读精度会低一档。',
      weight: 0,
    });
  }

  /* ---------- 3. 签诗：最低权重 ---------- */
  const poemTone = toneScore(input.poem || '');
  if (poemTone !== 0) {
    evidence.push({
      label: '签诗语气',
      detail: `签诗首句「${firstClause(input.poem || '')}」，整体语气${poemTone > 0 ? '偏吉' : '偏抑'}（${poemTone * 0.3 > 0 ? '+' : ''}${(poemTone * 0.3).toFixed(1)}）。`,
      weight: poemTone * 0.3,
    });
  }

  const raw = base + offset + poemTone * 0.3;
  const score = graded ? clampScore(clampByLevel(raw, level)) : clampScore(raw);
  const verdict: Verdict = verdictOf(score);

  const headline = hit
    ? `签文对这一项的原话是「${firstClause(hit.text)}」`
    : `这一签没有单项断语，只能从签诗「${firstClause(input.poem || '')}」里读语气`;

  const tail = graded
    ? `签等是「${level}」，基调就摆在那里（${bandOf(verdictOf(base)).word}）；分项只在一档之内微调，不会把「${level}」读成相反的结果。`
    : '本签不分等级，以上按签文语气推定，仅作方向参考。';

  return {
    theme,
    verdict,
    score,
    subject: graded ? `${level}签 · ${hit?.label || '签诗语气'}` : `未分级签 · ${hit?.label || '签诗语气'}`,
    summary: composeSummary(theme, verdict, headline, tail),
    evidence: sortEvidence(evidence),
    advice: adviceOf(theme, verdict),
    note: JUDGE_RULE.lot,
  };
}

export function buildAllLotReadings(input: LotReadingInput): ThemeReading[] {
  return (['事业', '爱情', '亲情', '财运', '健康', '学业'] as Theme[]).map((t) =>
    buildLotReading(input, t),
  );
}
