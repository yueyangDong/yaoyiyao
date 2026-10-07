// ========== 白话结论生成器 ==========
// 原则：结论先行、口语化、保留专业术语供 renderWithTerms 二次高亮
//
// ⚠️ 「一句话看懂你的八字」的生成纪律（2026-10-07 重修）：
//   旧版入参只有 dayGan/dayWx/level/用神/五行多寡/dayunFirst，输出与**四柱无关**——
//   年月时三柱一个字都没进句子；且 dayunFirst 取的是「起运后第一步大运」，
//   文案却写「下一步大运是 X」，给 40 岁的人报他 3 岁走的运（实测 4 盘全中）；
//   流年字段干脆不存在。
//   现口径：四柱干支 → 日主与旺衰 → 当前大运（干支+年龄段+十神关系+是否落用神）→
//   今年流年（与日主生克）→ 用神落地建议。
//   不变量：四柱/当前大运/流年任一变化，输出文本必须随之变化（见 plainConclusion.test.ts）。

import { resolveRelation, type RelationKind } from './dayunReading';

// 天干 → 五行、地支 → 五行。项目内多处各有一份同值局部表（baziAnalysis / hepan /
// wuxingFlow / mingGe / liuyueReading 等），此处为保持本模块零外部依赖各自声明。
const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

export interface BaziConclusionInput {
  /** 四柱干支，顺序为年、月、日、时（如 ['乙丑','己卯','庚戌','庚辰']） */
  pillars: string[];
  dayGan: string;
  dayWx: string;
  /** 日支（用于"日主坐X"） */
  dayZhi: string;
  /** 日支藏干十神，可能为复合串（如 '偏印/劫财/正官'），空串则不显示 */
  dayShiShenZhi: string;
  /** 时柱是否为推定值（不知时辰按午时排盘）——必须在文案里交代，不可当既定事实 */
  hourUnknown?: boolean;
  level: string;          // '身强' | '身弱' | '中和' | '身极强' | '身极弱'
  yongShen: string[];     // 用神五行列表
  xiShen: string[];       // 喜神五行列表
  wxStrongest: string;    // 命局最强五行
  wxWeakest: string;      // 命局最弱五行
  /** 当前所处大运（未起运传 null） */
  currentDaYun: { ganZhi: string; startAge: number; endAge: number } | null;
  /** 今年流年（与 utils/liunianReading 的 LiuNianItem 同构） */
  liuNian: { year: number; ganZhi: string; wx: string; desc: string } | null;
}

/**
 * 旺衰档 → 性格速写。⚠️ 五条长度直接影响句子总长（本卡有 240 字上限，见
 * plainConclusion.test.ts 的长度回归），改文案时必须同跑那条断言。
 */
const STRENGTH_TRAIT: Record<string, string> = {
  '身极强': '能量极旺，是天生的领导者，但容易听不进意见',
  '身强': '底子厚、扛得住事，性格自信有主见',
  '中和': '五行平衡，性格稳当，遇事不慌',
  '身弱': '心思细腻、依赖环境，适合借力而行',
  '身极弱': '能量偏弱，更依赖贵人帮扶，切勿硬扛',
};

/** 大运天干对日主的十神关系 → 这十年的行为重心（一句可落地的动作，长度计入 240 字上限） */
const YUN_RELATION_ACTION: Record<RelationKind, string> = {
  bijie: '同辈是你的杠杆：结伴做事效率最高，但先谈清规矩',
  yin: '贵人与平台会托底，力气使在打地基和跟对人上',
  shishang: '才华最容易变现，把想法做成作品',
  guansha: '责任与外部要求变重：扛过去就上一个段位',
  cai: '资源与进账是主线，重点在会管而非多赚',
};

export function generateBaziPlainConclusion(input: BaziConclusionInput): string {
  const {
    pillars, dayGan, dayWx, dayZhi, dayShiShenZhi, hourUnknown,
    level, yongShen, xiShen, wxStrongest, wxWeakest,
    currentDaYun, liuNian,
  } = input;

  const trait = STRENGTH_TRAIT[level] || STRENGTH_TRAIT['中和'];
  const yongAll = [...yongShen, ...xiShen].filter(Boolean);
  const yongText = yongAll.join('、') || '五行平衡';

  // ① 四柱 + 日主 + 旺衰（时柱为推定值时明确标注）
  const siZhu = pillars.filter(Boolean).join(' ');
  const zuoText = dayZhi
    ? `坐${dayZhi}${DZ_WX[dayZhi] || ''}${dayShiShenZhi ? `（自坐${dayShiShenZhi}）` : ''}`
    : '';
  const part1 =
    `你的四柱是「${siZhu}」${hourUnknown ? '（时柱按午时推定）' : ''}，` +
    `日主${dayGan}${dayWx}${zuoText}，八字属「${level}」——${trait}。`;

  // ② 五行多寡 + 用神落地（长度计入 240 字上限，勿随意加词）
  const part2 =
    `命局${wxStrongest}最旺、${wxWeakest}最弱，用神取「${yongText}」——` +
    `颜色、方位、行业多往${yongText}靠。`;

  // ③ 当前大运（替换旧版误报的「第一步大运」）
  let part3: string;
  if (currentDaYun) {
    const gan = currentDaYun.ganZhi.charAt(0);
    const ganWx = TG_WX[gan] || '';
    const relation = resolveRelation(dayGan, gan);
    const onYong = !!ganWx && yongAll.includes(ganWx);
    const action = relation ? YUN_RELATION_ACTION[relation] : '';
    const tianShi = onYong
      ? '正落在用神上，这十年宜主动出手'
      : `不在用神（${yongText}）内，这十年宜守成积累`;
    part3 =
      `你正走「${currentDaYun.ganZhi}」大运（${currentDaYun.startAge}~${currentDaYun.endAge}岁）：` +
      `${gan}属${ganWx}，${tianShi}${action ? `——${action}` : ''}。`;
  } else {
    part3 = '你目前尚在起运之前，属于"上运前"的蓄力期——把身体和基本功养住，比急着抢跑更重要。';
  }

  // ④ 今年流年（与日主生克）
  const part4 = liuNian ? `今年走到「${liuNian.ganZhi}」：${liuNian.desc}` : '';

  return part1 + part2 + part3 + part4;
}

export function generateZiweiPlainConclusion(overall: string, highlight: string | null): string {
  const first = overall.split(/[。！!]/)[0] || overall;
  const hl = highlight ? `其中最亮眼的是：${highlight}。` : '';
  return `一句话总结你的命盘：${first}。${hl}记住，命盘是地图，路还是自己走。`;
}

export interface LiuyaoConclusion {
  verdict: '宜守' | '有变' | '大动';
  text: string;
}

export function generateLiuyaoPlainConclusion(
  guaName: string,
  dongYaoCount: number,
  hasZhiGua: boolean,
): LiuyaoConclusion {
  if (dongYaoCount === 0) {
    return {
      verdict: '宜守',
      text: `你起得「${guaName}」，卦象安静无动爻——事情短期内不会大变，现在不是冲动出手的时候，稳住现状、把手里的事做扎实就是最好的选择。`,
    };
  }
  if (dongYaoCount <= 2) {
    return {
      verdict: '有变',
      text: `你起得「${guaName}」，卦中有${dongYaoCount}个动爻${hasZhiGua ? '，且已变出新的卦象' : ''}——事情正在起变化，方向还不明朗，但转机已经在酝酿。近期多留意身边的新机会，顺势而为。`,
    };
  }
  return {
    verdict: '大动',
    text: `你起得「${guaName}」，卦中${dongYaoCount}个动爻齐动，是根本性的变化之象——这件事会迎来大转折，旧局面守不住了。与其抗拒变化，不如主动拥抱：把能控制的准备做好，剩下的交给时间。`,
  };
}

export function generateDailyPlainConclusion(
  jiShen: string[],
  xiongSha: string[],
  weatherDesc: string | null,
  temp: number | null,
): string {
  const parts: string[] = [];
  parts.push(`今天${weatherDesc ? `天气${weatherDesc}` : '天气平稳'}${temp !== null ? `（${temp}°C）` : ''}。`);
  if (jiShen.length > 0) parts.push(`宜：${jiShen.slice(0, 3).join('、')}。`);
  if (xiongSha.length > 0) parts.push(`忌：${xiongSha.slice(0, 3).join('、')}。`);
  parts.push('顺天应时，今天适合按黄历提示安排重要事情。');
  return parts.join('');
}
