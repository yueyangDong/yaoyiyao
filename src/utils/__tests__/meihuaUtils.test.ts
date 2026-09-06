import { describe, it, expect } from 'vitest';
import { calcMeiHua, calcMeiHuaFromDate } from '../meihuaUtils';

describe('梅花易数排盘算法', () => {
  it('乾为天：互卦仍为乾为天（纯阳卦互体不变）', () => {
    const r = calcMeiHua(1, 1, 1);
    expect(r.benGuaName).toBe('乾为天');
    expect(r.huGuaName).toBe('乾为天');
    // 初爻动：下卦乾初爻变 → 巽 → 天风姤
    expect(r.bianGuaName).toBe('天风姤');
    // 动爻 1 在下卦 → 用=乾(金)，体=乾(金)？不对：动在下卦→用=下卦乾，体=上卦乾 → 比和
    expect(r.relation).toBe('体用比和');
  });

  it('坤为地：上爻动 → 山地剥；互卦仍为坤为地', () => {
    const r = calcMeiHua(8, 8, 6);
    expect(r.benGuaName).toBe('坤为地');
    expect(r.huGuaName).toBe('坤为地');
    expect(r.bianGuaName).toBe('山地剥');
  });

  it('水雷屯：互卦为山地剥（经典互体）', () => {
    // 上卦坎=6，下卦震=4，三爻动
    const r = calcMeiHua(6, 4, 3);
    expect(r.benGuaName).toBe('水雷屯');
    expect(r.huGuaName).toBe('山地剥');
  });

  it('水雷屯三爻动：变卦水火既济，体坎水用震木为体生用', () => {
    const r = calcMeiHua(6, 4, 3);
    expect(r.bianGuaName).toBe('水火既济');
    // 动爻 3 在下卦 → 用=震(木)，体=坎(水)：水生木 → 体生用
    expect(r.tiWuxing).toBe('水');
    expect(r.yongWuxing).toBe('木');
    expect(r.relation).toBe('体生用');
    // 变卦用卦=离(火)，体=坎(水)：水克火 → 体克用
    expect(r.bianRelation).toBe('体克用');
  });

  it('天风姤五爻动：体用不颠倒（动在上卦→用=乾金，体=巽木→用克体），变卦火风鼎', () => {
    // 上卦乾=1，下卦巽=5，五爻动
    const r = calcMeiHua(1, 5, 5);
    expect(r.benGuaName).toBe('天风姤');
    expect(r.yongWuxing).toBe('金');
    expect(r.tiWuxing).toBe('木');
    expect(r.relation).toBe('用克体');
    expect(r.bianGuaName).toBe('火风鼎');
  });

  it('动爻 6 与 3 的取余：num3=6 → 动爻 6；num3=12 → 动爻 6', () => {
    expect(calcMeiHua(1, 1, 6).dongYao).toBe(6);
    expect(calcMeiHua(1, 1, 12).dongYao).toBe(6);
  });

  it('时间起卦：同一时刻结果确定，且卦名合法', () => {
    const d = new Date(2026, 8, 5, 12, 0, 0);
    const r1 = calcMeiHuaFromDate(d);
    const r2 = calcMeiHuaFromDate(d);
    expect(r1).toEqual(r2);
    expect(r1.benGuaName).not.toBe('未知卦');
    expect(r1.huGuaName).not.toBe('未知卦');
    expect(r1.bianGuaName).not.toBe('未知卦');
    expect(r1.dongYao).toBeGreaterThanOrEqual(1);
    expect(r1.dongYao).toBeLessThanOrEqual(6);
  });
});
