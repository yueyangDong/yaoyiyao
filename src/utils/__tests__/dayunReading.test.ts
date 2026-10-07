import { describe, it, expect } from 'vitest';
import {
  resolveLifeStage,
  resolveRelation,
  buildDayunReadings,
  findCurrentDayunStep,
  toNominalAge,
  LIFE_STAGES,
  type DayunStep,
} from '../dayunReading';

describe('人生阶段划分', () => {
  it('边界取值正确（60 岁起为退休生活期）', () => {
    const cases: Array<[number, string]> = [
      [0, 'student'], [12, 'student'], [22, 'student'],
      [23, 'young'], [30, 'young'], [34, 'young'],
      [35, 'prime'], [42, 'prime'], [49, 'prime'],
      [50, 'mature'], [55, 'mature'], [59, 'mature'],
      [60, 'retire'], [68, 'retire'], [74, 'retire'],
      [75, 'elder'], [90, 'elder'],
    ];
    for (const [age, key] of cases) {
      expect(resolveLifeStage(age).key, `${age} 岁`).toBe(key);
    }
  });

  it('阶段连续无空洞：上一段 max + 1 === 下一段 min', () => {
    for (let i = 1; i < LIFE_STAGES.length; i++) {
      expect(LIFE_STAGES[i].min, `${LIFE_STAGES[i].key} 起点不接续`).toBe(LIFE_STAGES[i - 1].max + 1);
    }
  });

  it('每个阶段都声明了内容重心与刻意排除项', () => {
    for (const s of LIFE_STAGES) {
      expect(s.focus.length, `${s.key} 缺 focus`).toBeGreaterThan(8);
      expect(s.exclude.length, `${s.key} 缺 exclude`).toBeGreaterThan(4);
    }
  });
});

describe('十神关系判定（日主 vs 大运天干）', () => {
  it('甲木日主的五种关系全部命中', () => {
    expect(resolveRelation('甲', '甲')).toBe('bijie');   // 同五行
    expect(resolveRelation('甲', '壬')).toBe('yin');     // 水生木 = 生我
    expect(resolveRelation('甲', '丙')).toBe('shishang'); // 木生火 = 我生
    expect(resolveRelation('甲', '庚')).toBe('guansha'); // 金克木 = 克我
    expect(resolveRelation('甲', '戊')).toBe('cai');     // 木克土 = 我克
  });

  it('未知天干返回 null（走阶段兜底而非报错）', () => {
    expect(resolveRelation('甲', 'X')).toBeNull();
    expect(resolveRelation('', '甲')).toBeNull();
  });
});

const steps: DayunStep[] = [
  { ganZhi: '甲子', startAge: 6, endAge: 15, startYear: 1996, endYear: 2005 },
  { ganZhi: '乙丑', startAge: 16, endAge: 25, startYear: 2006, endYear: 2015 },
  { ganZhi: '丙寅', startAge: 26, endAge: 35, startYear: 2016, endYear: 2025 },
  { ganZhi: '丁卯', startAge: 36, endAge: 45, startYear: 2026, endYear: 2035 },
  { ganZhi: '戊辰', startAge: 46, endAge: 55, startYear: 2036, endYear: 2045 },
  { ganZhi: '己巳', startAge: 56, endAge: 65, startYear: 2046, endYear: 2055 },
  { ganZhi: '庚午', startAge: 66, endAge: 75, startYear: 2056, endYear: 2065 },
  { ganZhi: '辛未', startAge: 76, endAge: 85, startYear: 2066, endYear: 2075 },
];

describe('buildDayunReadings 大运阶段解读', () => {
  it('每步大运都拿到阶段标签，且 60 岁后不再归入事业导向阶段', () => {
    const { readings } = buildDayunReadings(steps, '甲', 40);
    expect(readings).toHaveLength(steps.length);
    for (const r of readings) {
      const mid = Math.floor((r.startAge + r.endAge) / 2);
      expect(r.stage).toBe(resolveLifeStage(mid).key);
      if (mid >= 60) {
        expect(['retire', 'elder'], `${r.ganZhi} 中点 ${mid} 岁仍归入事业阶段`).toContain(r.stage);
      }
    }
  });

  it('退休及颐养阶段的文案不含事业/求财扩张导向措辞', () => {
    const FORBIDDEN = ['事业', '升职', '晋升', '创业', '融资', 'KPI', '业绩', '副业', '扩张', '合伙人', '组团队', '人脉'];
    for (const age of [62, 80]) {
      const { readings } = buildDayunReadings(steps, '甲', age);
      const matureReadings = readings.filter((r) => r.stage === 'retire' || r.stage === 'elder');
      expect(matureReadings.length).toBeGreaterThan(0);
      for (const r of matureReadings) {
        for (const word of FORBIDDEN) {
          expect(r.text.includes(word), `${r.stageLabel}文案出现「${word}」：${r.text}`).toBe(false);
        }
      }
    }
  });

  it('同一个干支，落在退休阶段与立业阶段的解读完全不同（年龄驱动取舍生效）', () => {
    const youngSteps: DayunStep[] = [{ ganZhi: '甲子', startAge: 24, endAge: 33 }];
    const retireSteps: DayunStep[] = [{ ganZhi: '甲子', startAge: 60, endAge: 69 }];
    const a = buildDayunReadings(youngSteps, '甲', 28).readings[0];
    const b = buildDayunReadings(retireSteps, '甲', 65).readings[0];
    expect(a.stage).toBe('young');
    expect(b.stage).toBe('retire');
    expect(a.text).not.toBe(b.text);
  });

  it('当前大运与已走过标记正确', () => {
    const { readings } = buildDayunReadings(steps, '甲', 40);
    const current = readings.filter((r) => r.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0].startAge).toBe(36);
    const past = readings.filter((r) => r.isPast);
    expect(past.map((r) => r.ganZhi)).toEqual(['甲子', '乙丑', '丙寅']);
    // 未来大运不得同时被判为"已走过"
    expect(readings.find((r) => r.ganZhi === '庚午')!.isPast).toBe(false);
  });

  it('同一阶段内同一种十神关系的两段大运，解读不重复（阶段内定位句生效）', () => {
    // 甲子（甲木）与乙丑（乙木）对甲日主都是比劫，且都落在求学成长期
    const { readings } = buildDayunReadings(steps, '甲', 40);
    const a = readings.find((r) => r.ganZhi === '甲子')!;
    const b = readings.find((r) => r.ganZhi === '乙丑')!;
    expect(a.stage).toBe('student');
    expect(b.stage).toBe('student');
    expect(a.text).not.toBe(b.text);
    expect(b.text).toContain('更靠后');
  });

  it('阶段导航按当前年龄给出不同的重心说明', () => {
    const young = buildDayunReadings(steps, '甲', 28);
    expect(young.stageLead).toContain('立业成家期');
    expect(young.currentStage?.key).toBe('young');

    const retired = buildDayunReadings(steps, '甲', 62);
    expect(retired.stageLead).toContain('退休生活期');
    expect(retired.stageLead).toContain('健康、家庭与生活节奏');
  });

  it('无法判定五行关系时回退到阶段兜底文案，而非空字符串', () => {
    const { readings } = buildDayunReadings([{ ganZhi: '?子', startAge: 60, endAge: 69 }], '甲', 65);
    expect(readings[0].text.length).toBeGreaterThan(10);
    expect(readings[0].relationLabel).toBe('五行关系平顺');
    expect(readings[0].text).toContain('换节奏');
  });
});

describe('当前大运定位（虚岁闭区间，端点不落空）', () => {
  it('toNominalAge：虚岁 = 公历年差 + 1', () => {
    expect(toNominalAge(2026, 2000)).toBe(27);
    expect(toNominalAge(2026, 1978)).toBe(49);
  });

  it('周岁恰好等于某步 endAge 时仍能定位（旧口径此处无运可归）', () => {
    // 2000-07-20 男：乙酉(17~26) / 丙戌(27~36)；2026 年周岁 26 → 虚岁 27
    const dayun: DayunStep[] = [
      { ganZhi: '—', startAge: 1, endAge: 6, isPreStart: true },
      { ganZhi: '甲申', startAge: 7, endAge: 16 },
      { ganZhi: '乙酉', startAge: 17, endAge: 26 },
      { ganZhi: '丙戌', startAge: 27, endAge: 36 },
    ];
    expect(findCurrentDayunStep(dayun, toNominalAge(2026, 2000))?.ganZhi).toBe('丙戌');
    // 1978-01-09 女：丁巳(39~48) / 戊午(49~58)；2026 年虚岁 49
    const dayun2: DayunStep[] = [
      { ganZhi: '丁巳', startAge: 39, endAge: 48 },
      { ganZhi: '戊午', startAge: 49, endAge: 58 },
    ];
    expect(findCurrentDayunStep(dayun2, toNominalAge(2026, 1978))?.ganZhi).toBe('戊午');
  });

  it('起运前返回 null，且端点取闭区间', () => {
    const dayun: DayunStep[] = [
      { ganZhi: '—', startAge: 1, endAge: 6, isPreStart: true },
      { ganZhi: '甲申', startAge: 7, endAge: 16 },
    ];
    expect(findCurrentDayunStep(dayun, 5)).toBeNull();
    expect(findCurrentDayunStep(dayun, 7)?.ganZhi).toBe('甲申');
    expect(findCurrentDayunStep(dayun, 16)?.ganZhi).toBe('甲申');
  });

  it('虚岁区间连续无缝：任取一年有且只有一步命中', () => {
    const dayun: DayunStep[] = Array.from({ length: 10 }, (_, i) => ({
      ganZhi: '甲子',
      startAge: 7 + i * 10,
      endAge: 16 + i * 10,
    }));
    for (let a = 7; a <= 106; a++) {
      const hits = dayun.filter((s) => a >= s.startAge && a <= s.endAge);
      expect(hits.length, `${a} 虚岁命中 ${hits.length} 步`).toBe(1);
    }
  });

  it('buildDayunReadings 收到虚岁后，endAge 那一年仍标为当前大运', () => {
    const dayun: DayunStep[] = [
      { ganZhi: '乙丑', startAge: 16, endAge: 25 },
      { ganZhi: '丙寅', startAge: 26, endAge: 35 },
    ];
    const { readings } = buildDayunReadings(dayun, '甲', 26, 26);
    const cur = readings.filter((r) => r.isCurrent);
    expect(cur).toHaveLength(1);
    expect(cur[0].ganZhi).toBe('丙寅');
  });
});
