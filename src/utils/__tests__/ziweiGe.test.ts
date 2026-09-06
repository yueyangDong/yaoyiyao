import { describe, it, expect } from 'vitest';
import { analyzeZiweiGe } from '../ziweiGe';

const gong = (name: string, major: string[], minor: string[] = [], sihua: Record<string, string> = {}) => ({
  name,
  majorStars: major.map(m => ({ name: m, sihua: sihua[m] || null })),
  minorStars: minor,
});

describe('analyzeZiweiGe', () => {
  it('机月同梁 + 吉星会照 + 四化引动 → 成格', () => {
    const gongData = [
      gong('命宫', ['天机', '太阴'], ['文昌'], { 天机: '禄' }),
      gong('财帛宫', ['天同', '天梁'], ['左辅']),
      gong('官禄宫', ['天相'], []),
      gong('迁移宫', ['天梁'], ['右弼']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('机月同梁格');
    expect(r.breakReasons).toHaveLength(0);
  });

  it('杀破狼缺四化引动 → 不成格（有原因）', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['擎羊']),
      gong('财帛宫', ['破军'], ['陀罗']),
      gong('官禄宫', ['贪狼'], []),
      gong('迁移宫', ['廉贞'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
    expect(r.breakReasons.length).toBeGreaterThan(0);
  });

  it('紫府同宫（命宫）成格', () => {
    const gongData = [
      gong('命宫', ['紫微', '天府'], ['文昌', '文曲'], { 紫微: '权' }),
      gong('财帛宫', ['武曲'], []),
      gong('官禄宫', ['廉贞'], []),
      gong('迁移宫', ['天相'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('紫府同宫格');
  });

  it('昌曲夹命 → 杂耀格', () => {
    const gongData = [
      gong('父母宫', [], ['文昌']),
      gong('命宫', ['天机'], [], { 天机: '科' }),
      gong('兄弟宫', [], ['文曲']),
      gong('财帛宫', ['天同'], []),
      gong('官禄宫', ['天梁'], []),
      gong('迁移宫', ['太阴'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('昌曲夹命格');
  });

  it('宫名无"宫"后缀（生产数据格式）也能正常成格', () => {
    const gongData = [
      gong('命宫', ['天机', '太阴'], ['文昌'], { 天机: '禄' }),
      gong('财帛', ['天同', '天梁'], ['左辅']),
      gong('官禄', ['天相'], []),
      gong('迁移', ['天梁'], ['右弼']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('机月同梁格');
  });

  it('杀破狼：命宫不坐杀破狼则不成格（避免人人成格）', () => {
    const gongData = [
      gong('命宫', ['紫微'], ['文昌'], { 紫微: '权' }),
      gong('财帛', ['七杀'], []),
      gong('官禄', ['破军'], []),
      gong('迁移', ['贪狼'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
  });

  it('杀破狼：命宫坐杀破狼之一且三方会齐 → 成格', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['左辅'], { 七杀: '权' }),
      gong('财帛', ['贪狼'], []),
      gong('官禄', ['破军'], []),
      gong('迁移', ['天相'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
  });

  it('火贪格逢地空地劫同宫 → 破格', () => {
    const gongData = [
      gong('命宫', ['贪狼', '火星', '地空'], ['文昌'], { 贪狼: '禄' }),
      gong('财帛', ['天相'], []),
      gong('官禄', ['天府'], []),
      gong('迁移', ['紫微'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('火贪格');
    expect(r.breakReasons.join()).toContain('空劫');
  });

  it('夹宫按地支相邻判定（branch 优先于数组顺序）', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '天机', sihua: '科' }], minorStars: [] },
      // 数组顺序故意打乱：文昌在数组末尾，但地支巳与午相邻
      { name: '财帛', branch: '戌', majorStars: [], minorStars: [] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: ['文昌'] },
      { name: '父母', branch: '未', majorStars: [], minorStars: ['文曲'] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('昌曲夹命格');
  });

  // ---- 2026-09 校准：加冕分层 ----
  it('加冕分层：结构成立但无吉星无四化 → 仍成格，reasons 注明层次打折', () => {
    const gongData = [
      gong('命宫', ['七杀']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', ['天相']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
    expect(r.breakReasons).toHaveLength(0);
    expect(r.reasons.join()).toContain('层次打折');
  });

  it('日月并明：太阳午宫、太阴子宫分居庙旺 → 成格', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '太阳', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [{ name: '太阴', sihua: null }], minorStars: ['文曲'] },
      { name: '财帛', branch: '寅', majorStars: [{ name: '天相', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [{ name: '天同', sihua: null }], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('日月并明格');
  });

  it('日月并明：丑宫日月同宫（必有一星失辉）→ 不成格', () => {
    const gongData = [
      { name: '命宫', branch: '丑', majorStars: [{ name: '太阳', sihua: null }, { name: '太阴', sihua: null }], minorStars: ['文曲'] },
      { name: '迁移', branch: '未', majorStars: [], minorStars: [] },
      { name: '财帛', branch: '巳', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '酉', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('日月并明格');
  });

  it('阳梁昌禄：太阳天梁文昌会命宫三方，见禄存 → 成格', () => {
    const gongData = [
      gong('命宫', ['太阳', '天梁'], ['文昌', '禄存']),
      gong('财帛', ['天相']),
      gong('官禄', ['天同']),
      gong('迁移', ['廉贞']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('阳梁昌禄格');
  });

  it('三奇嘉会：禄权科三化齐会三方四正 → 成格', () => {
    const gongData = [
      gong('命宫', ['紫微'], ['左辅'], { 紫微: '权' }),
      gong('财帛', ['武曲'], [], { 武曲: '禄' }),
      gong('官禄', ['天相'], [], { 天相: '科' }),
      gong('迁移', ['贪狼']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('三奇嘉会格');
  });

  it('七杀朝斗：七杀坐命于寅 → 成格', () => {
    const gongData = [
      { name: '命宫', branch: '寅', majorStars: [{ name: '七杀', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '申', majorStars: [{ name: '紫微', sihua: null }, { name: '天府', sihua: null }], minorStars: [] },
      { name: '财帛', branch: '午', majorStars: [{ name: '贪狼', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [{ name: '破军', sihua: null }], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('七杀朝斗格');
  });

  it('紫府朝垣：紫微天府分居三方会照命宫（命宫非紫府同宫）→ 成格', () => {
    const gongData = [
      gong('命宫', ['天相']),
      gong('财帛', ['紫微']),
      gong('官禄', ['天府']),
      gong('迁移', ['七杀']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('紫府朝垣格');
  });

  it('羊陀夹忌：命宫坐生年化忌且擎羊陀罗两宫相夹 → 破格', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '武曲', sihua: '忌' }], minorStars: [] },
      { name: '父母', branch: '未', majorStars: [], minorStars: ['陀罗'] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: ['擎羊'] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.breakReasons.join()).toContain('羊陀夹忌');
    expect(r.geNames).toHaveLength(0);
  });
});
