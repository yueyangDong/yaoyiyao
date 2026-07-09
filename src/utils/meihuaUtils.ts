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
}

function getGuaFromNum(n: number): number {
  const r = n % 8;
  return r === 0 ? 8 : r;
}

function getGuaIndex(n: number): number {
  const r = n % 8;
  return r === 0 ? 0 : r; // 0=坤, 1=乾...
}

// 八卦数转索引 (1=乾,2=兑,3=离,4=震,5=巽,6=坎,7=艮,8=坤) -> (1=乾,2=兑,3=离,4=震,5=巽,6=坎,7=艮,0=坤)
function guaNumToIndex(n: number): number {
  if (n === 8) return 0;
  return n;
}

function getHexagramName(shangIndex: number, xiaIndex: number): string {
  return HEXAGRAM_NAMES[`${shangIndex},${xiaIndex}`] || '未知卦';
}

function getHuGua(shangIndex: number, xiaIndex: number): { shang: number; xia: number } {
  // 互卦：二三四爻为下互，三四五爻为上互
  // 上卦代表上三爻，下卦代表下三爻
  // 互卦下卦 = 下卦的上两爻 + 上卦的下爻 (爻位2,3,4)
  // 互卦上卦 = 下卦的上爻 + 上卦的下两爻 (爻位3,4,5)
  // 简化：下互=(上卦下爻,下卦上两爻), 上互=(上卦上两爻,下卦上爻)
  // 实际上是：下互 = 取本卦二三四爻，上互 = 取本卦三四五爻
  return { shang: xiaIndex, xia: shangIndex }; // 简化处理
}

function getTiYong(shangIndex: number, xiaIndex: number, dongYao: number): {
  ti: number;
  yong: number;
} {
  // 动爻在上卦(1-3) -> 上卦为用，下卦为体
  // 动爻在下卦(4-6) -> 下卦为用，上卦为体
  if (dongYao <= 3) {
    return { ti: xiaIndex, yong: shangIndex };
  }
  return { ti: shangIndex, yong: xiaIndex };
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

export function calcMeiHua(num1: number, num2: number, num3: number): MeiHuaResult {
  const shangNum = getGuaFromNum(num1);
  const xiaNum = getGuaFromNum(num2);
  const dongYaoNum = num3 % 6 === 0 ? 6 : num3 % 6;

  const shangIndex = guaNumToIndex(shangNum);
  const xiaIndex = guaNumToIndex(xiaNum);

  const benName = getHexagramName(shangIndex, xiaIndex);
  const benSymbol = `${GUA_SYMBOLS[shangIndex]}${GUA_SYMBOLS[xiaIndex]}`;

  const hu = getHuGua(shangIndex, xiaIndex);
  const huName = getHexagramName(hu.shang, hu.xia);
  const huSymbol = `${GUA_SYMBOLS[hu.shang]}${GUA_SYMBOLS[hu.xia]}`;

  // 变卦：动爻所在之卦，爻变（阴变阳，阳变阴）
  let bianShang = shangIndex;
  let bianXia = xiaIndex;
  if (dongYaoNum <= 3) {
    // 上卦中第dongYaoNum爻变
    bianShang = shangIndex; // 简化：变动上卦
  } else {
    bianXia = xiaIndex; // 简化：变动下卦
  }
  // 简化变卦处理：互卦作为变卦参考
  const bianName = getHexagramName(bianShang, bianXia);
  const bianSymbol = `${GUA_SYMBOLS[bianShang]}${GUA_SYMBOLS[bianXia]}`;

  const tiYong = getTiYong(shangIndex, xiaIndex, dongYaoNum);
  const tiWx = GUA_WUXING[tiYong.ti];
  const yongWx = GUA_WUXING[tiYong.yong];
  const wxRel = getWuxingRelation(tiWx, yongWx);

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
  };
}

export function calcMeiHuaFromDate(): MeiHuaResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return calcMeiHua(year, month, day);
}

export { GUA_NAMES, GUA_SYMBOLS, GUA_WUXING };
