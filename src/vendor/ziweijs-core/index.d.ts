import { createI18n } from '@ziweijs/i18n';
import { DeepReadonly } from '@ziweijs/i18n';
import { I18n } from '@ziweijs/i18n';
import { I18nCreateOptions } from '@ziweijs/i18n';
import { I18nLanguages } from '@ziweijs/i18n';
import { LanguageKey } from '@ziweijs/i18n';
import { LunarHour } from 'tyme4ts';
import { NestedKeyOf } from '@ziweijs/i18n';
import { SolarTime } from 'tyme4ts';
import { TranslationKey } from '@ziweijs/i18n';

/**
 * 用于处理索引，将索引锁定在 0~max 范围内
 *
 * @param index 当前索引
 * @param max 最大循环数，默认为12
 * @returns {number} 处理后的索引
 */
export declare function $index(index: number, max?: number): number;

/**
 * 获取传入索引的本对宫位索引
 * @param index
 * @returns
 */
export declare function $oppositeIndex(index: number): number;

/**
 * 获取传入索引的相对宫位索引
 * @param index
 * @returns
 */
export declare function $relativeIndex(index: number): number;

export declare interface Astrolabe extends AstrolabeProps {
    /**
     * 获取运限数据
     *
     * @param index 以地支寅为起始的宫位索引（0-11）
     * @returns 运限数据
     */
    getHoroscope(index?: number): Horoscope;
}

export declare interface AstrolabeProps {
    /** 姓名 */
    name: string;
    /** 性别 */
    gender: string;
    /** 出生年份天干 */
    birthYearStem: StemName;
    /** 出生年份天干 Key */
    birthYearStemKey: StemKey;
    /** 出生年份地支 */
    birthYearBranch: BranchName;
    /** 出生年份地支 Key */
    birthYearBranchKey: BranchKey;
    /** 阳历日期 */
    solarDate: string;
    /** 阳历日期之真太阳时 */
    solarDateByTrue?: string;
    /** 阴历年份 */
    lunisolarYear: number;
    /** 阴阳合历日期 */
    lunisolarDate: string;
    /** 干支日期 */
    sexagenaryCycleDate?: string;
    /** 时辰 */
    hour: `${BranchName}${HourName}`;
    /** 时辰对应的时间段 */
    hourRange: HourRange;
    /** 生肖 */
    zodiac: ZodiacName;
    /** 五行局 */
    fiveElementName: FiveElementNumName;
    /** 五行局数 */
    fiveElementNum: FiveElementNumValue;
    /** 紫微星所在地支 */
    ziweiBranch: BranchName;
    /** 紫微星所在地支Key */
    ziweiBranchKey: BranchKey;
    /** 命宫之地支 */
    mainPalaceBranch: BranchName;
    /** 命宫之地支 Key */
    mainPalaceBranchKey: BranchKey;
    /** 十二宫数据 */
    palaces: Palace[];
    /** 运限数据 */
    horoscope: Horoscope;
    /** 大限流向，1为顺行，-1为逆行 */
    horoscopeDirection: 1 | -1;
    /** 版权 */
    _copyright: string;
    /** 版本 */
    _version: string;
}

export declare type BranchKey = keyof typeof _default.branch;

/** 十二地支 Key 数组 */
export declare const _branchKeys: BranchKey[];

export declare type BranchName = BranchNameZhCN | BranchNameZhHant;

export declare type BranchNameZhCN = (typeof _default.branch)[BranchKey]["name"];

export declare type BranchNameZhHant = (typeof _default_2.branch)[BranchKey]["name"];

/**
 * 通过农历获取紫微斗数命盘信息
 */
declare function byLunisolar({ name, gender, date, language }: LunisolarParams): Astrolabe;

/**
 * 通过阳历获取紫微斗数命盘信息
 */
declare function bySolar(params: SolarParams): Astrolabe;

export declare function calculateAstrolabeDate(date: string): {
    stemKey: "JIA" | "YI" | "BING" | "DING" | "WU" | "JI" | "GENG" | "XIN" | "REN" | "GUI";
    branchKey: "WU" | "ZI" | "CHOU" | "YIN" | "MAO" | "CHEN" | "SI" | "WEI" | "SHEN" | "YOU" | "XU" | "HAI";
    monthIndex: number;
    day: number;
    hourIndex: number;
};

/**
 * 修正阳历转农历的年、月、日、时信息。
 *
 * 该函数通过输入的阳历日期和全局配置，处理以下特殊情况：
 * 1. 晚子时（23:00 - 24:00）的处理，将其归属到次日的子时。
 * 2. 闰月的处理，根据全局配置判断是否为闰月，并修正农历月索引。
 *
 * 最终返回修正后的农历日期信息，包括天干地支、农历月索引、农历日和时辰索引。
 *
 * @param {LunisolarDateParams} params - 参数对象
 * @param {LunarHour} params.date - 输入的农历日期对象
 * @param {GlobalConfigs} params.globalConfigs - 全局配置对象，包含月分割和日分割的规则
 *
 * @returns {FixedLunarDate} 返回修正后的农历日期信息
 * @property {StemKey} stemKey - 修正后的天干键值
 * @property {BranchKey} branchKey - 修正后的地支键值
 * @property {number} year - 修正后的农历年
 * @property {number} monthIndex - 修正后的农历月索引（从 0 开始）
 * @property {number} day - 修正后的农历日
 * @property {number} hourIndex - 修正后的时辰索引（0-11 表示正常时辰，12 表示晚子时）
 */
export declare function calculateAstrolabeDateBySolar({ date, globalConfigs, }: LunisolarDateParams): FixedLunarDate;

/**
 * 根据给定的地支时辰索引计算其对应的时分秒。
 *
 * 因为阴阳合历的入参是地支的索引，所以分和秒需要给一个相对中间的默认值。
 * @param hourIndex - 对应的地支时辰索引（0~11之间的整数）
 * @returns
 */
export declare function calculateHourByIndex(hourIndex: number): number[];

/**
 * 根据公历日期计算对应的阴阳合历日期对象。
 *
 * 此函数将JavaScript原生Date对象转换为阴阳合历（农历）的LunarHour对象，
 * 通过tyme4ts库的SolarTime中间对象进行转换。
 *
 * @param date - 要转换的公历日期对象
 * @returns 返回对应的阴阳合历时辰对象，包含农历年、月、日、时等信息
 *
 * @example
 * // 将当前公历日期转换为农历时辰
 * const today = new Date();
 * const lunarHour = calculateLunisolarDateBySolar(today);
 * console.log(lunarHour.getLunarDay().getName()); // 输出农历日名称，如"初一"、"十五"等
 */
export declare function calculateLunisolarDateBySolar(date: Date): LunarHour;

/**
 * 计算指定时间与经度对应的真太阳时。
 *
 * @param date - 基准时间（JavaScript Date，包含绝对 UTC 时间）
 * @param longitude - 经度（东经为正，西经为负），单位：度
 * @param timezoneOffsetMinutes - 时区偏移（分钟，默认取 `-date.getTimezoneOffset()`）
 *
 * @returns `TrueSolarTimeResult`，包含真太阳时对应的 `date`、时间方程以及修正值
 *
 * @remarks
 * - 算法基于 NOAA 推荐公式：先计算日序数与当地时间的分数年角，
 *   再求出时间方程（EoT），最后结合经度与时区偏差得到真太阳时。
 * - 若未显式传入 `timezoneOffsetMinutes`，则默认使用环境运行时对 `date` 的解释结果，
 *   在跨时区场景下建议明确传入对应地点的时区偏移。
 */
export declare function calculateTrueSolarTime(date: Date, longitude: number, timezoneOffsetHours?: number): Date;

/**
 * 创建初始化星辰的十二空宫
 * @returns
 */
export declare function createEmptyStars(): Star[][];

export { createI18n }

/**
 * 根据紫微天府的索引创建星辰元数组
 * @param ziweiIndex
 * @param tianfuIndex
 * @returns 十二宫位元数组
 */
export declare function createMetaMajorStars(ziweiIndex: number, tianfuIndex: number): StarMeta[];

/**
 * 根据左右昌曲的初始索引创建元数组
 * @param param0
 * @returns
 */
export declare function createMetaMinorStars({ zuofuIndex, youbiIndex, wenchangIndex, wenquIndex, }: CreateMetaMinorStarsParams): StarMeta[];

export declare interface CreateMetaMinorStarsParams {
    zuofuIndex: number;
    youbiIndex: number;
    wenchangIndex: number;
    wenquIndex: number;
}

export { DeepReadonly }

declare const _default: {
    readonly gender: {
        readonly male: "男";
        readonly female: "女";
    };
    readonly one: {
        readonly yin: "阴";
        readonly yang: "阳";
    };
    readonly year: "年";
    readonly age: "岁";
    readonly hour: "时";
    readonly stem: {
        readonly JIA: "甲";
        readonly YI: "乙";
        readonly BING: "丙";
        readonly DING: "丁";
        readonly WU: "戊";
        readonly JI: "己";
        readonly GENG: "庚";
        readonly XIN: "辛";
        readonly REN: "壬";
        readonly GUI: "癸";
    };
    readonly branch: {
        readonly ZI: {
            readonly name: "子";
            readonly zodiac: "鼠";
        };
        readonly CHOU: {
            readonly name: "丑";
            readonly zodiac: "牛";
        };
        readonly YIN: {
            readonly name: "寅";
            readonly zodiac: "虎";
        };
        readonly MAO: {
            readonly name: "卯";
            readonly zodiac: "兔";
        };
        readonly CHEN: {
            readonly name: "辰";
            readonly zodiac: "龙";
        };
        readonly SI: {
            readonly name: "巳";
            readonly zodiac: "蛇";
        };
        readonly WU: {
            readonly name: "午";
            readonly zodiac: "马";
        };
        readonly WEI: {
            readonly name: "未";
            readonly zodiac: "羊";
        };
        readonly SHEN: {
            readonly name: "申";
            readonly zodiac: "猴";
        };
        readonly YOU: {
            readonly name: "酉";
            readonly zodiac: "鸡";
        };
        readonly XU: {
            readonly name: "戌";
            readonly zodiac: "狗";
        };
        readonly HAI: {
            readonly name: "亥";
            readonly zodiac: "猪";
        };
    };
    readonly palace: {
        readonly MING: {
            readonly name: "命宫";
            readonly horoscope: "大命";
        };
        readonly XIONG_DI: {
            readonly name: "兄弟";
            readonly horoscope: "大兄";
        };
        readonly FU_QI: {
            readonly name: "夫妻";
            readonly horoscope: "大夫";
        };
        readonly ZI_NV: {
            readonly name: "子女";
            readonly horoscope: "大子";
        };
        readonly CAI_BO: {
            readonly name: "财帛";
            readonly horoscope: "大财";
        };
        readonly JI_E: {
            readonly name: "疾厄";
            readonly horoscope: "大疾";
        };
        readonly QIAN_YI: {
            readonly name: "迁移";
            readonly horoscope: "大迁";
        };
        readonly JIAO_YOU: {
            readonly name: "交友";
            readonly horoscope: "大友";
        };
        readonly GUAN_LU: {
            readonly name: "官禄";
            readonly horoscope: "大官";
        };
        readonly TIAN_ZHAI: {
            readonly name: "田宅";
            readonly horoscope: "大田";
        };
        readonly FU_DE: {
            readonly name: "福德";
            readonly horoscope: "大福";
        };
        readonly FU_MU: {
            readonly name: "父母";
            readonly horoscope: "大父";
        };
    };
    readonly star: {
        readonly ZI_WEI: {
            readonly name: "紫微";
            readonly abbr: "紫";
        };
        readonly TAI_YANG: {
            readonly name: "太阳";
            readonly abbr: "阳";
        };
        readonly WU_QU: {
            readonly name: "武曲";
            readonly abbr: "武";
        };
        readonly TIAN_TONG: {
            readonly name: "天同";
            readonly abbr: "同";
        };
        readonly LIAN_ZHEN: {
            readonly name: "廉贞";
            readonly abbr: "廉";
        };
        readonly TIAN_JI: {
            readonly name: "天机";
            readonly abbr: "机";
        };
        readonly TAI_YIN: {
            readonly name: "太阴";
            readonly abbr: "阴";
        };
        readonly TAN_LANG: {
            readonly name: "贪狼";
            readonly abbr: "贪";
        };
        readonly JU_MEN: {
            readonly name: "巨门";
            readonly abbr: "巨";
        };
        readonly TIAN_LIANG: {
            readonly name: "天梁";
            readonly abbr: "梁";
        };
        readonly PO_JUN: {
            readonly name: "破军";
            readonly abbr: "破";
        };
        readonly QI_SHA: {
            readonly name: "七杀";
            readonly abbr: "杀";
        };
        readonly TIAN_XIANG: {
            readonly name: "天相";
            readonly abbr: "相";
        };
        readonly TIAN_FU: {
            readonly name: "天府";
            readonly abbr: "府";
        };
        readonly ZUO_FU: {
            readonly name: "左辅";
            readonly abbr: "左";
        };
        readonly YOU_BI: {
            readonly name: "右弼";
            readonly abbr: "右";
        };
        readonly WEN_CHANG: {
            readonly name: "文昌";
            readonly abbr: "昌";
        };
        readonly WEN_QU: {
            readonly name: "文曲";
            readonly abbr: "曲";
        };
    };
    readonly transformation: {
        readonly A: "禄";
        readonly B: "权";
        readonly C: "科";
        readonly D: "忌";
    };
    readonly fiveElementNum: {
        readonly WOOD: "木三局";
        readonly METAL: "金四局";
        readonly WATER: "水二局";
        readonly EARTH: "土五局";
        readonly FIRE: "火六局";
    };
};

declare const _default_2: {
    readonly gender: {
        readonly male: "男";
        readonly female: "女";
    };
    readonly one: {
        readonly yin: "陰";
        readonly yang: "陽";
    };
    readonly year: "年";
    readonly age: "歲";
    readonly hour: "時";
    readonly stem: {
        readonly JIA: "甲";
        readonly YI: "乙";
        readonly BING: "丙";
        readonly DING: "丁";
        readonly WU: "戊";
        readonly JI: "己";
        readonly GENG: "庚";
        readonly XIN: "辛";
        readonly REN: "壬";
        readonly GUI: "癸";
    };
    readonly branch: {
        readonly ZI: {
            readonly name: "子";
            readonly zodiac: "鼠";
        };
        readonly CHOU: {
            readonly name: "丑";
            readonly zodiac: "牛";
        };
        readonly YIN: {
            readonly name: "寅";
            readonly zodiac: "虎";
        };
        readonly MAO: {
            readonly name: "卯";
            readonly zodiac: "兔";
        };
        readonly CHEN: {
            readonly name: "辰";
            readonly zodiac: "龍";
        };
        readonly SI: {
            readonly name: "巳";
            readonly zodiac: "蛇";
        };
        readonly WU: {
            readonly name: "午";
            readonly zodiac: "馬";
        };
        readonly WEI: {
            readonly name: "未";
            readonly zodiac: "羊";
        };
        readonly SHEN: {
            readonly name: "申";
            readonly zodiac: "猴";
        };
        readonly YOU: {
            readonly name: "酉";
            readonly zodiac: "雞";
        };
        readonly XU: {
            readonly name: "戌";
            readonly zodiac: "狗";
        };
        readonly HAI: {
            readonly name: "亥";
            readonly zodiac: "豬";
        };
    };
    readonly palace: {
        readonly MING: {
            readonly name: "命宮";
            readonly horoscope: "大命";
        };
        readonly XIONG_DI: {
            readonly name: "兄弟";
            readonly horoscope: "大兄";
        };
        readonly FU_QI: {
            readonly name: "夫妻";
            readonly horoscope: "大夫";
        };
        readonly ZI_NV: {
            readonly name: "子女";
            readonly horoscope: "大子";
        };
        readonly CAI_BO: {
            readonly name: "財帛";
            readonly horoscope: "大財";
        };
        readonly JI_E: {
            readonly name: "疾厄";
            readonly horoscope: "大疾";
        };
        readonly QIAN_YI: {
            readonly name: "遷移";
            readonly horoscope: "大遷";
        };
        readonly JIAO_YOU: {
            readonly name: "交友";
            readonly horoscope: "大友";
        };
        readonly GUAN_LU: {
            readonly name: "官祿";
            readonly horoscope: "大官";
        };
        readonly TIAN_ZHAI: {
            readonly name: "田宅";
            readonly horoscope: "大田";
        };
        readonly FU_DE: {
            readonly name: "福德";
            readonly horoscope: "大福";
        };
        readonly FU_MU: {
            readonly name: "父母";
            readonly horoscope: "大父";
        };
    };
    readonly star: {
        readonly ZI_WEI: {
            readonly name: "紫微";
            readonly abbr: "紫";
        };
        readonly TAI_YANG: {
            readonly name: "太陽";
            readonly abbr: "陽";
        };
        readonly WU_QU: {
            readonly name: "武曲";
            readonly abbr: "武";
        };
        readonly TIAN_TONG: {
            readonly name: "天同";
            readonly abbr: "同";
        };
        readonly LIAN_ZHEN: {
            readonly name: "廉貞";
            readonly abbr: "廉";
        };
        readonly TIAN_JI: {
            readonly name: "天機";
            readonly abbr: "機";
        };
        readonly TAI_YIN: {
            readonly name: "太陰";
            readonly abbr: "陰";
        };
        readonly TAN_LANG: {
            readonly name: "貪狼";
            readonly abbr: "貪";
        };
        readonly JU_MEN: {
            readonly name: "巨門";
            readonly abbr: "巨";
        };
        readonly TIAN_LIANG: {
            readonly name: "天梁";
            readonly abbr: "梁";
        };
        readonly PO_JUN: {
            readonly name: "破軍";
            readonly abbr: "破";
        };
        readonly QI_SHA: {
            readonly name: "七殺";
            readonly abbr: "殺";
        };
        readonly TIAN_XIANG: {
            readonly name: "天相";
            readonly abbr: "相";
        };
        readonly TIAN_FU: {
            readonly name: "天府";
            readonly abbr: "府";
        };
        readonly ZUO_FU: {
            readonly name: "左輔";
            readonly abbr: "左";
        };
        readonly YOU_BI: {
            readonly name: "右弼";
            readonly abbr: "右";
        };
        readonly WEN_CHANG: {
            readonly name: "文昌";
            readonly abbr: "昌";
        };
        readonly WEN_QU: {
            readonly name: "文曲";
            readonly abbr: "曲";
        };
    };
    readonly transformation: {
        readonly A: "祿";
        readonly B: "權";
        readonly C: "科";
        readonly D: "忌";
    };
    readonly fiveElementNum: {
        readonly WOOD: "木三局";
        readonly METAL: "金四局";
        readonly WATER: "水二局";
        readonly EARTH: "土五局";
        readonly FIRE: "火六局";
    };
};

/** 五行局数 Key 数组 */
export declare const _fiveElementKeys: FiveElementNumKey[];

export declare type FiveElementNumKey = keyof typeof _default.fiveElementNum;

export declare const _fiveElementNumMaps: Record<"WOOD" | "METAL" | "WATER" | "EARTH" | "FIRE", 2 | 3 | 4 | 5 | 6>;

export declare type FiveElementNumName = FiveElementNumNameZhCN | FiveElementNumNameZhHant;

export declare type FiveElementNumNameZhCN = (typeof _default.fiveElementNum)[FiveElementNumKey];

export declare type FiveElementNumNameZhHant = (typeof _default_2.fiveElementNum)[FiveElementNumKey];

export declare type FiveElementNumValue = (typeof _fiveElementNumValue)[number];

/** 五行局数 - 顺序与国际化对应且不可变，影响排序计算 */
export declare const _fiveElementNumValue: readonly [3, 4, 2, 5, 6];

export declare interface FixedLunarDate {
    stemKey: StemKey;
    branchKey: BranchKey;
    year: number;
    monthIndex: number;
    day: number;
    hourIndex: number;
}

export declare function fixLateZiHour(date: LunarHour, globalConfigs: GlobalConfigs): LunarHour;

/**
 * 处理农历闰月的日期修正函数
 *
 * 当遇到农历闰月时，根据全局配置的月份划分规则（_monthDivision），通过调整日期的方式修正
 * 将闰月日期映射到对应的前一个月、后一个月或根据15日前后自动判断的月份，非闰月情况则返回原日期
 *
 * TODO：此计算方法依然存在问题，对于一些特殊日期的计算，需要进一步优化。
 *
 * @param date - 需要处理的农历时间对象，包含日、月、年等农历信息
 * @param globalConfigs - 全局配置对象，其中_monthDivision决定闰月处理规则
 * @returns 修正后的农历时间对象，若原月份非闰月则返回原对象
 *
 * @remarks
 * 支持的_monthDivision规则：
 * - "last": 闰月统一映射到前一个月（通过日期减30天实现）
 * - "next": 闰月统一映射到后一个月（通过日期加30天实现）
 * - "normal": 15日（不含23点）前映射到前一个月，15日23点及之后映射到后一个月
 *
 * @example
 * // 闰月且配置为"last"时，日期减30天切换到前一个月
 * const fixedDate = fixLeapMonth(leapMonthDate, { _monthDivision: 'last' });
 */
export declare function fixLeapMonth(date: LunarHour, globalConfigs: GlobalConfigs): LunarHour;

export declare type Galaxy = (typeof _galaxyKeys)[number];

/** 星辰所属星系（南 | 北 | 中） */
export declare const _galaxyKeys: readonly ["S", "N", "C"];

export declare type Gender = (typeof _genders)[number];

export declare type GenderKey = keyof typeof _default.gender;

export declare const _genderMap: Record<Gender, number>;

export declare type GenderName = GenderNameZhCN | GenderNameZhHant;

export declare type GenderNameZhCN = (typeof _default.gender)[GenderKey];

export declare type GenderNameZhHant = (typeof _default_2.gender)[GenderKey];

export declare const _genders: GenderKey[];

/**
 * 将阴阳合历（农历）时辰对象格式化为人类可读的文本字符串。
 *
 * 此函数接收一个 LunarHour 对象和时辰索引，生成格式为"年支名月名日名 时辰名"的文本。
 * 例如："甲子年正月初一 午时"。
 *
 * @param date - 阴阳合历时辰对象，包含农历年、月、日信息
 * @param hourIndex - 时辰索引（0-11），对应十二地支时辰
 * @returns 格式化后的农历日期和时辰文本
 *
 * @example
 * // 假设 lunarHour 表示农历甲子年正月初一，hourIndex 为 6（午时）
 * const text = getLunisolarDateText(lunarHour, 6);
 * // 返回: "甲子年正月初一 午时"
 */
export declare function getLunisolarDateText(date: LunarHour, hourIndex: number): string;

/**
 * 根据起始天干生成五虎遁月表
 * @param startStemIndex 天干起始索引 (0-9)
 * @param startBranchIndex 地支起始索引 (0-11) 默认为寅
 * @returns string[] 包含12个月份的天干地支组合
 */
export declare function getMonthlyStemsAndBranches(startStemIndex: number, startBranchIndex?: number): MonthlyStemsAndBranch[];

/**
 * 将日期对象格式化为标准日期时间文本字符串。
 *
 * @param date - 要格式化的日期对象，可以是 SolarTime 或 JavaScript 原生 Date 类型
 * @returns 格式化后的日期时间字符串，格式为："YYYY-MM-DD HH:MM"，其中月、日、时、分均为两位数字表示（不足两位前补零）
 *
 * @example
 * ```typescript
 * // 使用 SolarTime 对象
 * import { SolarTime } from "tyme4ts";
 * const solarTime = SolarTime.fromYmdHms(2023, 5, 15, 14, 30, 0);
 * const formatted1 = getSolarDateText(solarTime);
 * // 结果: "2023-05-15 14:30"
 *
 * // 使用 JavaScript Date 对象
 * const jsDate = new Date(2023, 4, 15, 14, 30); // 注意：月份从0开始
 * const formatted2 = getSolarDateText(jsDate);
 * // 结果: "2023-05-15 14:30"
 * ```
 */
export declare function getSolarDateText(date: SolarTime | Date): string;

/**
 * 根据公历年份计算对应的天干地支索引。
 *
 * 天干地支是中国传统纪年法的一部分，每年对应一个天干（10 个）和一个地支（12 个）。
 * 此函数根据输入的公历年份，计算出对应的天干和地支索引。
 *
 * @param {number} year - 公历年份（有效范围：1 ~ 9999）。
 * @throws {RangeError} 如果年份不在有效范围内（1 ~ 9999），抛出范围错误。
 *
 * @returns {[number, number]} 返回对应的天干地支索引：
 * - 第一个元素为天干索引（范围：0 ~ 9）。
 * - 第二个元素为地支索引（范围：0 ~ 11）。
 *
 * @example
 * // 示例 1：2024 年对应甲辰（天干索引 0，地支索引 3）
 * const [stemIndex, branchIndex] = getStemAndBranchByYear(2024);
 * console.log(stemIndex); // 输出 0
 * console.log(branchIndex); // 输出 3
 *
 * @example
 * // 示例 2：1900 年对应庚子（天干索引 6，地支索引 0）
 * const [stemIndex, branchIndex] = getStemAndBranchByYear(1900);
 * console.log(stemIndex); // 输出 6
 * console.log(branchIndex); // 输出 0
 */
export declare function getStemAndBranchByYear(year: number): [number, number];

declare interface GlobalConfigs {
    /**
     * 年分界点参数，默认为正月初一分界。
     *
     * normal：正月初一分界
     * spring：立春分界
     */
    _yearDivision: "normal" | "spring";
    /**
     * 月分界点参数，默认为月中分界。
     *
     * normal：正月中分界
     * last：视为上月
     * next：视为下月
     */
    _monthDivision: "normal" | "last" | "next";
    /**
     * 日分界点参数，默认为子时为次日。
     *
     * normal：子时为次日
     * current：当前子时为当日
     */
    _dayDivision: "normal" | "current";
}

declare const GlobalConfigs: GlobalConfigs;

export declare interface Horoscope extends HoroscopeProps {
}

export declare interface HoroscopePalace {
    palaceName: PalaceHoroscopeName;
    age: number;
    yearly: number;
    yearlyText: string;
}

export declare interface HoroscopeProps {
    index: number;
    palaces: HoroscopePalace[];
}

export declare type HourName = typeof _default.hour | typeof _default_2.hour;

export declare type HourRange = (typeof _hourRanges)[number];

/** 时辰间隔文案数组 */
export declare const _hourRanges: readonly ["23:00~12:59", "01:00~02:59", "03:00~04:59", "05:00~06:59", "07:00~08:59", "09:00~10:59", "11:00~12:59", "13:00~14:59", "15:00~16:59", "17:00~18:59", "19:00~20:59", "21:00~22:59"];

export { I18n }

export declare const i18n: I18n<    {
readonly "zh-CN": {
readonly gender: {
readonly male: "男";
readonly female: "女";
};
readonly one: {
readonly yin: "阴";
readonly yang: "阳";
};
readonly year: "年";
readonly age: "岁";
readonly hour: "时";
readonly stem: {
readonly JIA: "甲";
readonly YI: "乙";
readonly BING: "丙";
readonly DING: "丁";
readonly WU: "戊";
readonly JI: "己";
readonly GENG: "庚";
readonly XIN: "辛";
readonly REN: "壬";
readonly GUI: "癸";
};
readonly branch: {
readonly ZI: {
readonly name: "子";
readonly zodiac: "鼠";
};
readonly CHOU: {
readonly name: "丑";
readonly zodiac: "牛";
};
readonly YIN: {
readonly name: "寅";
readonly zodiac: "虎";
};
readonly MAO: {
readonly name: "卯";
readonly zodiac: "兔";
};
readonly CHEN: {
readonly name: "辰";
readonly zodiac: "龙";
};
readonly SI: {
readonly name: "巳";
readonly zodiac: "蛇";
};
readonly WU: {
readonly name: "午";
readonly zodiac: "马";
};
readonly WEI: {
readonly name: "未";
readonly zodiac: "羊";
};
readonly SHEN: {
readonly name: "申";
readonly zodiac: "猴";
};
readonly YOU: {
readonly name: "酉";
readonly zodiac: "鸡";
};
readonly XU: {
readonly name: "戌";
readonly zodiac: "狗";
};
readonly HAI: {
readonly name: "亥";
readonly zodiac: "猪";
};
};
readonly palace: {
readonly MING: {
readonly name: "命宫";
readonly horoscope: "大命";
};
readonly XIONG_DI: {
readonly name: "兄弟";
readonly horoscope: "大兄";
};
readonly FU_QI: {
readonly name: "夫妻";
readonly horoscope: "大夫";
};
readonly ZI_NV: {
readonly name: "子女";
readonly horoscope: "大子";
};
readonly CAI_BO: {
readonly name: "财帛";
readonly horoscope: "大财";
};
readonly JI_E: {
readonly name: "疾厄";
readonly horoscope: "大疾";
};
readonly QIAN_YI: {
readonly name: "迁移";
readonly horoscope: "大迁";
};
readonly JIAO_YOU: {
readonly name: "交友";
readonly horoscope: "大友";
};
readonly GUAN_LU: {
readonly name: "官禄";
readonly horoscope: "大官";
};
readonly TIAN_ZHAI: {
readonly name: "田宅";
readonly horoscope: "大田";
};
readonly FU_DE: {
readonly name: "福德";
readonly horoscope: "大福";
};
readonly FU_MU: {
readonly name: "父母";
readonly horoscope: "大父";
};
};
readonly star: {
readonly ZI_WEI: {
readonly name: "紫微";
readonly abbr: "紫";
};
readonly TAI_YANG: {
readonly name: "太阳";
readonly abbr: "阳";
};
readonly WU_QU: {
readonly name: "武曲";
readonly abbr: "武";
};
readonly TIAN_TONG: {
readonly name: "天同";
readonly abbr: "同";
};
readonly LIAN_ZHEN: {
readonly name: "廉贞";
readonly abbr: "廉";
};
readonly TIAN_JI: {
readonly name: "天机";
readonly abbr: "机";
};
readonly TAI_YIN: {
readonly name: "太阴";
readonly abbr: "阴";
};
readonly TAN_LANG: {
readonly name: "贪狼";
readonly abbr: "贪";
};
readonly JU_MEN: {
readonly name: "巨门";
readonly abbr: "巨";
};
readonly TIAN_LIANG: {
readonly name: "天梁";
readonly abbr: "梁";
};
readonly PO_JUN: {
readonly name: "破军";
readonly abbr: "破";
};
readonly QI_SHA: {
readonly name: "七杀";
readonly abbr: "杀";
};
readonly TIAN_XIANG: {
readonly name: "天相";
readonly abbr: "相";
};
readonly TIAN_FU: {
readonly name: "天府";
readonly abbr: "府";
};
readonly ZUO_FU: {
readonly name: "左辅";
readonly abbr: "左";
};
readonly YOU_BI: {
readonly name: "右弼";
readonly abbr: "右";
};
readonly WEN_CHANG: {
readonly name: "文昌";
readonly abbr: "昌";
};
readonly WEN_QU: {
readonly name: "文曲";
readonly abbr: "曲";
};
};
readonly transformation: {
readonly A: "禄";
readonly B: "权";
readonly C: "科";
readonly D: "忌";
};
readonly fiveElementNum: {
readonly WOOD: "木三局";
readonly METAL: "金四局";
readonly WATER: "水二局";
readonly EARTH: "土五局";
readonly FIRE: "火六局";
};
};
readonly "zh-Hant": {
readonly gender: {
readonly male: "男";
readonly female: "女";
};
readonly one: {
readonly yin: "陰";
readonly yang: "陽";
};
readonly year: "年";
readonly age: "歲";
readonly hour: "時";
readonly stem: {
readonly JIA: "甲";
readonly YI: "乙";
readonly BING: "丙";
readonly DING: "丁";
readonly WU: "戊";
readonly JI: "己";
readonly GENG: "庚";
readonly XIN: "辛";
readonly REN: "壬";
readonly GUI: "癸";
};
readonly branch: {
readonly ZI: {
readonly name: "子";
readonly zodiac: "鼠";
};
readonly CHOU: {
readonly name: "丑";
readonly zodiac: "牛";
};
readonly YIN: {
readonly name: "寅";
readonly zodiac: "虎";
};
readonly MAO: {
readonly name: "卯";
readonly zodiac: "兔";
};
readonly CHEN: {
readonly name: "辰";
readonly zodiac: "龍";
};
readonly SI: {
readonly name: "巳";
readonly zodiac: "蛇";
};
readonly WU: {
readonly name: "午";
readonly zodiac: "馬";
};
readonly WEI: {
readonly name: "未";
readonly zodiac: "羊";
};
readonly SHEN: {
readonly name: "申";
readonly zodiac: "猴";
};
readonly YOU: {
readonly name: "酉";
readonly zodiac: "雞";
};
readonly XU: {
readonly name: "戌";
readonly zodiac: "狗";
};
readonly HAI: {
readonly name: "亥";
readonly zodiac: "豬";
};
};
readonly palace: {
readonly MING: {
readonly name: "命宮";
readonly horoscope: "大命";
};
readonly XIONG_DI: {
readonly name: "兄弟";
readonly horoscope: "大兄";
};
readonly FU_QI: {
readonly name: "夫妻";
readonly horoscope: "大夫";
};
readonly ZI_NV: {
readonly name: "子女";
readonly horoscope: "大子";
};
readonly CAI_BO: {
readonly name: "財帛";
readonly horoscope: "大財";
};
readonly JI_E: {
readonly name: "疾厄";
readonly horoscope: "大疾";
};
readonly QIAN_YI: {
readonly name: "遷移";
readonly horoscope: "大遷";
};
readonly JIAO_YOU: {
readonly name: "交友";
readonly horoscope: "大友";
};
readonly GUAN_LU: {
readonly name: "官祿";
readonly horoscope: "大官";
};
readonly TIAN_ZHAI: {
readonly name: "田宅";
readonly horoscope: "大田";
};
readonly FU_DE: {
readonly name: "福德";
readonly horoscope: "大福";
};
readonly FU_MU: {
readonly name: "父母";
readonly horoscope: "大父";
};
};
readonly star: {
readonly ZI_WEI: {
readonly name: "紫微";
readonly abbr: "紫";
};
readonly TAI_YANG: {
readonly name: "太陽";
readonly abbr: "陽";
};
readonly WU_QU: {
readonly name: "武曲";
readonly abbr: "武";
};
readonly TIAN_TONG: {
readonly name: "天同";
readonly abbr: "同";
};
readonly LIAN_ZHEN: {
readonly name: "廉貞";
readonly abbr: "廉";
};
readonly TIAN_JI: {
readonly name: "天機";
readonly abbr: "機";
};
readonly TAI_YIN: {
readonly name: "太陰";
readonly abbr: "陰";
};
readonly TAN_LANG: {
readonly name: "貪狼";
readonly abbr: "貪";
};
readonly JU_MEN: {
readonly name: "巨門";
readonly abbr: "巨";
};
readonly TIAN_LIANG: {
readonly name: "天梁";
readonly abbr: "梁";
};
readonly PO_JUN: {
readonly name: "破軍";
readonly abbr: "破";
};
readonly QI_SHA: {
readonly name: "七殺";
readonly abbr: "殺";
};
readonly TIAN_XIANG: {
readonly name: "天相";
readonly abbr: "相";
};
readonly TIAN_FU: {
readonly name: "天府";
readonly abbr: "府";
};
readonly ZUO_FU: {
readonly name: "左輔";
readonly abbr: "左";
};
readonly YOU_BI: {
readonly name: "右弼";
readonly abbr: "右";
};
readonly WEN_CHANG: {
readonly name: "文昌";
readonly abbr: "昌";
};
readonly WEN_QU: {
readonly name: "文曲";
readonly abbr: "曲";
};
};
readonly transformation: {
readonly A: "祿";
readonly B: "權";
readonly C: "科";
readonly D: "忌";
};
readonly fiveElementNum: {
readonly WOOD: "木三局";
readonly METAL: "金四局";
readonly WATER: "水二局";
readonly EARTH: "土五局";
readonly FIRE: "火六局";
};
};
}>;

export { I18nCreateOptions }

export { I18nLanguages }

export declare type Language = (typeof _languages)[number];

export { LanguageKey }

/** 现支持的国际化语言 */
export declare const _languages: readonly ["zh-CN", "zh-Hant"];

export declare interface LunisolarDateParams {
    date: LunarHour;
    globalConfigs: GlobalConfigs;
}

declare interface LunisolarParams {
    /** 姓名 */
    name: string;
    /** 性别 Key */
    gender: GenderKey;
    /** 出生日期 YYYY-m-d-hourIndex  */
    date: string;
    /** 语言 */
    language?: Language;
}

/** 辅星 Key  数组 */
export declare const _minorStars: StarKey[];

export declare type MonthlyStemsAndBranch = [
    {
    stemKey: StemKey;
    stemName: StemName;
},
    {
    branchKey: BranchKey;
    branchName: BranchName;
}
];

export { NestedKeyOf }

/** 太极 Key 数组 */
export declare const _one: OneKey[];

export declare type OneKey = keyof typeof _default.one;

export declare type OneName = OneZhCN | OneZhHant;

export declare type OneZhCN = (typeof _default.one)[OneKey];

export declare type OneZhHant = (typeof _default_2.one)[OneKey];

export declare interface Palace extends PalaceProps {
    /**
     * 获取当前宫位飞宫四化的四个星辰Key数组，下标分别对 [禄，权，科，忌]
     */
    $starKeysByFlying(): StarKey[];
}

export declare type PalaceHoroscopeName = PalaceHoroscopeNameZhCN | PalaceHoroscopeNameZhHant;

export declare type PalaceHoroscopeNameZhCN = (typeof _default.palace)[PalaceKey]["horoscope"];

export declare type PalaceHoroscopeNameZhHant = (typeof _default_2.palace)[PalaceKey]["horoscope"];

export declare type PalaceKey = keyof typeof _default.palace;

/** 十二宫职 Key 数组 */
export declare const _palaceKeys: PalaceKey[];

export declare type PalaceName = PalaceNameZhCN | PalaceNameZhHant;

export declare type PalaceNameZhCN = (typeof _default.palace)[PalaceKey]["name"];

export declare type PalaceNameZhHant = (typeof _default_2.palace)[PalaceKey]["name"];

/**
 * 宫位
 * @property
 * - index 宫位索引
 * - key 宫位Key
 * - name 宫位名称
 * - isLaiYin 是否来因宫
 * - stem 宫位天干
 * - stemKey 宫位天干Key
 * - branch 宫位地支
 * - branchKey 宫位地支Key
 * - majorStars 主星
 * - minorStars 辅星
 * - horoscopeRanges 大限间隔
 */
export declare interface PalaceProps {
    /** 宫位索引，从0到11的数字 */
    index: number;
    /** 宫位Key，用于唯一标识宫位 */
    key: PalaceKey;
    /** 宫位名称，如命宫、财帛宫等 */
    name: PalaceName;
    /** 是否来因宫，标识此宫是否为来因宫 */
    isLaiYin: boolean;
    /** 宫位天干，如甲、乙、丙等 */
    stem: StemName;
    /** 宫位天干Key，天干的唯一标识符 */
    stemKey: StemKey;
    /** 宫位地支，如子、丑、寅等 */
    branch: BranchName;
    /** 宫位地支Key，地支的唯一标识符 */
    branchKey: BranchKey;
    /** 主星，宫位中的主要星耀数组 */
    majorStars: Star[];
    /** 辅星，宫位中的次要星耀数组 */
    minorStars: Star[];
    /** 大限间隔，表示大限的起止年龄范围 */
    horoscopeRanges: [number, number];
}

export declare type SelfTransformation = (typeof _selfTransformation)[number];

export declare const _selfTransformation: readonly ["CP", "CF"];

declare interface SolarParams {
    /** 姓名 */
    name: string;
    /** 性别 Key */
    gender: GenderKey;
    /** 出生日期 */
    date: Date;
    /** 语言 */
    language?: Language;
    /** 出生地经度 默认为116.38333 北京天安门 */
    longitude?: number;
    /** 出生时区 默认为 8，北京时区 */
    timezoneOffset?: number;
    /** 是否采用真太阳时计算 默认为 true */
    useTrueSolarTime?: boolean;
}

export declare interface Star extends StarProps {
}

export declare type StarAbbrKey = StarKey;

export declare type StarAbbrName = StarAbbrNameZhCN | StarAbbrNameZhHant;

export declare type StarAbbrNameZhCN = (typeof _default.star)[StarKey]["abbr"];

export declare type StarAbbrNameZhHant = (typeof _default_2.star)[StarKey]["abbr"];

export declare type StarKey = keyof typeof _default.star;

export declare interface StarMeta {
    starKey?: StarKey;
    startIndex: number;
    direction: 1 | -1;
    galaxy?: Galaxy;
}

export declare type StarName = StarNameZhCN | StarNameZhHant;

export declare type StarNameZhCN = (typeof _default.star)[StarKey]["name"];

export declare type StarNameZhHant = (typeof _default_2.star)[StarKey]["name"];

/**
 * 星辰
 * @property
 * - key 星辰唯一标识
 * - name 星辰名字
 * - abbrName 星辰缩写名
 * - type 星辰类型
 * - galaxy 星辰所属星系
 * - YT 生年四化
 * - ST 自化
 */
export declare interface StarProps {
    /** 星辰唯一标识符 */
    key: StarKey;
    /** 星耀名字，如紫微、天机等 */
    name: StarName;
    /** 星耀缩写，用于简短显示 */
    abbrName: StarAbbrName;
    /** 星辰类型（主星 | 辅星） */
    type: StarType;
    /** 星辰所属星系，如紫微垣、天市垣等，可选属性 */
    galaxy?: Galaxy;
    /** 生年四化，若未产生生年四化则此字段为 `undefined` */
    YT?: StarTransformation;
    /** 自化，若未产生自化则此字段为 `undefined`，记录不同自化类型对应的变化 */
    ST?: Partial<Record<SelfTransformation, StarTransformation>>;
}

export declare interface StarTransformation {
    name: TransformationName;
    key: TransformationKey;
}

/**
 * 星辰类型（主星 | 辅星）
 */
export declare type StarType = "major" | "minor";

export declare type StemKey = keyof typeof _default.stem;

/** 十天干 Key 数组 */
export declare const _stemKeys: StemKey[];

export declare type StemName = StemNameZhCN | StemNameZhHant;

export declare type StemNameZhCN = (typeof _default.stem)[StemKey];

export declare type StemNameZhHant = (typeof _default_2.stem)[StemKey];

export declare const _stemStarTransformations: Record<StemKey, StarKey[]>;

export declare type TransformationKey = keyof typeof _default.transformation;

/** 四化 key 数组 */
export declare const _transformationKeys: TransformationKey[];

export declare type TransformationName = TransformationNameZhCN | TransformationNameZhHant;

export declare type TransformationNameZhCN = (typeof _default.transformation)[TransformationKey];

export declare type TransformationNameZhHant = (typeof _default_2.transformation)[TransformationKey];

export { TranslationKey }

/**
 * 五虎遁月诀 - 以年推月法
 *
 * 天干与起始天干索引的对应关系：
 * 甲(0)己(5) -> 丙(2)
 * 乙(1)庚(6) -> 戊(4)
 * 丙(2)辛(7) -> 庚(6)
 * 丁(3)壬(8) -> 壬(8)
 * 戊(4)癸(9) -> 甲(0)
 */
export declare const _yearToMonthMap: Record<"JIA" | "YI" | "BING" | "DING" | "WU" | "JI" | "GENG" | "XIN" | "REN" | "GUI", MonthlyStemsAndBranch[]>;

export declare namespace ziwei {
    export {
        bySolar,
        byLunisolar,
        SolarParams,
        LunisolarParams
    }
}

export declare type ZodiacKey = BranchKey;

export declare type ZodiacName = ZodiacNameZhCN | ZodiacNameZhHant;

export declare type ZodiacNameZhCN = (typeof _default.branch)[ZodiacKey]["zodiac"];

export declare type ZodiacNameZhHant = (typeof _default_2.branch)[ZodiacKey]["zodiac"];

export { }
