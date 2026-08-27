import { describe, it, expect } from 'vitest';
import { analyzeMingGeDetailed, analyzeTouGan } from '../mingGe';
import type { PillarData } from '../../pages/Bazi';

const mk = (tianGan: string, diZhi: string, cangGan: string[], shiShen: string): PillarData => ({
  pillar: '年柱', ganZhi: tianGan + diZhi, tianGan, diZhi, cangGan, shiShen,
  shiShenZhi: '', nayin: '',
});

const pillars = (tg: string[], dz: string[], cg: string[][], ss: string[]): PillarData[] =>
  tg.map((t, i) => mk(t, dz[i], cg[i], ss[i]));

describe('analyzeMingGeDetailed', () => {
  it('八格：正官格（月令本气正官透干）', () => {
    // 甲日主，月支酉（本气辛→正官），辛透年干 → 正官格
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '酉', '子', '午'],
      [['辛'], ['辛'], ['癸'], ['丁']], ['正官', '正官', '偏印', '食神']);
    ps[1].shiShenZhi = '正官'; // 月支酉本气辛 → 正官
    const r = analyzeMingGeDetailed(ps, '甲', '中和', {});
    expect(r.geName).toContain('正官格');
  });

  it('禄刃格：建禄格（月支=日干禄位）', () => {
    // 甲日主，月支寅 = 甲禄 → 建禄格
    const ps = pillars(['庚', '甲', '甲', '丙'], ['午', '寅', '子', '辰'],
      [['丁'], ['甲'], ['癸'], ['戊']], ['七杀', '比肩', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '中和', {});
    expect(r.geName).toContain('建禄格');
  });

  it('特殊外格：天元一气格（四柱天干相同）', () => {
    const ps = pillars(['甲', '甲', '甲', '甲'], ['子', '寅', '午', '戌'],
      [['癸'], ['甲'], ['丁'], ['戊']], ['偏印', '比肩', '伤官', '偏财']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极强', {});
    expect(r.geName).toContain('天元一气');
  });

  it('特殊外格：魁罡格（日柱庚辰）', () => {
    const ps = pillars(['丙', '甲', '庚', '戊'], ['午', '寅', '辰', '辰'],
      [['丁'], ['甲'], ['戊'], ['戊']], ['食神', '比肩', '偏印', '偏印']);
    const r = analyzeMingGeDetailed(ps, '庚', '身强', {});
    expect(r.geName).toContain('魁罡');
  });

  it('衍生格：杀印相生 → 上等', () => {
    // 甲日主，天干见七杀庚 + 偏印壬 → 杀印相生
    const ps = pillars(['庚', '庚', '甲', '壬'], ['午', '寅', '子', '申'],
      [['丁'], ['甲'], ['癸'], ['庚']], ['七杀', '七杀', '偏印', '七杀']);
    const r = analyzeMingGeDetailed(ps, '甲', '身弱', {});
    expect(r.geName).toContain('杀印相生');
    expect(r.score).toBe('上等');
  });

  it('专旺不成立：壬午壬子癸酉壬戌（无三会/三合水局）→ 建禄（月劫）非润下', () => {
    // 癸日主，月令子=癸禄；地支午子酉戌无亥子丑/申子辰水局 → 不判润下，判建禄/建禄月劫
    const ps = pillars(['壬', '壬', '癸', '壬'], ['午', '子', '酉', '戌'],
      [['丁'], ['癸'], ['辛'], ['戊']], ['劫财', '比肩', '偏印', '劫财']);
    const r = analyzeMingGeDetailed(ps, '癸', '身极强', {});
    expect(r.geName).toContain('建禄');
    expect(r.geName).not.toContain('润下');
  });

  it('专旺成立：癸日主地支亥子丑三会水局且无土透干 → 润下格', () => {
    // 地支亥子丑三会水，天干壬癸癸壬（无戊己土克星）→ 润下格
    const ps = pillars(['壬', '癸', '癸', '壬'], ['亥', '子', '丑', '寅'],
      [['壬'], ['癸'], ['己'], ['甲']], ['劫财', '比肩', '比肩', '劫财']);
    const r = analyzeMingGeDetailed(ps, '癸', '身极强', {});
    expect(r.geName).toContain('润下');
  });

  it('建禄月劫格：建禄 + 比劫旺（天干比劫≥2）', () => {
    // 壬午壬子癸酉壬戌：癸禄在子，天干三比劫 → 建禄月劫格
    const ps = pillars(['壬', '壬', '癸', '壬'], ['午', '子', '酉', '戌'],
      [['丁'], ['癸'], ['辛'], ['戊']], ['劫财', '比肩', '偏印', '劫财']);
    const r = analyzeMingGeDetailed(ps, '癸', '身极强', {});
    expect(r.geName).toContain('建禄月劫格');
  });

  it('假从格：身极弱 + 月令财旺 + 日支余气根 → 假从财格', () => {
    // 庚日主身极弱，月支子（正财），日支申（庚禄余气根）→ 假从财格
    const ps = pillars(['戊', '丙', '庚', '戊'], ['午', '子', '申', '午'],
      [['丁'], ['癸'], ['庚'], ['丁']], ['偏印', '正财', '比肩', '偏印']);
    const r = analyzeMingGeDetailed(ps, '庚', '身极弱', {});
    expect(r.geName).toContain('假从财格');
  });

  it('真从格：身极弱 + 月令七杀旺 + 无根无比劫 → 从官杀格', () => {
    // 甲日主身极弱，月支酉（正官？七杀）……用七杀：月支申（庚七杀）
    const ps = pillars(['庚', '庚', '甲', '庚'], ['午', '申', '午', '午'],
      [['丁'], ['庚'], ['丁'], ['丁']], ['七杀', '七杀', '伤官', '七杀']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极弱', {});
    expect(r.geName).toContain('从官杀格');
    expect(r.geName).not.toContain('假');
  });

  it('专旺破格：水三会但地支克星（土）≥2 → 不判润下', () => {
    // 癸日主，地支亥子丑三会水，但地支丑戌双土（土≥2 破格）→ 不判润下
    const ps = pillars(['壬', '癸', '癸', '壬'], ['亥', '子', '丑', '戌'],
      [['壬'], ['癸'], ['己'], ['戊']], ['劫财', '比肩', '比肩', '劫财']);
    const r = analyzeMingGeDetailed(ps, '癸', '身极强', {});
    expect(r.geName).not.toContain('润下');
  });

  it('输出含类型与层次字段', () => {
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '卯', '子', '午'],
      [['辛'], ['乙'], ['癸'], ['丁']], ['正官', '伤官', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geType).toBeTruthy();
    expect(['上等', '中上', '中等', '中下', '下等']).toContain(r.score);
  });
});

describe('analyzeTouGan', () => {
  it('用神透干：返回柱位', () => {
    // 日干甲（木），年干辛（金）→ 用神木在日干透、忌神金在年干透
    const ps = pillars(['辛', '丙', '甲', '庚'], ['酉', '寅', '子', '午'],
      [['辛'], ['甲'], ['癸'], ['丁']], ['正官', '食神', '比肩', '七杀']);
    const lines = analyzeTouGan(ps, ['木'], ['金']);
    expect(lines.some(l => l.includes('用神木透干') && l.includes('日干'))).toBe(true);
    expect(lines.some(l => l.includes('忌神金透干') && l.includes('年干'))).toBe(true);
  });

  it('不透干：提示未透', () => {
    // 用神水，四柱天干无壬癸 → 不透干
    const ps = pillars(['辛', '丙', '甲', '庚'], ['酉', '寅', '子', '午'],
      [['辛'], ['甲'], ['癸'], ['丁']], ['正官', '食神', '比肩', '七杀']);
    const lines = analyzeTouGan(ps, ['水'], ['火']);
    expect(lines.some(l => l.includes('用神水不透干'))).toBe(true);
  });
});
