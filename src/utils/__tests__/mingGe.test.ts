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

  it('化气格·真化：甲日己月戌月土旺，无根无助无克 → 甲己化土格', () => {
    // 戊甲甲己 辰戌辰巳 的变体：甲日干、月干己相邻合，戌月土当令，
    // 地支辰戌辰三土（化神 ≥2），天干透戊（化神透干），无比劫印绶 → 真化
    const ps = pillars(['戊', '己', '甲', '丁'], ['辰', '戌', '辰', '巳'],
      [['戊'], ['戊'], ['戊'], ['丙']], ['偏财', '正财', '偏财', '伤官']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极弱', {});
    expect(r.geName).toContain('甲己化土格');
    expect(r.geName).not.toContain('假');
    expect(r.desc).toContain('真化');
  });

  it('化气格·假化：甲日己月土令但日支带卯根 → 假甲己化土格', () => {
    // 甲日干、月干己合，戌月土当令、地支土旺，但日支卯为甲之根 → 假化
    const ps = pillars(['戊', '己', '甲', '丁'], ['辰', '戌', '卯', '巳'],
      [['戊'], ['戊'], ['乙'], ['丙']], ['偏财', '正财', '劫财', '伤官']);
    const r = analyzeMingGeDetailed(ps, '甲', '身弱', {});
    expect(r.geName).toContain('假甲己化土格');
    expect(r.desc).toContain('根苗');
  });

  it('化气格·争合不化：甲日己月己时（两己夹甲妒合）→ 不判化气', () => {
    const ps = pillars(['戊', '己', '甲', '己'], ['辰', '戌', '辰', '巳'],
      [['戊'], ['戊'], ['戊'], ['丙']], ['偏财', '正财', '偏财', '劫财']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极弱', {});
    expect(r.geName).not.toContain('化土');
  });

  it('化气格·失时不化：甲日己合但生于卯月（非化神当令月）→ 不判化气', () => {
    // 百科命例：甲己合于卯月，失时不作化气看
    const ps = pillars(['乙', '己', '甲', '丁'], ['亥', '卯', '巳', '子'],
      [['甲'], ['乙'], ['丙'], ['癸']], ['劫财', '劫财', '伤官', '正印']);
    const r = analyzeMingGeDetailed(ps, '甲', '身极弱', {});
    expect(r.geName).not.toContain('化土');
  });

  it('输出含类型与层次字段', () => {
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '卯', '子', '午'],
      [['辛'], ['乙'], ['癸'], ['丁']], ['正官', '伤官', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geType).toBeTruthy();
    expect(['上等', '中上', '中等', '中下', '下等']).toContain(r.score);
  });

  it('判定依据链：每一步都能追到盘面事实（月令→透干→日主状态→结论）', () => {
    // 甲日主、月支酉本气辛（正官）透年干 → 正官格
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '酉', '子', '午'],
      [['辛'], ['辛'], ['癸'], ['丁']], ['正官', '正官', '偏印', '食神']);
    ps[1].shiShenZhi = '正官';
    const r = analyzeMingGeDetailed(ps, '甲', '中和', {}, ['水', '木']);
    expect(r.basis.length).toBeGreaterThanOrEqual(3);
    // 依据链必须落到具体干支/十神，而不是空话
    expect(r.basis[0]).toContain('月令');
    expect(r.basis[0]).toContain('酉');
    expect(r.basis.some((b) => b.includes('辛'))).toBe(true);
    expect(r.basis[r.basis.length - 1]).toContain('正官格');
  });

  it('要素对应表：含月令/透出/日主强弱/格局，且月令行绑定本盘取值', () => {
    const ps = pillars(['辛', '丁', '甲', '庚'], ['酉', '酉', '子', '午'],
      [['辛'], ['辛'], ['癸'], ['丁']], ['正官', '正官', '偏印', '食神']);
    ps[1].shiShenZhi = '正官';
    const r = analyzeMingGeDetailed(ps, '甲', '身弱', {}, ['水']);
    const keys = r.keyFactors.map((k) => k.factor);
    expect(keys).toContain('月令');
    expect(keys).toContain('天干透出');
    expect(keys).toContain('日主强弱');
    expect(keys).toContain('用神');
    expect(keys).toContain('格局');
    const month = r.keyFactors.find((k) => k.factor === '月令')!;
    expect(month.value).toContain('酉');
    expect(month.meaning).toContain('本气十神');
    // 用神透传进要素表
    expect(r.keyFactors.find((k) => k.factor === '用神')!.value).toBe('水');
  });

  it('成败关键：不同格局给出不同的喜忌（正官格 vs 专旺格）', () => {
    const guan = pillars(['辛', '丁', '甲', '庚'], ['酉', '酉', '子', '午'],
      [['辛'], ['辛'], ['癸'], ['丁']], ['正官', '正官', '偏印', '食神']);
    guan[1].shiShenZhi = '正官';
    const rGuan = analyzeMingGeDetailed(guan, '甲', '中和', {});
    expect(rGuan.successKey).toContain('伤官');

    const zhuanWang = pillars(['壬', '癸', '癸', '壬'], ['亥', '子', '丑', '寅'],
      [['壬'], ['癸'], ['己'], ['甲']], ['劫财', '比肩', '比肩', '劫财']);
    const rZW = analyzeMingGeDetailed(zhuanWang, '癸', '身极强', {});
    expect(rZW.successKey).toContain('官杀');
    expect(rZW.successKey).not.toBe(rGuan.successKey);
  });

  it('杂气月：本气非八格（比劫），余气透干取余气格', () => {
    // 戊日主，月支辰（本气戊→比肩，不在八格）；余气乙（正官）透年干 → 正官格
    // 辰藏干：戊（本气比肩）、乙（中气正官）、癸（余气正财）
    const ps = pillars(['乙', '丙', '戊', '庚'], ['酉', '辰', '午', '申'],
      [['辛'], ['戊', '乙', '癸'], ['丁', '己'], ['庚', '壬', '戊']],
      ['正官', '比肩', '正印', '食神']);
    ps[1].shiShenZhi = '比肩/正官/正财'; // 辰藏戊乙癸 → 比肩/正官/正财
    const r = analyzeMingGeDetailed(ps, '戊', '中和', {});
    expect(r.geName).toContain('正官格');
    expect(r.geName).not.toContain('月令杂气');
  });

  it('杂气月：本气非八格且无余气透干 → 月令杂气', () => {
    // 戊日主，月支辰（本气戊比肩），余气乙癸均不透干 → 月令杂气
    const ps = pillars(['甲', '丙', '戊', '庚'], ['酉', '辰', '午', '申'],
      [['辛'], ['戊', '乙', '癸'], ['丁', '己'], ['庚', '壬', '戊']],
      ['七杀', '比肩', '正印', '食神']);
    ps[1].shiShenZhi = '比肩/正官/正财';
    const r = analyzeMingGeDetailed(ps, '戊', '中和', {});
    expect(r.geName).toContain('月令杂气');
  });

  it('羊刃格只论阳干：乙阴干生在寅月（非羊刃）走普通八格', () => {
    // 乙日主，月支寅。YANG_REN['乙']='寅'，但乙是阴干，不应判羊刃格
    const ps = pillars(['庚', '甲', '乙', '丁'], ['申', '寅', '卯', '亥'],
      [['壬'], ['甲'], ['乙'], ['甲']], ['正官', '劫财', '比肩', '比肩']);
    ps[1].shiShenZhi = '劫财/伤官/正财'; // 寅藏甲丙戊 → 劫财/伤官/正财
    const r = analyzeMingGeDetailed(ps, '乙', '中和', {});
    expect(r.geName).not.toContain('羊刃');
  });

  it('羊刃格：甲阳干生在卯月 → 羊刃格', () => {
    // 甲日主，月支卯 = 甲的羊刃（YANG_REN['甲']='卯'），甲是阳干 → 羊刃格
    const ps = pillars(['辛', '庚', '甲', '丙'], ['酉', '卯', '子', '午'],
      [['辛'], ['乙'], ['癸'], ['丁']], ['正官', '劫财', '偏印', '食神']);
    const r = analyzeMingGeDetailed(ps, '甲', '中和', {});
    expect(r.geName).toContain('羊刃格');
  });

  it('金神格须乙/己日主：甲日主时柱己巳 → 不判金神', () => {
    // 甲日主，时柱己巳（金神三组之一），但甲非乙/己日 → 不判金神格
    const ps = pillars(['庚', '甲', '甲', '己'], ['午', '寅', '子', '巳'],
      [['丁'], ['甲'], ['癸'], ['戊']], ['七杀', '比肩', '偏印', '正财']);
    ps[1].shiShenZhi = '比肩/食神/偏财';
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geName).not.toContain('金神');
  });

  it('金神格：己日主时柱己巳 → 判金神格', () => {
    // 己日主，时柱己巳 → 金神格
    const ps = pillars(['庚', '甲', '己', '己'], ['午', '寅', '丑', '巳'],
      [['丁'], ['甲'], ['己'], ['丙']], ['正印', '正官', '比肩', '正印']);
    const r = analyzeMingGeDetailed(ps, '己', '身弱', {});
    expect(r.geName).toContain('金神格');
  });

  it('比劫夺财须成势：仅一个比肩+正财透干 → 不判下等夺财', () => {
    // 甲日主，年干甲（1个比肩）+ 月干己（正财），比劫不成势 → 不判比劫夺财
    const ps = pillars(['甲', '己', '甲', '庚'], ['子', '巳', '子', '午'],
      [['癸'], ['丙'], ['癸'], ['丁']], ['比肩', '正财', '偏印', '伤官']);
    const r = analyzeMingGeDetailed(ps, '甲', '身弱', {});
    expect(r.geName).not.toContain('比劫夺财');
  });

  it('比劫夺财：比劫两透成势 + 正财 + 无食伤通关 → 判下等', () => {
    // 甲日主，年干乙（劫财）+ 月干甲（比肩）成势，时干己（正财），无食伤官杀 → 比劫夺财
    // （月支子藏癸正印本气未透 → 基础格正印格，衍生格覆盖为比劫夺财）
    const ps = pillars(['乙', '甲', '甲', '己'], ['卯', '子', '子', '巳'],
      [['乙'], ['癸'], ['癸'], ['丙']], ['劫财', '比肩', '比肩', '正财']);
    ps[1].shiShenZhi = '正印';
    const r = analyzeMingGeDetailed(ps, '甲', '身强', {});
    expect(r.geName).toContain('比劫夺财');
    expect(r.score).toBe('下等');
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
