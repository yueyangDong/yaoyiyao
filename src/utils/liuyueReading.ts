// ========== 流月推算：月令与日主关系 + 月令与当前大运的生克 ==========
//
// 解决的问题：旧版流月话术是纯静态模板池（同关系 5 条轮转），只看月令对日主，
// 完全忽略"当前正行哪步大运"——同一个月在不同大运里，顺逆完全不同。
//
// 本轮升级：基底话术不变（月令 vs 日主五类关系，防雷同仍用多条轮换），
// 叠加「大运地支五行 vs 月令天干五行」的生克后缀——
// 因运而异，同一句话不再适用于任何时刻。
//
// 口径说明：月干支取节气月柱（与页面旧实现一致）；大运五行取**地支**（传统以支为重）；
// 当前 12 个月若跨大运边界，一律按"当前大运"近似——边界月误差可接受，不做动态换运。

import { Solar } from 'lunar-typescript';
import { SHENG, KE } from './wuxingFlow';

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 月令 vs 日主：五类关系的基础话术池（防雷同轮换，按月份索引选取） */
export const LIUYUE_TEMPLATES: Record<string, string[]> = {
  same: [
    '比和之月，运势平稳',
    '同气之月，宜稳扎稳打',
    '比肩当令，适合与同伴协作，共担共进',
    '同频之月，能量守恒，宜巩固既有阵地',
    '气场合拍，本月不用太费力也能稳步推进',
  ],
  yin: [
    '印星之月，利学业贵人',
    '印绶当令，宜进修充电、亲近长辈',
    '印星照临，学习效率高，易得提携',
    '印气护体，本月精神状态好，适合啃硬骨头',
    '贵人暗中相助，多问多得，少说多做更佳',
  ],
  shishang: [
    '食伤之月，利创意发挥',
    '才华之月，表达欲强，作品易被看见',
    '食伤吐秀，灵感涌现，适合输出',
    '表达欲爆棚，多写、多画、多讲，回报率高于埋头执行',
    '思维活跃期，是解决疑难问题的好月份',
  ],
  guansha: [
    '官杀之月，有压力挑战',
    '官杀当值，责任加身，宜迎难而上',
    '压力之月，扛过去就是成长',
    '外部期待变高，主动揽责反而是机会',
    '本月规则大于灵活，按部就班比临场发挥更稳',
  ],
  cai: [
    '财运之月，利求财',
    '财星当令，宜开源、谈合作',
    '财星照临，进账机会增多，注意理财',
    '现金流佳，适合结算、回款、谈价格',
    '本月贵在"主动出击"，而不是"等米下锅"',
  ],
};

/** 大运（支）vs 月令（干）五类生克关系的后缀话术——因运而异的核心 */
export const YUN_YUE_SUFFIX: Record<string, string> = {
  yunShengYue: '大运生助月令，本月之事有底托，放手去做',
  yueShengYun: '月令反哺大运，本月的付出会沉淀为这步大运的底子',
  yueKeYun: '月令与大运相左，计划易反复，守成优于进取',
  yunKeYue: '大运压过月令，本月发力难显，宜蓄势不宜强攻',
  tongqi: '与大运同气相求，能量叠加，顺势而为收获加倍',
};

export interface LiuYueItem {
  monthName: string;
  ganZhi: string;
  wx: string;
  desc: string;
}

/**
 * 当前月起未来 12 个自然月的逐月运势。
 * @param dayWx 日主五行
 * @param dayunGanZhi 当前大运干支（可选）——传入则叠加大运与月令的生克后缀
 */
export function buildLiuYueList(opts: { now?: Date; dayWx: string; dayunGanZhi?: string }): LiuYueItem[] {
  const { dayWx, dayunGanZhi } = opts;
  const now = opts.now || new Date();
  // 日主 vs 月令：wxSheng[x] = 生 x 之行
  const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
  const dayunZhiWx = dayunGanZhi ? DZ_WX[dayunGanZhi[1]] || '' : '';

  const result: LiuYueItem[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    let gz = '';
    try {
      // 关键点：先把公历 → 农历，再取节气月柱（getMonthInGanZhi 内部按节气和年上起月计算）
      const sol = Solar.fromYmdHms(y, m, 15, 12, 0, 0);
      const lu = sol.getLunar();
      gz = lu.getMonthInGanZhi();
    } catch {
      gz = '--';
    }
    const gan = gz.charAt(0);
    const wx = TG_WX[gan] || '';
    let base = '';
    if (dayWx === wx) base = LIUYUE_TEMPLATES.same[i % LIUYUE_TEMPLATES.same.length];
    else if (wxSheng[dayWx] === wx) base = LIUYUE_TEMPLATES.yin[i % LIUYUE_TEMPLATES.yin.length];
    else if (wxSheng[wx] === dayWx) base = LIUYUE_TEMPLATES.shishang[i % LIUYUE_TEMPLATES.shishang.length];
    else if (wxKe[dayWx] === wx) base = LIUYUE_TEMPLATES.guansha[i % LIUYUE_TEMPLATES.guansha.length];
    else if (wxKe[wx] === dayWx) base = LIUYUE_TEMPLATES.cai[i % LIUYUE_TEMPLATES.cai.length];

    // 大运 vs 月令后缀
    let suffix = '';
    if (dayunZhiWx && wx) {
      if (dayunZhiWx === wx) suffix = YUN_YUE_SUFFIX.tongqi;
      else if (SHENG[dayunZhiWx] === wx) suffix = YUN_YUE_SUFFIX.yunShengYue;
      else if (SHENG[wx] === dayunZhiWx) suffix = YUN_YUE_SUFFIX.yueShengYun;
      else if (KE[wx] === dayunZhiWx) suffix = YUN_YUE_SUFFIX.yueKeYun;
      else if (KE[dayunZhiWx] === wx) suffix = YUN_YUE_SUFFIX.yunKeYue;
    }
    result.push({ monthName: `${y}年${m}月`, ganZhi: gz, wx, desc: suffix ? `${base}；${suffix}` : base });
  }
  return result;
}
