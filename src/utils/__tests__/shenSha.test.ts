import { describe, it, expect } from 'vitest';
import { calcShenSha, getKongWang } from '../shenSha';

const P = (gz: string) => ({
  tianGan: gz[0],
  diZhi: gz[1],
  ganZhi: gz,
});

const names = (r: { name: string; pillar: string }[]) => r.map(x => `${x.pillar}${x.name}`);

describe('getKongWang', () => {
  it('甲子旬（含癸酉）空戌亥', () => {
    expect(getKongWang('癸酉')).toEqual(['戌', '亥']);
    expect(getKongWang('甲子')).toEqual(['戌', '亥']);
    expect(getKongWang('壬申')).toEqual(['戌', '亥']);
  });
  it('甲戌旬空申酉', () => {
    expect(getKongWang('甲戌')).toEqual(['申', '酉']);
    expect(getKongWang('丙子')).toEqual(['申', '酉']);
  });
  it('甲寅旬空子丑', () => {
    expect(getKongWang('甲寅')).toEqual(['子', '丑']);
  });
});

describe('calcShenSha 修正与扩充', () => {
  it('用户案例：癸酉日柱命带金神（日柱+时柱均判）', () => {
    const r = calcShenSha([P('甲子'), P('丙子'), P('癸酉'), P('乙丑')]);
    expect(names(r)).toContain('日柱金神');
    expect(names(r)).toContain('时柱金神');
  });

  it('时柱金神：仅时柱见乙丑/己巳/癸酉', () => {
    const r = calcShenSha([P('甲子'), P('丙子'), P('庚午'), P('己巳')]);
    expect(names(r)).toContain('时柱金神');
  });

  it('金神不在年柱/月柱论', () => {
    const r = calcShenSha([P('癸酉'), P('甲子'), P('丙子'), P('庚午')]);
    expect(r.filter(x => x.name === '金神')).toHaveLength(0);
  });

  it('空亡修正：癸酉日见戌/亥为空亡（旧版误算午未）', () => {
    const r = calcShenSha([P('甲戌'), P('丙子'), P('癸酉'), P('庚申')]);
    expect(names(r)).toContain('年柱空亡');
    expect(names(r)).not.toContain('时柱空亡');
  });

  it('空亡修正：甲子日见戌/亥为空亡', () => {
    const r = calcShenSha([P('甲戌'), P('乙亥'), P('甲子'), P('丙寅')]);
    expect(names(r)).toContain('年柱空亡');
    expect(names(r)).toContain('月柱空亡');
  });

  it('天德贵人补查地支：卯月见申（旧版漏判）', () => {
    const r = calcShenSha([P('甲戌'), P('辛卯'), P('癸巳'), P('壬申')]);
    expect(names(r)).toContain('时柱天德贵人');
  });

  it('国印贵人修正：甲日见戌（禄前九位）', () => {
    const r = calcShenSha([P('甲戌'), P('丙子'), P('甲午'), P('庚午')]);
    expect(names(r)).toContain('年柱国印贵人');
  });

  it('福星贵人修正：甲见寅/子', () => {
    const r = calcShenSha([P('甲戌'), P('丙寅'), P('甲午'), P('庚午')]);
    expect(names(r)).toContain('月柱福星贵人');
  });

  it('魁罡修正：戊戌日为魁罡，壬戌日不是', () => {
    expect(names(calcShenSha([P('甲子'), P('丙子'), P('戊戌'), P('壬子')]))).toContain('日柱魁罡');
    expect(calcShenSha([P('甲子'), P('丙子'), P('壬戌'), P('壬子')]).filter(x => x.name === '魁罡')).toHaveLength(0);
  });

  it('天赦：春天（寅月）生人戊寅日', () => {
    const r = calcShenSha([P('甲子'), P('丙寅'), P('戊寅'), P('壬子')]);
    expect(names(r)).toContain('日柱天赦');
  });

  it('天医：寅月生人见丑', () => {
    const r = calcShenSha([P('甲子'), P('丙寅'), P('甲午'), P('乙丑')]);
    expect(names(r)).toContain('时柱天医');
  });

  it('阴差阳错/十恶大败：丙子日、甲辰日', () => {
    expect(names(calcShenSha([P('甲子'), P('乙亥'), P('丙子'), P('辛卯')]))).toContain('日柱阴差阳错');
    expect(names(calcShenSha([P('甲子'), P('乙亥'), P('甲辰'), P('辛未')]))).toContain('日柱十恶大败');
  });

  it('孤鸾煞：辛亥日', () => {
    const r = calcShenSha([P('甲子'), P('乙亥'), P('辛亥'), P('辛卯')]);
    expect(names(r)).toContain('日柱孤鸾煞');
  });

  it('红艳：甲日见午', () => {
    const r = calcShenSha([P('甲子'), P('丙子'), P('甲午'), P('庚午')]);
    expect(names(r)).toContain('日柱红艳');
  });

  it('羊刃仅阳干：甲见卯为羊刃，乙见寅为阴刃', () => {
    const r1 = calcShenSha([P('甲子'), P('丙子'), P('甲午'), P('丁卯')]);
    expect(names(r1)).toContain('时柱羊刃');
    const r2 = calcShenSha([P('甲子'), P('丙子'), P('乙丑'), P('戊寅')]);
    expect(names(r2)).toContain('时柱阴刃');
    expect(r2.filter(x => x.name === '羊刃')).toHaveLength(0);
  });

  it('天乙贵人年干日干双查：辛日干查年支午', () => {
    const r = calcShenSha([P('甲午'), P('丙子'), P('辛卯'), P('甲午')]);
    expect(names(r)).toContain('年柱天乙贵人');
  });

  it('原通行神煞保持正确：甲日见寅禄神、申子辰见酉桃花', () => {
    const r = calcShenSha([P('甲寅'), P('丙子'), P('甲申'), P('丁酉')]);
    expect(names(r)).toContain('年柱禄神');
    expect(names(r)).toContain('时柱桃花');
  });
});
