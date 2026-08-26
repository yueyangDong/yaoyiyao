import { describe, it, expect } from 'vitest';
import { Lunar } from 'lunar-typescript';
import { getJiShiZhiList } from '../dailyFortuneUtils';

describe('getJiShiZhiList（时辰吉凶，修复 getTianShenType 误用）', () => {
  it('固定日期：返回的吉时地支对应时辰 luck 为「吉」，且不全吉不全凶', () => {
    const lunar = Lunar.fromYmd(2026, 8, 26);
    const times = lunar.getTimes();
    const jiZhis = getJiShiZhiList(lunar);

    expect(jiZhis.length).toBeGreaterThan(0);      // 有吉时
    expect(jiZhis.length).toBeLessThan(times.length); // 非全吉
    expect(new Set(jiZhis).size).toBe(jiZhis.length); // 去重
    for (const zhi of jiZhis) {
      // getTimes 可能含早/晚两个子时（地支重复），存在性判断
      const hasJi = times.some(x => x.getZhi() === zhi && x.getTianShenLuck() === '吉');
      expect(hasJi).toBe(true);
    }
  });

  it('今日：吉凶混合，绝不是全凶', () => {
    const lunar = Lunar.fromDate(new Date());
    const times = lunar.getTimes();
    const jiZhis = getJiShiZhiList(lunar);

    expect(jiZhis.length).toBeGreaterThan(0); // 至少一个吉时
    const xiongCount = times.filter(t => t.getTianShenLuck() === '凶').length;
    expect(xiongCount).toBeGreaterThan(0);
    expect(xiongCount).toBeLessThan(times.length);
  });

  it('结果与 getTianShenType() === 吉 的旧逻辑不同（回归保护）', () => {
    const lunar = Lunar.fromYmd(2026, 8, 26);
    // 旧逻辑用 getTianShenType()（黄道/黑道）判断吉，恒为 false → 空列表
    const oldLogicCount = lunar.getTimes().filter(t => t.getTianShenType() === '吉').length;
    expect(oldLogicCount).toBe(0); // 证明旧 bug 根因
    expect(getJiShiZhiList(lunar).length).toBeGreaterThan(0); // 新逻辑非空
  });
});
