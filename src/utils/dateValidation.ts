import { Lunar, LunarYear } from 'lunar-typescript';

/**
 * 该公历月的实际天数（month 从 1 开始；2 月按闰年自适应）。
 * `new Date(y, m, 0)` 取的是「下个月的第 0 天」= 本月最后一天，闰年 2 月自动得 29。
 */
export function daysInSolarMonth(year: number, month: number): number {
  if (!year || month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

/** 公历日期合法性（含闰年 2 月） */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (!year || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInSolarMonth(year, month);
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

/**
 * 该农历月的实际天数（29 / 30）。
 * 闰月传 `isLeap`（内部转成负月号）；**该年不存在这个闰月时返回 null**——而不是 30，
 * 好让调用方把「这个闰月根本不存在」与「这个月有 30 天」分开处理
 * （前者应当在提交时报错，见 `isValidLunarDate`）。
 */
export function daysInLunarMonth(year: number, month: number, isLeap = false): number | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  try {
    const m = LunarYear.fromYear(year).getMonth(isLeap ? -month : month);
    return m ? m.getDayCount() : null;
  } catch {
    return null;
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

export interface BirthdayBounds {
  /** 年份上限 */
  maxYear: number;
  /** 月份上限（选了往年则为 12） */
  maxMonth: number;
  /** 日上限＝该年月的实际天数（只有"今年今月"才再夹到今天） */
  maxDay: number;
}

/**
 * 生日输入的**三道上限**（不允许晚于此刻）。
 *
 * 为什么把判据前移到输入框：
 * `validatePersonForm` 本来就会拦（`isValidSolarDate` / `isSolarFuture`），
 * 但用户要**填完一整张表、点了「开始对比」才被告知"生日不能晚于今天"**——
 * 这一步的挫败感远大于输入框里根本选不出来。这里把同一个判据搬到 UI 层，逐级收紧。
 *
 * ⚠️ 逐级收紧的顺序不能省（这是最容易写错、也最容易被当成 bug 的一处）：
 *   · **年**：≤ 当前年；
 *   · **月**：只有当**所选年份就是当前年**时才压到当前月——否则 1998 年出生的人
 *     连 11 月、12 月都选不了；
 *   · **日**：先取该年月的实际天数（闰年 2 月 29 / 4 月 30 / 12 月 31），
 *     只有当**年 + 月都等于当前**时才再夹到今天。
 *
 * 农历走同一套逻辑，只是"当前年月日"取农历口径（`Lunar.fromDate`），
 * 天数实际值来自 `daysInLunarMonth`。
 *
 * @param opts.now 注入"现在"，便于测试（缺省取真实当前时刻）
 */
export function birthdayBounds(
  opts: { calendar?: string; isLeap?: boolean; year?: number; month?: number; now?: Date } = {},
): BirthdayBounds {
  const now = opts.now || new Date();
  const lunarMode = opts.calendar === 'lunar';

  let curYear: number;
  let curMonth: number;
  let curDay: number;
  if (lunarMode) {
    const l = Lunar.fromDate(now);
    curYear = l.getYear();
    // 闰月在 lunar-typescript 里是**负数月号**，取绝对值才能和表单里的月份比较
    curMonth = Math.abs(l.getMonth());
    curDay = l.getDay();
  } else {
    curYear = now.getFullYear();
    curMonth = now.getMonth() + 1;
    curDay = now.getDate();
  }

  const { year, month } = opts;
  const maxYear = curYear;
  const maxMonth = year === curYear ? curMonth : 12;

  let maxDay = lunarMode
    ? daysInLunarMonth(year || curYear, month || 1, !!opts.isLeap) ?? 30
    : daysInSolarMonth(year || curYear, month || 1);
  if (year === curYear && month === curMonth) maxDay = Math.min(maxDay, curDay);

  return { maxYear, maxMonth, maxDay };
}

/**
 * 把一组「生日」字段夹回合法上限，返回修正后的 `{ year, month, day }`。
 *
 * 为什么不能只靠 `InputNumber` 的 `max`：`max` 只约束**用户正在编辑的那一格**。
 * 用户先填 1998-12-31、再把年份改成今年，日期不会自己回退到 13 号，限制就被绕过了。
 *
 * ⚠️ 必须 **year → month → day 逐级重算** `birthdayBounds`：若只算一次，
 *   把年份改成今年时月份会漏夹（拿到的还是按往年算出的 12）。
 *
 * @param opts.isLeapOf 农历下"这个月是不是闰月"**依赖月份本身**，所以做成回调而不是布尔值
 *   ——排盘页的闰月是独立 state、对比页是表单里的 checkbox，两处判定方式不同。
 * @returns 调用方比较 `year/month/day` 是否与入参不同，决定要不要回写表单
 */
export function clampBirthday(
  v: { year?: number; month?: number; day?: number },
  opts: { calendar?: string; isLeapOf?: (month?: number) => boolean; now?: Date } = {},
): { year?: number; month?: number; day?: number } {
  const isLeapOf = opts.isLeapOf || (() => false);
  const base = { calendar: opts.calendar, now: opts.now };

  const b0 = birthdayBounds({ ...base, isLeap: isLeapOf(v.month), year: v.year, month: v.month });
  const year = v.year && v.year > b0.maxYear ? b0.maxYear : v.year;

  const b1 = birthdayBounds({ ...base, isLeap: isLeapOf(v.month), year, month: v.month });
  const month = v.month && v.month > b1.maxMonth ? b1.maxMonth : v.month;

  const b2 = birthdayBounds({ ...base, isLeap: isLeapOf(month), year, month });
  const day = v.day && v.day > b2.maxDay ? b2.maxDay : v.day;

  return { year, month, day };
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
