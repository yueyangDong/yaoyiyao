import { Lunar, LunarYear } from 'lunar-typescript';

/** 公历日期合法性（含闰年 2 月） */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/** 返回该农历年闰月月份（0 = 无闰月） */
export function getLunarLeapMonth(year: number): number {
  if (year < 1900 || year > 2100) return 0;
  try {
    return LunarYear.fromYear(year).getLeapMonth();
  } catch {
    return 0;
  }
}

/** 农历日期合法性：month 1-12、day 1-30、闰月仅当该年存在对应闰月 */
export function isValidLunarDate(year: number, month: number, day: number, isLeap: boolean): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 30) return false;
  if (isLeap && getLunarLeapMonth(year) !== month) return false;
  try {
    // 往返校验：闰月用负月构造，核对构造结果（fromYmdHms 对非法日期不抛错，不能靠构造探测）
    const l = Lunar.fromYmd(year, isLeap ? -month : month, day);
    return l.getMonth() === (isLeap ? -month : month) && l.getDay() === day;
  } catch {
    return false;
  }
}
