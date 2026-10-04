// ========== 神煞「本局解释」生成器 ==========
//
// 解决的问题：旧版每个神煞只有一句静态释义（SHENSHA_PLAIN）按名字取，
// 同一颗煞在任何盘、任何柱位看到的话都一样——用户读不出"这颗煞在我的盘里到底怎样"。
//
// 本模块把 shenShaPower 的结构化因子（落柱 / 十二长生得地 / 空亡 / 制化 / 喜忌）
// 加上同柱十神与日主强弱，翻译成绑定本盘的自然语言：
//   定位（在哪、得不得地、多大力）→ 作用领域（同柱十神）→ 兑现条件（喜忌）
//   → 阶段与用法（柱位人生阶段）→ 强弱交互（担不担得起）
//
// 与 shenShaPower 的分工：power 只出数字与档位，本模块只出人话，两者同源同参。

import type { PillarData } from '../pages/Bazi';
import { calcShenShaPower, type ShaPowerItem } from './shenShaPower';

export interface ShaExplainInput {
  pillars: PillarData[];
  shenSha: { name: string; pillar: string; type?: '吉' | '凶' | '平' }[];
  /** '身强' | '身弱' | '中和' | '身极强' | '身极弱' */
  strengthLevel?: string;
  /** 用神五行，如 ['木','火'] */
  yongShen?: string[];
}

export interface ShaExplainItem {
  name: string;
  pillar: string;
  ganZhi: string;
  type: '吉' | '凶' | '平';
  level: '强' | '中' | '弱';
  power: number;
  /** 落点定位句（在哪一柱、得不得地、多大力） */
  positioning: string;
  /** 本局实际作用句（因盘而异的核心结论） */
  verdict: string;
  /** 定位 + 作用，拼成一段 */
  text: string;
}

/** 柱位人生阶段（与项目 PLAIN 口径一致） */
const PILLAR_STAGE: Record<string, string> = {
  年柱: '早年与祖上，是出身与起点的影响',
  月柱: '青年与父母兄弟，是性格成型的关键期',
  日柱: '中年与自我配偶，是人生最核心的一段',
  时柱: '晚年与子女，也主晚景与传承',
};

/** 同柱十神 → 这颗煞的作用领域偏向 */
const SHISHEN_FIELD: Record<string, string> = {
  正官: '名分、责任与体制内的上下关系',
  七杀: '压力、竞争与需要魄力去闯的场合',
  正财: '稳定收入与务实经营',
  偏财: '机会财、人脉与横向资源',
  正印: '学历、长辈庇护与系统学习',
  偏印: '专门技术、直觉与非常规思路',
  食神: '才艺、从容输出与生活品质',
  伤官: '才华表达与不服管的冲劲',
  比肩: '自我意志、同辈关系与自立',
  劫财: '竞争、分财与合伙',
};

/** 十二长生 → 得地描述 */
function deDiText(cs: string): string {
  if (!cs) return '';
  if (cs === '临官' || cs === '帝旺') return '正得地，气势最足';
  if (cs === '长生' || cs === '冠带') return '得地且气新，起步就有力';
  if (cs === '沐浴') return '得地但气杂，力量带着不稳';
  if (cs === '衰' || cs === '病') return '气已渐退，力量打了折';
  if (cs === '胎' || cs === '养') return '气在孕育，力量尚浅';
  return '处失气之地，先天力量弱';
}

/** 制化描述（取最强制化一档，与 power 模型同口径） */
const RELATION_TEXT: Record<string, string> = {
  冲: '此支逢冲——力量被打散，相关的事容易反复',
  合: '此支被合——力量被人情与关系牵走，不全是自己的',
  刑: '此支逢刑——过程有摩擦，慢半拍、多确认一次更稳',
  害: '此支被害——暗处有损耗，提防看不见的小麻烦',
};

/** 十神 → 简短领域标签（用于 verdict 句） */
function shiShenOf(p: PillarData | undefined): string {
  const s = p?.shiShen || '';
  return SHISHEN_FIELD[s] ? s : '';
}

/**
 * 本局解释核心句：把因子转成「这颗煞在你盘里会怎样」。
 * 吉煞看「接不接得住」，凶煞看「防不防得住」，平煞看「随什么而定」。
 */
function verdictOf(
  item: ShaPowerItem,
  type: '吉' | '凶' | '平',
  opts: { strengthLevel?: string; yongShen: string[]; inYong: boolean; shiShen: string },
): string {
  const { strengthLevel = '', inYong, shiShen } = opts;
  const isStrong = strengthLevel === '身强' || strengthLevel === '身极强';
  const isWeak = strengthLevel === '身弱' || strengthLevel === '身极弱';
  const field = shiShen ? `作用点偏在${SHISHEN_FIELD[shiShen]}上` : '';
  const rel = item.factors.relationType;
  const kong = item.factors.kong < 1;

  const parts: string[] = [];

  // 1) 兑现条件（喜忌）
  if (type === '吉') {
    parts.push(inYong
      ? '它正落在你的用神上，是能用得上的助力'
      : '它不在你的用神上，好处要主动去接，不接就只是"看着好"');
  } else if (type === '凶') {
    parts.push(inYong
      ? '它落在你的用神上，凶性被化掉一部分，属于"可控的压力"'
      : '它不在用神上，凶性会直接显现，宜提前设防而不是事后补救');
  } else {
    parts.push('它性质中性，实际走向要看你把它用在什么事上');
  }

  // 2) 强弱交互
  if (isStrong) {
    parts.push(type === '凶'
      ? '日主身强有力，这股煞气你担得起，当作磨刀石用反而出成绩'
      : '日主身强有力，吉气你接得住、留得下');
  } else if (isWeak) {
    parts.push(type === '凶'
      ? '但日主偏弱，逢这股力量要避其锋芒，别硬碰'
      : '但日主偏弱，吉气得靠借力（贵人、平台、团队）才吃得下，别独自硬撑');
  }

  // 3) 落空提示（放最后，作为最强限定）
  if (kong) parts.push('此支又落空亡，星是"虚"的——有名无实，别把希望全押在这一处');

  // 4) 制化（若与空亡叠加则只保留更强的冲）
  if (rel && RELATION_TEXT[rel] && (!kong || rel === '冲')) {
    parts.push(RELATION_TEXT[rel]);
  }

  return (field ? `这颗煞的${field}；` : '') + parts.join('；') + '。';
}

/**
 * 为每一处神煞落点生成「本局解释」。
 * 同名多柱各出一条（柱位不同则定位、阶段、强弱交互都不同），与 power 模型同构。
 */
export function explainShenSha(input: ShaExplainInput): ShaExplainItem[] {
  const { pillars, shenSha, strengthLevel, yongShen = [] } = input;
  const items = calcShenShaPower({ pillars, shenSha, strengthLevel, yongShen });
  const ZHI_WX: Record<string, string> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
    午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
  };

  return items.map((item) => {
    const idx = ['年柱', '月柱', '日柱', '时柱'].indexOf(item.pillar);
    const p = pillars[idx];
    const ganZhi = p?.ganZhi || '';
    const zhi = p?.diZhi || '';
    const cs = item.factors.changSheng;
    const stage = PILLAR_STAGE[item.pillar] || '';
    const shiShen = shiShenOf(p);
    const inYong = yongShen.includes(ZHI_WX[zhi] || '');

    // 定位句
    const levelWord = item.level === '强' ? '力量属强档' : item.level === '中' ? '力量中等' : '力量偏弱';
    const positioning = `落${item.pillar}${ganZhi ? `（${ganZhi}）` : ''}${cs ? `，此处为日主的${cs}之地，${deDiText(cs)}` : ''}，${levelWord}。`;

    // 作用句
    const verdict = verdictOf(item, item.type, { strengthLevel, yongShen, inYong, shiShen });

    // 阶段句
    const stageText = stage ? `它主要在你${item.pillar}所主的阶段显威——${stage}，用法上要顺着这个时间段的重心来。` : '';

    return {
      name: item.name,
      pillar: item.pillar,
      ganZhi,
      type: item.type,
      level: item.level,
      power: item.power,
      positioning,
      verdict,
      text: positioning + (stageText ? stageText + verdict : verdict),
    };
  });
}

/** 取某一处神煞的本局解释（页面按 name|pillar 查用） */
export function explainShenShaMap(input: ShaExplainInput): Record<string, ShaExplainItem> {
  const out: Record<string, ShaExplainItem> = {};
  for (const it of explainShenSha(input)) out[`${it.name}|${it.pillar}`] = it;
  return out;
}
