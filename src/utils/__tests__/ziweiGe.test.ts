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

  it('杀破狼：命宫擎羊 + 财帛陀罗（煞 2 颗）→ 古法列为下格，仍入格', () => {
    // ⚠️ 2026-10 破格分级后口径变了：煞 2 颗从"一刀切不入格"降为"下格"（《全书》「吉凶相半守照为中格，
    //    凶星恶杀为下格」——下格仍是格）。真正不入格的门槛是煞≥3。
    const gongData = [
      gong('命宫', ['七杀'], ['擎羊']),
      gong('财帛宫', ['破军'], ['陀罗']),
      gong('官禄宫', ['贪狼'], []),
      gong('迁移宫', ['廉贞'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
    expect(r.reasons.join()).toContain('下格');
    expect(r.breakReasons).toHaveLength(0);
  });

  it('杀破狼：煞星 3 颗 → 破格不入', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['擎羊']),
      gong('财帛', ['破军'], ['陀罗']),
      gong('官禄', ['贪狼'], []),
      gong('迁移', ['天相'], ['火星']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
    expect(r.breakReasons.join()).toContain('煞星');
    expect(r.breakReasons.join()).toContain('主星格');
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

  // ---- 2026-10 依出处修正火贪判据（docs/ziwei-ge-audit.md §6.2） ----
  it('火贪：贪狼火星同宫又逢空劫 → 仍成格，理由注明减色（原文「不怕空劫，反能习正」）', () => {
    // ⚠️ 旧口径是"逢地空地劫同宫即破格"，与《全书》原文相反。
    //    原文：「不怕空劫，空劫会贪狼，反能习正；只怕羊陀，遇之色灾成祸」——
    //    空劫只减弱横发之力（"火铃力量被空劫吸蚀"），不断格。
    const gongData = [
      gong('命宫', ['贪狼', '火星', '地空'], ['文昌'], { 贪狼: '禄' }),
      gong('财帛', ['天相'], []),
      gong('官禄', ['天府'], []),
      gong('迁移', ['紫微'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('火贪格');
    expect(r.reasons.join()).toContain('地空地劫');
    expect(r.reasons.join()).toContain('成色打折');
  });

  it('火贪：同宫见擎羊 → 破格（「擎羊火星同度…均不合格」）', () => {
    const gongData = [
      gong('命宫', ['贪狼', '火星', '擎羊'], [], { 贪狼: '禄' }),
      gong('财帛', ['天相'], []),
      gong('官禄', ['天府'], []),
      gong('迁移', ['紫微'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('火贪格');
    expect(r.breakReasons.join()).toContain('羊陀');
  });

  it('火贪：贪狼坐命、火星在财帛三方相会 → 成格（次格）', () => {
    // 出处：「贪狼守命宫，火星仅在三方相会，不见煞，亦合格，但格局稍次」
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '贪狼', sihua: null }], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: ['火星'] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('火贪格');
    expect(r.reasons.join()).toContain('次格');
  });

  it('火贪：贪狼在田宅、火星同宫 → 成格（旧版只取命宫三方四正，漏此落宫）', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '天机', sihua: null }], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [{ name: '天相', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [{ name: '天同', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [{ name: '太阴', sihua: null }], minorStars: [] },
      { name: '田宅', branch: '未', majorStars: [{ name: '贪狼', sihua: null }], minorStars: ['火星'] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: [] },
      { name: '父母', branch: '申', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('火贪格');
    expect(r.reasons.join()).toContain('田宅宫');
  });

  it('火贪：贪狼在田宅、火星三方相会 → 不成格（弱档主语是"守命宫"）', () => {
    // 若把"三方相会"弱档套到全部六个落宫，火贪会从 83 盘涨到 306 盘（10.1%），
    // 变成全站最高频格，与"突发横发"的稀有语气不符。
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '天机', sihua: null }], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [{ name: '天相', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [{ name: '天同', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [{ name: '太阴', sihua: null }], minorStars: [] },
      { name: '田宅', branch: '未', majorStars: [{ name: '贪狼', sihua: null }], minorStars: [] },
      { name: '子女', branch: '卯', majorStars: [], minorStars: ['火星'] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('火贪格');
  });

  // ---- 2026-10 加冕计入禄存（「与禄存、科权禄、左右、魁钺加会，则为极美之格」） ----
  it('加冕：三方有禄存而无四化 → 计入吉星会照，判格局纯正', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['左辅']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', ['天相'], ['禄存']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
    expect(r.reasons.join()).toContain('禄存朝拱');
    expect(r.reasons.join()).toContain('格局纯正');
  });

  it('加冕：既无禄存也无四化 → 仍成格但注明层次打折', () => {
    const gongData = [
      gong('命宫', ['七杀'], ['左辅']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', ['天相']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
    expect(r.reasons.join()).toContain('层次打折');
    expect(r.reasons.join()).toContain('禄存');
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

  it('羊陀夹忌：擎羊陀罗同侧（未分居两侧）→ 不触发破格', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '武曲', sihua: '忌' }], minorStars: [] },
      // 擎羊陀罗都在兄弟宫（巳），父母宫（未）无 → 不算夹
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: ['擎羊', '陀罗'] },
      { name: '父母', branch: '未', majorStars: [], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.breakReasons.join()).not.toContain('羊陀夹忌');
  });

  it('杂耀夹格：昌曲同侧（未分居两侧）→ 不成夹格', () => {
    // 文昌文曲都在父母宫（巳），兄弟宫（未）无 → 不算夹命
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '天机', sihua: '科' }], minorStars: [] },
      { name: '父母', branch: '巳', majorStars: [], minorStars: ['文昌', '文曲'] },
      { name: '兄弟', branch: '未', majorStars: [], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('昌曲夹命格');
  });

  it('羊陀夹忌：命宫辅星坐生年化忌（文昌化忌）同样触发破格', () => {
    // 全书画化忌可落辅星（如辛干文昌化忌），只查主星会漏判
    const gongData = [
      {
        name: '命宫', branch: '午',
        majorStars: [{ name: '天机', sihua: null }],
        minorStars: ['文昌'],
        minorStarDetails: [{ name: '文昌', type: 'minor', sihua: '忌' }],
      },
      { name: '父母', branch: '未', majorStars: [], minorStars: ['陀罗'] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: ['擎羊'] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.breakReasons.join()).toContain('羊陀夹忌');
  });

  // ---- 2026-10 一致性修正 ----
  it('君臣庆会：紫微坐命 + 左辅文昌（含辅弼、六吉两颗）→ 成格', () => {
    // 紫微坐命在不成紫府同宫/朝垣时的兜底：否则紫微坐命一个格都没有
    const gongData = [
      gong('命宫', ['紫微'], ['左辅', '文昌'], { 紫微: '权' }),
      gong('财帛', ['武曲'], []),
      gong('官禄', ['天相'], []),
      gong('迁移', ['七杀'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('君臣庆会格');
  });

  it('君臣庆会：紫微坐命 + 昌曲两颗但无辅弼 → 不成格（紫微无辅弼为孤君）', () => {
    // 出处一致口径：「没有左辅、右弼会入的紫微星，只能算是孤君」——辅弼是必需项。
    // 旧口径只判"六吉≥2"，会让昌曲魁钺凑两颗即算，把"孤君"这个正题漏掉。
    const gongData = [
      gong('命宫', ['紫微'], ['文昌', '文曲'], { 紫微: '权' }),
      gong('财帛', ['武曲'], []),
      gong('官禄', ['天相'], []),
      gong('迁移', ['七杀'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('君臣庆会格');
  });

  it('君臣庆会：紫微坐命但只有一颗吉星 → 不成格', () => {
    const gongData = [
      gong('命宫', ['紫微'], ['左辅'], { 紫微: '权' }),
      gong('财帛', ['武曲'], []),
      gong('官禄', ['天相'], []),
      gong('迁移', ['七杀'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('君臣庆会格');
  });

  it('两层口径：重破盘上夹宫格仍成立，但破格文案明确只约束"主星格"', () => {
    // 昌曲夹结构成立的盘实测 124/124 都带破格——若让夹宫格连坐，等于删掉这个功能。
    // 正确做法是分层讲清：破格只管主星格，夹宫格另论，并注明力度打折。
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '天机', sihua: '科' }], minorStars: [] },
      // 煞 3 颗才构成破格（2026-10 分级后煞 2 只是下格）
      { name: '迁移', branch: '子', majorStars: [], minorStars: ['擎羊', '陀罗', '火星'] },
      { name: '兄弟', branch: '巳', majorStars: [], minorStars: ['文昌'] },
      { name: '父母', branch: '未', majorStars: [], minorStars: ['文曲'] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('昌曲夹命格');
    // 文案必须点名约束范围，否则与"格成立"读起来矛盾
    expect(r.breakReasons.join()).toContain('主星格');
    expect(r.reasons.join()).toContain('力度打折');
  });

  it('两层口径：重破盘上火贪仍成立，并注明力度打折', () => {
    const gongData = [
      gong('命宫', ['贪狼'], ['火星'], { 贪狼: '忌' }),
      gong('财帛', ['天相']),
      gong('官禄', ['天府']),
      // 擎羊陀罗须放在别的宫：与火铃同宫会直接破火贪格
      gong('迁移', ['紫微'], ['擎羊', '陀罗']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('火贪格');
    expect(r.breakReasons.join()).toContain('主星格');
    expect(r.reasons.join()).toContain('力度打折');
  });

  // ---- 2026-10 破格分级（《全书》上/中/下格 → 四档） ----
  it('分级：生年化忌落财帛 → 中格，仍入格', () => {
    const gongData = [
      gong('命宫', ['七杀']),
      gong('财帛', ['贪狼'], [], { 贪狼: '忌' }),
      gong('官禄', ['破军']),
      gong('迁移', ['天相']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('杀破狼格');
    expect(r.reasons.join()).toContain('中格');
    expect(r.breakReasons).toHaveLength(0);
  });

  it('分级：生年化忌落迁移（冲命）→ 破格不入', () => {
    // 落宫分量不同：化忌在财帛只减色，冲命才真破——旧版不区分，任意一宫全灭
    const gongData = [
      gong('命宫', ['七杀']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', ['天相'], [], { 天相: '忌' }),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
    expect(r.breakReasons.join()).toContain('迁移宫');
  });

  it('分级：空劫与主星同宫 → 破格不入（分居则只降档）', () => {
    const sameGong = [
      gong('命宫', ['七杀'], ['地空']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', ['天相']),
    ];
    const r1 = analyzeZiweiGe(sameGong);
    expect(r1.geNames).not.toContain('杀破狼格');
    expect(r1.breakReasons.join()).toContain('同宫');

    // 空劫两颗但都在没有主星的宫位 → 只算下格
    const splitGong = [
      gong('命宫', ['七杀']),
      gong('财帛', ['贪狼']),
      gong('官禄', ['破军']),
      gong('迁移', [], ['地空', '地劫']),
    ];
    const r2 = analyzeZiweiGe(splitGong);
    expect(r2.geNames).toContain('杀破狼格');
    expect(r2.reasons.join()).toContain('下格');
  });

  it('日月并明：理由文案标明「广义口径」（经典落点说依据不足，不收紧但要说清）', () => {
    const gongData = [
      { name: '命宫', branch: '午', majorStars: [{ name: '太阳', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [{ name: '太阴', sihua: null }], minorStars: ['文曲'] },
      { name: '财帛', branch: '寅', majorStars: [{ name: '天相', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [{ name: '天同', sihua: null }], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('日月并明格');
    expect(r.reasons.join()).toContain('广义口径');
  });

  it('身宫条件依赖 isShenGong：字段缺失时安全退化（不抛错、不误判成格）', () => {
    // buildZiweiChart（合盘链路）产出的宫位没有 isShenGong，复用时不能静默误判
    const gongData = [
      gong('命宫', ['紫微'], ['文昌'], { 紫微: '权' }),
      gong('财帛', ['七杀']),
      gong('官禄', ['破军']),
      gong('迁移', ['贪狼']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('杀破狼格');
    expect(Array.isArray(r.breakReasons)).toBe(true);
  });

  // ---- 2026-10 P1 补格（十格）----
  // 每格都要绑盘面事实（理由里说清是哪个宫、哪颗星），不接受"主星组合成立"一句套所有格。
  const mingWithBranch = (branch: string, major: string[], minor: string[] = [], sihua: Record<string, string> = {}) => ({
    name: '命宫',
    branch,
    majorStars: major.map((m) => ({ name: m, sihua: sihua[m] || null })),
    minorStars: minor,
  });

  it('禄马交驰：三方四正同见禄存与天马 → 成格', () => {
    const gongData = [
      gong('命宫', ['天机'], ['禄存', '天马']),
      gong('财帛', ['天同']),
      gong('官禄', ['天梁']),
      gong('迁移', ['太阴']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('禄马交驰格');
    expect(r.reasons.join()).toContain('禄存与天马');
  });

  it('禄马交驰：只有禄存没有天马 → 不成格', () => {
    const gongData = [
      gong('命宫', ['天机'], ['禄存']),
      gong('财帛', ['天同']),
      gong('官禄', ['天梁']),
      gong('迁移', ['太阴']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('禄马交驰格');
  });

  it('双禄朝垣：禄存 + 化禄同会三方四正 → 成格', () => {
    const gongData = [
      gong('命宫', ['天机'], ['禄存']),
      gong('财帛', ['天同'], [], { 天同: '禄' }),
      gong('官禄', ['天梁']),
      gong('迁移', ['太阴']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('双禄朝垣格');
    expect(r.reasons.join()).toContain('双禄朝命');
  });

  it('科权禄夹命：命宫两侧分见化科与化禄 → 成格', () => {
    const gongData = [
      mingWithBranch('午', ['天机']),
      { name: '兄弟', branch: '巳', majorStars: [{ name: '太阴', sihua: '科' }], minorStars: [] },
      { name: '父母', branch: '未', majorStars: [{ name: '天梁', sihua: '禄' }], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('科权禄夹命格');
  });

  it('科权禄夹命：两侧同为化科（同一种化）→ 不成格', () => {
    // 夹的是两股力，不是同一股；同一种化星两侧夹命不构成"科权禄夹"
    const gongData = [
      mingWithBranch('午', ['天机']),
      { name: '兄弟', branch: '巳', majorStars: [{ name: '太阴', sihua: '科' }], minorStars: [] },
      { name: '父母', branch: '未', majorStars: [{ name: '天梁', sihua: '科' }], minorStars: [] },
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).not.toContain('科权禄夹命格');
  });

  it('巨日同宫：太阳巨门同坐命宫 → 成格', () => {
    const gongData = [
      gong('命宫', ['太阳', '巨门']),
      gong('财帛', ['天机']),
      gong('官禄', ['天同']),
      gong('迁移', ['天梁']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('巨日同宫格');
    expect(r.reasons.join()).toContain('太阳与巨门同坐命宫');
  });

  it('武贪同行：武曲贪狼同坐命宫 → 成格', () => {
    const gongData = [
      gong('命宫', ['武曲', '贪狼']),
      gong('财帛', ['天府']),
      gong('官禄', ['天相']),
      gong('迁移', ['紫微']),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('武贪同行格');
  });

  it('石中隐玉：巨门单星坐命于午 → 成格；与别的主星同宫则不成格', () => {
    const single = [
      mingWithBranch('午', ['巨门']),
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(single).geNames).toContain('石中隐玉格');

    // 巨门+天机同坐午宫 → 不是单星，不成石中隐玉
    const withOther = [
      mingWithBranch('午', ['巨门', '天机']),
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(withOther).geNames).not.toContain('石中隐玉格');
  });

  it('月朗天门：太阴坐命于亥 → 成格；坐其他宫不成格', () => {
    const ok = [
      mingWithBranch('亥', ['太阴']),
      { name: '财帛', branch: '卯', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '未', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '巳', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(ok).geNames).toContain('月朗天门格');

    const wrongBranch = [
      mingWithBranch('子', ['太阴']),
      { name: '财帛', branch: '辰', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '申', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '午', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(wrongBranch).geNames).not.toContain('月朗天门格');
  });

  it('日照雷门：太阳坐命于卯 → 成格', () => {
    const gongData = [
      mingWithBranch('卯', ['太阳']),
      { name: '财帛', branch: '未', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '亥', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '酉', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames).toContain('日照雷门格');
    expect(r.reasons.join()).toContain('卯宫');
  });

  it('明珠出海：命宫未宫空宫 + 三方会太阳太阴 → 成格；命宫有主星则不成格', () => {
    const emptyMing = [
      mingWithBranch('未', []),
      { name: '财帛', branch: '卯', majorStars: [{ name: '太阴', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '亥', majorStars: [{ name: '太阳', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '丑', majorStars: [], minorStars: [] },
    ];
    const r = analyzeZiweiGe(emptyMing);
    expect(r.geNames).toContain('明珠出海格');
    // 命宫空宫不是缺数据，理由里要写清借对宫
    expect(r.reasons.join()).toContain('借对宫');

    const withMajor = [
      mingWithBranch('未', ['巨门']),
      { name: '财帛', branch: '卯', majorStars: [{ name: '太阴', sihua: null }], minorStars: [] },
      { name: '官禄', branch: '亥', majorStars: [{ name: '太阳', sihua: null }], minorStars: [] },
      { name: '迁移', branch: '丑', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(withMajor).geNames).not.toContain('明珠出海格');
  });

  it('马头带箭：擎羊坐命于午 → 成格；擎羊不在命宫不成格', () => {
    const ok = [
      mingWithBranch('午', ['天机'], ['擎羊']),
      { name: '财帛', branch: '寅', majorStars: [], minorStars: [] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(ok).geNames).toContain('马头带箭格');

    const yangElsewhere = [
      mingWithBranch('午', ['天机']),
      { name: '财帛', branch: '寅', majorStars: [], minorStars: ['擎羊'] },
      { name: '官禄', branch: '戌', majorStars: [], minorStars: [] },
      { name: '迁移', branch: '子', majorStars: [], minorStars: [] },
    ];
    expect(analyzeZiweiGe(yangElsewhere).geNames).not.toContain('马头带箭格');
  });

  it('geNames 与 reasons 一一对应（页面按索引取文案）', () => {
    const gongData = [
      gong('命宫', ['紫微', '天府'], ['左辅', '文昌'], { 紫微: '权' }),
      gong('财帛', ['武曲'], [], { 武曲: '禄' }),
      gong('官禄', ['天相'], [], { 天相: '科' }),
      gong('迁移', ['七杀'], []),
    ];
    const r = analyzeZiweiGe(gongData);
    expect(r.geNames.length).toBeGreaterThanOrEqual(2);
    expect(r.reasons.length).toBe(r.geNames.length);
    expect(r.reasons.every((x) => x.length > 0)).toBe(true);
  });
});
