import { describe, it, expect } from 'vitest';
import { decodePan } from 'iching-shifa';
import {
  verdictOf, VERDICT_BANDS, THEMES, JUDGE_RULE,
  type Theme, type Verdict, type ThemeReading,
} from '../divinationCore';
import {
  buildLiuyaoReading, buildAllLiuyaoReadings, probesOf,
  detectSanHeJu, detectFuYinFanYin,
  type LiuyaoChartLike, type YaoLike, type GuaLike,
} from '../liuyaoReading';
import { buildMeihuaReading, buildAllMeihuaReadings, buildMeihuaExtras } from '../meihuaReading';
import { calcMeiHua } from '../meihuaUtils';
import { buildLotReading, buildAllLotReadings, clampByLevel, imageryHits, imageryQuote } from '../lotReading';
import { guanyinLots } from '../../data/guanyinLots';
import { guandiLots } from '../../data/guandiLots';

/* ------------------------------------------------------------------ *
 * 夹具
 * ------------------------------------------------------------------ */

const Y = (
  position: number,
  liuQin: string,
  wuXing: string,
  naJia: string,
  extra: Partial<YaoLike> = {},
): YaoLike => ({
  position,
  yaoValue: 7,
  isMoving: false,
  naJia,
  wuXing,
  liuQin,
  shiYing: String(position),
  ...extra,
});

/** 官鬼持世且得月建（戌土生金）、日辰（申金同气）双扶 —— 六爻里的「强用神」标准盘 */
function strongGuanGuiChart(dayKong = '子丑'): LiuyaoChartLike {
  return {
    monthJian: '戊戌',
    ganZhiDay: { gz: '甲申' },
    dayKong,
    dongYaoCount: 0,
    benGua: {
      guaName: '乾为天',
      yaoList: [
        Y(1, '官鬼', '金', '庚申', { shiYing: '世' }),
        Y(2, '子孙', '水', '壬子'),
        Y(3, '兄弟', '土', '戊辰'),
        Y(4, '妻财', '木', '甲寅'),
        Y(5, '父母', '火', '丙午'),
        Y(6, '子孙', '土', '戊戌', { shiYing: '应' }),
      ],
    },
  };
}

const themeOf = (list: ThemeReading[], t: Theme) => {
  const r = list.find((x) => x.theme === t);
  if (!r) throw new Error(`缺少主题 ${t}`);
  return r;
};

/* ------------------------------------------------------------------ *
 * 1. 统一刻度
 * ------------------------------------------------------------------ */

describe('三板块共用一把吉凶尺子', () => {
  it('档位表单调且覆盖全区间（不会漏档）', () => {
    const mins = VERDICT_BANDS.map((b) => b.min);
    for (let i = 1; i < mins.length; i++) {
      expect(mins[i]).toBeLessThan(mins[i - 1]);
    }
    expect(verdictOf(10)).toBe('大吉');
    expect(verdictOf(0)).toBe('平');
    expect(verdictOf(-10)).toBe('凶');
  });

  it('每个板块的产出都落在同一套档位枚举里', () => {
    const allow: Verdict[] = ['大吉', '吉', '平', '小凶', '凶'];
    const liuyao = buildAllLiuyaoReadings(strongGuanGuiChart(), 'male');
    const meihua = buildAllMeihuaReadings(calcMeiHua(3, 4, 1), '戌');
    const lot = buildAllLotReadings(guanyinLots[0] as any);
    for (const r of [...liuyao, ...meihua, ...lot]) {
      expect(allow).toContain(r.verdict);
      expect(r.summary.length).toBeGreaterThan(10);
      expect(r.advice.length).toBeGreaterThan(10);
    }
  });

  it('六主题全覆盖，且每个板块都给出 6 条', () => {
    expect(buildAllLiuyaoReadings(strongGuanGuiChart()).map((r) => r.theme)).toEqual(THEMES);
    expect(buildAllMeihuaReadings(calcMeiHua(3, 4, 1), '戌').map((r) => r.theme)).toEqual(THEMES);
    expect(buildAllLotReadings(guanyinLots[0] as any).map((r) => r.theme)).toEqual(THEMES);
  });

  it('三个板块都声明了自己的判读口径（页面要原样展示）', () => {
    for (const k of ['liuyao', 'meihua', 'lot'] as const) {
      expect(JUDGE_RULE[k].length).toBeGreaterThan(20);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 2. 六爻：极性（这一条是整个重构的核心）
 * ------------------------------------------------------------------ */

describe('六爻：官鬼越旺≠一切越好', () => {
  it('同一张盘，事业看官鬼旺则该吉，健康看官鬼旺则该凶', () => {
    const chart = strongGuanGuiChart();
    const career = buildLiuyaoReading(chart, '事业', 'male');
    const health = buildLiuyaoReading(chart, '健康', 'male');

    expect(career.score).toBeGreaterThan(0);
    expect(health.score).toBeLessThan(0);
    expect(career.score).toBeGreaterThan(health.score);
    expect(['大吉', '吉']).toContain(career.verdict);
    expect(['小凶', '凶']).toContain(health.verdict);
  });

  it('健康题必须同时给出「病势」与「解神」两星依据', () => {
    const health = buildLiuyaoReading(strongGuanGuiChart(), '健康', 'male');
    const labels = health.evidence.map((e) => e.label).join(' ');
    expect(labels).toMatch(/病神·官鬼/);
    expect(labels).toMatch(/解神·子孙/);
    expect(health.note).toMatch(/官鬼是病势/);
  });

  it('用神旬空会把分数往下拉（空则不实）', () => {
    const normal = buildLiuyaoReading(strongGuanGuiChart('子丑'), '事业', 'male');
    // 申入旬空（午未申…）——用神自己落空
    const kong = buildLiuyaoReading(strongGuanGuiChart('午未申'), '事业', 'male');
    expect(kong.score).toBeLessThan(normal.score);
    expect(kong.evidence.some((e) => /旬空/.test(e.label))).toBe(true);
  });

  it('用神不上卦时走伏神，并显式告知（不静默兜底）', () => {
    const chart = strongGuanGuiChart();
    // 去掉妻财，只留伏神
    chart.benGua.yaoList = chart.benGua.yaoList.filter((y) => y.liuQin !== '妻财');
    chart.benGua.fuShen = [{ fuLiuQin: '妻财', fuNaJia: '甲寅', fuWuXing: '木', hostPosition: 4 }];
    const wealth = buildLiuyaoReading(chart, '财运', 'male');
    expect(wealth.evidence.some((e) => /伏神/.test(e.label))).toBe(true);
    expect(wealth.note).toMatch(/伏神/);
  });

  it('爱情题必须分性别；未设性别时两星各半并说明', () => {
    const male = probesOf('爱情', 'male').probes;
    const female = probesOf('爱情', '女').probes;
    const unknown = probesOf('爱情', null);
    expect(male[0].liuQin).toBe('妻财');
    expect(female[0].liuQin).toBe('官鬼');
    expect(unknown.probes.map((p) => p.liuQin).sort()).toEqual(['妻财', '官鬼']);
    expect(unknown.note).toMatch(/未设置性别/);
    // 未设性别不得默认男命
    expect(buildLiuyaoReading(strongGuanGuiChart(), '爱情', null).note).toMatch(/未设置性别/);
  });

  it('真实排盘可直接吃进去（含互卦/变卦/伏神字段）', () => {
    const pan = decodePan('789789', { year: 2026, month: 11, day: 6, hour: 22 });
    const list = buildAllLiuyaoReadings(pan as any, 'male');
    expect(list).toHaveLength(6);
    for (const r of list) expect(r.evidence.length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ *
 * 3. 梅花：体用 + 时令
 * ------------------------------------------------------------------ */

describe('梅花：体用为主，时令加权', () => {
  it('用生体优于用克体（同吉凶量纲下单调）', () => {
    // 上离(火) 下震(木) 动爻1 → 用(木)生体(火)
    const sheng = calcMeiHua(3, 4, 1);
    // 上离(火) 下坎(水) 动爻1 → 用(水)克体(火)
    const ke = calcMeiHua(3, 6, 1);
    expect(sheng.relation).toBe('用生体');
    expect(ke.relation).toBe('用克体');

    const a = buildMeihuaReading(sheng, '事业', '戌');
    const b = buildMeihuaReading(ke, '事业', '戌');
    expect(a.score).toBeGreaterThan(b.score);
    expect(['大吉', '吉']).toContain(a.verdict);
    expect(['凶', '小凶', '平']).toContain(b.verdict);
  });

  it('同一卦在不同时令得到不同分数（否则时令这一层等于没加）', () => {
    const r = calcMeiHua(3, 4, 1); // 体属火
    const summer = buildMeihuaReading(r, '事业', '午'); // 火旺
    const winter = buildMeihuaReading(r, '事业', '子'); // 火死
    expect(summer.score).toBeGreaterThan(winter.score);
    expect(summer.evidence.some((e) => e.label.includes('时令'))).toBe(true);
  });

  it('时令依据里必须写明体卦处在旺相休囚死哪一档', () => {
    const r = buildMeihuaReading(calcMeiHua(3, 4, 1), '财运', '子');
    const t = r.evidence.find((e) => e.label.includes('时令'));
    expect(t?.detail).toMatch(/[旺相休囚死]/);
  });

  it('互卦与变卦都要参与判读（不能只有本卦体用）', () => {
    const r = buildMeihuaReading(calcMeiHua(3, 4, 1), '亲情', '戌');
    const labels = r.evidence.map((e) => e.label).join(' ');
    expect(labels).toMatch(/体用/);
    expect(labels).toMatch(/变卦/);
    expect(labels).toMatch(/互卦/);
  });
});

/* ------------------------------------------------------------------ *
 * 4. 灵签：签等定基调，分项只在一档内微调
 * ------------------------------------------------------------------ */

describe('灵签：下下签读不出大吉', () => {
  const mk = (level: string, guide: Record<string, string> = {}, text = '') => ({
    lotType: 'guanyin' as const,
    level,
    poem: text || '开天辟地作良缘，吉日良时万物全',
    explanation: text,
    interpretation: '',
    guide,
  });

  it('clampByLevel 的四条边界', () => {
    expect(clampByLevel(10, '下下')).toBeLessThan(0);
    expect(clampByLevel(10, '下')).toBeLessThanOrEqual(1);
    expect(clampByLevel(-10, '上上')).toBeGreaterThanOrEqual(3);
    expect(clampByLevel(0, '中')).toBe(0);
  });

  it('下下签即使分项全好，也不能出「吉 / 大吉」', () => {
    const good = mk('下下', { 求财: '大吉，财源广进，顺利可成', 自身: '万事亨通', 婚姻: '天赐良缘' });
    for (const t of THEMES) {
      const r = buildLotReading(good as any, t);
      expect(['凶', '小凶']).toContain(r.verdict);
    }
  });

  it('上上签即使分项全差，也不能出「凶 / 小凶」', () => {
    const bad = mk('上上', { 求财: '破财，不宜，难成', 自身: '阻滞，多忧', 婚姻: '口舌，难成' });
    for (const t of THEMES) {
      const r = buildLotReading(bad as any, t);
      expect(['大吉', '吉']).toContain(r.verdict);
    }
  });

  it('观音灵签要用本签自己的分项断语，而不是按签等套模板', () => {
    const lot = guanyinLots[0] as any; // 第1签 上上 钟离成道
    const r = buildLotReading({ ...lot, lotType: 'guanyin' }, '事业');
    const hit = r.evidence.find((e) => e.label.includes('签文分项·事业'));
    expect(hit).toBeTruthy();
    // 必须真的引用了这一签的原话
    expect(hit!.detail).toContain('事业运势极佳');
  });

  it('同为上上签，不同签文的结论文案必须不同（禁止一招通吃）', () => {
    const top = guanyinLots.filter((l) => l.level === '上上签').slice(0, 2);
    expect(top.length).toBe(2);
    const a = buildLotReading({ ...(top[0] as any), lotType: 'guanyin' }, '事业');
    const b = buildLotReading({ ...(top[1] as any), lotType: 'guanyin' }, '事业');
    expect(a.summary).not.toBe(b.summary);
  });

  it('关帝的「事业：xxx」行文本能被解析成分项', () => {
    const lot = guandiLots[0] as any;
    const r = buildLotReading({ ...lot, lotType: 'guandi' }, '事业');
    expect(r.evidence.some((e) => e.label.includes('事业'))).toBe(true);
  });

  it('诸葛神数不分等级：必须显式说明是「推定」', () => {
    const r = buildLotReading(
      { lotType: 'zhuge', level: '', poem: '天门一挂榜\n预定夺标人', explanation: '这支签大吉，事业顺利。', guide: {} },
      '事业',
    );
    expect(r.evidence[0].label).toMatch(/未分级/);
    expect(r.score).toBeGreaterThan(0);
    expect(r.note).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ *
 * 5. 反套话：换盘 / 换主题必须换话
 * ------------------------------------------------------------------ */

describe('判读必须因盘、因主题而异', () => {
  it('同一张盘，六个主题的结论不得雷同', () => {
    const list = buildAllLiuyaoReadings(strongGuanGuiChart(), 'male');
    const distinct = new Set(list.map((r) => r.summary));
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it('同一主题，强盘与弱盘的结论文案必须不同', () => {
    const strong = buildLiuyaoReading(strongGuanGuiChart(), '事业', 'male');
    const weakChart = strongGuanGuiChart();
    weakChart.monthJian = '甲午'; // 火克金 → 官鬼死
    weakChart.ganZhiDay = { gz: '丙午' }; // 火克金
    const weak = buildLiuyaoReading(weakChart, '事业', 'male');
    expect(weak.score).toBeLessThan(strong.score);
    expect(weak.summary).not.toBe(strong.summary);
  });

  it('同一张梅花盘，六个主题不得全部同档', () => {
    const list = buildAllMeihuaReadings(calcMeiHua(3, 4, 1), '午');
    const distinct = new Set(list.map((r) => r.verdict));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('全部观音灵签扫一遍：档位分布不塌缩成单一档', () => {
    const verdicts = new Set<Verdict>();
    for (const lot of guanyinLots) {
      verdicts.add(buildLotReading({ ...(lot as any), lotType: 'guanyin' }, '事业').verdict);
    }
    expect(verdicts.size).toBeGreaterThanOrEqual(3);
  });
});

/* ------------------------------------------------------------------ *
 * 6. 依据可读性：不能只甩术语
 * ------------------------------------------------------------------ */

describe('依据必须「事实 + 意味」两段都有', () => {
  it('每条计分依据都得有可读解释，不能只有卦名', () => {
    const readings = [
      ...buildAllLiuyaoReadings(strongGuanGuiChart(), 'female'),
      ...buildAllMeihuaReadings(calcMeiHua(3, 4, 1), '戌'),
      ...buildAllLotReadings(guanyinLots[0] as any),
    ];
    for (const r of readings) {
      for (const e of r.evidence) {
        expect(e.label.length).toBeGreaterThan(1);
        expect(e.detail.length).toBeGreaterThan(8);
      }
    }
  });

  it('权重绝对值排序在前面的，是真正决定结论的那条', () => {
    const r = buildLiuyaoReading(strongGuanGuiChart(), '事业', 'male');
    const weights = r.evidence.map((e) => Math.abs(e.weight));
    const sorted = [...weights].sort((a, b) => b - a);
    expect(weights).toEqual(sorted);
  });
});

/* ------------------------------------------------------------------ *
 * 7. 六爻：三合局 / 卦变伏吟反吟（群体力量与「原地打转」）
 * ------------------------------------------------------------------ */

/** 申子辰三合水局：初爻申、二爻子皆动，月建辰补齐第三支 */
function sanHeChart(yongWx: string, dayGz = '乙亥'): LiuyaoChartLike {
  return {
    monthJian: '戊辰',
    ganZhiDay: { gz: dayGz },
    dongYaoCount: 2,
    benGua: {
      guaName: '水火既济',
      yaoList: [
        Y(1, '父母', '金', '庚申', { isMoving: true }),
        Y(2, '子孙', '水', '壬子', { isMoving: true }),
        Y(3, '官鬼', yongWx, '戊辰'),
        Y(4, '妻财', '木', '甲寅'),
        Y(5, '兄弟', '土', '丙午'),
        Y(6, '子孙', '土', '戊戌'),
      ],
    },
  };
}

const gua = (name: string, zhis: string[]): GuaLike => ({
  guaName: name,
  // 三爻给官鬼，免得「事业用神不上卦」把伏神分支抢在前面
  yaoList: zhis.map((z, i) => Y(i + 1, i === 2 ? '官鬼' : '兄弟', i === 2 ? '金' : '土', `甲${z}`)),
});

describe('六爻：三合局是「群体力量」，单爻旺相顶不住', () => {
  it('三支齐现且两支来自动爻 → 成局', () => {
    const hit = detectSanHeJu(sanHeChart('火'));
    expect(hit).toBeTruthy();
    expect(hit!.name).toBe('申子辰水局');
    expect(hit!.fromMoving).toBeGreaterThanOrEqual(2);
    expect(hit!.broken).toBe(false);
  });

  it('两爻动、一爻静（《增删卜易》第二条）→ 仍成局，静爻可充第三支', () => {
    const c = sanHeChart('火');
    c.benGua.yaoList[0].isMoving = false; // 申由动转静，子、辰不动 → 只剩子一爻动
    expect(detectSanHeJu(c)).toBeNull();   // 只一爻发动，不成局

    // 申静、子动、月建辰补 → 仍是只有一爻动 → 不成局
    const c2 = sanHeChart('火');
    c2.benGua.yaoList[0].isMoving = false;
    c2.benGua.yaoList[1].isMoving = true;
    expect(detectSanHeJu(c2)).toBeNull();

    // 子动 + 申动 = 2 支发动，第三支辰来自静爻 → 成局（这就是「两爻动，一爻不动」）
    const c3 = sanHeChart('火');
    c3.monthJian = '丁巳'; // 月建不再是辰（巳不冲申子辰），辰只能来自卦中静爻
    c3.ganZhiDay = { gz: '乙亥' };
    const hit = detectSanHeJu(c3);
    expect(hit).toBeTruthy();
    expect(hit!.fromMoving).toBe(2);
    expect(hit!.broken).toBe(false);
  });

  it('三爻全静、只靠日月凑齐 → 不成局', () => {
    const c = sanHeChart('火');
    c.benGua.yaoList.forEach((y) => { y.isMoving = false; });
    expect(detectSanHeJu(c)).toBeNull();
  });

  it('局中一支被日辰冲 → 成局不成（半合只算有势）', () => {
    // 午冲子：申子辰里的子被冲散
    const hit = detectSanHeJu(sanHeChart('火', '甲午'));
    expect(hit).toBeTruthy();
    expect(hit!.broken).toBe(true);
  });

  it('世爻在局内 → 额外 +1（原文「尤要世爻在局为美」）', () => {
    const c = sanHeChart('火');
    // 把世爻放到局中（子）
    c.benGua.yaoList[1].shiYing = '世';
    const hit = detectSanHeJu(c)!;
    expect(hit.shiInJu).toBe(true);
    const r = buildLiuyaoReading(c, '事业', 'male');
    expect(r.evidence.some((e) => e.label.includes('世在局'))).toBe(true);
  });

  it('世不在局内且局神克世 → 必须扣分（原文「倘局克世爻，则以凶推」）', () => {
    const c = sanHeChart('火');
    // 世爻放在戌（土），水局不克土 → 先验「不克世」
    c.benGua.yaoList[5].shiYing = '世';
    const noKe = buildLiuyaoReading(c, '事业', 'male');
    expect(noKe.evidence.some((e) => e.label.includes('克世'))).toBe(false);

    // 换到火（午），水克火 → 克世
    c.benGua.yaoList[5].shiYing = '';
    c.benGua.yaoList[4].shiYing = '世'; // 午
    const keShi = buildLiuyaoReading(c, '事业', 'male');
    const ev = keShi.evidence.find((e) => e.label.includes('克世'));
    expect(ev).toBeTruthy();
    expect(ev!.weight).toBeLessThan(0);
  });

  it('局神克用神时，用神分数必须被压下去', () => {
    // 水局克火 → 官鬼属火时被克
    const ke = buildLiuyaoReading(sanHeChart('火'), '事业', 'male');
    // 水局同气于水 → 官鬼属水时得势
    const same = buildLiuyaoReading(sanHeChart('水'), '事业', 'male');

    expect(ke.score).toBeLessThan(same.score);
    const ev = ke.evidence.find((e) => e.label.includes('三合局'));
    expect(ev).toBeTruthy();
    expect(ev!.detail).toMatch(/克用神/);
    expect(ev!.weight).toBeLessThan(0);
  });

  it('被冲散的三合局只提示「有势无实」，不能借它加分', () => {
    const r = buildLiuyaoReading(sanHeChart('火', '甲午'), '事业', 'male');
    const ev = r.evidence.find((e) => e.label.includes('三合局'));
    expect(ev).toBeTruthy();
    expect(ev!.weight).toBe(0);
    expect(ev!.detail).toMatch(/冲散|不成/);
  });
});

describe('六爻：伏吟 / 反吟讲的是「动而不进」', () => {
  const withBian = (benZhis: string[], bianZhis: string[]): LiuyaoChartLike => ({
    monthJian: '戊戌',
    ganZhiDay: { gz: '甲申' },
    dongYaoCount: 3,
    benGua: gua('乾为天', benZhis),
    zhiGua: gua('坤为地', bianZhis),
  });

  it('本卦变卦同位地支全同 → 全卦伏吟', () => {
    const hit = detectFuYinFanYin(withBian(
      ['子', '寅', '辰', '午', '申', '戌'],
      ['子', '寅', '辰', '午', '申', '戌'],
    ));
    expect(hit).toEqual({ kind: '伏吟', scope: '全卦' });
  });

  it('本卦变卦同位地支全冲 → 全卦反吟', () => {
    const hit = detectFuYinFanYin(withBian(
      ['子', '寅', '辰', '午', '申', '戌'],
      ['午', '申', '戌', '子', '寅', '辰'],
    ));
    expect(hit).toEqual({ kind: '反吟', scope: '全卦' });
  });

  it('只有内卦相同 → 标内卦伏吟，力度减半', () => {
    const c = withBian(
      ['子', '寅', '辰', '午', '申', '戌'],
      ['子', '寅', '辰', '丑', '卯', '巳'],
    );
    const hit = detectFuYinFanYin(c);
    expect(hit).toEqual({ kind: '伏吟', scope: '内卦' });

    const full = withBian(
      ['子', '寅', '辰', '午', '申', '戌'],
      ['子', '寅', '辰', '午', '申', '戌'],
    );
    const half = buildLiuyaoReading(c, '事业', 'male');
    const whole = buildLiuyaoReading(full, '事业', 'male');
    const halfEv = half.evidence.find((e) => e.label.includes('伏吟'))!;
    const wholeEv = whole.evidence.find((e) => e.label.includes('伏吟'))!;
    expect(Math.abs(wholeEv.weight)).toBeGreaterThan(Math.abs(halfEv.weight));
  });

  it('没有变卦（静卦）时不产生伏吟反吟', () => {
    expect(detectFuYinFanYin(strongGuanGuiChart())).toBeNull();
  });

  it('伏吟结论里必须写「动而不进」的意思，而不是当成普通坏运', () => {
    // 三爻用神取巳（避开戌月冲辰的月破分支，让伏吟能排到 headline）
    const r = buildLiuyaoReading(withBian(
      ['子', '寅', '巳', '午', '申', '戌'],
      ['子', '寅', '巳', '午', '申', '戌'],
    ), '事业', 'male');
    expect(r.summary).toMatch(/原地打转|没往前/);
  });
});

/* ------------------------------------------------------------------ *
 * 8. 梅花：方位 / 应期 / 观物取象（外应层）
 * ------------------------------------------------------------------ */

describe('梅花：方位与应期可以追溯到卦', () => {
  const extras = buildMeihuaExtras(calcMeiHua(3, 4, 1));

  it('应期数字 = 先天卦数 + 动爻，且给出封顶口径', () => {
    expect(extras.timing.number).toBeGreaterThan(0);
    expect(['日', '月']).toContain(extras.timing.unit);
    expect(extras.timing.text).toContain(String(extras.timing.number));
  });

  it('先天起卦取「卦气」定应期（原书正法），不能只给一个数字', () => {
    expect(extras.timing.qi).toMatch(/卦气/);
    expect(extras.timing.qi).toMatch(/用卦/);
    // 卦气必须落到具体的干支日类别上
    expect(extras.timing.qi).toMatch(/甲|庚|壬|丙|戊/);
  });

  it('应期取数按主题分档：测财、测病、其余各用不同算式', () => {
    const r = calcMeiHua(3, 4, 1);
    const cai = buildMeihuaExtras(r, '财运').timing.number;
    const bing = buildMeihuaExtras(r, '健康').timing.number;
    const shi = buildMeihuaExtras(r, '事业').timing.number;
    expect(new Set([cai, bing, shi]).size).toBeGreaterThanOrEqual(2);
    // 测病取主互变总数，必然不小于主卦数
    expect(bing).toBeGreaterThanOrEqual(cai);
  });

  it('有利 / 回避方位都必须是真实方位词，且理由里带卦名', () => {
    const all = [...extras.luckyDirections, ...extras.avoidDirections];
    expect(all.length).toBeGreaterThan(0);
    for (const d of all) {
      expect(['东', '南', '西', '北', '东南', '西南', '东北', '西北']).toContain(d.dir);
      expect(d.why.length).toBeGreaterThan(6);
    }
  });

  it('四层（体/用/互/变）类象都要给，供用户自己对照外应', () => {
    expect(extras.xiang.map((x) => x.role).join()).toMatch(/体.*用.*互.*变/);
    for (const x of extras.xiang) {
      expect(x.items.length).toBeGreaterThan(0);
    }
  });

  it('不得替用户编造外应，必须显式说明要他自查', () => {
    expect(extras.note).toMatch(/不替你编造/);
    expect(extras.note).toMatch(/自己/);
  });
});

/* ------------------------------------------------------------------ *
 * 9. 灵签：学业题的降级判据
 * ------------------------------------------------------------------ */

describe('灵签：学业没有「功名」仙机项时怎么断', () => {
  it('签诗里出现功名意象 → 引用原句并明标这是降级判据', () => {
    const lot76 = guanyinLots.find((l) => l.id === 76) as any; // 青灯夜读十年深，一朝金榜姓名闻
    expect(lot76).toBeTruthy();
    const r = buildLotReading({ ...lot76, lotType: 'guanyin' }, '学业');
    const ev = r.evidence.find((e) => e.label.includes('意象'));
    expect(ev).toBeTruthy();
    expect(ev!.label).toContain('本签无学业专项断语');
    expect(ev!.detail).toContain('金榜'); // 必须引到原句，而不是只甩一个词
  });

  it('意象证据的权重低于原签分项，不许靠它翻转档位', () => {
    const lot76 = guanyinLots.find((l) => l.id === 76) as any;
    const r = buildLotReading({ ...lot76, lotType: 'guanyin' }, '学业');
    const ev = r.evidence.find((e) => e.label.includes('意象'))!;
    expect(Math.abs(ev.weight)).toBeLessThanOrEqual(0.3 + 1e-9);
    // 上签不能被意象顶成大吉
    expect(r.verdict).not.toBe('大吉');
  });

  it('签诗完全没有功名意象时，退到仙机兜底而不是留空', () => {
    const plain = {
      lotType: 'guanyin' as const,
      level: '中',
      poem: '云开月出正分明，不须进退问前程',
      explanation: '守旧待时之象。',
      interpretation: '',
      guide: { 自身: '安分守己，静待时机，不必强求。' },
    };
    const r = buildLotReading(plain as any, '学业');
    expect(r.evidence.some((e) => e.label.includes('仙机'))).toBe(true);
    expect(r.summary.length).toBeGreaterThan(10);
  });

  it('imageryHits / imageryQuote 只认本主题词，不会串味', () => {
    expect(imageryHits('一朝金榜姓名闻', '学业')).toContain('金榜');
    expect(imageryHits('一朝金榜姓名闻', '爱情')).not.toContain('金榜');
    expect(imageryQuote('青灯夜读十年深，\n一朝金榜姓名闻。', ['金榜'])).toContain('金榜');
  });
});
