import { describe, it, expect } from 'vitest';
import type { PillarData } from '../../types/chart';
import { buildDayunReadings, LIFE_STAGES, type DayunStep } from '../dayunReading';
import { generateDomainDeepReadings, type DomainDeepInput } from '../baziDomainDeep';
import { generateBaziPlainConclusion, type BaziConclusionInput } from '../plainConclusion';

/**
 * 晚年语气守卫：60 岁以上不得出现「进取型」事业 / 求财扩张措辞。
 *
 * ── 为什么要单独立一个文件 ────────────────────────────────────────
 * 这条约束**散落在三个文案出口**，各自实现、彼此不知情：
 *   · dayunReading   「阶段 × 十神」30 条 + 互动句（自带 LATE_FORBIDDEN 双保险）
 *   · baziDomainDeep 「眼下这步运」段的 career 分叉 + ageClause
 *   · plainConclusion 结论卡 part3（当前大运那句）
 * 只要有一个出口漏了，同屏就会出现两种声音：大运解读说「换节奏、看景」，
 * 结论卡却说「扛过去就上一个段位」。这种矛盾**不报错**，也逃过各自的单测——
 * 只能靠「把所有出口放在同一把尺子下量一遍」才发现。
 *
 * ── 两级词表（这是本文件的判据核心）────────────────────────────────
 * HARD（进取型指令）：任何 60+ 文案都不许出现。它们都是"要你往上冲"的动作。
 * SOFT（领域词）：`事业` `人脉` 在对应领域里是**导航词/领域内词汇**
 *   （career 的标题叫"事业格局的发动机"、social 有段叫"人脉的暗号"），
 *   禁掉会让段落读不通——但它们在「你该怎么做」的语境里必须消失。
 *   所以 SOFT 只对 dayunReading 与结论卡生效，不对领域解读生效。
 *
 * ⚠️ 别把 SOFT 也塞进领域解读的断言：那不是"更严"，是判错——
 *    禁了「事业」等于要求这个领域不许存在，禁了「人脉」等于砍掉社交领域的常用词。
 */
const HARD = [
  '晋升', '升职', '升迁', '创业', '融资', 'KPI', '业绩', '副业',
  '扩张', '合伙人', '组团队', '跳槽', '加薪', '往上走',
];
/** 领域词：在"该怎么做"的语境（大运/结论卡）里禁用；领域导航语境放行 */
const SOFT = ['事业', '人脉'];

const P = (pillar: string, tianGan: string, diZhi: string): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});
const PILLARS = [P('年柱', '乙', '丑'), P('月柱', '己', '卯'), P('日柱', '庚', '戌'), P('时柱', '庚', '辰')];

/** 结论卡入参：大运干支与年龄区间**固定**，只有 nominalAge 变——这样正文的任何差异都只能来自年龄判断 */
function conclusionInput(nominalAge?: number): BaziConclusionInput {
  return {
    pillars: ['乙丑', '己卯', '庚戌', '庚辰'],
    dayGan: '庚',
    dayWx: '金',
    dayZhi: '戌',
    dayShiShenZhi: '偏印',
    level: '身强',
    yongShen: ['火'],
    xiShen: ['木'],
    wxStrongest: '金',
    wxWeakest: '水',
    currentDaYun: { ganZhi: '戊寅', startAge: 60, endAge: 69 },
    liuNian: { year: 2026, ganZhi: '丙午', wx: '火', desc: '责任加身的一年，扛住就是升级，值得拼一把。' },
    nominalAge,
  };
}

/** 六大领域入参：大运干支与区间固定，只有 nominalAge 变 */
function domainInput(nominalAge: number): DomainDeepInput {
  return {
    pillars: PILLARS,
    shenSha: [],
    gender: '男',
    dayGan: '庚',
    strengthLevel: '身强',
    yongShen: ['火'],
    jiShen: ['金'],
    relations: [],
    currentDayun: { ganZhi: '戊寅', startAge: 60, endAge: 69 },
    nominalAge,
  };
}

/** 大运步骤：覆盖全部六个阶段，保证 60+ 的两段一定出现 */
const STEPS: DayunStep[] = [
  { ganZhi: '甲子', startAge: 8, endAge: 17 },
  { ganZhi: '乙丑', startAge: 18, endAge: 27 },
  { ganZhi: '丙寅', startAge: 28, endAge: 37 },
  { ganZhi: '丁卯', startAge: 38, endAge: 47 },
  { ganZhi: '戊辰', startAge: 48, endAge: 57 },
  { ganZhi: '己巳', startAge: 58, endAge: 67 },
  { ganZhi: '庚午', startAge: 68, endAge: 77 },
  { ganZhi: '辛未', startAge: 78, endAge: 87 },
];

function assertNone(text: string, words: string[], where: string) {
  for (const w of words) {
    expect(text.includes(w), `${where} 出现「${w}」：\n${text}`).toBe(false);
  }
}

describe('晚年语气：三个文案出口共用一把尺子', () => {
  it('阶段划分本身先成立（65 岁落在退休期、85 岁落在颐养期）', () => {
    // 前置断言：阶段表若被改动，下面几条会以"其实没进入晚期"的方式假绿
    expect(LIFE_STAGES.find((s) => 65 >= s.min && 65 <= s.max)?.key).toBe('retire');
    expect(LIFE_STAGES.find((s) => 85 >= s.min && s.max >= 85)?.key).toBe('elder');
  });

  it('结论卡：大运干支与年龄区间不变时，正文仍必须随年龄变化', () => {
    // ⚠️ 这条是"年龄有没有真的参与判断"的唯一有效断言。
    //    之前只比 `nominalAge` 不同的两份，但 startAge/endAge 也一起变了，
    //    差异全来自正文里打印的年龄数字——假绿。
    const young = generateBaziPlainConclusion(conclusionInput(30));
    const old = generateBaziPlainConclusion(conclusionInput(68));
    expect(old, `年龄没有参与结论卡判断，两段一字不差：\n${old}`).not.toBe(young);
  });

  it('结论卡：60 岁以后不出现进取型事业措辞，也不出现 SOFT 词', () => {
    for (const age of [60, 68, 82]) {
      const text = generateBaziPlainConclusion(conclusionInput(age));
      assertNone(text, [...HARD, ...SOFT], `${age} 岁结论卡`);
    }
  });

  it('六大领域「眼下这步运」：60 岁以后不出现进取型事业措辞', () => {
    for (const age of [60, 70, 85]) {
      for (const d of generateDomainDeepReadings(domainInput(age))) {
        for (const s of d.sections) {
          // 注意：这里只查 HARD。career 领域自带「事业」这个导航词，见文件头说明。
          assertNone(s.text, HARD, `${age} 岁 / ${d.domainKey} / ${s.heading}`);
        }
      }
    }
  });

  it('六大领域：career 与 health 的「眼下这步运」随年龄变，其余四域不受年龄影响', () => {
    const young = new Map(generateDomainDeepReadings(domainInput(30)).map((d) => [d.domainKey, d]));
    const old = new Map(generateDomainDeepReadings(domainInput(70)).map((d) => [d.domainKey, d]));
    const yunText = (d?: { sections: { heading: string; text: string }[] }) =>
      (d?.sections || []).filter((s) => s.heading.startsWith('眼下这步运')).map((s) => s.text).join('\n');

    // 事业与健康：必须分档（这是产品口径，写死就是错）
    expect(yunText(old.get('career'))).not.toBe(yunText(young.get('career')));
    expect(yunText(old.get('health'))).not.toBe(yunText(young.get('health')));
    // 其余四域：刻意不年龄化——若哪天有人给它们塞了年龄话，这条会红
    for (const key of ['love', 'family', 'social', 'personality'] as const) {
      expect(yunText(old.get(key)), `${key} 的「眼下这步运」不该随年龄变化`).toBe(yunText(young.get(key)));
    }
  });

  it('大运解读：60 岁以后不出现进取型事业措辞（正文与互动句都查）', () => {
    const chart = {
      pillars: PILLARS, dayWx: '金', yongShen: ['火'], jiShen: ['金'],
      strengthLevel: '身强', gender: '男',
    };
    for (const age of [62, 80]) {
      const { readings } = buildDayunReadings(STEPS, '庚', age, age, chart);
      for (const r of readings) {
        if (r.stage !== 'retire' && r.stage !== 'elder') continue;
        assertNone(r.text, [...HARD, ...SOFT], `${age} 岁 / ${r.ganZhi} / 正文`);
        if (r.interactionNote) assertNone(r.interactionNote, [...HARD, ...SOFT], `${age} 岁 / ${r.ganZhi} / 互动句`);
      }
    }
  });
});
