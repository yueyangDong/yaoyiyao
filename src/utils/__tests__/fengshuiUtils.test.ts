import { describe, it, expect } from 'vitest';
import { calcMingGua, calcFengshui } from '../fengshuiUtils';

describe('calcMingGua 命卦计算（八宅游年法）', () => {
  it('1990年男命 → 坎1（东四命）——旧版误算为离9', () => {
    const r = calcMingGua(1990, 'male');
    expect(r.guaNum).toBe(1);
    expect(r.guaName).toBe('坎');
    expect(r.type).toBe('东四命');
  });

  it('1990年女命 → 余5五黄，女寄艮8（西四命）', () => {
    const r = calcMingGua(1990, 'female');
    expect(r.guaNum).toBe(8);
    expect(r.guaName).toBe('艮');
    expect(r.type).toBe('西四命');
  });

  it('1995年男命 → 余5五黄，男寄坤2（西四命）', () => {
    const r = calcMingGua(1995, 'male');
    expect(r.guaNum).toBe(2);
    expect(r.guaName).toBe('坤');
    expect(r.type).toBe('西四命');
  });

  it('2000年男命 → 离9（东四命），2000后公式', () => {
    const r = calcMingGua(2000, 'male');
    expect(r.guaNum).toBe(9);
    expect(r.guaName).toBe('离');
    expect(r.type).toBe('东四命');
  });

  it('2000年女命 → 乾6（西四命），2000后公式', () => {
    const r = calcMingGua(2000, 'female');
    expect(r.guaNum).toBe(6);
    expect(r.guaName).toBe('乾');
    expect(r.type).toBe('西四命');
  });

  it('2008年男命 → 坎1（东四命）；女命余5寄艮8', () => {
    const male = calcMingGua(2008, 'male');
    expect(male.guaNum).toBe(1);
    expect(male.guaName).toBe('坎');
    const female = calcMingGua(2008, 'female');
    expect(female.guaNum).toBe(8);
    expect(female.guaName).toBe('艮');
  });

  it('跨世纪连续：1999男坎1 → 2000男离9（逆行衔接）', () => {
    expect(calcMingGua(1999, 'male').guaNum).toBe(1);
    expect(calcMingGua(2000, 'male').guaNum).toBe(9);
  });
});

describe('calcFengshui 宅卦与九星', () => {
  it('坐北朝南为坎宅（东四宅），东南方为生气', () => {
    const r = calcFengshui('坐北朝南', '东南', '东', '南');
    expect(r).not.toBeNull();
    expect(r!.house.gua).toBe('坎');
    expect(r!.house.type).toBe('东四宅');
    expect(r!.starMap['东南']).toBe('生气');
    expect(r!.starMap['西南']).toBe('绝命');
  });

  it('坐西朝东为兑宅（西四宅）', () => {
    const r = calcFengshui('坐西朝东', '西北', '东北', '西南');
    expect(r!.house.gua).toBe('兑');
    expect(r!.house.type).toBe('西四宅');
    expect(r!.starMap['西北']).toBe('生气');
  });
});
