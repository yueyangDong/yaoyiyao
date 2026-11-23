import { describe, it, expect } from 'vitest';
import {
  generateDomainDeepReadings, shaHeading, normalizeSections,
  isShaSectionHeading, normalizeShaHeading,
} from '../baziDomainDeep';
import type { PillarData } from '../../types/chart';

// 命例 mock：甲日主，年柱戊辰、月柱丁丑、日柱甲子（日支正印）、时柱甲戌
const pillars: PillarData[] = [
  { pillar: '年柱', ganZhi: '戊辰', tianGan: '戊', diZhi: '辰', cangGan: ['戊', '乙', '癸'], shiShen: '偏财', shiShenZhi: '偏财/劫财/正印', nayin: '大林木' },
  { pillar: '月柱', ganZhi: '丁丑', tianGan: '丁', diZhi: '丑', cangGan: ['己', '癸', '辛'], shiShen: '伤官', shiShenZhi: '正财/正印/正官', nayin: '涧下水' },
  { pillar: '日柱', ganZhi: '甲子', tianGan: '甲', diZhi: '子', cangGan: ['癸'], shiShen: '日主', shiShenZhi: '正印', nayin: '海中金' },
  { pillar: '时柱', ganZhi: '甲戌', tianGan: '甲', diZhi: '戌', cangGan: ['戊', '辛', '丁'], shiShen: '比肩', shiShenZhi: '偏财/正官/伤官', nayin: '山头火' },
];

const baseInput = {
  pillars,
  shenSha: [
    { name: '桃花', pillar: '日柱' },
    { name: '天乙贵人', pillar: '月柱' },
    { name: '羊刃', pillar: '月柱' },
    { name: '驿马', pillar: '年柱' },
  ],
  gender: 'male',
  dayGan: '甲',
  strengthLevel: '偏弱',
  yongShen: ['水', '木'],
  relations: [],
};

/**
 * ⚠️ 断言一律按标题取段，不写 `sections[2]`：
 * 段落顺序是"判读层级"的一部分，会随产品口径调整（本次就把神煞从第 2 段挪到末段），
 * 用下标会把顺序焊死在测试里，改口径就得改一堆与本意无关的断言。
 */
const sec = (reading: any, key: string) =>
  reading.sections.find((s: any) => s.heading.includes(key));

const DOMAINS = ['personality', 'love', 'career', 'health', 'family', 'social'];

describe('generateDomainDeepReadings 六领域深度解读', () => {
  const readings = generateDomainDeepReadings(baseInput);
  const byKey: Record<string, any> = {};
  for (const r of readings) byKey[r.domainKey] = r;

  it('六个领域全部生成，各含4段分层结构', () => {
    expect(readings).toHaveLength(6);
    for (const key of DOMAINS) {
      expect(byKey[key]).toBeDefined();
      expect(byKey[key].sections.length).toBe(4);
    }
  });

  it('⚠️ 段落层级：主判在前、神煞垫底，且标题明写「不单独定吉凶」', () => {
    for (const key of DOMAINS) {
      const sections = byKey[key].sections;
      // 第一段必须是主判（十神/月令/宫位/旺衰），不能是神煞
      expect(sections[0].role).not.toBe('modifier');
      // 第二段也不能是神煞（这正是本次要修的毛病）
      expect(sections[1].role).not.toBe('modifier');
      // 神煞段在末位、有 role 标记、标题带免责声明
      const last = sections[sections.length - 1];
      expect(last.role).toBe('modifier');
      expect(last.heading.startsWith('神煞修饰')).toBe(true);
      expect(last.heading).toContain('不单独定吉凶');
      // 全篇不得再出现旧标题
      expect(sections.map((s: any) => s.heading).join('|')).not.toContain('神煞点睛');
    }
  });

  it('神煞段标题统一由 shaHeading 生成，避免各领域各写一套', () => {
    expect(shaHeading('性格的暗号')).toBe('神煞修饰·性格的暗号（不单独定吉凶）');
  });

  it('爱情：夫妻宫底牌引日柱干支与坐支十神；神煞段含桃花', () => {
    const love = byKey.love;
    const base = sec(love, '夫妻宫的底牌');
    expect(base.text).toContain('甲子');
    expect(base.text).toContain('正印');
    expect(base.role).toBe('primary');
    expect(sec(love, '神煞修饰').text).toContain('【桃花·日柱】');
    expect(sec(love, '经营之道').text).toContain('水、木'); // 喜用神
  });

  it('事业：月令十神发动机（丑藏己土正财）+ 天乙贵人作修饰', () => {
    const career = byKey.career;
    expect(sec(career, '月令十神').text).toContain('正财');
    expect(sec(career, '月令十神').role).toBe('primary');
    expect(sec(career, '神煞修饰').text).toContain('【天乙贵人·月柱】');
    // 财富形状：年干偏财透出
    expect(sec(career, '财富的形状').text).toContain('偏财在年柱戊辰');
  });

  it('健康：体质底色（旺衰）在前，羊刃只作修饰；五行短板与喜用神开方', () => {
    const health = byKey.health;
    expect(sec(health, '体质的底色').text).toContain('日主甲（木）');
    expect(sec(health, '体质的底色').text).toContain('偏弱'); // strengthLevel 进主判段
    expect(sec(health, '神煞修饰').text).toContain('【羊刃·月柱】');
    expect(sec(health, '五行短板').heading).toContain('五行短板');
    expect(sec(health, '养生方案').text).toContain('水、木');
  });

  it('家庭：男命父星=偏财（年柱戊辰命中）；喜用神相处建议', () => {
    const family = byKey.family;
    expect(sec(family, '六亲宫位').text).toContain('父星（偏财）在年柱戊辰');
    expect(sec(family, '相处建议').text).toContain('水、木');
  });

  it('社交：驿马进神煞段，择友建议仍按喜用神出人话', () => {
    const social = byKey.social;
    expect(sec(social, '神煞修饰').text).toContain('【驿马·年柱】');
    expect(sec(social, '择友建议').text).toContain('灵活会变通'); // 水→贵人气质
  });

  it('无血光神煞时健康段走平顺文案；日支逢冲时感情暗线提示', () => {
    const r = generateDomainDeepReadings({
      ...baseInput,
      shenSha: [],
      relations: [{ type: '冲', desc: '日柱地支子与月柱地支丑相破；日支子逢冲（示例）' }],
    });
    const health = r.find((x) => x.domainKey === 'health')!;
    expect(sec(health, '神煞修饰').text).toContain('体质底子平顺');
    const love = r.find((x) => x.domainKey === 'love')!;
    expect(sec(love, '感情暗线').text).toContain('日支逢冲');
  });

  it('relations 带 pillars 时按柱位结构化判断夫妻宫（刑类不再漏报）', () => {
    const r = generateDomainDeepReadings({
      ...baseInput,
      shenSha: [],
      // 刑类 desc 不含「日柱」字样，仅靠 pillars 命中 —— 旧字符串匹配在此漏报
      relations: [{ type: '刑', desc: '子卯相刑（无礼之刑），示例文案不含柱位', pillars: [2, 3] }],
    });
    const love = r.find((x) => x.domainKey === 'love')!;
    expect(sec(love, '感情暗线').text).toContain('日支逢刑');
  });

  it('传入 analyses 时合并为单一解读：领域分析并入对应段，页面不再重复', () => {
    const r = generateDomainDeepReadings({
      ...baseInput,
      analyses: {
        love: { spouseFeature: '配偶特征样例', marriageQuality: '婚姻质量样例', peachBlossom: '桃花样例', advice: '感情建议样例' },
        career: { direction: '事业方向样例', moneyMethod: '赚钱样例', fortuneTrend: '财运样例', nobleHelp: '贵人样例', advice: '事业建议样例' },
      },
    });
    const love = r.find((x) => x.domainKey === 'love')!;
    expect(sec(love, '夫妻宫的底牌').text).toContain('配偶特征样例');
    expect(sec(love, '神煞修饰').text).toContain('桃花样例');
    // 婚姻质量仍覆盖暗线段（口径不变，只是位置前移）
    expect(sec(love, '婚姻质量').heading).toContain('婚姻质量');
    expect(sec(love, '婚姻质量').text).toBe('婚姻质量样例');
    expect(sec(love, '经营之道').text).toContain('感情建议样例');
    const career = r.find((x) => x.domainKey === 'career')!;
    // 贵人佐证仍落进神煞段，但整段在末位
    expect(sec(career, '神煞修饰').text).toContain('贵人样例');
    expect(career.sections[career.sections.length - 1].role).toBe('modifier');
  });

  it('命局指纹：性格领域按 日主/月令/强弱/主导十神 定调，且不再是固定模板', () => {
    const r = generateDomainDeepReadings(baseInput);
    const p = r.find((x) => x.domainKey === 'personality')!;
    const gang = sec(p, '十神给的性格骨架');
    expect(gang.text).toContain('【命局指纹】');
    expect(gang.text).toContain('日主属木');   // 甲日主
    expect(gang.text).toContain('生于丑月');   // 丑月令
    // 主导十神组不同 → 各领域建议段文案不同
    const r2 = generateDomainDeepReadings({
      ...baseInput,
      pillars: [
        { ...pillars[0], shiShen: '正官' },
        { ...pillars[1], shiShen: '七杀' },
        pillars[2],
        { ...pillars[3], shiShen: '正印' },
      ],
    });
    const careerA = r.find((x) => x.domainKey === 'career')!;
    const careerB = r2.find((x) => x.domainKey === 'career')!;
    expect(careerA.sections.map((s: any) => s.text).join('')).not.toBe(careerB.sections.map((s: any) => s.text).join(''));
  });
});

/**
 * 出口归一化。这组用例防的是"忘标"而不是"写错"：
 * role 是选填的，将来有人加段落忘了标、或把神煞段 push 到中间，
 * 都不会有任何报错——只会静默把修饰项变成主判。所以出口必须自己兜住。
 */
describe('normalizeSections 出口归一化', () => {
  const P = (heading: string, text = '正文') => ({ heading, text });

  it('⚠️ 漏标 role 的神煞段 → 自动降级为修饰、补免责声明、压到末位', () => {
    const out = normalizeSections([
      { heading: '神煞点睛·性格的暗号', text: '旧标题样例' },   // 既漏标又是历史别名
      P('十神给的性格骨架'),
    ]);
    expect(out.map((s) => s.heading)).toEqual([
      '十神给的性格骨架',
      '神煞修饰·性格的暗号（不单独定吉凶）',
    ]);
    expect(out[0].role).toBe('primary');
    expect(out[1].role).toBe('modifier');
    // 历史别名一个都不许留
    expect(out.map((s) => s.heading).join('|')).not.toContain('神煞点睛');
  });

  it('标了 modifier 但标题不是神煞前缀 → 仍按 role 压到末位（role 说了算）', () => {
    const out = normalizeSections([
      { heading: '补充说明', text: '修饰正文', role: 'modifier' },
      P('体质的底色'),
    ]);
    expect(out.map((s) => s.heading)).toEqual(['体质的底色', '补充说明']);
    expect(out[1].role).toBe('modifier');
  });

  it('前缀判断只看开头：主判标题里出现「神煞」二字不会被误降级', () => {
    expect(isShaSectionHeading('神煞修饰·性格的暗号（不单独定吉凶）')).toBe(true);
    expect(isShaSectionHeading('十神与神煞的配合')).toBe(false);
    const out = normalizeSections([{ heading: '十神与神煞的配合', text: '主判正文' }, P('夫妻宫的底牌')]);
    expect(out.every((s) => s.role === 'primary')).toBe(true);
    expect(out).toHaveLength(2);
  });

  it('空正文的段直接丢弃，不留「附｜…」空壳', () => {
    const out = normalizeSections([
      P('事业格局的发动机'),
      { heading: shaHeading('职场的底牌'), text: '   ', role: 'modifier' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].heading).toBe('事业格局的发动机');
  });

  it('幂等：归一后的结果再归一一次不变（出口可能被重复调用）', () => {
    const once = normalizeSections([
      { heading: '神煞点睛·人脉的暗号', text: '样例正文' },
      P('社交风格'),
      P('朋友圈的形状'),
    ]);
    expect(normalizeSections(once)).toEqual(once);
    expect(normalizeShaHeading(normalizeShaHeading('神煞点睛·人脉的暗号')))
      .toBe('神煞修饰·人脉的暗号（不单独定吉凶）');
  });

  it('真实产出全部合规：role 只有两档，且含「神煞」的标题必带免责声明', () => {
    for (const r of generateDomainDeepReadings(baseInput)) {
      for (const s of r.sections) {
        expect(['primary', 'modifier']).toContain(s.role);
        if (s.heading.includes('神煞')) expect(s.heading).toContain('不单独定吉凶');
      }
      // 主判段一定排在所有修饰段之前
      const firstMod = r.sections.findIndex((s) => s.role === 'modifier');
      if (firstMod >= 0) {
        expect(r.sections.slice(firstMod).every((s) => s.role === 'modifier')).toBe(true);
      }
    }
  });
});

/**
 * 眼下这步运（大运 × 领域宫位）
 *
 * 命例：甲日主（木），喜用水木；四柱 戊辰 / 丁丑 / 甲子 / 甲戌
 *  → 夫妻宫子、月令丑、父母宫辰。
 * 取「丙午」运：午冲子（夫妻宫）、午与丑相害（月令）、午与辰无关系；
 *  天干丙对甲为「食神」（食伤类）；丙午皆火，既非喜用也非忌神 → 过渡基调。
 */
describe('眼下这步运（大运层）', () => {
  const withYun = (extra: Record<string, any> = {}) =>
    generateDomainDeepReadings({
      ...baseInput,
      currentDayun: { ganZhi: '丙午', startAge: 27, endAge: 36 },
      nominalAge: 30,
      jiShen: [],
      ...extra,
    });
  const secOf = (r: any, key: string) => r.sections.find((s: any) => s.heading.includes(key));

  it('缺 currentDayun 时不生成该段（六领域回到 4 段，不留占位话）', () => {
    for (const r of generateDomainDeepReadings(baseInput)) {
      expect(r.sections).toHaveLength(4);
      expect(r.sections.some((s) => s.heading.includes('眼下这步运'))).toBe(false);
    }
  });

  it('有大运时六领域各 5 段，大运段是第 2 段、主判、标题写干支与岁数区间', () => {
    for (const r of withYun()) {
      expect(r.sections).toHaveLength(5);
      const y = r.sections[1];
      expect(y.role).toBe('primary');
      expect(y.heading).toContain('眼下这步运');
      expect(y.heading).toContain('丙午');
      expect(y.heading).toContain('27~36 岁');
      // 神煞仍是末段：大运段不能挤掉层级
      expect(r.sections[r.sections.length - 1].role).toBe('modifier');
    }
  });

  it('⚠️ 落点按领域宫位分叉：午冲夫妻宫 / 午害月令，两个领域不能同一句话', () => {
    const list = withYun();
    const love = list.find((x) => x.domainKey === 'love')!;
    const career = list.find((x) => x.domainKey === 'career')!;
    expect(secOf(love, '眼下这步运').text).toContain('夫妻宫子被冲');
    expect(secOf(career, '眼下这步运').text).toContain('月令丑受害');
    expect(secOf(love, '眼下这步运').text).not.toBe(secOf(career, '眼下这步运').text);
    // 无关系的领域走「按原样走」，不能硬造动静
    const family = list.find((x) => x.domainKey === 'family')!;
    expect(secOf(family, '眼下这步运').text).toContain('父母宫辰');
    expect(secOf(family, '眼下这步运').text).toContain('没有刑冲合害');
  });

  it('⚠️ 喜忌方向必须相反：同一「丙午」，落在喜用与落在忌神的说法不能一样', () => {
    const good = withYun({ yongShen: ['火', '木'], jiShen: [] });
    const bad = withYun({ yongShen: ['水', '木'], jiShen: ['火'] });
    const g = secOf(good.find((x) => x.domainKey === 'career')!, '眼下这步运').text;
    const b = secOf(bad.find((x) => x.domainKey === 'career')!, '眼下这步运').text;
    expect(g).toContain('顺着你走');
    expect(b).toContain('逆水期');
    expect(g).not.toBe(b);
  });

  it('健康题不看宫位，看「大运支五行 vs 日主五行」：午火对甲木是「泄」', () => {
    const health = withYun().find((x) => x.domainKey === 'health')!;
    const t = secOf(health, '眼下这步运').text;
    expect(t).toContain('日主所生'); // 木生火 = 精力外泄
    expect(t).not.toContain('夫妻宫');
  });

  it('⚠️ 60+ 禁提事业晋升/创业/融资：措辞换成「交出去、名声比职位值钱」', () => {
    const old = withYun({ nominalAge: 65 }).find((x) => x.domainKey === 'career')!;
    const t = secOf(old, '眼下这步运').text;
    expect(t).toContain('名声比职位值钱');
    for (const banned of ['晋升', '创业', '融资', 'KPI', '副业', '扩张', '合伙人', '人脉']) {
      expect(t.includes(banned)).toBe(false);
    }
  });

  it('⚠️ 换一步运整段就换话（不是换个干支名了事）', () => {
    const a = withYun().find((x) => x.domainKey === 'love')!;
    const b = withYun({ currentDayun: { ganZhi: '戊戌', startAge: 37, endAge: 46 } })
      .find((x) => x.domainKey === 'love')!;
    expect(secOf(a, '眼下这步运').text).not.toBe(secOf(b, '眼下这步运').text);
    // 戊戌：戌与子无刑冲合害；丙午：午冲子 —— 结论方向必须不同
    expect(secOf(a, '眼下这步运').text).toContain('被冲');
    expect(secOf(b, '眼下这步运').text).toContain('没有刑冲合害');
  });

  it('干支同五行时不拼成「木木」：写「干支都属火」这类说法', () => {
    const t = secOf(withYun().find((x) => x.domainKey === 'personality')!, '眼下这步运').text;
    expect(t).toContain('干支都属火'); // 丙午 = 火火
    expect(t).not.toMatch(/干支[木火土金水]{2}/); // 不许出现「干支木木」
  });

  it('大运段本身也要过归一化：role 显式、无空正文', () => {
    for (const r of withYun()) {
      const y = r.sections.find((s) => s.heading.includes('眼下这步运'))!;
      expect(y.role).toBe('primary');
      expect(y.text.trim().length).toBeGreaterThan(30);
    }
  });
});
