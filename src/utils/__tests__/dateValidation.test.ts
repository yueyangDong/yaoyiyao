import { describe, it, expect } from 'vitest';
import { isValidSolarDate, isValidLunarDate, getLunarLeapMonth } from '../dateValidation';

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
