// ========== 命盘对比：链路回归 ==========
// 页面（ChartCompare.tsx）只做渲染，逻辑在 utils/chartCompare.ts —— 这里把那部分钉住：
// 表单校验、真太阳时/农历路径、以及"同一张盘与自身对比 → 相似度 1"。

import { describe, it, expect, vi } from 'vitest';

// chartCompare 依赖 UserContext（内部 import supabase，import.meta.env 在 vitest 下无注入）
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import { validatePersonForm, formToChart, comparePersons, type PersonForm } from '../chartCompare';
import { correctSolarTime } from '../../context/UserContext';
import { SHENSHA_SIMILARITY_BANDS } from '../shenShaSimilarity';

const base = (over: Partial<PersonForm> = {}): PersonForm => ({
  calendar: 'solar', year: 1990, month: 6, day: 15, hour: 10, minute: 30, gender: 'male', ...over,
});

describe('validatePersonForm', () => {
  it('正常公历通过', () => {
    expect(validatePersonForm(base())).toBeNull();
  });

  it('公历 2 月 30 日 → 报"日期不存在"', () => {
    expect(validatePersonForm(base({ year: 1990, month: 2, day: 30 }))).toContain('不存在');
  });

  it('未来日期 → 报"不能晚于今天"', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(validatePersonForm(base({ year: nextYear, month: 1, day: 1 }))).toContain('不能晚于今天');
  });

  it('农历：不存在的闰月 → 报错（该年闰月与填写不符）', () => {
    // 1990 年不闰 4 月
    expect(validatePersonForm(base({ calendar: 'lunar', year: 1990, month: 4, day: 10, isLeap: true }))).toContain('农历');
  });

  it('缺时辰 → 报"请填写完整"', () => {
    expect(validatePersonForm(base({ hour: undefined as any }))).toContain('完整');
  });
});

describe('formToChart', () => {
  it('晚子时流派透传：23:30 出生者，1=日柱算次日 / 2=算当天（缺省 2）', () => {
    const f = { year: 2002, month: 12, day: 31, hour: 23, minute: 30, gender: 'male' as const };
    expect(formToChart({ ...base(), ...f }).pillars[2].ganZhi).toBe('癸酉');                          // 缺省 = 算当天
    expect(formToChart({ ...base(), ...f, ziShiSect: 2 }).pillars[2].ganZhi).toBe('癸酉');
    expect(formToChart({ ...base(), ...f, ziShiSect: 1 }).pillars[2].ganZhi).toBe('甲戌');
  });

  it('公历排盘：四柱为 4 柱、日主与日柱天干一致', () => {
    const c = formToChart(base());
    expect(c.pillars).toHaveLength(4);
    expect(c.pillars.map((p) => p.pillar)).toEqual(['年柱', '月柱', '日柱', '时柱']);
    expect(c.dayGan).toBe(c.pillars[2].tianGan);
    expect(c.shenSha.length).toBeGreaterThan(0);
    expect(c.strengthLevel).toMatch(/身|中和/);
  });

  it('农历输入与对应公历输入排出的四柱一致（历法不改变命盘）', () => {
    // 1990 年农历五月廿三 = 公历 1990-06-15
    const solar = formToChart(base({ calendar: 'solar', year: 1990, month: 6, day: 15, hour: 12 }));
    const lunar = formToChart(base({ calendar: 'lunar', year: 1990, month: 5, day: 23, hour: 12 }));
    expect(lunar.pillars.map((p) => p.ganZhi)).toEqual(solar.pillars.map((p) => p.ganZhi));
  });

  it('真太阳时校正：西安（≈108.9°E）比东八区晚约 44 分钟', () => {
    // 直接断言校正后的时刻（数值口径最稳），避免"同一时辰内偏移看不出来"的假绿
    const xian = correctSolarTime({ year: 1990, month: 6, day: 15, hour: 12, minute: 0, lng: 108.9, calendar: 'solar' });
    expect(xian.hour).toBe(11);
    expect(xian.minute).toBeGreaterThanOrEqual(10);
    expect(xian.minute).toBeLessThanOrEqual(20);
    // 上海（≈121.5°E）略早于东八区基准
    const shanghai = correctSolarTime({ year: 1990, month: 6, day: 15, hour: 12, minute: 0, lng: 121.5, calendar: 'solar' });
    expect(shanghai.hour).toBe(12);
    expect(shanghai.minute).toBeGreaterThan(0);
  });

  it('真太阳时跨时辰边界时，时柱确实随之改变（校真正生效，不是被忽略）', () => {
    // 11:00（午时起点）：西安 −44 分钟 → 10:16 巳时；上海 +6 分钟 → 11:06 仍午时
    const xian = formToChart(base({ hour: 11, minute: 0, birthplace: ['61', '6101'] }));
    const shanghai = formToChart(base({ hour: 11, minute: 0, birthplace: ['31', '3101'] }));
    expect(xian.pillars[3].ganZhi).not.toBe(shanghai.pillars[3].ganZhi);
    expect(xian.pillars[3].diZhi).toBe('巳');
    expect(shanghai.pillars[3].diZhi).toBe('午');
  });
});

describe('comparePersons', () => {
  it('同一张盘与自己对比 → 相似度 1、档位"高"、无独有项', () => {
    const r = comparePersons(base(), base());
    expect(r.similarity.score).toBe(1);
    expect(r.similarity.level).toBe('高');
    expect(r.similarity.onlyA).toHaveLength(0);
    expect(r.similarity.onlyB).toHaveLength(0);
  });

  it('不同命盘：分数落在 [0,1]，且带出双方独有神煞', () => {
    const r = comparePersons(base(), base({ year: 1975, month: 11, day: 3, hour: 4, gender: 'female' }));
    expect(r.similarity.score).toBeGreaterThanOrEqual(0);
    expect(r.similarity.score).toBeLessThanOrEqual(1);
    expect(r.similarity.level).toMatch(/^(高|中|低)$/);
    // 两张盘不可能神煞完全一致（否则相似度会是 1）
    expect(r.similarity.onlyA.length + r.similarity.onlyB.length).toBeGreaterThan(0);
    expect(r.similarity.sharedCount).toBeGreaterThan(0);
  });

  it('交换两侧 → 相似度不变（对称），但独有项互换', () => {
    const a = base();
    const b = base({ year: 1975, month: 11, day: 3, hour: 4, gender: 'female' });
    const ab = comparePersons(a, b).similarity;
    const ba = comparePersons(b, a).similarity;
    expect(ba.score).toBe(ab.score);
    expect(ba.level).toBe(ab.level);
    expect(ba.onlyA).toEqual(ab.onlyB);
    expect(ba.onlyB).toEqual(ab.onlyA);
  });

  it('任一侧校验不过 → 抛错且文案指明是哪一张盘', () => {
    expect(() => comparePersons(base(), base({ month: 2, day: 30 }))).toThrow(/第二张盘/);
    expect(() => comparePersons(base({ month: 2, day: 30 }), base())).toThrow(/第一张盘/);
  });

  it('档位阈值与被测分布一致（高 ≥0.30 / 中 ≥0.22；2026-10-07 德秀判据修正后回退到加德秀之前的锚点）', () => {
    expect(SHENSHA_SIMILARITY_BANDS.high).toBe(0.30);
    expect(SHENSHA_SIMILARITY_BANDS.medium).toBe(0.22);
  });

  it('随机抽样：档位分布不过度集中于"高"（否则判据又失效了）', () => {
    let high = 0;
    const total = 60;
    for (let i = 0; i < total; i++) {
      const r = comparePersons(
        base({ year: 1950 + i, month: (i % 12) + 1, day: (i % 27) + 1, hour: i % 24 }),
        base({ year: 1960 + i, month: ((i * 5) % 12) + 1, day: ((i * 7) % 27) + 1, hour: (i * 3) % 24, gender: 'female' }),
      );
      if (r.similarity.level === '高') high++;
    }
    // 实测"高"约占 5%，这里给足余量但必须明显少于三分之一
    expect(high).toBeLessThan(total / 3);
  });
});
