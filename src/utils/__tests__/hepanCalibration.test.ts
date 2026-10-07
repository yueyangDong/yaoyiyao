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
//
// v5（2026-10-07）重标记录：同日改了三个分项口径（日主五行加喜忌修正、喜用互补改双向
// 四象限、地支合冲补跨盘三合三会），分布整体下移——p15 由 90 → 83、p55 由 101 → 100、
// mean 由 100.1 → 97.6（p90 恰好仍为 114）。档位随之由 114/101/90 改为 114/100/83。
//
// v5.1（同日）再重标：发现「地支合冲」的分项循环里拿**地支**去查**生肖键**的表
// （LIU_HE/SAN_HE/LIU_CHONG 的键是 '鼠'/'牛'…），一律 undefined —— 六合/三合/六冲
// 在该分项里**全部静默失效**，dzScore 退化成"常数 10 + 成局修正"，而 desc 照样写
// "无大合也无大冲"（400 对实测 99%+ 落在这句）。改用 DZ_ 前缀的表后分布抬回并有真实方差：
// mean 97.6 → 100.7、p15 83 → 85、p55 100 → 103、p90 114 → 118。档位 → **118/103/85**。
// 教训：这个 bug 测试全绿也发现不了——除非夹具刻意造一对六冲，且断言里检查 desc 措辞。

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

  it('总分分布：mean ≈ 101、p15 ≈ 85、p55 ≈ 103、p90 ≈ 118（档位锚点，v5.1 重标）', () => {
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    expect(mean).toBeGreaterThan(95);
    expect(mean).toBeLessThan(110);
    expect(quantile(totals, 0.15)).toBeGreaterThan(80);
    expect(quantile(totals, 0.15)).toBeLessThan(94);
    expect(quantile(totals, 0.55)).toBeGreaterThan(96);
    expect(quantile(totals, 0.55)).toBeLessThan(110);
    expect(quantile(totals, 0.9)).toBeGreaterThan(110);
    expect(quantile(totals, 0.9)).toBeLessThan(126);
  });

  it('档位占比落在合理区间：最高档稀有、最低档可达（这是 v4 修的既有缺陷）', () => {
    // 旧口径实测 天作之合 38.7% / 需磨合 0%，两个档位都失去意义
    // v5.1 阈值 118/103/85 实测占比 11.5% / 34.8% / 40.3% / 13.5%
    const tian = shares((t) => t >= 118);
    const liang = shares((t) => t >= 103 && t < 118);
    const ping = shares((t) => t >= 85 && t < 103);
    const mo = shares((t) => t < 85);
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

  it('v5 三项改动确实拉开了分布（不得被基准分压平）', () => {
    const pick = (title: string) =>
      results.map((r) => r.items.find((i) => i.title === title)!.score).sort((a, b) => a - b);
    const ys = pick('喜用互补');
    const dz = pick('地支合冲');
    // 「互为忌神」必须可达（v5 新增的最低档）——若被基准分托住就说明忌神判定没生效
    expect(ys[0]).toBeLessThanOrEqual(6);
    // 高端也要够得着：互为喜用仍应能拿满
    expect(ys[ys.length - 1]).toBe(20);
    // 地支成局（共同用神）要能把合冲分推高
    expect(dz[dz.length - 1]).toBeGreaterThanOrEqual(18);
    expect(dz[0]).toBeLessThanOrEqual(4);
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
