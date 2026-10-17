import { describe, it, expect } from 'vitest';
import { analyzeHealth } from '../baziAnalysis';
import { generateDomainDeepReadings, type DomainDeepInput } from '../baziDomainDeep';
import { wxHealthAdvice } from '../wuxingHealth';
import type { PillarData } from '../../pages/Bazi';

const mk = (pillar: string, tianGan: string, diZhi: string, shiShen: string): PillarData => ({
  pillar,
  ganZhi: tianGan + diZhi,
  tianGan,
  diZhi,
  cangGan: [],
  shiShen,
  shiShenZhi: '',
  nayin: '',
});

/** 五行计数 → wxStats（level 按计数推：0=缺、1=弱、其余中和），保证最弱项唯一 */
function st(c: Record<string, number>) {
  const lv = (n: number) => (n === 0 ? '缺' : n === 1 ? '弱' : '中和');
  const pick = (w: string) => ({ count: c[w] ?? 0, level: lv(c[w] ?? 0) });
  return { '木': pick('木'), '火': pick('火'), '土': pick('土'), '金': pick('金'), '水': pick('水') };
}

// 甲木日主、冬月
const pillarsJia = [
  mk('年柱', '甲', '子', '比肩'),
  mk('月柱', '丙', '子', '食神'),
  mk('日柱', '甲', '午', '比肩'),
  mk('时柱', '庚', '午', '七杀'),
];

// 癸水日主、夏月
const pillarsGui = [
  mk('年柱', '丁', '巳', '偏财'),
  mk('月柱', '乙', '巳', '食神'),
  mk('日柱', '癸', '酉', '比肩'),
  mk('时柱', '甲', '寅', '伤官'),
];

describe('健康模块：数量最少 ≠ 该进补', () => {
  it('身弱 + 最弱为财（甲木、土最弱）：不得推出「补土」', () => {
    // 甲木身弱，土为财（我克，耗身）。旧实现会直接建议补土 → 越补越虚。
    const r = analyzeHealth(
      pillarsJia,
      st({ '木': 2, '火': 2, '土': 0, '金': 2, '水': 2 }),
      '甲',
      '身弱',
      []
    );
    expect(r.wellnessAdvice).toContain('五行调养方向：「水」'); // 印（生我）
    expect(r.wellnessAdvice).not.toContain('五行调养方向：「土」');
    expect(r.wellnessAdvice).toContain('身弱最怕再被财、官杀、食伤耗泄');
  });

  it('身弱 + 最弱为食伤（戊土、金最弱）：不得推出「补金」', () => {
    // 戊土身弱，金为食伤（我生，泄身）。
    const r = analyzeHealth(
      [mk('年柱', '丙', '寅', '偏印'), mk('月柱', '戊', '午', '比肩'), mk('日柱', '戊', '申', '比肩'), mk('时柱', '癸', '亥', '正财')],
      st({ '木': 1, '火': 2, '土': 2, '金': 0, '水': 2 }),
      '戊',
      '身弱',
      []
    );
    expect(r.wellnessAdvice).not.toContain('五行调养方向：「金」');
    expect(r.wellnessAdvice).toContain('五行调养方向：「火」'); // 印（生我）
  });

  it('有喜用神时以喜用神为准，并明确区分「数量最少」与「该补」', () => {
    const r = analyzeHealth(
      pillarsJia,
      st({ '木': 2, '火': 2, '土': 0, '金': 2, '水': 1 }),
      '甲',
      '身弱',
      [],
      { yongShen: ['水'] }
    );
    expect(r.wellnessAdvice).toContain('五行调养方向：「水」');
    expect(r.wellnessAdvice).toContain('局中数量最少的是「土」');
    expect(r.wellnessAdvice).toContain('别把"数字最少"当成"该补"');
  });

  it('最弱恰是喜用神时才说「一举两得」', () => {
    const r = analyzeHealth(
      pillarsJia,
      st({ '木': 2, '火': 2, '土': 1, '金': 2, '水': 0 }),
      '甲',
      '身弱',
      [],
      { yongShen: ['水'] }
    );
    expect(r.wellnessAdvice).toContain('五行调养方向：「水」');
    expect(r.wellnessAdvice).toContain('一举两得');
  });

  it('最弱五行非喜用时，concerns 不得说成「天生薄弱、要多补」', () => {
    const r = analyzeHealth(
      pillarsJia,
      st({ '木': 2, '火': 2, '土': 0, '金': 2, '水': 1 }),
      '甲',
      '身弱',
      [],
      { yongShen: ['水'] }
    );
    const weak = r.concerns.find((c) => c.includes('【土偏弱】'));
    expect(weak).toBeTruthy();
    expect(weak).toContain('省力处');
    expect(weak).not.toContain('要主动去养');
  });
});

describe('养生建议的性别语境', () => {
  const inputOf = (gender: string): DomainDeepInput => ({
    pillars: pillarsGui,
    shenSha: [],
    gender,
    dayGan: '癸',
    strengthLevel: '身弱',
    yongShen: ['金'],
    wxStats: st({ '木': 2, '火': 2, '土': 2, '金': 2, '水': 0 }),
    relations: [],
  });
  const healthText = (gender: string) =>
    generateDomainDeepReadings(inputOf(gender))
      .filter((d) => d.domainKey === 'health')
      .flatMap((d) => d.sections.map((s) => s.text))
      .join('\n');

  it('女命盘不出现「节欲保精」这类男性语境', () => {
    const t = healthText('female');
    expect(t).not.toContain('节欲');
    expect(t).not.toContain('保精');
    expect(t).not.toContain('房事有节');
    expect(t).toContain('宜温养');
  });

  it('男命盘保留男性语境（分档不是一刀切删掉）', () => {
    const t = healthText('male');
    expect(t).toContain('房事有节');
    expect(t).not.toContain('宜温养');
  });

  it('同一张盘换性别，只有措辞变、判据不变', () => {
    const strip = (s: string) => s.replace(/肾与泌尿、内分泌偏弱——[^）]*/, '');
    expect(strip(healthText('female'))).toBe(strip(healthText('male')));
  });

  it('未知性别不得默认男命口径', () => {
    expect(wxHealthAdvice('水')).not.toContain('房事有节');
    expect(wxHealthAdvice('水', undefined)).toContain('宜温养');
    // 非水五行与性别无关
    expect(wxHealthAdvice('木', 'male')).toBe(wxHealthAdvice('木', 'female'));
  });
});
