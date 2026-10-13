import { describe, it, expect } from 'vitest';
import {
  isValidSolarDate, isValidLunarDate, getLunarLeapMonth, isSolarFuture, isLunarFuture,
  daysInSolarMonth, daysInLunarMonth, birthdayBounds, clampBirthday,
} from '../dateValidation';

describe('isValidSolarDate', () => {
  it('accepts normal dates', () => {
    expect(isValidSolarDate(2024, 3, 15)).toBe(true);
  });
  it('rejects invalid dates', () => {
    expect(isValidSolarDate(2024, 2, 30)).toBe(false);
    expect(isValidSolarDate(2024, 13, 1)).toBe(false);
    expect(isValidSolarDate(2023, 2, 29)).toBe(false); // 非闰年
  });
  it('accepts leap year Feb 29', () => {
    expect(isValidSolarDate(2024, 2, 29)).toBe(true);
  });
});

describe('isValidLunarDate', () => {
  it('accepts normal lunar dates', () => {
    expect(isValidLunarDate(2024, 1, 15, false)).toBe(true);
  });
  it('rejects out-of-range', () => {
    expect(isValidLunarDate(2024, 13, 1, false)).toBe(false);
    expect(isValidLunarDate(2024, 1, 31, false)).toBe(false); // 农历最大 30 天
  });
  it('accepts leap month only when year has it', () => {
    // 2025 年农历有闰六月；2024 无闰月
    expect(getLunarLeapMonth(2025)).toBe(6);
    expect(getLunarLeapMonth(2024)).toBe(0);
    expect(isValidLunarDate(2025, 6, 15, true)).toBe(true);
    expect(isValidLunarDate(2024, 6, 15, true)).toBe(false);
  });
});

describe('getLunarLeapMonth', () => {
  it('returns 0 for no leap month', () => {
    expect(getLunarLeapMonth(2024)).toBe(0);
  });
});

describe('未来时间校验（排盘不能超前）', () => {
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();

  it('isSolarFuture：明天为未来，昨天为过去', () => {
    const tomorrow = new Date(now.getTime() + 86400000);
    const yesterday = new Date(now.getTime() - 86400000);
    expect(isSolarFuture(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())).toBe(true);
    expect(isSolarFuture(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate())).toBe(false);
  });

  it('isSolarFuture：今天同一天，未来时分拒绝、过去时分放行', () => {
    // 今天 23:59 若未到则未来（除非恰好在 23:59）
    expect(isSolarFuture(todayY, todayM, todayD, 23, 59)).toBe(now.getHours() * 60 + now.getMinutes() < 23 * 60 + 59);
    // 今天 00:00 若已过则过去
    expect(isSolarFuture(todayY, todayM, todayD, 0, 0)).toBe(false);
  });

  it('isSolarFuture：今天日期本身不是未来', () => {
    expect(isSolarFuture(todayY, todayM, todayD, now.getHours(), now.getMinutes())).toBe(false);
  });

  it('isLunarFuture：农历未来日期（2027 年正月初一）为未来', () => {
    expect(isLunarFuture(2027, 1, 1, false)).toBe(true);
  });

  it('isLunarFuture：1900 年正月初一为过去', () => {
    expect(isLunarFuture(1900, 1, 1, false)).toBe(false);
  });
});

describe('daysInSolarMonth', () => {
  it('按年月给实际天数（含闰年 2 月）', () => {
    expect(daysInSolarMonth(2026, 1)).toBe(31);
    expect(daysInSolarMonth(2026, 2)).toBe(28);
    expect(daysInSolarMonth(2024, 2)).toBe(29); // 普通闰年
    expect(daysInSolarMonth(2000, 2)).toBe(29); // 400 年一闰
    expect(daysInSolarMonth(1900, 2)).toBe(28); // 100 年不闰
    expect(daysInSolarMonth(2026, 4)).toBe(30);
    expect(daysInSolarMonth(2026, 12)).toBe(31);
  });
  it('月份越界时退回 31，不抛错（调用方拿它当宽松兜底）', () => {
    expect(daysInSolarMonth(2026, 0)).toBe(31);
    expect(daysInSolarMonth(2026, 13)).toBe(31);
  });
});

describe('daysInLunarMonth', () => {
  it('返回农历月实际天数（29 / 30）', () => {
    const d = daysInLunarMonth(2026, 1);
    expect(d === 29 || d === 30).toBe(true);
  });
  it('该年没有这个闰月时返回 null —— 不是 30', () => {
    // 2024 无闰月；2025 有闰六月（见 getLunarLeapMonth 用例）
    expect(daysInLunarMonth(2024, 6, true)).toBe(null);
    expect(daysInLunarMonth(2025, 6, true)).toBeGreaterThan(0);
  });
});

describe('birthdayBounds（生日输入的三道上限）', () => {
  const NOW = new Date(2026, 9, 13); // 2026-10-13

  it('年上限＝当前年', () => {
    expect(birthdayBounds({ year: 2026, month: 6, now: NOW }).maxYear).toBe(2026);
    expect(birthdayBounds({ year: 1998, month: 6, now: NOW }).maxYear).toBe(2026);
  });

  it('⚠️ 选往年时月/日必须放开 —— 只按"当前月/当前日"一刀切会把 1998 年出生的人压到 10 月 13 日', () => {
    const past = birthdayBounds({ year: 1998, month: 12, now: NOW });
    expect(past.maxMonth).toBe(12);
    expect(past.maxDay).toBe(31);
  });

  it('只有"今年今月"才把日夹到今天', () => {
    expect(birthdayBounds({ year: 2026, month: 10, now: NOW }).maxDay).toBe(13);
    // 今年但换个月 → 不夹（11 月 30 天）
    expect(birthdayBounds({ year: 2026, month: 11, now: NOW }).maxDay).toBe(30);
    // 往年同月 → 不夹（2025 年 10 月有 31 天）
    expect(birthdayBounds({ year: 2025, month: 10, now: NOW }).maxDay).toBe(31);
  });

  it('月上限：今年压到当前月，往年放开到 12', () => {
    expect(birthdayBounds({ year: 2026, month: 12, now: NOW }).maxMonth).toBe(10);
    expect(birthdayBounds({ year: 2025, month: 12, now: NOW }).maxMonth).toBe(12);
  });

  it('日上限＝该年月实际天数（闰年 2 月 29 / 4 月 30 / 12 月 31）', () => {
    expect(birthdayBounds({ year: 2024, month: 2, now: NOW }).maxDay).toBe(29);
    expect(birthdayBounds({ year: 2023, month: 2, now: NOW }).maxDay).toBe(28);
    expect(birthdayBounds({ year: 1998, month: 4, now: NOW }).maxDay).toBe(30);
    expect(birthdayBounds({ year: 1998, month: 12, now: NOW }).maxDay).toBe(31);
  });

  it('字段还没填时不误收紧（宽松兜底，避免刚进页面就选不出东西）', () => {
    const b = birthdayBounds({ now: NOW });
    expect(b.maxYear).toBe(2026);
    expect(b.maxMonth).toBe(12);
    expect(b.maxDay).toBe(31);
  });

  it('农历口径：当前年月日取农历（2026-10-13 = 农历九月四日）', () => {
    expect(birthdayBounds({ calendar: 'lunar', year: 2026, month: 9, now: NOW }).maxDay).toBe(4);
    // 往年农历月不夹到今天
    expect(birthdayBounds({ calendar: 'lunar', year: 1998, month: 9, now: NOW }).maxDay).toBeGreaterThanOrEqual(29);
  });
});

describe('clampBirthday（超限值级联夹回）', () => {
  const NOW = new Date(2026, 9, 13);

  it('未来年 / 未来月 / 未来日一起被夹回', () => {
    expect(clampBirthday({ year: 2030, month: 12, day: 31 }, { now: NOW }))
      .toEqual({ year: 2026, month: 10, day: 13 });
  });

  it('⚠️ 级联：年份夹回后月份必须跟着夹 —— 只算一次 bounds 会漏掉这一步', () => {
    // 2027-12-05 → 年夹到 2026 → 月 12 需再夹到 10 → 日 5 ≤ 13 保留
    expect(clampBirthday({ year: 2027, month: 12, day: 5 }, { now: NOW }))
      .toEqual({ year: 2026, month: 10, day: 5 });
  });

  it('改月份后超出的日被夹回该月天数（用户先填 12-31 再改成 2 月）', () => {
    expect(clampBirthday({ year: 2026, month: 2, day: 30 }, { now: NOW }))
      .toEqual({ year: 2026, month: 2, day: 28 });
    expect(clampBirthday({ year: 2026, month: 4, day: 31 }, { now: NOW }))
      .toEqual({ year: 2026, month: 4, day: 30 });
    expect(clampBirthday({ year: 2024, month: 2, day: 30 }, { now: NOW }))
      .toEqual({ year: 2024, month: 2, day: 29 }); // 闰年
  });

  it('合法值原样返回（不误伤）', () => {
    const v = { year: 1998, month: 12, day: 31 };
    expect(clampBirthday(v, { now: NOW })).toEqual(v);
  });

  it('字段缺失时不抛错', () => {
    expect(clampBirthday({}, { now: NOW })).toEqual({ year: undefined, month: undefined, day: undefined });
    expect(clampBirthday({ year: 2026 }, { now: NOW })).toEqual({ year: 2026, month: undefined, day: undefined });
  });

  it('农历：isLeapOf 回调按"这个月是不是闰月"动态判定', () => {
    const leap = (m?: number) => m === 6;
    // 闰月实际天数由 daysInLunarMonth 给（29 或 30，不写死），clamp 必须跟着它走
    const realDays = daysInLunarMonth(2025, 6, true)!;
    expect(realDays).toBeGreaterThanOrEqual(29);
    const r = clampBirthday({ year: 2025, month: 6, day: 30 }, { calendar: 'lunar', isLeapOf: leap, now: NOW });
    expect(r.day).toBe(Math.min(30, realDays));
    // 2024 年没有闰六月 → daysInLunarMonth 返回 null → 兜底 30，同样不误夹
    const r2 = clampBirthday({ year: 2024, month: 6, day: 30 }, { calendar: 'lunar', isLeapOf: leap, now: NOW });
    expect(r2.day).toBe(30);
  });
});
