// ========== 合盘满分与档位的分布回归 ==========
//
// 为什么单独一个文件：hepan.test.ts 用手工构造盘测「判定语义」（五行相生、生肖六合…），
// 快但**不符合真实分布**。而档位阈值必须由真实分布标定 —— 所以这里用 400 对真实合盘
// （buildPerson 真实排盘，含紫微）把满分 160 制下的分布与档位占比钉住。
//
// ⚠️ 区间断言，不是精确值：lunar-typescript / 紫微 vendor 都在 `^` 版本下，
//    CI 装到新小版本会让分布微移，精确断言会假红。区间要"窄到能拦住阈值写反、
//    宽到能容忍小版本漂移"。
//
// ⚠️ 改权重/项数/档位阈值后，这个文件必红 —— 那不是 bug，是提醒你重新标定。

import { describe, it, expect } from 'vitest';
import { buildPerson } from '../personChart';
import { analyzeHePan, HEPAN_MAX_SCORE } from '../hepan';
import { makeRng, quantile } from './fixtures/realCharts';

const PAIRS = 400;

function buildPairs() {
  const rnd = makeRng(20261006);
  const people = Array.from({ length: PAIRS * 2 }, () => {
    const y = 1935 + Math.floor(rnd() * 71);
    const m = 1 + Math.floor(rnd() * 12);
    const d = 1 + Math.floor(rnd() * 28);
    const h = Math.floor(rnd() * 24);
    const g = rnd() < 0.5 ? 'male' : 'female';
    return buildPerson(y, m, d, h, 30, g, 0, 'solar', false);
  });
  const results = [];
  for (let i = 0; i < people.length - 1; i += 2) {
    results.push(analyzeHePan({ mine: people[i], partner: people[i + 1] } as any));
  }
  return results;
}

const results = buildPairs();
const totals = results.map((r) => r.totalScore).sort((a, b) => a - b);
const shares = (f: (t: number) => boolean) => totals.filter(f).length / totals.length;

describe('合盘分布回归（400 对真实命盘，seed 20261006）', () => {
  it('满分口径：8 项 × 20 = 160，每项 0~20', () => {
    expect(HEPAN_MAX_SCORE).toBe(160);
    for (const r of results) {
      expect(r.items).toHaveLength(8);
      for (const it of r.items) {
        expect(it.score).toBeGreaterThanOrEqual(0);
        expect(it.score).toBeLessThanOrEqual(20);
      }
      expect(r.totalScore).toBeLessThanOrEqual(HEPAN_MAX_SCORE);
      expect(r.totalScore).toBe(r.items.reduce((s, i) => s + i.score, 0));
    }
  });

  it('总分分布：mean ≈ 100、p15 ≈ 90、p55 ≈ 101、p90 ≈ 114（档位锚点）', () => {
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    expect(mean).toBeGreaterThan(92);
    expect(mean).toBeLessThan(108);
    expect(quantile(totals, 0.15)).toBeGreaterThan(84);
    expect(quantile(totals, 0.15)).toBeLessThan(96);
    expect(quantile(totals, 0.55)).toBeGreaterThan(95);
    expect(quantile(totals, 0.55)).toBeLessThan(107);
    expect(quantile(totals, 0.9)).toBeGreaterThan(108);
    expect(quantile(totals, 0.9)).toBeLessThan(120);
  });

  it('档位占比落在合理区间：最高档稀有、最低档可达（这是 v4 修的既有缺陷）', () => {
    // 旧口径实测 天作之合 38.7% / 需磨合 0%，两个档位都失去意义
    const tian = shares((t) => t >= 114);
    const liang = shares((t) => t >= 101 && t < 114);
    const ping = shares((t) => t >= 90 && t < 101);
    const mo = shares((t) => t < 90);
    expect(tian).toBeGreaterThan(0.03);
    expect(tian).toBeLessThan(0.2);      // 最高档必须稀有
    expect(liang).toBeGreaterThan(0.25);
    expect(liang).toBeLessThan(0.5);
    expect(ping).toBeGreaterThan(0.25);
    expect(ping).toBeLessThan(0.5);
    expect(mo).toBeGreaterThan(0.05);    // 最低档必须可达（旧口径是 0%）
    expect(mo).toBeLessThan(0.3);
    // 四档占比之和为 1（无空洞）
    expect(tian + liang + ping + mo).toBeCloseTo(1, 6);
  });

  it('神煞共振项：中位数是 10 分（沿用"中位即中性分"约定），分布不压平', () => {
    const shaScores = results.map((r) => r.items.find((i) => i.title === '神煞共振')!.score).sort((a, b) => a - b);
    const mean = shaScores.reduce((a, b) => a + b, 0) / shaScores.length;
    expect(mean).toBeGreaterThan(8.5);
    expect(mean).toBeLessThan(12);
    expect(quantile(shaScores, 0.5)).toBeGreaterThanOrEqual(9);
    expect(quantile(shaScores, 0.5)).toBeLessThanOrEqual(11);
    // 高端不能被封顶压平：要有 17~20 分的样本，也要有 ≤5 分的样本
    expect(shaScores[shaScores.length - 1]).toBeGreaterThanOrEqual(18);
    expect(shaScores[0]).toBeLessThanOrEqual(5);
  });

  it('每一项的 desc 都非空（页面会渲染成空白的就是 bug）', () => {
    for (const r of results.slice(0, 40)) {
      for (const it of r.items) {
        expect(it.desc.trim().length).toBeGreaterThan(8);
      }
    }
  });
});
