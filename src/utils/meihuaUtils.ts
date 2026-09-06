import { Lunar } from 'lunar-typescript';

// 八卦：0=坤, 1=乾, 2=兑, 3=离, 4=震, 5=巽, 6=坎, 7=艮
const GUA_NAMES: Record<number, string> = {
  0: '坤', 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮',
};

const GUA_SYMBOLS: Record<number, string> = {
  0: '☷', 1: '☰', 2: '☱', 3: '☲', 4: '☳', 5: '☴', 6: '☵', 7: '☶',
};

const GUA_WUXING: Record<number, string> = {
  0: '土', 1: '金', 2: '金', 3: '火', 4: '木', 5: '木', 6: '水', 7: '土',
};

// 卦序 -> 三爻位值（bit0=下爻，bit1=中爻，bit2=上爻；1=阳，0=阴）
// 乾☰=111 兑☱=110(从下到上:阳阳阴=0b011) 离☲=101 震☳=100(从下到上:阳阴阴=0b001)
// 巽☴=011(从下到上:阴阳阳=0b110) 坎☵=010 艮☶=001(从下到上:阴阴阳=0b100) 坤☷=000
const GUA_BITS: Record<number, number> = {
  0: 0b000, 1: 0b111, 2: 0b011, 3: 0b101, 4: 0b001, 5: 0b110, 6: 0b010, 7: 0b100,
};

const BITS_TO_GUA: Record<number, number> = {
  0b000: 0, 0b111: 1, 0b011: 2, 0b101: 3, 0b001: 4, 0b110: 5, 0b010: 6, 0b100: 7,
};

// 六十四卦名 (上卦*8+下卦)
const HEXAGRAM_NAMES: Record<string, string> = {
  '1,1': '乾为天', '1,2': '天泽履', '1,3': '天火同人', '1,4': '天雷无妄',
  '1,5': '天风姤', '1,6': '天水讼', '1,7': '天山遁', '1,0': '天地否',
  '2,1': '泽天夬', '2,2': '兑为泽', '2,3': '泽火革', '2,4': '泽雷随',
  '2,5': '泽风大过', '2,6': '泽水困', '2,7': '泽山咸', '2,0': '泽地萃',
  '3,1': '火天大有', '3,2': '火泽睽', '3,3': '离为火', '3,4': '火雷噬嗑',
  '3,5': '火风鼎', '3,6': '火水未济', '3,7': '火山旅', '3,0': '火地晋',
  '4,1': '雷天大壮', '4,2': '雷泽归妹', '4,3': '雷火丰', '4,4': '震为雷',
  '4,5': '雷风恒', '4,6': '雷水解', '4,7': '雷山小过', '4,0': '雷地豫',
  '5,1': '风天小畜', '5,2': '风泽中孚', '5,3': '风火家人', '5,4': '风雷益',
  '5,5': '巽为风', '5,6': '风水涣', '5,7': '风山渐', '5,0': '风地观',
  '6,1': '水天需', '6,2': '水泽节', '6,3': '水火既济', '6,4': '水雷屯',
  '6,5': '水风井', '6,6': '坎为水', '6,7': '水山蹇', '6,0': '水地比',
  '7,1': '山天大畜', '7,2': '山泽损', '7,3': '山火贲', '7,4': '山雷颐',
  '7,5': '山风蛊', '7,6': '山水蒙', '7,7': '艮为山', '7,0': '山地剥',
  '0,1': '地天泰', '0,2': '地泽临', '0,3': '地火明夷', '0,4': '地雷复',
  '0,5': '地风升', '0,6': '地水师', '0,7': '地山谦', '0,0': '坤为地',
};

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface MeiHuaResult {
  shangGua: number;
  xiaGua: number;
  dongYao: number; // 1-6
  benGuaName: string;
  benGuaSymbol: string;
  huGuaName: string;
  huGuaSymbol: string;
  bianGuaName: string;
  bianGuaSymbol: string;
  tiGua: number;
  yongGua: number;
  tiWuxing: string;
  yongWuxing: string;
  relation: string;
  judgement: string;
  bianYongWuxing: string;   // 变卦中用卦（变出之卦）的五行
  bianRelation: string;     // 变卦用卦对体卦的生克（定结局吉凶）
  bianJudgement: string;
}

function getGuaFromNum(n: number): number {
  const r = n % 8;
  return r === 0 ? 8 : r;
}

// 先天卦数(1乾2兑3离4震5巽6坎7艮8坤) -> 内部索引(1乾2兑3离4震5巽6坎7艮0坤)
function guaNumToIndex(n: number): number {
  if (n === 8) return 0;
  return n;
}

function getHexagramName(shangIndex: number, xiaIndex: number): string {
  return HEXAGRAM_NAMES[`${shangIndex},${xiaIndex}`] || '未知卦';
}

/**
 * 互卦：取本卦二、三、四爻为下互，三、四、五爻为上互。
 * 六爻位序（从下到上）：爻1-3 为下卦，爻4-6 为上卦。
 */
function getHuGua(shangIndex: number, xiaIndex: number): { shang: number; xia: number } {
  const s = GUA_BITS[shangIndex];
  const x = GUA_BITS[xiaIndex];
  const y2 = (x >> 1) & 1;
  const y3 = (x >> 2) & 1;
  const y4 = s & 1;
  const y5 = (s >> 1) & 1;
  const huXiaBits = y2 | (y3 << 1) | (y4 << 2);
  const huShangBits = y3 | (y4 << 1) | (y5 << 2);
  return { shang: BITS_TO_GUA[huShangBits], xia: BITS_TO_GUA[huXiaBits] };
}

/** 变卦：动爻阴阳翻转（动爻 1-3 在下卦，4-6 在上卦）。 */
function getBianGua(shangIndex: number, xiaIndex: number, dongYao: number): { shang: number; xia: number } {
  let s = GUA_BITS[shangIndex];
  let x = GUA_BITS[xiaIndex];
  if (dongYao <= 3) {
    x ^= 1 << (dongYao - 1);
  } else {
    s ^= 1 << (dongYao - 4);
  }
  return { shang: BITS_TO_GUA[s], xia: BITS_TO_GUA[x] };
}

/** 体用：动爻所在之卦为用卦，另一卦为体卦（体为自己，用为所占之事/外部环境）。 */
function getTiYong(shangIndex: number, xiaIndex: number, dongYao: number): {
  ti: number;
  yong: number;
} {
  if (dongYao <= 3) {
    return { ti: shangIndex, yong: xiaIndex };
  }
  return { ti: xiaIndex, yong: shangIndex };
}

function getWuxingRelation(tiWx: string, yongWx: string): { relation: string; judgement: string } {
  const wuxingCycle: Record<string, { sheng: string; ke: string }> = {
    '金': { sheng: '水', ke: '木' },
    '水': { sheng: '木', ke: '火' },
    '木': { sheng: '火', ke: '土' },
    '火': { sheng: '土', ke: '金' },
    '土': { sheng: '金', ke: '水' },
  };

  if (tiWx === yongWx) {
    return { relation: '体用比和', judgement: '体用比和，百事顺遂，谋为可成，吉利之象。' };
  }
  if (wuxingCycle[tiWx]?.sheng === yongWx) {
    return { relation: '体生用', judgement: '体生用，有耗泄之象，事虽可成但较为费力，需耐心等待。' };
  }
  if (wuxingCycle[tiWx]?.ke === yongWx) {
    return { relation: '体克用', judgement: '体克用，诸事可成，但需主动出击，积极争取，不宜被动等待。' };
  }
  if (wuxingCycle[yongWx]?.sheng === tiWx) {
    return { relation: '用生体', judgement: '用生体，大吉之象，有贵人相助，事半功倍，诸事顺利。' };
  }
  return { relation: '用克体', judgement: '用克体，凶象，诸事不宜，宜守不宜攻，需谨慎行事，等待时机。' };
}

function buildResult(shangNum: number, xiaNum: number, dongYaoNum: number): MeiHuaResult {
  const shangIndex = guaNumToIndex(shangNum);
  const xiaIndex = guaNumToIndex(xiaNum);

  const benName = getHexagramName(shangIndex, xiaIndex);
  const benSymbol = `${GUA_SYMBOLS[shangIndex]}${GUA_SYMBOLS[xiaIndex]}`;

  const hu = getHuGua(shangIndex, xiaIndex);
  const huName = getHexagramName(hu.shang, hu.xia);
  const huSymbol = `${GUA_SYMBOLS[hu.shang]}${GUA_SYMBOLS[hu.xia]}`;

  const bian = getBianGua(shangIndex, xiaIndex, dongYaoNum);
  const bianName = getHexagramName(bian.shang, bian.xia);
  const bianSymbol = `${GUA_SYMBOLS[bian.shang]}${GUA_SYMBOLS[bian.xia]}`;

  const tiYong = getTiYong(shangIndex, xiaIndex, dongYaoNum);
  const tiWx = GUA_WUXING[tiYong.ti];
  const yongWx = GUA_WUXING[tiYong.yong];
  const wxRel = getWuxingRelation(tiWx, yongWx);

  // 变卦参断：动爻在用卦，变卦同位置之卦即"用卦变出之卦"，其对体卦的生克定结局
  const bianYongIndex = dongYaoNum <= 3 ? bian.xia : bian.shang;
  const bianYongWx = GUA_WUXING[bianYongIndex];
  const bianRel = getWuxingRelation(tiWx, bianYongWx);

  return {
    shangGua: shangNum,
    xiaGua: xiaNum,
    dongYao: dongYaoNum,
    benGuaName: benName,
    benGuaSymbol: benSymbol,
    huGuaName: huName,
    huGuaSymbol: huSymbol,
    bianGuaName: bianName,
    bianGuaSymbol: bianSymbol,
    tiGua: tiYong.ti,
    yongGua: tiYong.yong,
    tiWuxing: tiWx,
    yongWuxing: yongWx,
    relation: wxRel.relation,
    judgement: wxRel.judgement,
    bianYongWuxing: bianYongWx,
    bianRelation: bianRel.relation,
    bianJudgement: bianRel.judgement,
  };
}

/**
 * 手动数字起卦：num1 求上卦、num2 求下卦、num3 求动爻（各按先天卦数取余）。
 */
export function calcMeiHua(num1: number, num2: number, num3: number): MeiHuaResult {
  const shangNum = getGuaFromNum(num1);
  const xiaNum = getGuaFromNum(num2);
  const dongYaoNum = num3 % 6 === 0 ? 6 : num3 % 6;
  return buildResult(shangNum, xiaNum, dongYaoNum);
}

/**
 * 标准梅花时间起卦（农历年月日时）：
 * 上卦 = (年支数 + 月数 + 日数) ÷ 8 取余
 * 下卦 = (年支数 + 月数 + 日数 + 时支数) ÷ 8 取余
 * 动爻 = (年支数 + 月数 + 日数 + 时支数) ÷ 6 取余
 * 年支数：子1丑2…亥12；月日按农历；时支数同年支数。
 */
export function calcMeiHuaFromDate(date: Date = new Date()): MeiHuaResult {
  const lunar = Lunar.fromDate(date);
  const yearZhi = lunar.getYearInGanZhi().charAt(1);
  const yearNum = ZHI_ORDER.indexOf(yearZhi) + 1;
  const monthNum = Math.abs(lunar.getMonth()); // 闰月取正值
  const dayNum = lunar.getDay();
  const hourNum = ZHI_ORDER.indexOf(lunar.getTimeZhi()) + 1;

  const shangNum = getGuaFromNum(yearNum + monthNum + dayNum);
  const xiaNum = getGuaFromNum(yearNum + monthNum + dayNum + hourNum);
  const total = yearNum + monthNum + dayNum + hourNum;
  const dongYaoNum = total % 6 === 0 ? 6 : total % 6;

  return buildResult(shangNum, xiaNum, dongYaoNum);
}

export { GUA_NAMES, GUA_SYMBOLS, GUA_WUXING };
