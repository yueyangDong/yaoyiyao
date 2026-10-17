// ========== 官杀混杂与去留判定 · 唯一出口 ==========
//
// 判据出处与流派分歧见 `docs/guansha-hunza.md`；改前先读、改后同步。
//
// 三道筛（折中口径：**不设身强弱硬门槛**，无去留时输出分档）：
//   ① 齐透天干——正官与七杀同时透干才谈混杂；地支藏干不计，一藏一透以透者论。
//   ② 去留优先——有制/合取清则以所留者论格，不叫混杂：
//      制：有力食伤克杀 = 去杀留官；有力伤官克官 = 去官留杀（阳日伤官须劫刃合杀才成立）。
//      合：杀被他干合住 = 合杀留官；官被他干合住 = 合官留杀（「合官不为贵」，层级降一档）。
//      化：印透有根 = 官杀生印、印生身——由「杀印相生 / 正官佩印」前置拦截，不到这里。
//      「有力」三关：有根（地支本气/藏干同五行）、未被闲神合绊、无印夺食。
//   ③ 无去留时分档：身强 → 官杀集结（身能任，不作混杂论）；
//      有虚浮制化 → 混而有制；全无 → 混而无制。
//
// 阴阳干细则（《三命通会》卷五）：
//   阳日食神——能去杀、又能留官；阳日伤官——只去官、不能留杀，须得羊刃合方成去官留杀；
//   阴日食神——只去杀、不能留官（日主自能留之）；阴日伤官——能去官、又能留杀。
// ⚠️ 五合的方向性：**阳日食神的五合对象恒为正官**（丙合辛、壬合丁、庚合乙、甲合己、戊合癸），
//    合官是「留」不是「绊」；**阴日伤官的五合对象恒为七杀**，合杀是「留」。
//    只有被「非官杀的闲神」合走才叫绊住。写反了就是「丙合辛官 → 制杀无力」这种方向性错误。
// ⚠️ 身强弱不设硬门槛是刻意的折中：A 派（三命通会）不设豁免、B 派（天机排盘）身旺论集结——
//    用「官杀集结」这一档承接身强盘，两边都不丢。

import type { PillarData } from '../pages/Bazi';
import { GAN_WX, WX_KE, YANG_GAN } from './wuXingRelations';

/** 天干五合：键与值相合（双向都已收录，任意一边做键都行） */
const GAN_HE: Record<string, string> = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛',
  '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊',
};

export type HunZaTier =
  | '去杀留官' | '去官留杀' | '合杀留官' | '合官留杀'
  | '官杀集结' | '混而有制' | '混而无制';

export interface HunZaResult {
  /** null = 官杀未齐透，不构成混杂（以透者论） */
  tier: HunZaTier | null;
  score: string;
  detail: string;
  basis: string[];
}

interface Stem {
  gan: string;
  ss: string;
  wx: string;
  pillar: string;
}

const SHI_SHANG = ['食神', '伤官'];
const YIN_SET = ['正印', '偏印'];
const BI_JIE = ['比肩', '劫财'];

/**
 * 官杀混杂判定唯一出口。
 * @param pillars 四柱（年/月/日/时；日柱天干十神为「日主」，自动排除）
 * @param dayGan 日干
 * @param strengthLevel 旺衰五档（仅用于「无去留」时的分档，不作硬门槛）
 */
export function analyzeGuanShaHunZa(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
): HunZaResult {
  const none: HunZaResult = { tier: null, score: '', detail: '', basis: [] };
  if (!pillars || pillars.length < 4 || !dayGan) return none;

  // 天干（日柱除外）
  const stems: Stem[] = pillars
    .filter((_, i) => i !== 2)
    .map((p) => ({ gan: p.tianGan, ss: p.shiShen, wx: GAN_WX[p.tianGan] || '', pillar: p.pillar }));

  const guanStems = stems.filter((s) => s.ss === '正官');
  const shaStems = stems.filter((s) => s.ss === '七杀');
  if (guanStems.length === 0 || shaStems.length === 0) return none;

  const guan = guanStems[0];
  const sha = shaStems[0];
  const isYang = YANG_GAN.includes(dayGan);
  const stemGans = stems.map((s) => s.gan);
  const basis: string[] = [
    `天干${guan.pillar}${guan.gan}（正官）与${sha.pillar}${sha.gan}（七杀）齐透——齐透天干是官杀混杂的硬门槛（地支藏干不计，一藏一透以透者论）`,
  ];

  /** 五行在四柱地支有无根（本气或藏干同五行） */
  const hasRoot = (wx: string): string[] => {
    const hits: string[] = [];
    for (const p of pillars) {
      for (const c of p.cangGan || []) {
        if (GAN_WX[c] === wx) hits.push(`${p.pillar}${p.diZhi}`);
      }
    }
    return hits;
  };

  /** 合住某干的他干（五合，双向） */
  const hePartnersOf = (g: string): Stem[] => stems.filter((o) => o.gan !== g && GAN_HE[o.gan] === g);

  const yinTou = stems.filter((s) => YIN_SET.includes(s.ss));
  const shishangStems = stems.filter((s) => SHI_SHANG.includes(s.ss));

  /** 「有力」三关：有根、未被非官杀闲神合绊、无印夺食（印克食伤恒成立） */
  const powerOf = (s: Stem) => {
    const roots = hasRoot(s.wx);
    const bannedBy = hePartnersOf(s.gan).filter((o) => o.ss !== '正官' && o.ss !== '七杀');
    const duoShi = yinTou.length > 0;
    return {
      roots,
      bannedBy,
      duoShi,
      strong: roots.length > 0 && bannedBy.length === 0 && !duoShi,
      weakReason: roots.length === 0
        ? '无根虚浮'
        : bannedBy.length > 0
          ? `被${bannedBy.map((b) => b.gan).join('、')}合绊`
          : '被印星夺食',
    };
  };

  // ---- 制 ----
  // ⚠️ 去留分工：去杀恒用食神、去官恒用伤官（《三命通会》阴阳干细则）。不取「伤官制杀 /
  //    食神去官」——五行上虽克，但不在去留体系内（阴日伤官与杀恒五合，是「留」不是「去」）。
  //    食神/伤官的五行必克杀/官（我生者克克我者，结构上恒成立），WX_KE 校验是防御性的。
  // ⚠️ 不设「官杀俱去」档：需官+杀+食+伤四干齐透，四柱除日干仅三干，结构上不可能。
  const shaKillers = shishangStems.filter((s) => s.ss === '食神' && powerOf(s).strong && WX_KE[s.wx] === sha.wx);
  const guanKillers = shishangStems.filter((s) => s.ss === '伤官' && powerOf(s).strong && WX_KE[s.wx] === guan.wx);
  const quSha = shaKillers.length > 0;
  const quGuan = guanKillers.length > 0;

  // ---- 合 ----
  const shaHe = hePartnersOf(sha.gan);   // 合住杀的他干
  const guanHe = hePartnersOf(guan.gan); // 合住官的他干
  /** 劫刃合杀（羊刃合杀：比肩/劫财合七杀 → 留杀） */
  const renHeSha = shaHe.some((o) => BI_JIE.includes(o.ss));

  const fmt = (list: Stem[]) => list.map((k) => `${k.pillar}${k.gan}（${k.ss}）`).join('、');
  const pack = (tier: HunZaTier, score: string, detail: string): HunZaResult => ({ tier, score, detail, basis });

  // ---- 决策 ----
  if (quSha) {
    basis.push(`${fmt(shaKillers)}有力制去七杀${sha.gan}（有根、未被闲神合绊、无印夺食）→ 去杀留官，格局取清`);
    if (isYang) basis.push('阳日干食神的五合对象恒为正官——合官是"留"不是"绊"，官星更清');
    return pack('去杀留官', '上等',
      `正官${guan.gan}与七杀${sha.gan}齐透，本属官杀交差；幸有${fmt(shaKillers)}制去七杀，官星独清——古法谓"去杀留官当论贵"。格局清纯，贵气不减。`);
  }
  if (quGuan) {
    if (!isYang || renHeSha) {
      const extra = isYang ? `，并有${shaHe.filter((o) => BI_JIE.includes(o.ss)).map((o) => o.gan).join('、')}劫刃合杀留杀` : '（阴日伤官能去官又能留杀）';
      basis.push(`${fmt(guanKillers)}有力制去正官${guan.gan}${extra} → 去官留杀，格局取清`);
      return pack('去官留杀', '中上',
        `正官${guan.gan}与七杀${sha.gan}齐透，本属官杀交差；幸有${fmt(guanKillers)}制去正官${extra ? '、劫刃合住七杀' : ''}，七杀独清——古法谓"去官留杀主威权"。格局清纯，以威权论。`);
    }
    // 阳日伤官单去官：不能留杀，不算取清
    basis.push(`${fmt(guanKillers)}有力制去正官${guan.gan}，但阳日干伤官"但能去官、不能留杀"——须劫刃合杀方成去官留杀；此盘杀无制合，不取清`);
  }
  if (!quSha && !quGuan && (renHeSha || shaHe.length > 0)) {
    basis.push(`${shaHe.map((o) => `${o.pillar}${o.gan}`).join('、')}合住七杀${sha.gan} → 合杀留官，格局取清`);
    return pack('合杀留官', '中上',
      `正官${guan.gan}与七杀${sha.gan}齐透，幸有${shaHe.map((o) => `${o.gan}（${o.ss}）`).join('、')}合住七杀——"合杀忘贱"，杀不逞凶而官星独清，以官论格。`);
  }
  if (!quSha && !quGuan && shaHe.length === 0 && guanHe.length > 0) {
    basis.push(`${guanHe.map((o) => `${o.pillar}${o.gan}`).join('、')}合住正官${guan.gan} → 合官留杀；⚠️「合官不为贵」，层级降一档`);
    return pack('合官留杀', '中等',
      `正官${guan.gan}与七杀${sha.gan}齐透，正官被${guanHe.map((o) => o.gan).join('、')}合去，七杀独清——格局虽清，但古法谓"合官忘贵"，贵气打折，以杀论格。`);
  }

  // ---- 无有效去留：分档 ----
  basis.push('无有效制合手段（或制化无力）');
  const weakDefense = shishangStems.filter((s) => !powerOf(s).strong)
    .map((s) => `${s.pillar}${s.gan}（${s.ss}）${powerOf(s).weakReason}`);
  const weakYin = yinTou.filter((s) => hasRoot(s.wx).length === 0)
    .map((s) => `${s.pillar}${s.gan}（${s.ss}）无根`);
  const defense = [...weakDefense, ...weakYin];

  if (defense.length > 0) {
    basis.push(`有${defense.join('；')} → 制化存在但无力，记"混而有制"`);
    return pack('混而有制', '中下',
      `正官${guan.gan}与七杀${sha.gan}齐透、日主${strengthLevel}，且${defense.join('，')}——有救应的手段但使不上劲。压力是真的，解法也在：岁运扶起那个制化的字，局面立刻清爽。`);
  }
  if (strengthLevel === '身强' || strengthLevel === '身极强') {
    basis.push(`日主「${strengthLevel}」能任官杀 → 不作混杂论，记"官杀集结"`);
    return pack('官杀集结', '中等',
      `正官${guan.gan}与七杀${sha.gan}齐透，但日主${strengthLevel}能任——两股"被管"的力在身强盘上是资源而非压力：正官主名分、七杀主魄力，刚柔并济。此按"集结"论，不作混杂。`);
  }
  basis.push(`日主「${strengthLevel}」不能任，又无去留 → 混而无制`);
  return pack('混而无制', '下等',
    `正官${guan.gan}与七杀${sha.gan}齐透、无制无化、日主${strengthLevel}偏弱——两套规则同时压身且互不相让，容易左右摇摆、上下失据。古法以此为官杀混杂。但这不是"命坏"，是结构内耗：岁运来印化、来食伤制、来劫刃合杀，皆是解药；人生选择上"去一留一"，局面立刻清爽。`);
}
