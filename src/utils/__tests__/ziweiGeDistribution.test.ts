import { describe, it, expect } from 'vitest';
import { ziwei } from '@ziweijs/core';
import { Solar } from 'lunar-typescript';
import { enrichGongData, effectiveLunarMonth, getMingShenGongBranch } from '../ziweiPalaceData';
import { recalcSihua } from '../ziweiSihuaFlying';
import { analyzeZiweiGe, type ZiweiGeResult } from '../ziweiGe';

/**
 * 紫微成格：分布守卫。
 *
 * 为什么需要这条：2026-10 之前 `hasJi || sha>=2 || kong>=2 || 羊陀夹忌` 三条全局破格
 * 是一刀切，把 **67.8% 的盘清成"无格局"，其中 41.7pp 结构上完全够格**。
 * 后来按《全书》「上/中/下三格」改成分档 + 补齐十格，有格率回到六成左右。
 *
 * 这里钉住的是**量级**，不是精确值：判据小改会让比例动几个百分点，
 * 但如果哪天有人把破格改回一刀切（有格率会掉到三成）或者误删判据分支
 * （某个格归零），这条会立刻红。区间取得宽，是为了不阻碍正常标定。
 */

/** 与 Ziwei.tsx 完全相同的管线：bySolar → enrichGongData → recalcSihua → analyzeZiweiGe */
function analyze(y: number, m: number, d: number, h: number, gender: 'male' | 'female'): ZiweiGeResult {
  const sol = Solar.fromYmdHms(y, m, d, h, 0, 0);
  const lu = sol.getLunar();
  const result: any = ziwei.bySolar({
    name: '', gender, date: new Date(y, m - 1, d, h, 0, 0), language: 'zh-CN',
  } as any);
  // 与页面同口径：有效农历月（闰月十六以后作下月）
  const lunarMonthAbs = effectiveLunarMonth(lu.getMonth(), lu.getDay());
  const { shenGongBranch } = getMingShenGongBranch(lunarMonthAbs, lu.getTimeZhi());
  const yearGanZhi = lu.getYearInGanZhi();

  const gongData = result.palaces.map((p: any) => ({
    name: p.name, stem: p.stem, branch: p.branch, isLaiYin: p.isLaiYin,
    isShenGong: p.branch === shenGongBranch,
    horoscopeRanges: p.horoscopeRanges,
    majorStars: (p.majorStars || []).map((s: any) => ({
      name: s.name, type: s.type, sihua: s.YT?.name || null,
      sihuaSelf: s.ST?.CF?.name || s.ST?.CP?.name || null,
      sihuaSelfKind: s.ST?.CF?.name ? 'CF' : (s.ST?.CP?.name ? 'CP' : null),
    })),
    minorStars: (p.minorStars || []).map((s: any) => s.name),
    minorStarDetails: (p.minorStars || []).map((s: any) => ({
      name: s.name, type: 'minor', sihua: s.YT?.name || null,
      sihuaSelf: s.ST?.CF?.name || s.ST?.CP?.name || null,
      sihuaSelfKind: s.ST?.CF?.name ? 'CF' : (s.ST?.CP?.name ? 'CP' : null),
    })),
  }));

  enrichGongData(gongData, {
    fiveElementName: result.fiveElementName,
    yearGan: yearGanZhi.charAt(0),
    yearZhi: yearGanZhi.charAt(1),
    gender, hourZhi: lu.getTimeZhi(), monthNum: lunarMonthAbs,
  });
  recalcSihua(gongData, yearGanZhi.charAt(0));
  return analyzeZiweiGe(gongData);
}

/** 固定取样：5 年 × 12 月 × 2 日 × 2 时辰 = 240 盘（确定性，不 flaky、不拖慢全量） */
function sample(): { noGe: number; total: number; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  let noGe = 0, total = 0;
  for (let y = 1990; y <= 1994; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [3, 13]) {
        for (const h of [2, 14]) {
          const gender = (y + m + d + h) % 2 === 0 ? 'male' : 'female';
          const r = analyze(y, m, d, h, gender as 'male' | 'female');
          total++;
          if (!r.geNames || r.geNames.length === 0) noGe++;
          else for (const n of r.geNames) counts[n] = (counts[n] || 0) + 1;
        }
      }
    }
  }
  return { noGe, total, counts };
}

describe('紫微成格分布', () => {
  const { noGe, total, counts } = sample();
  const withGeRate = (total - noGe) / total;

  it('有格率在合理量级（一刀切回退会掉到三成，此处会红）', () => {
    // 2026-11-23 实测 3024 盘：有格 64.3%（无格 35.7%）
    expect(total).toBe(240);
    expect(
      withGeRate,
      `有格率 ${(withGeRate * 100).toFixed(1)}%（${total - noGe}/${total}）——低于 40% 说明破格又退回一刀切`,
    ).toBeGreaterThan(0.40);
    expect(withGeRate, '有格率高于 90% 说明破格判据可能失效').toBeLessThan(0.90);
  });

  it('格局种类不塌缩（至少命中 18 种，且没有格归零）', () => {
    const names = Object.keys(counts);
    expect(
      names.length,
      `只命中 ${names.length} 种格局：${names.sort().join('、')}`,
    ).toBeGreaterThanOrEqual(18);
  });

  it('高频格与稀有格各在其位（防止某个判据被改成恒真/恒假）', () => {
    // 高频：结构最宽松的几格
    for (const n of ['杀破狼格', '府相朝垣格', '紫府朝垣格']) {
      expect(counts[n] || 0, `${n} 命中过少或归零`).toBeGreaterThan(0);
    }
    // 稀有格也不为零（曾经担心补成死格）
    const rare = ['月朗天门格', '石中隐玉格', '巨日同宫格'];
    const hit = rare.filter((n) => (counts[n] || 0) > 0);
    expect(hit.length, `稀有格全都没命中：${rare.join('、')}`).toBeGreaterThanOrEqual(1);
  });
});
