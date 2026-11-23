import { describe, it, expect } from 'vitest';
import { buildPerson, type PersonChart } from '../personChart';
import { analyzeHePan, type HePanInput } from '../hepan';


/**
 * 合盘的结构不变量。
 *
 * `HePanResult` 的契约写着「分数对称（交换输入不变），文字视角随人走」。
 * 这句话如果没有人测，就只是一句注释——而 10 项 × 20 分的体系里，
 * 只要某一项把 mine/partner 写反，观感上完全正常（分数照样有高有低），
 * 只有交换输入才会露馅。所以这里专门盯着这一条。
 */

function toInput(p: PersonChart, name: string): HePanInput['mine'] {
  return {
    name,
    pillars: p.pillars,
    dayGan: p.dayGan,
    dayWx: p.dayWx,
    dayZhi: p.dayZhi,
    zodiac: p.zodiac,
    nayin: p.nayin,
    yongShen: p.yongShen,
    strengthLevel: p.strengthLevel,
    jiShen: p.jiShen,
    shenSha: p.shenSha,
    ziwei: p.ziwei,
  };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randomPerson(rand: () => number, gender: string): PersonChart {
  const y = 1950 + Math.floor(rand() * 60);
  const m = 1 + Math.floor(rand() * 12);
  const d = 1 + Math.floor(rand() * 28);
  const h = Math.floor(rand() * 24);
  return buildPerson(y, m, d, h, 0, gender);
}

describe('合盘：分数对称性', () => {
  it('交换双方总分不变', () => {
    const rand = rng(424242);
    const bad: string[] = [];
    for (let i = 0; i < 40; i++) {
      const a = randomPerson(rand, 'male');
      const b = randomPerson(rand, 'female');
      const ab = analyzeHePan({ mine: toInput(a, '甲'), partner: toInput(b, '乙') as HePanInput['partner'] });
      const ba = analyzeHePan({ mine: toInput(b, '乙'), partner: toInput(a, '甲') as HePanInput['partner'] });
      if (ab.totalScore !== ba.totalScore) {
        bad.push(`${a.birthInfo}/${b.birthInfo}：A→B=${ab.totalScore}  B→A=${ba.totalScore}`);
      }
    }
    expect(bad, `总分不对称（某几项可能把 mine/partner 写反）：\n${bad.slice(0, 8).join('\n')}`).toEqual([]);
  });

  it('交换双方逐项分数不变', () => {
    const rand = rng(7777);
    const bad: string[] = [];
    for (let i = 0; i < 25; i++) {
      const a = randomPerson(rand, 'male');
      const b = randomPerson(rand, 'female');
      const ab = analyzeHePan({ mine: toInput(a, '甲'), partner: toInput(b, '乙') as HePanInput['partner'] });
      const ba = analyzeHePan({ mine: toInput(b, '乙'), partner: toInput(a, '甲') as HePanInput['partner'] });
      for (let k = 0; k < ab.items.length; k++) {
        const x = ab.items[k];
        // 按标题对齐（顺序可能不同，不假定同序）
        const y = ba.items.find((it) => it.title === x.title);
        if (!y) { bad.push(`${a.birthInfo}/${b.birthInfo}：反向结果缺少项「${x.title}」`); continue; }
        if (x.score !== y.score) {
          bad.push(`${a.birthInfo}/${b.birthInfo} 项「${x.title}」：${x.score} vs ${y.score}`);
        }
      }
    }
    expect(bad, `逐项不对称：\n${bad.slice(0, 8).join('\n')}`).toEqual([]);
  });

  it('总分落在 0–200，且等于逐项之和', () => {
    const rand = rng(2026);
    for (let i = 0; i < 30; i++) {
      const a = randomPerson(rand, 'male');
      const b = randomPerson(rand, 'female');
      const r = analyzeHePan({ mine: toInput(a, '甲'), partner: toInput(b, '乙') as HePanInput['partner'] });
      expect(r.totalScore).toBeGreaterThanOrEqual(0);
      expect(r.totalScore).toBeLessThanOrEqual(200);
      const sum = r.items.reduce((s, it) => s + it.score, 0);
      // 10 项 × 20 分 = 满分 200，总分即各项之和（神煞共振走 SHENSHA_HEPAN_SCALE，已在项内归一）
      expect(r.totalScore, `总分与逐项之和不等（${r.totalScore} vs ${sum}）`).toBe(sum);
    }
  });

  it('档位与总分单调对应（不会出现低分高档、高分低档）', () => {
    const rand = rng(99001);
    const seen: { score: number; level: string }[] = [];
    for (let i = 0; i < 60; i++) {
      const a = randomPerson(rand, 'male');
      const b = randomPerson(rand, 'female');
      const r = analyzeHePan({ mine: toInput(a, '甲'), partner: toInput(b, '乙') as HePanInput['partner'] });
      seen.push({ score: r.totalScore, level: r.level });
    }
    // 同一档位内分数的上下界必须不交叠：取每档 min/max，按分数排序后档位应单调
    const byLevel = new Map<string, { min: number; max: number }>();
    for (const s of seen) {
      const cur = byLevel.get(s.level) || { min: Infinity, max: -Infinity };
      byLevel.set(s.level, { min: Math.min(cur.min, s.score), max: Math.max(cur.max, s.score) });
    }
    const levels = [...byLevel.entries()].sort((x, y) => x[1].min - y[1].min);
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i][1].min,
        `档位「${levels[i - 1][0]}」(≤${levels[i - 1][1].max}) 与「${levels[i][0]}」(≥${levels[i][1].min}) 分数区间交叠`,
      ).toBeGreaterThan(levels[i - 1][1].max);
    }
  });
});
