// ========== 晚子时（23:00–23:59）流派：三处排盘入口口径一致性 ==========
//
// 背景（2026-10-07 复核）：
//   八字侧 lunar-typescript 默认 sect=2（晚子时日柱算当天），可切 sect=1（算次日）；
//   紫微侧厂内 core 的换日行为固定为「算次日」——fixLateZiHour 在 _dayDivision='normal'
//   （GlobalConfigs 默认值）下把农历日 +1，而 GlobalConfigs 未导出、bySolar 也不接受配置。
//   → 若不干预，「同一张盘里八字按当天、紫微按次日」，两套「日」并存且界面上看不出来。
//
// 本组用例锁死统一后的行为：
//   buildPerson / buildZiweiChart 共用 ziShiSect（1=算次日 / 2=算当天，默认 2），
//   紫微侧「算当天」档通过**前移一天**借用 core 自己的 +1 落回出生日。

import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import { buildPerson, buildZiweiChart, normalizeWanZi, WAN_ZI_DEFAULT } from '../personChart';

/** 十二宫「宫名:主星」串，用于整盘比对 */
const palaces = (zw?: any[]) =>
  (zw || []).map((p) => `${p.name}:${(p.majorStars || []).map((s: any) => s.name).join('') || '空'}`).join(' ');

describe('晚子时流派 · 八字侧（buildPerson）', () => {
  it('23:30 出生：默认档（2=算当天）日柱为当天，1=算次日', () => {
    expect(WAN_ZI_DEFAULT).toBe(2);
    // 2002-12-31 23:30 → 当天日柱 癸酉；次日日柱 甲戌
    expect(buildPerson(2002, 12, 31, 23, 30, 'male').pillars[2].ganZhi).toBe('癸酉');
    expect(buildPerson(2002, 12, 31, 23, 30, 'male', 0, 'solar', false, undefined, 2).pillars[2].ganZhi).toBe('癸酉');
    expect(buildPerson(2002, 12, 31, 23, 30, 'male', 0, 'solar', false, undefined, 1).pillars[2].ganZhi).toBe('甲戌');
  });

  it('非晚子时（19:56）两档完全一致——开关不影响其他时辰', () => {
    const a = buildPerson(2002, 12, 31, 19, 56, 'male', 0, 'solar', false, undefined, 1);
    const b = buildPerson(2002, 12, 31, 19, 56, 'male', 0, 'solar', false, undefined, 2);
    expect(a.pillars.map((p) => p.ganZhi)).toEqual(b.pillars.map((p) => p.ganZhi));
    expect(a.pillars.map((p) => p.ganZhi)).toEqual(['壬午', '壬子', '癸酉', '壬戌']);
  });

  it('normalizeWanZi：只认 1，其余（含 undefined / 0 / 2）一律回落到默认档 2', () => {
    expect(normalizeWanZi(1)).toBe(1);
    expect(normalizeWanZi(2)).toBe(2);
    expect(normalizeWanZi(undefined)).toBe(2);
    expect(normalizeWanZi(null)).toBe(2);
    expect(normalizeWanZi(0)).toBe(2);
    expect(normalizeWanZi(99)).toBe(2);
  });

  it('buildPerson 会把流派透传到紫微项（同一张盘八字与紫微同取一档）', () => {
    const sameDay = buildPerson(2002, 12, 31, 23, 30, 'male', 0, 'solar', false, undefined, 2);
    const nextDay = buildPerson(2002, 12, 31, 23, 30, 'male', 0, 'solar', false, undefined, 1);
    expect(palaces(sameDay.ziwei)).not.toBe(palaces(nextDay.ziwei));
  });
});

describe('晚子时流派 · 紫微侧（buildZiweiChart）', () => {
  const lateZi = () => Solar.fromYmdHms(2002, 12, 31, 23, 30, 0);
  const nextMorning = () => Solar.fromYmdHms(2003, 1, 1, 0, 30, 0);

  it('次日档 ≡ 次日早子时的命盘（core 原生换日即「算次日」）', () => {
    expect(palaces(buildZiweiChart(lateZi(), 'male', 1)))
      .toBe(palaces(buildZiweiChart(nextMorning(), 'male', 2)));
  });

  it('当天档 ≠ 次日早子时的命盘——证明「前移一天」真的把日归回出生日', () => {
    expect(palaces(buildZiweiChart(lateZi(), 'male', 2)))
      .not.toBe(palaces(buildZiweiChart(nextMorning(), 'male', 2)));
  });

  it('当天档 ≡ 出生日早子时（23:30 与同日 00:30 同盘：都为子时、都为同一个农历日）', () => {
    const sameMorning = Solar.fromYmdHms(2002, 12, 31, 0, 30, 0);
    expect(palaces(buildZiweiChart(lateZi(), 'male', 2)))
      .toBe(palaces(buildZiweiChart(sameMorning, 'male', 2)));
  });

  it('非晚子时（午时）两档同盘——前移只在 23 点发生', () => {
    const noon = Solar.fromYmdHms(2002, 12, 31, 12, 0, 0);
    expect(palaces(buildZiweiChart(noon, 'male', 1)))
      .toBe(palaces(buildZiweiChart(noon, 'male', 2)));
  });

  it('农历月末 / 年末边界（2003-01-31 除夕 23:30）：当天档不丢一天，且与次日档不同盘', () => {
    const chuxi2330 = Solar.fromYmdHms(2003, 1, 31, 23, 30, 0); // 农历壬午年腊月廿九 23:30
    const chuxi0030 = Solar.fromYmdHms(2003, 1, 31, 0, 30, 0);  // 同日晚早子时
    // 当天档：前移一天后由 core 的 next(1) 进位回腊月廿九 → 与当日早子时同盘
    expect(palaces(buildZiweiChart(chuxi2330, 'male', 2)))
      .toBe(palaces(buildZiweiChart(chuxi0030, 'male', 2)));
    // 次日档：闰到次年正月初一 → 与当日早子时不同盘
    expect(palaces(buildZiweiChart(chuxi2330, 'male', 1)))
      .not.toBe(palaces(buildZiweiChart(chuxi0030, 'male', 2)));
  });
});
