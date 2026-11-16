/**
 * 大六壬起课引擎（唯一判据出口）。
 *
 * ⚠️ 为什么单独一个文件：
 * 六爻/梅花/灵签走的是「卦」体系，大六壬走的是「课」体系——月将加时、四课、
 * 三传九宗门、十二天将。它的盘面结构与六爻完全不同，硬塞进 liuyaoReading
 * 只会两套判据互相污染。这里只负责「把时间折算成一张课盘」，吉凶判断在
 * `daliurenReading.ts`，页面只渲染。
 *
 * ⚠️ 口径声明（与开源实现的差异都写在这里，改之前先想清楚）：
 * 1. 月将按「中气换将」定（雨水后亥将……大寒后子将），这是通行正法；
 *    另有「节气换将」一说，本项目不采。
 * 2. 天乙贵人取通行口诀「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，
 *    六辛逢马虎」，昼占用阳贵（前一字）、夜占用阴贵（后一字）。
 *    ⚠️ 另有「甲羊戊庚牛」一系（甲日昼贵用未），属流派差异，本项目不采。
 * 3. 天将顺逆：贵人临地盘亥子丑寅卯辰顺布，临巳午未申酉戌逆布。
 * 4. 三传取用按九宗门：伏吟/返吟 → 贼克 → 比用 → 涉害 → 八专 → 别责 → 遥克 → 昴星。
 *    kinliuren 等实现还有大量杂课（励德、稼穑、龙战、元胎……）的细分，属课体
 *    细目而非取传规则，本项目只落到九宗门主干 + 结构课（伏吟/返吟/八专/别责）。
 * 5. 涉害深浅：以天盘神归本位途中「克我」重数多者为用，重数相同再比「我克」，
 *    仍相同则阳日取干上神、阴日取支上神。
 */

import { Lunar } from 'lunar-typescript';
import { DZ_ORDER, DZ_WX, DZ_CHONG, isChong } from './diZhiRelations';
import { WX_SHENG, WX_KE, GAN_WX, YANG_GAN } from './wuXingRelations';

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export type KeMode = 'time' | 'manual' | 'random';

export interface SiKeItem {
  /** 1~4 课 */
  index: number;
  name: string;
  /** 下神：第一课为日干，其余为地支 */
  lower: string;
  upper: string;
  /** 下神的显示标签，如「甲（寄寅）」 */
  lowerLabel: string;
  relation: '下贼上' | '上克下' | '无克';
}

export interface SanChuanItem {
  stage: '初传' | '中传' | '末传';
  zhi: string;
  /** 旬遁天干（该支在本旬所配之干） */
  dunGan: string;
  liuQin: string;
  tianJiang: string;
  /** 旬空 */
  kong: boolean;
  /** 日马（驿马） */
  yiMa: boolean;
  /** 与日干的关系白话，如「财爻」「官爻」 */
  tag: string;
}

export interface PanPosition {
  /** 地盘支 */
  di: string;
  /** 天盘支（月将加时后的上神） */
  tian: string;
  /** 该天盘支所乘天将 */
  jiang: string;
  isGuiRen: boolean;
  isHour: boolean;
}

export interface KeResult {
  mode: KeMode;
  dateInfo: {
    yearGz: string;
    monthGz: string;
    dayGz: string;
    hourGz: string;
    dayGan: string;
    dayZhi: string;
    hourZhi: string;
    /** 月将地支 */
    jiangZhi: string;
    jiangName: string;
    /** 定将所用中气 */
    zhongQi: string;
    /** 昼占 / 夜占 */
    dayNight: '昼' | '夜';
    /** 当前所处节气（最近一个已过的节气），仅作展示 */
    jieQi: string;
    solarText: string;
  };
  keTi: { name: string; note: string };
  siKe: SiKeItem[];
  sanChuan: SanChuanItem[];
  tianDiPan: {
    positions: PanPosition[];
    guiRenZhi: string;
    guiRenOnDi: string;
    forward: boolean;
  };
  flags: {
    fuYin: boolean;
    fanYin: boolean;
    kongZhi: string[];
    yiMaZhi: string;
    baZhuan: boolean;
    siKeBuQuan: boolean;
  };
  /** 一句话课体白话，供页面开篇 */
  headline: string;
}

/* ------------------------------------------------------------------ *
 * 基础表
 * ------------------------------------------------------------------ */

/** 日干寄宫：甲寅 乙辰 丙戊巳 丁己未 庚申 辛戌 壬亥 癸丑 */
export const JI_GONG: Record<string, string> = {
  甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳',
  己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
};

/** 十二天将（顺序固定：贵蛇雀合勾龙空虎常玄阴后） */
export const TIAN_JIANG = [
  '贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙',
  '天空', '白虎', '太常', '玄武', '太阴', '天后',
];

/** 月将名（地支 → 将名） */
export const JIANG_NAME: Record<string, string> = {
  亥: '登明', 戌: '河魁', 酉: '从魁', 申: '传送',
  未: '小吉', 午: '胜光', 巳: '太乙', 辰: '天罡',
  卯: '太冲', 寅: '功曹', 丑: '大吉', 子: '神后',
};

/** 中气 → 月将（换将正法） */
export const ZHONG_QI_JIANG: { qi: string; jiang: string }[] = [
  { qi: '雨水', jiang: '亥' }, { qi: '春分', jiang: '戌' },
  { qi: '谷雨', jiang: '酉' }, { qi: '小满', jiang: '申' },
  { qi: '夏至', jiang: '未' }, { qi: '大暑', jiang: '午' },
  { qi: '处暑', jiang: '巳' }, { qi: '秋分', jiang: '辰' },
  { qi: '霜降', jiang: '卯' }, { qi: '小雪', jiang: '寅' },
  { qi: '冬至', jiang: '丑' }, { qi: '大寒', jiang: '子' },
];

/**
 * ⚠️ lunar-typescript 的节气表跨年时会把键写成拼音（冬至→DONG_ZHI、大寒→DA_HAN……），
 * 只按中文名过滤会**漏掉跨年那几个中气**，于是 12 月下旬被判成「小雪将」。
 * 这里统一折回中文名再查表。
 */
const JIE_QI_ALIAS: Record<string, string> = {
  DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒',
  LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', CHUN_FEN: '春分',
  QING_MING: '清明', GU_YU: '谷雨', LI_XIA: '立夏', XIAO_MAN: '小满',
  MANG_ZHONG: '芒种', XIA_ZHI: '夏至', XIAO_SHU: '小暑', DA_SHU: '大暑',
  LI_QIU: '立秋', CHU_SHU: '处暑', BAI_LU: '白露', QIU_FEN: '秋分',
  HAN_LU: '寒露', SHUANG_JIANG: '霜降', LI_DONG: '立冬', XIAO_XUE: '小雪',
};

/** 天乙贵人：昼占（阳贵）/ 夜占（阴贵） */
const GUI_REN_DAY: Record<string, string> = {
  甲: '丑', 戊: '丑', 庚: '丑', 乙: '子', 己: '子',
  丙: '亥', 丁: '亥', 壬: '卯', 癸: '巳', 辛: '午',
};
const GUI_REN_NIGHT: Record<string, string> = {
  甲: '未', 戊: '未', 庚: '未', 乙: '申', 己: '申',
  丙: '酉', 丁: '酉', 壬: '巳', 癸: '卯', 辛: '寅',
};

/** 三合局 → 驿马 */
const YI_MA: Record<string, string> = {
  申: '寅', 子: '寅', 辰: '寅',
  寅: '申', 午: '申', 戌: '申',
  巳: '亥', 酉: '亥', 丑: '亥',
  亥: '巳', 卯: '巳', 未: '巳',
};

/** 天干五合，用于别责课（阳日取干合上神） */
const GAN_HE: Record<string, string> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛',
  辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
};

/** 三合局（顺行前一位，用于别责课阴日取用） */
const SAN_HE_NEXT: Record<string, string> = {
  申: '子', 子: '辰', 辰: '申',
  寅: '午', 午: '戌', 戌: '寅',
  亥: '卯', 卯: '未', 未: '亥',
  巳: '酉', 酉: '丑', 丑: '巳',
};

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支顺序唯一出口（页面画盘与测试都从这里取，别另写一张） */
export const DI_ZHI_ORDER = DZ_ORDER;

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

const idx = (z: string) => DZ_ORDER.indexOf(z);
const shiftZhi = (z: string, n: number) => DZ_ORDER[((idx(z) + n) % 12 + 12) % 12];

export const isYangGan = (g: string) => YANG_GAN.includes(g);

/** 六亲：以日干为我 */
export function liuQinOf(dayGan: string, zhi: string): string {
  const me = GAN_WX[dayGan];
  const other = DZ_WX[zhi];
  if (!me || !other) return '';
  if (me === other) return '兄弟';
  if (WX_SHENG[me] === other) return '子孙';
  if (WX_KE[me] === other) return '妻财';
  if (WX_KE[other] === me) return '官鬼';
  return '父母';
}

/** 六亲的断事含义（页面 tooltip 与判读层共用，避免两处各写一套） */
export const LIU_QIN_PLAIN: Record<string, string> = {
  父母: '长辈、文书、学历、合同、房子、消息',
  兄弟: '朋友、同辈、竞争者、合伙、开支',
  子孙: '晚辈、下属、解忧、医药、口福、福气',
  妻财: '钱财、实物、生意（男命也代表另一半）',
  官鬼: '工作、职位、压力、官司、疾病（女命也代表另一半）',
};

/** 天将的吉凶倾向：只作修饰，不单独定吉凶 */
export const JIANG_TONE: Record<string, 1 | 0 | -1> = {
  贵人: 1, 青龙: 1, 六合: 1, 太常: 1, 太阴: 1, 天后: 1,
  朱雀: 0, 勾陈: -1, 螣蛇: -1, 天空: -1, 白虎: -1, 玄武: -1,
};

export const JIANG_PLAIN: Record<string, string> = {
  贵人: '主贵人提携、上级、体面——事有转圜的余地',
  螣蛇: '主虚惊、缠绕、反覆——事情容易一惊一乍地反复',
  朱雀: '主口舌、文书、消息——成败常落在一句话或一份文件上',
  六合: '主和合、中介、约定——谈得拢，也主有人牵线',
  勾陈: '主牵连、迟滞、田土——事情黏住不动，或牵扯旧账',
  青龙: '主喜庆、财帛、正途——正路来的好处',
  天空: '主落空、虚耗、口惠——说得好听，未必兑现',
  白虎: '主凶伤、压力、病痛——有硬碰硬的成分',
  太常: '主衣食、宴饮、常例——按常规走，稳中有得',
  玄武: '主暗昧、盗失、隐私——有没说清的部分',
  太阴: '主隐蔽、内助、暗中经营——成在暗处',
  天后: '主恩泽、女性、家务——柔性的力量在起作用',
};

/* ------------------------------------------------------------------ *
 * 月将：按中气定
 * ------------------------------------------------------------------ */

function solarToDate(s: { getYear(): number; getMonth(): number; getDay(): number; getHour(): number; getMinute(): number; getSecond(): number }): Date {
  return new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond());
}

/**
 * 取给定时刻所行的月将。
 * ⚠️ 只回看 200 天是不够的：大寒前后要的是上一年冬至的丑将，而冬至在 11 个月前，
 *    所以这里同时扫「当天」与「200 天前」两张节气表，再取已过中气里最晚的一个。
 */
export function monthJiangOf(date: Date): { jiang: string; qi: string; qiTime: Date } {
  const names = ZHONG_QI_JIANG.map((x) => x.qi);
  const candidates: { qi: string; time: Date }[] = [];
  for (const offset of [0, -200]) {
    const probe = new Date(date.getTime() + offset * 86400000);
    const table = Lunar.fromDate(probe).getJieQiTable() as Record<string, { getYear(): number; getMonth(): number; getDay(): number; getHour(): number; getMinute(): number; getSecond(): number }>;
    for (const key of Object.keys(table)) {
      const name = JIE_QI_ALIAS[key] || key;
      if (!names.includes(name)) continue;
      const t = solarToDate(table[key]);
      if (t.getTime() <= date.getTime()) candidates.push({ qi: name, time: t });
    }
  }
  candidates.sort((a, b) => b.time.getTime() - a.time.getTime());
  const hit = candidates[0];
  const fallback = { jiang: '亥', qi: '雨水', qiTime: date };
  if (!hit) return fallback;
  const row = ZHONG_QI_JIANG.find((x) => x.qi === hit.qi);
  return { jiang: row ? row.jiang : fallback.jiang, qi: hit.qi, qiTime: hit.time };
}

/* ------------------------------------------------------------------ *
 * 起课
 * ------------------------------------------------------------------ */

export interface KeOptions {
  /** 活时起课：手动指定时支（不填则用真实时辰） */
  hourZhi?: string;
  /** 随机课：直接指定月将（页面「随机起课」用） */
  jiangZhi?: string;
  mode?: KeMode;
}

export function buildKe(date: Date, opts: KeOptions = {}): KeResult {
  const lunar = Lunar.fromDate(date);
  const dayGz = lunar.getDayInGanZhiExact();
  const hourGz = opts.hourZhi ? `${lunar.getTimeGan()}${opts.hourZhi}` : lunar.getTimeInGanZhi();
  const dayGan = dayGz[0];
  const dayZhi = dayGz[1];
  const hourZhi = opts.hourZhi || lunar.getTimeZhi();

  const mj = monthJiangOf(date);
  const jiangZhi = opts.jiangZhi || mj.jiang;

  // 昼占：卯辰巳午未申（日出至日落）；夜占：酉戌亥子丑寅
  const dayNight: '昼' | '夜' = idx(hourZhi) >= 3 && idx(hourZhi) <= 8 ? '昼' : '夜';
  const guiRenZhi = (dayNight === '昼' ? GUI_REN_DAY : GUI_REN_NIGHT)[dayGan] || '丑';

  // ---- 天地盘：月将加于占时之上，顺布十二支 ----
  const tianPan: Record<string, string> = {};
  const base = idx(hourZhi);
  const jBase = idx(jiangZhi);
  for (let i = 0; i < 12; i++) {
    tianPan[DZ_ORDER[(base + i) % 12]] = DZ_ORDER[(jBase + i) % 12];
  }
  const tianUp = (zhi: string) => tianPan[zhi];
  const tianDown = (tian: string) => DZ_ORDER.find((d) => tianPan[d] === tian) || DZ_ORDER[0];

  // ---- 十二天将：贵人落宫定顺逆 ----
  const guiRenOnDi = tianDown(guiRenZhi);
  const forward = [9, 10, 11, 0, 1, 2].includes(idx(guiRenOnDi)); // 亥子丑寅卯辰顺布
  const jiangOfTian: Record<string, string> = {};
  for (let k = 0; k < 12; k++) {
    const tian = DZ_ORDER[((idx(guiRenZhi) + (forward ? k : -k)) % 12 + 12) % 12];
    jiangOfTian[tian] = TIAN_JIANG[k];
  }

  // ---- 四课 ----
  const relationOf = (upper: string, lowerWx: string): SiKeItem['relation'] => {
    const upperWx = DZ_WX[upper];
    if (!upperWx || !lowerWx) return '无克';
    if (WX_KE[upperWx] === lowerWx) return '上克下';
    if (WX_KE[lowerWx] === upperWx) return '下贼上';
    return '无克';
  };

  const gong = JI_GONG[dayGan];
  const ke1Upper = tianUp(gong);
  const ke2Upper = tianUp(ke1Upper);
  const ke3Upper = tianUp(dayZhi);
  const ke4Upper = tianUp(ke3Upper);

  const siKe: SiKeItem[] = [
    { index: 1, name: '第一课', lower: dayGan, upper: ke1Upper, lowerLabel: `${dayGan}（寄${gong}）`, relation: relationOf(ke1Upper, GAN_WX[dayGan]) },
    { index: 2, name: '第二课', lower: ke1Upper, upper: ke2Upper, lowerLabel: ke1Upper, relation: relationOf(ke2Upper, DZ_WX[ke1Upper]) },
    { index: 3, name: '第三课', lower: dayZhi, upper: ke3Upper, lowerLabel: dayZhi, relation: relationOf(ke3Upper, DZ_WX[dayZhi]) },
    { index: 4, name: '第四课', lower: ke3Upper, upper: ke4Upper, lowerLabel: ke3Upper, relation: relationOf(ke4Upper, DZ_WX[ke3Upper]) },
  ];

  // ---- 旬空 / 遁干 ----
  const gz60: string[] = [];
  for (let i = 0; i < 60; i++) gz60.push(GAN[i % 10] + DZ_ORDER[i % 12]);
  const dayIdx = gz60.indexOf(dayGz) >= 0 ? gz60.indexOf(dayGz) : 0;
  const xunStart = dayIdx - (dayIdx % 10);
  const xunGz = gz60[xunStart];
  const kongZhi = [gz60[(xunStart + 10) % 60][1], gz60[(xunStart + 11) % 60][1]];
  const dunGanOf = (zhi: string): string => {
    const gap = ((idx(zhi) - idx(xunGz[1])) % 12 + 12) % 12;
    return GAN[(GAN.indexOf(xunGz[0]) + gap) % 10];
  };
  const yiMaZhi = YI_MA[dayZhi];
  const fuYin = jiangZhi === hourZhi;
  const fanYin = isChong(jiangZhi, hourZhi);
  const baZhuan = gong === dayZhi;
  const siKeBuQuan = ke1Upper === ke3Upper;

  // ---- 三传 ----
  const zhiXing = (z: string): string => {
    // 三刑取一位：寅→巳、巳→申、申→寅；丑→戌→未→丑；子→卯→子；自刑取冲
    const map: Record<string, string> = {
      寅: '巳', 巳: '申', 申: '寅',
      丑: '戌', 戌: '未', 未: '丑',
      子: '卯', 卯: '子',
      辰: '辰', 午: '午', 酉: '酉', 亥: '亥',
    };
    const next = map[z] || z;
    return next === z ? DZ_CHONG[z] : next; // 自刑取冲，避免刑出自己
  };

  const chuan = (first: string): string[] => {
    const second = tianUp(first);
    const third = tianUp(second);
    return [first, second, third];
  };

  let keTiName = '';
  let keTiNote = '';
  let trio: string[] = [];

  const selectByKe = (): { zhi: string; name: string } | null => {
    const xiaZei = siKe.filter((k) => k.relation === '下贼上');
    const shangKe = siKe.filter((k) => k.relation === '上克下');
    const pool = xiaZei.length > 0 ? xiaZei : shangKe;
    const baseName = xiaZei.length > 0 ? '重审' : '元首';
    if (pool.length === 0) return null;
    if (pool.length === 1) return { zhi: pool[0].upper, name: baseName };
    // 比用：取与日干同阴阳者
    const sameYinYang = pool.filter((k) => {
      const i = idx(k.upper);
      const isYangZhi = i % 2 === 0;
      return isYangZhi === isYangGan(dayGan);
    });
    if (sameYinYang.length === 1) return { zhi: sameYinYang[0].upper, name: '比用（知一）' };
    // 涉害：归本位途中克我重数多者
    const depthOf = (k: SiKeItem): number => {
      let pos = tianDown(k.upper);
      let deep = 0;
      let other = 0;
      for (let step = 0; step < 12; step++) {
        if (pos === k.upper) break;
        const wx = DZ_WX[pos];
        if (WX_KE[wx] === DZ_WX[k.upper]) deep++;
        if (WX_KE[DZ_WX[k.upper]] === wx) other++;
        pos = shiftZhi(pos, 1);
      }
      return deep * 10 + other;
    };
    const ranked = [...pool].sort((a, b) => depthOf(b) - depthOf(a));
    if (bound(depthOf(ranked[0]), depthOf(ranked[1]))) {
      // 复等：阳日取干上神，阴日取支上神
      return { zhi: isYangGan(dayGan) ? ke1Upper : ke3Upper, name: '涉害（复等）' };
    }
    return { zhi: ranked[0].upper, name: '涉害' };
  };

  if (fuYin) {
    const sel = selectByKe();
    if (sel) {
      trio = [sel.zhi, zhiXing(sel.zhi), zhiXing(zhiXing(sel.zhi))];
      keTiName = `伏吟·${sel.name}`;
      keTiNote = '月将与占时同位，天地盘重叠——事情原地打转，动不了，也急不得。';
    } else {
      const first = isYangGan(dayGan) ? ke1Upper : ke3Upper;
      trio = [first, zhiXing(first), zhiXing(zhiXing(first))];
      keTiName = isYangGan(dayGan) ? '伏吟·自任' : '伏吟·自信';
      keTiNote = '天地盘重叠且四课无克——纯属停摆之象，宜守成、宜等，不宜强行推动。';
    }
  } else if (fanYin) {
    const sel = selectByKe();
    if (sel) {
      trio = chuan(sel.zhi);
      keTiName = `返吟·${sel.name}`;
      keTiNote = '月将与占时相冲，天地盘两两对冲——事情翻来覆去，往往先动后定。';
    } else {
      trio = [yiMaZhi, ke3Upper, ke1Upper];
      keTiName = '返吟·井栏射（无依）';
      keTiNote = '天地盘全冲又无克——无依之象：靠不住现成的路，得靠「动」破局，动起来才有转机。';
    }
  } else {
    const sel = selectByKe();
    if (sel) {
      trio = chuan(sel.zhi);
      keTiName = sel.name;
      keTiNote = sel.name.includes('重审')
        ? '下贼上，以下犯上取用——事由内起、由下起，得先处理内部或基础的问题。'
        : sel.name.includes('元首')
          ? '上克下，顺理成章取用——事情由外部推动，按规矩走就能推进。'
          : '课体取用需层层筛选——头绪不止一条，得看清哪条才是真正的主线。';
    } else if (baZhuan) {
      const first = isYangGan(dayGan)
        ? shiftZhi(ke1Upper, 2)
        : shiftZhi(ke3Upper, -2);
      trio = [first, ke1Upper, first];
      keTiName = '八专';
      keTiNote = '干支同位（日干寄宫即日支），四课挤成两课——事与己贴得太近，容易当局者迷，先拉开距离再看。';
    } else if (siKeBuQuan) {
      const heGan = GAN_HE[dayGan];
      const first = isYangGan(dayGan) ? tianUp(JI_GONG[heGan]) : SAN_HE_NEXT[dayZhi];
      trio = [first, ke1Upper, first];
      keTiName = '别责';
      keTiNote = '四课不全又无克——事情没有正面对手，却也没有现成的抓手，只能借力（借人、借势）来推。';
    } else {
      // 遥克：四课上神与日干相克（隔位而克，力量弱于近克）
      const dayWx = GAN_WX[dayGan];
      const yaoKeMe = siKe.filter((k) => WX_KE[DZ_WX[k.upper]] === dayWx);
      const woYaoKe = siKe.filter((k) => WX_KE[dayWx] === DZ_WX[k.upper]);
      if (yaoKeMe.length > 0 || woYaoKe.length > 0) {
        const pool = yaoKeMe.length > 0 ? yaoKeMe : woYaoKe;
        const pick = pool.length > 1
          ? (pool.find((k) => (idx(k.upper) % 2 === 0) === isYangGan(dayGan)) || pool[0])
          : pool[0];
        trio = chuan(pick.upper);
        keTiName = yaoKeMe.length > 0 ? '遥克·蒿矢' : '遥克·弹射';
        keTiNote = yaoKeMe.length > 0
          ? '四课无近克，只有上神远远克着日干——压力来自远处，看得见摸不着，宜早做准备。'
          : '四课无近克，是日干远远克着上神——你想掌控的对象隔着一层，急不得，得迂回。';
      } else if (isYangGan(dayGan)) {
        trio = chuan(tianUp('酉'));
        keTiName = '昴星·虎视';
        keTiNote = '四课无克也无遥克，取酉上神为用——事情悬着，主动出手反而易失，静观其变更稳。';
      } else {
        trio = chuan(tianDown('酉'));
        keTiName = '昴星·冬蛇掩目';
        keTiNote = '四课无克也无遥克，取天盘酉下神为用——对方不动，你在暗处等，等一个信号再动。';
      }
    }
  }

  const sanChuan: SanChuanItem[] = trio.map((zhi, i) => {
    const stage = (['初传', '中传', '末传'] as const)[i];
    const liuQin = liuQinOf(dayGan, zhi);
    return {
      stage,
      zhi,
      dunGan: dunGanOf(zhi),
      liuQin,
      tianJiang: jiangOfTian[zhi] || '',
      kong: kongZhi.includes(zhi),
      yiMa: zhi === yiMaZhi,
      tag: `${liuQin}（${LIU_QIN_PLAIN[liuQin]?.split('、')[0] || ''}）`,
    };
  });

  // ---- 十二宫盘 ----
  const positions: PanPosition[] = DZ_ORDER.map((di) => ({
    di,
    tian: tianPan[di],
    jiang: jiangOfTian[tianPan[di]] || '',
    isGuiRen: tianPan[di] === guiRenZhi,
    isHour: di === hourZhi,
  }));

  const chuanText = sanChuan.map((s) => s.zhi).join('→');
  const headline = `${keTiName}课，三传${chuanText}；月将${JIANG_NAME[jiangZhi] || ''}（${jiangZhi}）加${hourZhi}时，${dayNight}占，贵人临${guiRenOnDi}${forward ? '顺' : '逆'}布。`;

  return {
    mode: opts.mode || 'time',
    dateInfo: {
      yearGz: lunar.getYearInGanZhi(),
      monthGz: lunar.getMonthInGanZhi(),
      dayGz,
      hourGz,
      dayGan,
      dayZhi,
      hourZhi,
      jiangZhi,
      jiangName: JIANG_NAME[jiangZhi] || '',
      zhongQi: mj.qi,
      dayNight,
      jieQi: lunar.getPrevJieQi(true)?.getName?.() || mj.qi,
      solarText: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    },
    keTi: { name: keTiName, note: keTiNote },
    siKe,
    sanChuan,
    tianDiPan: { positions, guiRenZhi, guiRenOnDi, forward },
    flags: { fuYin, fanYin, kongZhi, yiMaZhi, baZhuan, siKeBuQuan },
    headline,
  };
}

/** 涉害重数只差一点点时视为「复等」（同一深度算同分） */
function bound(a: number, b: number): boolean {
  return Math.abs(a - b) < 10;
}

/** 随机起课：不按时间，随机取月将与占时（「心中有疑、随时起课」用） */
export function buildRandomKe(seedDate: Date = new Date()): KeResult {
  const jiang = DZ_ORDER[Math.floor(Math.random() * 12)];
  const hour = DZ_ORDER[Math.floor(Math.random() * 12)];
  return buildKe(seedDate, { jiangZhi: jiang, hourZhi: hour, mode: 'random' });
}
