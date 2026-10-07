import { describe, it, expect } from 'vitest';
import { buildRawChart, buildPerson, normalizeWanZi } from '../personChart';

/**
 * buildRawChart = 全站唯一的四柱构造入口（Bazi 页 / 合盘页 / 命盘对比页共用）。
 * 这些用例的意义：**锁住三页曾经各自实现的那套口径**——
 *   公历 vs 农历（含闰月）、真太阳时跨午夜 dayOffset、晚子时流派。
 * 任何一处被改坏，都会让页面之间出现「同一生辰、不同四柱」而无人察觉。
 */

const ganZhi = (raw: ReturnType<typeof buildRawChart>) => raw.pillars.map((p) => p.ganZhi);

describe('buildRawChart —— 四柱构造的唯一入口', () => {
  it('公历输入：2002-12-31 20:30 → 壬午 壬子 癸酉 壬戌（真实盘钉值）', () => {
    const raw = buildRawChart(2002, 12, 31, 20, 30, 0, 'solar', false, 2);
    expect(ganZhi(raw)).toEqual(['壬午', '壬子', '癸酉', '壬戌']);
    expect(raw.dayGan).toBe('癸');
    expect(raw.dayWx).toBe('水');
  });

  it('农历输入 ≡ 先转公历再走公历输入（Bazi 页两条分支合并后的等价性）', () => {
    // 农历 1995-06-15 14:30 → 公历 1995-07-12 14:30
    const viaLunar = buildRawChart(1995, 6, 15, 14, 30, 0, 'lunar', false, 2);
    expect(viaLunar.solar.getYear()).toBe(1995);
    expect(viaLunar.solar.getMonth()).toBe(7);
    expect(viaLunar.solar.getDay()).toBe(12);

    const viaSolar = buildRawChart(1995, 7, 12, 14, 30, 0, 'solar', false, 2);
    expect(ganZhi(viaLunar)).toEqual(ganZhi(viaSolar));
    expect(viaLunar.dayGan).toBe(viaSolar.dayGan);
  });

  it('闰月：2023 闰二月初十落 03-31，非闰二月初十落 03-01（isLeap 必须生效）', () => {
    const leap = buildRawChart(2023, 2, 10, 12, 0, 0, 'lunar', true, 2);
    const plain = buildRawChart(2023, 2, 10, 12, 0, 0, 'lunar', false, 2);
    expect(`${leap.solar.getMonth()}-${leap.solar.getDay()}`).toBe('3-31');
    expect(`${plain.solar.getMonth()}-${plain.solar.getDay()}`).toBe('3-1');
  });

  it('真太阳时跨午夜：dayOffset=-1 把日柱整体前移一天（癸酉 → 壬申）', () => {
    const base = buildRawChart(2002, 12, 31, 0, 10, 0, 'solar', false, 2);
    expect(base.pillars[2].ganZhi).toBe('癸酉');
    const shifted = buildRawChart(2002, 12, 31, 0, 10, -1, 'solar', false, 2);
    expect(shifted.pillars[2].ganZhi).toBe('壬申');
  });

  it('晚子时流派：23:30 两档日柱不同（2=算当天 癸酉 / 1=算次日 甲戌）', () => {
    const sect2 = buildRawChart(2002, 12, 31, 23, 30, 0, 'solar', false, 2);
    const sect1 = buildRawChart(2002, 12, 31, 23, 30, 0, 'solar', false, 1);
    expect(sect2.pillars[2].ganZhi).toBe('癸酉');
    expect(sect1.pillars[2].ganZhi).toBe('甲戌');
  });

  it('晚子时流派：非 23 点出生，两档四柱完全相同', () => {
    const sect2 = buildRawChart(2002, 12, 31, 12, 0, 0, 'solar', false, 2);
    const sect1 = buildRawChart(2002, 12, 31, 12, 0, 0, 'solar', false, 1);
    expect(ganZhi(sect2)).toEqual(ganZhi(sect1));
  });

  it('不设置时柱 unknown 标记 —— 该语义只属于 Bazi 页，由调用方自补', () => {
    const raw = buildRawChart(2002, 12, 31, 20, 30, 0, 'solar', false, 2);
    expect(raw.pillars[3].unknown).toBeUndefined();
  });

  it('缺省参数等价于「公历 + 无修正 + 流派 2」', () => {
    const explicit = buildRawChart(2002, 12, 31, 20, 30, 0, 'solar', false, 2);
    const implicit = buildRawChart(2002, 12, 31, 20, 30);
    expect(ganZhi(implicit)).toEqual(ganZhi(explicit));
  });

  it('normalizeWanZi：只有 1 才是「算次日」，其余（含 undefined / 非法值）一律回落 2', () => {
    expect(normalizeWanZi(1)).toBe(1);
    expect(normalizeWanZi(2)).toBe(2);
    expect(normalizeWanZi(undefined)).toBe(2);
    expect(normalizeWanZi(null)).toBe(2);
    expect(normalizeWanZi(99)).toBe(2);
  });
});

describe('buildPerson 与 buildRawChart 同源（合盘/对比页与八字页不会分叉）', () => {
  it('同一组参数下，buildPerson 的四柱 / 日干 / 日主五行与 buildRawChart 完全一致', () => {
    const raw = buildRawChart(2002, 12, 31, 20, 30, 0, 'solar', false, 2);
    const person = buildPerson(2002, 12, 31, 20, 30, 'male', 0, 'solar', false, '男方', 2);
    expect(person.pillars.map((p) => p.ganZhi)).toEqual(raw.pillars.map((p) => p.ganZhi));
    expect(person.dayGan).toBe(raw.dayGan);
    expect(person.dayWx).toBe(raw.dayWx);
    expect(person.dayZhi).toBe(raw.pillars[2].diZhi);
  });

  it('农历 + 闰月 + 流派 1 + dayOffset 组合下，两侧仍然一致（含 23 点边界）', () => {
    const raw = buildRawChart(2002, 12, 31, 23, 30, -1, 'solar', false, 1);
    const person = buildPerson(2002, 12, 31, 23, 30, 'female', -1, 'solar', false, '女方', 1);
    expect(person.pillars.map((p) => p.ganZhi)).toEqual(raw.pillars.map((p) => p.ganZhi));
    expect(person.dayGan).toBe(raw.dayGan);
  });
});
