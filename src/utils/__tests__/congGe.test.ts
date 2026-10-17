import { describe, it, expect } from 'vitest';
import { analyzeCongGe, congGeName } from '../congGe';
import type { PillarData } from '../../pages/Bazi';

/** 造一柱：pillar 名、天干、地支、藏干、天干十神、地支十神串 */
const mk = (
  pillar: string, tianGan: string, diZhi: string,
  cangGan: string[], shiShen: string, shiShenZhi: string,
): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi, cangGan, shiShen, shiShenZhi, nayin: '',
});

/**
 * 实盘来源：丁酉 庚戌 甲申 丁卯（2017-10-24 卯时）。
 * 甲木：月令戌本气戊＝偏财；时支卯本气乙＝劫财（羊刃）；日支申藏壬＝偏印。
 * 旧实现只看日支同五行 → 判「从财格·真从」并写「四柱无根」，
 * 而旺衰函数同时说「时柱（卯）有根但浅」——同一张盘前后矛盾。
 */
const realChart = (): PillarData[] => [
  mk('年柱', '丁', '酉', ['辛'], '伤官', '正官'),
  mk('月柱', '庚', '戌', ['戊', '辛', '丁'], '七杀', '偏财/正官/伤官'),
  mk('日柱', '甲', '申', ['庚', '壬', '戊'], '日主', '七杀/偏印/偏财'),
  mk('时柱', '丁', '卯', ['乙'], '伤官', '劫财'),
];

describe('analyzeCongGe · 前提', () => {
  it('非身极弱不谈从格', () => {
    const ps = realChart();
    for (const lv of ['身极强', '身强', '中和', '身弱']) {
      const r = analyzeCongGe(ps, '木', lv);
      expect(r.kind).toBeNull();
      expect(r.purity).toBe('不成从');
      expect(r.reason).toContain('未至极弱');
    }
  });

  it('四柱不足或五行缺失时安全返回，不抛错', () => {
    expect(analyzeCongGe([], '木', '身极弱').purity).toBe('不成从');
    expect(analyzeCongGe(realChart(), '', '身极弱').purity).toBe('不成从');
  });
});

describe('analyzeCongGe · 本气根是硬门槛', () => {
  it('时支卯为甲木羊刃本气根 → 不成从（不因被酉冲而放宽）', () => {
    const r = analyzeCongGe(realChart(), '木', '身极弱');
    expect(r.purity).toBe('不成从');
    expect(r.roots.some((x) => x.kind === '本气比劫')).toBe(true);
    expect(r.reason).toContain('有根即不从');
    // 冲只作说明，不作判定依据
    expect(r.reason).toContain('卯被酉冲');
  });

  it('本气根在年支/时支同样生效——不能只查日支', () => {
    // 甲木：年支寅（本气甲＝比肩）为根，日支反而是官杀
    const ps = [
      mk('年柱', '丙', '寅', ['甲', '丙', '戊'], '食神', '比肩/食神/偏财'),
      mk('月柱', '戊', '戌', ['戊', '辛', '丁'], '偏财', '偏财/正官/伤官'),
      mk('日柱', '甲', '酉', ['辛'], '日主', '正官'),
      mk('时柱', '庚', '午', ['丁', '己'], '七杀', '伤官/正财'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.purity).toBe('不成从');
    expect(r.roots[0].label).toContain('寅');
  });
});

describe('analyzeCongGe · 真从', () => {
  it('四柱无本气/余气比劫、无印苗、不透帮身 → 真从财', () => {
    // 甲木，月支戌（本气戊＝偏财）；地支午戌酉午皆无木无水，天干丙戊庚亦无比劫印绶
    const ps = [
      mk('年柱', '丙', '午', ['丁', '己'], '食神', '伤官/正财'),
      mk('月柱', '戊', '戌', ['戊', '辛', '丁'], '偏财', '偏财/正官/伤官'),
      mk('日柱', '甲', '酉', ['辛'], '日主', '正官'),
      mk('时柱', '庚', '午', ['丁', '己'], '七杀', '伤官/正财'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.kind).toBe('从财');
    expect(r.purity).toBe('真从');
    expect(r.reason).toBe('');
    expect(r.roots).toEqual([]);
    expect(r.wangSource).toBe('本气');
  });
});

describe('analyzeCongGe · 假从', () => {
  it('无本气根但有藏干余气比劫 → 假从', () => {
    // 甲木，月支戌（偏财）；时支辰藏乙（劫财余气）→ 从得不纯
    const ps = [
      mk('年柱', '丙', '午', ['丁', '己'], '食神', '伤官/正财'),
      mk('月柱', '戊', '戌', ['戊', '辛', '丁'], '偏财', '偏财/正官/伤官'),
      mk('日柱', '甲', '酉', ['辛'], '日主', '正官'),
      mk('时柱', '丙', '辰', ['戊', '乙', '癸'], '食神', '偏财/劫财/正印'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.kind).toBe('从财');
    expect(r.purity).toBe('假从');
    expect(r.reason).toContain('假从');
    expect(r.roots.some((x) => x.kind === '余气比劫')).toBe(true);
  });

  it('无根但天干透印 → 假从（透干帮身比藏干更明显）', () => {
    // 甲木，月支戌（偏财），年干壬（偏印）透出
    const ps = [
      mk('年柱', '壬', '午', ['丁', '己'], '偏印', '伤官/正财'),
      mk('月柱', '戊', '戌', ['戊', '辛', '丁'], '偏财', '偏财/正官/伤官'),
      mk('日柱', '甲', '酉', ['辛'], '日主', '正官'),
      mk('时柱', '庚', '午', ['丁', '己'], '七杀', '伤官/正财'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.purity).toBe('假从');
    expect(r.yinTou[0]).toContain('壬');
  });
});

describe('analyzeCongGe · 旺神取法（会局优先于月令本气）', () => {
  it('申酉戌三会齐 → 以会局金论旺神，从官杀而非从财', () => {
    // 甲木，月支戌本气戊是偏财；但年酉、日申、月戌凑齐申酉戌西方金，
    // 土气尽泄于金 → 从的是官杀，不是财。
    const ps = [
      mk('年柱', '丙', '酉', ['辛'], '食神', '正官'),
      mk('月柱', '戊', '戌', ['戊', '辛', '丁'], '偏财', '偏财/正官/伤官'),
      mk('日柱', '甲', '申', ['庚', '壬', '戊'], '日主', '七杀/偏印/偏财'),
      mk('时柱', '庚', '巳', ['丙', '戊', '庚'], '七杀', '食神/偏财/七杀'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.wangSource).toBe('会局');
    expect(r.wangWx).toBe('金');
    expect(r.kind).toBe('从官杀');
    // 日支申藏壬（偏印）→ 假从
    expect(r.purity).toBe('假从');
    expect(r.basis.join(' ')).toContain('申酉戌');
  });

  it('会局齐但月令不在方中 → 仍以月令本气论', () => {
    // 地支申酉戌齐，但月支是子（不在申酉戌方内）→ 月令为提纲，取子本气癸水（甲的印）
    const ps = [
      mk('年柱', '庚', '申', ['庚', '壬', '戊'], '七杀', '七杀/偏印/偏财'),
      mk('月柱', '戊', '子', ['癸'], '偏财', '正印'),
      mk('日柱', '甲', '酉', ['辛'], '日主', '正官'),
      mk('时柱', '庚', '戌', ['戊', '辛', '丁'], '七杀', '偏财/正官/伤官'),
    ];
    const r = analyzeCongGe(ps, '木', '身极弱');
    expect(r.wangSource).toBe('本气');
    expect(r.wangWx).toBe('水');
    // 旺神为印（生我）→ 不在从财/从官杀/从儿之列
    expect(r.kind).toBeNull();
    expect(r.purity).toBe('不成从');
  });

  it('旺神为印/比劫 → 不成从（另论从旺/专旺）', () => {
    // 庚金日主，月支申本气庚＝比肩 → 旺神为比劫
    const ps = [
      mk('年柱', '丙', '午', ['丁', '己'], '七杀', '正官/正印'),
      mk('月柱', '甲', '申', ['庚', '壬', '戊'], '偏财', '比肩/食神/偏印'),
      mk('日柱', '庚', '午', ['丁', '己'], '日主', '正官/正印'),
      mk('时柱', '丙', '戌', ['戊', '辛', '丁'], '七杀', '偏印/劫财/正官'),
    ];
    const r = analyzeCongGe(ps, '金', '身极弱');
    expect(r.kind).toBeNull();
    expect(r.purity).toBe('不成从');
    expect(r.wangCategory).toBe('比劫');
  });
});

describe('congGeName', () => {
  it('真从/假从格名', () => {
    expect(congGeName('从财', '真从')).toBe('从财格');
    expect(congGeName('从官杀', '假从')).toBe('假从官杀格');
    expect(congGeName('从儿', '真从')).toBe('从儿格');
  });
});
