// ========== 流月 / 流日推算：月令与日主关系 + 月令与当前大运的生克 + 干支 × 命局互动 ==========
//
// 解决的问题：旧版流月话术是纯静态模板池（同关系 5 条轮转），只看月令对日主，
// 完全忽略"当前正行哪步大运"——同一个月在不同大运里，顺逆完全不同。
//
// 本轮升级：基底话术不变（月令 vs 日主五类关系，防雷同仍用多条轮换），
// 叠加「大运地支五行 vs 月令天干五行」的生克后缀——
// 因运而异，同一句话不再适用于任何时刻。
//
// 【2026-10-13】再补一层地支：月柱/日柱干支送进 utils/liunianInteraction，产出该月/该日
// 与命局的冲/合/三合/三会/刑/害（此前只有天干层）。例如"某月冲你的日支"，是流月里
// 最有操作性的一条；流日同理。输出放在独立的 interaction 字段，**不改动原有 desc**
// （desc 的模板与轮换是既有约定，有测试钉着）。
//
// 流日原先是 Bazi.tsx 的 handleLiuRi 内联实现（还自带一份 tgWx 五行表——五行表的又一副本），
// 现迁至本文件 buildLiuRiList：口径与流月统一、可 node 测试、五行表回到唯一出口。
//
// 口径说明：月干支取节气月柱、日干支取当日日柱（与页面旧实现一致）；大运五行取**地支**
// （传统以支为重）；当前 12 个月若跨大运边界，一律按"当前大运"近似——边界月误差可接受，
// 不做动态换运。

import { Solar } from 'lunar-typescript';
import { SHENG, KE } from './wuxingFlow';
import type { PillarData } from '../pages/Bazi';
import { analyzeGanZhiInteraction, type FlowInteraction } from './liunianInteraction';
// 干支五行表走 utils 唯一出口（本文件原先自留一份 TG_WX / DZ_WX）
import { GAN_WX as TG_WX } from './wuXingRelations';
import { DZ_WX } from './diZhiRelations';

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
  /**
   * 月柱 × 命局互动（冲/合/三合/三会/刑/害/伏吟/反吟 + 落柱领域 + 喜忌定向）。
   * 仅在调用方传入 pillars 与 dayGan 时产出。
   */
  interaction?: FlowInteraction;
}

export interface LiuYueOpts {
  now?: Date;
  dayWx: string;
  dayunGanZhi?: string;
  /** 命局四柱：传入后每月额外产出 interaction（缺省时行为与接入前完全一致） */
  pillars?: PillarData[];
  /** 日主天干：算十神与配偶宫所必需，与 pillars 一起传 */
  dayGan?: string;
  yongShen?: string[];
  strengthLevel?: string;
  gender?: string;
}

/**
 * 当前月起未来 12 个自然月的逐月运势。
 * @param opts.now 起点（缺省当天）
 * @param opts.dayWx 日主五行
 * @param opts.dayunGanZhi 当前大运干支（可选）——传入则叠加大运与月令的生克后缀
 * @param opts.pillars / opts.dayGan 命局（可选）——传入则每月附加地支互动
 */
export function buildLiuYueList(opts: LiuYueOpts): LiuYueItem[] {
  const { dayWx, dayunGanZhi, pillars, dayGan, yongShen, strengthLevel, gender } = opts;
  const now = opts.now || new Date();
  // 日主 vs 月令：wxSheng[x] = 生 x 之行
  const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
  const dayunZhiWx = dayunGanZhi ? DZ_WX[dayunGanZhi[1]] || '' : '';
  // 地支互动需要有命局；缺命局（如只做模板单测）时整条链路自动退化为旧行为
  const canInteract = !!(pillars && pillars.length >= 4 && dayGan);

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

    // 月柱 × 命局地支互动：把「本月冲你的日支」这类最有操作性的一条算出来。
    // ⚠️ 判据全在 utils/liunianInteraction（与大运/流年/合盘动态层同一份），本文件不另写。
    // 单独放 interaction 字段，不动 desc —— desc 的模板与轮换是既有约定，有测试钉着。
    const monthName = `${y}年${m}月`;
    const interaction = canInteract && gz.length >= 2
      ? analyzeGanZhiInteraction({
          pillars: pillars!,
          dayGan: dayGan!,
          dayWx,
          ganZhi: gz,
          label: monthName,
          era: 'month',
          yongShen,
          strengthLevel,
          gender,
        })
      : undefined;

    result.push({ monthName, ganZhi: gz, wx, desc: suffix ? `${base}；${suffix}` : base, interaction });
  }
  return result;
}

/** 流日单条：日干支 + 与日主的十神大类 + 与命局的地支互动 */
export interface LiuRiItem {
  day: number;
  ganZhi: string;
  wx: string;
  desc: string;
  weekend: boolean;
  /** 日柱 × 命局互动；仅在传入 pillars 与 dayGan 时产出 */
  interaction?: FlowInteraction;
}

export interface LiuRiOpts {
  year: number;
  month: number;
  dayWx: string;
  pillars?: PillarData[];
  dayGan?: string;
  yongShen?: string[];
  strengthLevel?: string;
  gender?: string;
}

/**
 * 某一公历月逐日的日干支与运势。
 * 从 Bazi.tsx 的 handleLiuRi 迁入——原先页面内联了一份 tgWx 五行表（五行表的第五份副本）
 * 且无法在 node 环境测试；现在与流月共用同一套口径，并补上地支互动。
 * @param opts.year 公历年
 * @param opts.month 公历月（1-12）
 */
export function buildLiuRiList(opts: LiuRiOpts): LiuRiItem[] {
  const { year, month, dayWx, pillars, dayGan, yongShen, strengthLevel, gender } = opts;
  const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
  const canInteract = !!(pillars && pillars.length >= 4 && dayGan);

  const daysInMonth = new Date(year, month, 0).getDate();
  const result: LiuRiItem[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const weekend = dow === 0 || dow === 6;
    try {
      const s = Solar.fromYmdHms(year, month, d, 12, 0, 0);
      const gz = s.getLunar().getEightChar().getDay();
      const wx = TG_WX[gz.charAt(0)] || '';
      let desc = '';
      if (dayWx === wx) desc = '比和';
      else if (wxSheng[dayWx] === wx) desc = '印生';
      else if (wxSheng[wx] === dayWx) desc = '食伤';
      else if (wxKe[dayWx] === wx) desc = '官杀';
      else if (wxKe[wx] === dayWx) desc = '财运';
      const label = `${year}年${month}月${d}日`;
      const interaction = canInteract && gz.length >= 2
        ? analyzeGanZhiInteraction({
            pillars: pillars!,
            dayGan: dayGan!,
            dayWx,
            ganZhi: gz,
            label,
            era: 'day',
            yongShen,
            strengthLevel,
            gender,
          })
        : undefined;
      result.push({ day: d, ganZhi: gz, wx, desc, weekend, interaction });
    } catch {
      result.push({ day: d, ganZhi: '--', wx: '', desc: '', weekend });
    }
  }
  return result;
}
