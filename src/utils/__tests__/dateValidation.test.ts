import { describe, it, expect } from 'vitest';
import { isValidSolarDate, isValidLunarDate, getLunarLeapMonth, isSolarFuture, isLunarFuture } from '../dateValidation';

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
