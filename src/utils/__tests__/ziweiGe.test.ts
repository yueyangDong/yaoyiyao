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
});
