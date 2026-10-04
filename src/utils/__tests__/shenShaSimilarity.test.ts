// ========== 神煞力量模型 + 加权相似度：回归测试 ==========
//
// 这个文件钉两件事：
//   1. 【模型语义】power 的各因子是否真的生效（得地/宫位/空亡/制化/喜忌），
//      以及"共同神煞多但都弱"能不能被识别为假性重合。
//   2. 【分布量纲】3000 张真实命盘的 power / similarity 分布分位数，
//      以及新旧判据的判别力对比——改任何系数/阈值，这里必须跟着动。
//
// ⚠️ 容差原则：分布断言用**区间**而非精确值。lunar-typescript 在 package.json 里是
//    `^1.6.0`（caret），CI 装到 1.7.x 可能让具体命盘分布微移，精确断言会让 CI 假红。
//    区间取到足以覆盖小版本漂移、又窄到能拦住"系数写反"这类真错。
//
// ⚠️ 采样口径：1935–2005 × 随机月/日/时 × 固定 seed，与 2026-10-04 审计同一批口径。
//    不要退化成单样本验证——项目历史踩过"单日样本恰好命中主星，漏掉 16% 空宫盘"的坑。

import { describe, it, expect } from 'vitest';
import { sampleCharts, buildChart, quantile, type ChartFixture } from './fixtures/realCharts';
import {
  calcShenShaPower, buildShaFingerprint, changShengOf, branchRelationsOf,
  powerLevel, SHENSHA_POWER_BANDS, PALACE_WEIGHT,
} from '../shenShaPower';
import {
  fingerprintSimilarity, compareShenShaCharts, shaSimilarityLevel, SHENSHA_SIMILARITY_BANDS,
} from '../shenShaSimilarity';
import type { PillarData } from '../../pages/Bazi';

const P = (pillar: string, gz: string): PillarData => ({
  pillar, ganZhi: gz, tianGan: gz[0], diZhi: gz[1],
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});

// ============ 1. 模型语义（构造盘，精确断言） ============

describe('神煞力量模型：因子语义', () => {
  it('十二长生：甲日见寅为临官（得地最强档），见申为绝地（最弱档）', () => {
    expect(changShengOf('甲', '寅')).toBe('临官');
    expect(changShengOf('甲', '卯')).toBe('帝旺');
    expect(changShengOf('甲', '亥')).toBe('长生');
    expect(changShengOf('甲', '申')).toBe('绝');
    // 阴干逆行：乙长生在午，则在巳为沐浴
    expect(changShengOf('乙', '午')).toBe('长生');
    expect(changShengOf('乙', '巳')).toBe('沐浴');
  });

  it('得地越强，同煞同柱力量越高', () => {
    // 日干甲：日柱坐寅（临官）vs 日柱坐申（绝）
    const strong: ChartFixture = { pillars: [P('年柱', '甲子'), P('月柱', '甲子'), P('日柱', '甲寅'), P('时柱', '甲子')], shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }], strengthLevel: '中和', yongShen: [], gender: 'male' };
    const weak: ChartFixture = { pillars: [P('年柱', '甲子'), P('月柱', '甲子'), P('日柱', '甲申'), P('时柱', '甲子')], shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }], strengthLevel: '中和', yongShen: [], gender: 'male' };
    const a = calcShenShaPower(strong)[0];
    const b = calcShenShaPower(weak)[0];
    expect(a.factors.changSheng).toBe('临官');
    expect(b.factors.changSheng).toBe('绝');
    expect(a.power).toBeGreaterThan(b.power);
    // 宫位相同，差异只来自得地系数
    expect(a.factors.palace).toBe(b.factors.palace);
    expect(a.factors.deDi).toBe(1.0);
    expect(b.factors.deDi).toBe(0.3);
  });

  it('宫位权重：月支/日支 1.0，年支/时支 0.6', () => {
    const pillars = [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '戊寅'), P('时柱', '庚寅')];
    const items = calcShenShaPower({
      pillars,
      shenSha: [
        { name: 'X', pillar: '年柱', type: '平' },
        { name: 'X', pillar: '月柱', type: '平' },
        { name: 'X', pillar: '日柱', type: '平' },
        { name: 'X', pillar: '时柱', type: '平' },
      ],
    });
    expect(items[0].factors.palace).toBe(PALACE_WEIGHT.年柱);
    expect(items[1].factors.palace).toBe(PALACE_WEIGHT.月柱);
    expect(items[2].factors.palace).toBe(PALACE_WEIGHT.日柱);
    expect(items[3].factors.palace).toBe(PALACE_WEIGHT.时柱);
  });

  it('地支被冲 → 制化系数 0.4，力量低于无冲的对照盘', () => {
    // A: 日支寅无冲；B: 时支申冲日支寅
    const noChong: ChartFixture = { pillars: [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '甲寅'), P('时柱', '丁卯')], shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }], strengthLevel: '中和', yongShen: [], gender: 'male' };
    const chong: ChartFixture = { pillars: [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '甲寅'), P('时柱', '甲申')], shenSha: [{ name: '天乙贵人', pillar: '日柱', type: '吉' }], strengthLevel: '中和', yongShen: [], gender: 'male' };
    const a = calcShenShaPower(noChong)[0];
    const b = calcShenShaPower(chong)[0];
    expect(b.factors.relationType).toBe('冲');
    expect(b.factors.relation).toBe(0.4);
    expect(b.power).toBeLessThan(a.power);
  });

  it('地支被合 → 0.55；刑/害也各自降力，且取最强一档而非连乘', () => {
    const he = calcShenShaPower({
      pillars: [P('年柱', '甲子'), P('月柱', '丙辰'), P('日柱', '甲寅'), P('时柱', '己亥')],
      shenSha: [{ name: 'X', pillar: '日柱', type: '平' }],
    })[0];
    // 寅与亥六合
    expect(he.factors.relationType).toBe('合');
    expect(he.factors.relation).toBe(0.55);

    // 同柱同时被冲被合被刑时，只取最强制化（最小值），不倒连乘归零
    const multi = calcShenShaPower({
      pillars: [P('年柱', '甲申'), P('月柱', '丙戌'), P('日柱', '甲寅'), P('时柱', '甲子')],
      shenSha: [{ name: 'X', pillar: '日柱', type: '平' }],
    })[0];
    expect(multi.factors.relation).toBe(0.4);
    expect(branchRelationsOf([P('年柱', '甲申'), P('月柱', '丙戌'), P('日柱', '甲寅'), P('时柱', '甲子')], 2)).toContain('冲');
  });

  it('落空亡 → 0.35；但「空亡」这颗煞自身不受自指影响', () => {
    // 甲子日 → 旬空为戌亥
    const pillars = [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '甲子'), P('时柱', '乙亥')];
    const items = calcShenShaPower({
      pillars,
      shenSha: [{ name: '天乙贵人', pillar: '时柱', type: '吉' }, { name: '空亡', pillar: '时柱', type: '平' }],
    });
    expect(items[0].factors.kong).toBe(0.35);
    expect(items[1].factors.kong).toBe(1);
  });

  it('喜忌：吉煞落用神五行不减力，未落用神打折；凶煞反之', () => {
    // 日支寅（木）；用神含木 → 吉煞 1.0；用神不含木 → 0.7
    const base = { pillars: [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '甲寅'), P('时柱', '丁卯')] };
    const jiHit = calcShenShaPower({ ...base, shenSha: [{ name: 'X', pillar: '日柱', type: '吉' }], yongShen: ['木'] })[0];
    const jiMiss = calcShenShaPower({ ...base, shenSha: [{ name: 'X', pillar: '日柱', type: '吉' }], yongShen: ['金'] })[0];
    expect(jiHit.factors.xiJi).toBe(1.0);
    expect(jiMiss.factors.xiJi).toBe(0.7);
    expect(jiHit.power).toBeGreaterThan(jiMiss.power);

    const xiongHit = calcShenShaPower({ ...base, shenSha: [{ name: 'X', pillar: '日柱', type: '凶' }], yongShen: ['木'] })[0];
    const xiongMiss = calcShenShaPower({ ...base, shenSha: [{ name: 'X', pillar: '日柱', type: '凶' }], yongShen: ['金'] })[0];
    expect(xiongHit.factors.xiJi).toBe(0.85);
    expect(xiongMiss.factors.xiJi).toBe(1.0);
  });

  it('power 恒定落在 [0,1]，且档位划分与阈值一致', () => {
    const charts = sampleCharts(200, 777);
    for (const c of charts) {
      for (const it of calcShenShaPower(c)) {
        expect(it.power).toBeGreaterThanOrEqual(0);
        expect(it.power).toBeLessThanOrEqual(1);
        expect(it.level).toBe(powerLevel(it.power));
      }
    }
    expect(powerLevel(SHENSHA_POWER_BANDS.strong)).toBe('强');
    expect(powerLevel(SHENSHA_POWER_BANDS.medium)).toBe('中');
    expect(powerLevel(SHENSHA_POWER_BANDS.medium - 0.01)).toBe('弱');
  });
});

// ============ 2. 相似度：假性重合识别（构造指纹，精确断言） ============

describe('神煞相似度：指纹聚合与假性重合识别', () => {
  it('同名多柱取 max，不求和（避免同名出现两次被当成两倍相似）', () => {
    const pillars = [P('年柱', '甲子'), P('月柱', '丙寅'), P('日柱', '甲寅'), P('时柱', '甲申')];
    const fp = buildShaFingerprint({
      pillars,
      shenSha: [
        { name: '天乙贵人', pillar: '年柱', type: '吉' },
        { name: '天乙贵人', pillar: '日柱', type: '吉' },
      ],
      yongShen: [],
    });
    const items = calcShenShaPower({
      pillars,
      shenSha: [
        { name: '天乙贵人', pillar: '年柱', type: '吉' },
        { name: '天乙贵人', pillar: '日柱', type: '吉' },
      ],
      yongShen: [],
    });
    const maxPower = Math.max(...items.map((i) => i.power));
    expect(fp['天乙贵人']).toBe(maxPower);
    expect(fp['天乙贵人']).toBeLessThan(items.reduce((a, b) => a + b.power, 0));
  });

  it('核心修复：共同神煞 ≥3 但全是弱煞 → 旧判据说"高重合"，新口径判"低"', () => {
    // 这是旧口径失效的最小复现：三颗 0.1 的弱煞共享，两边各带两颗 0.9 的强煞且不重叠。
    const a = { 弱煞甲: 0.1, 弱煞乙: 0.1, 弱煞丙: 0.1, 强煞A: 0.9, 强煞B: 0.9 };
    const b = { 弱煞甲: 0.1, 弱煞乙: 0.1, 弱煞丙: 0.1, 强煞C: 0.9, 强煞D: 0.9 };
    const r = fingerprintSimilarity(a, b);
    expect(r.sharedCount).toBe(3);                      // 旧判据：共同 ≥3 → 会被判高重合
    expect(r.score).toBeLessThan(0.1);                  // 新口径：0.3 / 3.9 ≈ 0.077
    expect(r.level).toBe('低');
    expect(r.shared.map((s) => s.name)).toEqual(['弱煞甲', '弱煞乙', '弱煞丙']);
    expect(r.onlyA.sort()).toEqual(['强煞A', '强煞B']);
    expect(r.onlyB.sort()).toEqual(['强煞C', '强煞D']);
  });

  it('强煞共振才算高重合：共享两颗 0.8、各带一颗 0.2 → 0.8/1.2 ≈ 0.67', () => {
    const a = { 强煞A: 0.8, 独有1: 0.2 };
    const b = { 强煞A: 0.8, 独有2: 0.2 };
    const r = fingerprintSimilarity(a, b);
    expect(r.score).toBeCloseTo(0.8 / 1.2, 4);
    expect(r.level).toBe('高');
  });

  it('加权 Jaccard 的精确值与对称性', () => {
    expect(fingerprintSimilarity({ x: 1 }, { x: 1 }).score).toBe(1);
    expect(fingerprintSimilarity({ x: 1 }, { x: 0.5 }).score).toBe(0.5);
    expect(fingerprintSimilarity({ x: 1, y: 0.1 }, { x: 1 }).score).toBeCloseTo(1 / 1.1, 4);
    const a = { x: 0.7, y: 0.2, z: 0.5 };
    const b = { x: 0.3, y: 0.9, w: 0.4 };
    expect(fingerprintSimilarity(a, b).score).toBe(fingerprintSimilarity(b, a).score);
  });

  it('同一个命盘与自身相似度为 1，且档位阈值与判定函数一致', () => {
    const c = buildChart(1988, 6, 15, 9, 'female');
    const r = compareShenShaCharts(c, c);
    expect(r.score).toBe(1);
    expect(r.level).toBe('高');
    expect(r.onlyA).toHaveLength(0);
    expect(r.onlyB).toHaveLength(0);
    expect(shaSimilarityLevel(SHENSHA_SIMILARITY_BANDS.high)).toBe('高');
    expect(shaSimilarityLevel(SHENSHA_SIMILARITY_BANDS.medium)).toBe('中');
    expect(shaSimilarityLevel(SHENSHA_SIMILARITY_BANDS.medium - 0.01)).toBe('低');
  });
});

// ============ 3. 分布量纲（3000 张真实盘，区间断言） ============

describe('3000 张真实命盘：分布分位与新/旧判据判别力', () => {
  const charts = sampleCharts(3000);
  const fps = charts.map((c) => buildShaFingerprint(c));
  const powers: number[] = [];
  const counts: number[] = [];
  const uniqCounts: number[] = [];
  for (const c of charts) {
    const items = calcShenShaPower(c);
    counts.push(items.length);
    uniqCounts.push(new Set(items.map((i) => i.name)).size);
    items.forEach((i) => powers.push(i.power));
  }
  powers.sort((a, b) => a - b);
  counts.sort((a, b) => a - b);
  uniqCounts.sort((a, b) => a - b);

  const sims: number[] = [];
  const oldCounts: number[] = [];
  for (let i = 0; i < fps.length; i++) {
    for (let j = i + 1; j < Math.min(i + 25, fps.length); j++) {
      const r = fingerprintSimilarity(fps[i], fps[j]);
      sims.push(r.score);
      oldCounts.push(r.sharedCount);
    }
  }
  sims.sort((a, b) => a - b);
  const pairs = sims.length;

  it('每盘神煞：去重名字数均值约 14.9（审计口径），落点处数均值约 18.6', () => {
    const meanUniq = uniqCounts.reduce((a, b) => a + b, 0) / uniqCounts.length;
    const meanOcc = counts.reduce((a, b) => a + b, 0) / counts.length;
    // 去重名字数是 2026-10-04 审计里"每盘平均 14.93 颗神煞"的同一口径
    expect(meanUniq).toBeGreaterThan(12);
    expect(meanUniq).toBeLessThan(18);
    expect(quantile(uniqCounts, 0.5)).toBeGreaterThan(12);
    expect(quantile(uniqCounts, 0.5)).toBeLessThan(18);
    // 落点处数 = name × pillar，必然不少于去重名字数（同名可落多柱）
    expect(meanOcc).toBeGreaterThanOrEqual(meanUniq);
    expect(meanOcc).toBeGreaterThan(14);
    expect(meanOcc).toBeLessThan(23);
  });

  it('power 分布分位：p30 ≈ 0.20、p50 ≈ 0.28、p70 ≈ 0.40（阈值锚点）', () => {
    expect(quantile(powers, 0.3)).toBeGreaterThan(0.15);
    expect(quantile(powers, 0.3)).toBeLessThan(0.27);
    expect(quantile(powers, 0.5)).toBeGreaterThan(0.22);
    expect(quantile(powers, 0.5)).toBeLessThan(0.36);
    expect(quantile(powers, 0.7)).toBeGreaterThan(0.33);
    expect(quantile(powers, 0.7)).toBeLessThan(0.48);
    // 档位锚点必须落在实测分位附近，否则"强/中/弱"三档会失衡
    expect(SHENSHA_POWER_BANDS.strong).toBeCloseTo(quantile(powers, 0.7), 1);
    expect(SHENSHA_POWER_BANDS.medium).toBeCloseTo(quantile(powers, 0.3), 1);
  });

  it('相似度分布分位：p50 ≈ 0.16、p90 ≈ 0.26、p95 ≈ 0.30', () => {
    expect(quantile(sims, 0.5)).toBeGreaterThan(0.12);
    expect(quantile(sims, 0.5)).toBeLessThan(0.20);
    expect(quantile(sims, 0.9)).toBeGreaterThan(0.22);
    expect(quantile(sims, 0.9)).toBeLessThan(0.31);
    expect(quantile(sims, 0.95)).toBeGreaterThan(0.26);
    expect(quantile(sims, 0.95)).toBeLessThan(0.35);
  });

  it('判别力：新口径判高重合的比例必须远低于旧判据「共同神煞 ≥3」', () => {
    const oldRatio = oldCounts.filter((c) => c >= 3).length / pairs;
    const newRatio = sims.filter((s) => s >= SHENSHA_SIMILARITY_BANDS.high).length / pairs;
    const midRatio = sims.filter((s) => s >= SHENSHA_SIMILARITY_BANDS.medium).length / pairs;
    // 旧判据在这批盘上几乎给所有组合发"高重合"——这是被替换掉的直接原因
    expect(oldRatio).toBeGreaterThan(0.85);
    // 新口径：高重合 ≤10%，中档及以上 ≤35%
    expect(newRatio).toBeLessThan(0.1);
    expect(midRatio).toBeLessThan(0.35);
    // 判别力至少提升 10 倍
    expect(oldRatio / newRatio).toBeGreaterThan(10);
  });

  it('新口径判为高重合的盘对，确实由"共同神煞多"驱动（不是随机噪声）', () => {
    const globalMedian = quantile([...oldCounts].sort((a, b) => a - b), 0.5);
    const hiShared: number[] = [];
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < Math.min(i + 25, fps.length); j++) {
        const r = fingerprintSimilarity(fps[i], fps[j]);
        if (r.level === '高') hiShared.push(r.sharedCount);
      }
    }
    expect(hiShared.length).toBeGreaterThan(0);
    hiShared.sort((a, b) => a - b);
    expect(quantile(hiShared, 0.5)).toBeGreaterThan(globalMedian);
  });
});
