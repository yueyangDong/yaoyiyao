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

/** 公历日期时间是否晚于当前时刻（排盘不允许超前时间） */
export function isSolarFuture(year: number, month: number, day: number, hour = 0, minute = 0): boolean {
  const input = new Date(year, month - 1, day, hour, minute, 0);
  return input.getTime() > Date.now();
}

/** 农历日期时间是否晚于当前时刻（先转公历再比较；转换失败按非未来处理） */
export function isLunarFuture(year: number, month: number, day: number, isLeap: boolean, hour = 0, minute = 0): boolean {
  try {
    const solar = Lunar.fromYmd(year, isLeap ? -month : month, day).getSolar();
    const input = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), hour, minute, 0);
    return input.getTime() > Date.now();
  } catch {
    return false;
  }
}
