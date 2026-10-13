// ========== 合盘满分与档位的分布回归 ==========
//
// 为什么单独一个文件：hepan.test.ts 用手工构造盘测「判定语义」（五行相生、生肖六合…），
// 快但**不符合真实分布**。而档位阈值必须由真实分布标定 —— 所以这里用 400 对真实合盘
// （buildPerson 真实排盘，含紫微）把满分 200 制下的分布与档位占比钉住。
//
// ⚠️ 区间断言，不是精确值：lunar-typescript / 紫微 vendor 都在 `^` 版本下，
//    CI 装到新小版本会让分布微移，精确断言会假红。区间要"窄到能拦住阈值写反、
//    宽到能容忍小版本漂移"。
//
// ⚠️ 改权重/项数/档位阈值后，这个文件必红 —— 那不是 bug，是提醒你重新标定。
//
// v6.1（2026-10-13）重标记录：一轮里连着重标两次（v6 → v6.1），因为改了五处口径：
//   ① 新增「旺衰互动」（双强/双弱/一强一弱互比）② 新增「气候与用神」（季节同向 + 用神交集）
//   → 项数 8 → 10、满分 160 → 200；
//   ③ 忌神改用**完整口径**（PersonChart.jiShen = recommendYongShen 的 xiShen：特殊格局 ∪ 扶抑
//      ∪ 破用变忌，减去用神）——实测 800 张真实盘 28.4% 的忌神表发生变化，
//      且「同一五行既是用神又是忌神」的盘为 0 例（这条是关键不变量）；
//      「喜用互补」方差随之变大（mean 12.29 → 11.54、p15 8 → 2），判别力更强；
//   ④「纳音年命」改用年柱纳音（口径与项名对齐）；
//   ⑤ `buildPerson` 把全局五行统计喂给 `recommendYongShen`（此前传 undefined）
//      → 合盘/对比页与八字页彻底同口径（从旺格识别从"缺"变"有"）。
//   实测：mean 128.2、min 85、p15 113、p50 128、p55 130、p70 137、p90 147、max 160。
//   档位 → **147 / 130 / 113**，占比 10.5% / 36.8% / 38.5% / 14.2%。
//
// 历史（供对照，别把旧阈值抄回来）：
//   v5（2026-10-07）：日主五行加喜忌修正、喜用互补改双向四象限、地支合冲补跨盘三合三会，
//     分布下移 → p15 83、p55 100；v5.1（同日）修「地支合冲」拿地支查生肖键表的静默失效，
//     分布抬回 → 档位 118/103/85（满分 160）；
//   v6（同日）：加两项后满分 200 → 档位 148/132/115（③⑤ 落地后分布又小幅下移，故 v6.1 下移 1~2 分）。

import { describe, it, expect } from 'vitest';
import { buildPerson } from '../personChart';
import { analyzeHePan, HEPAN_MAX_SCORE, deriveJiShen } from '../hepan';
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
  it('满分口径：10 项 × 20 = 200，每项 0~20', () => {
    expect(HEPAN_MAX_SCORE).toBe(200);
    for (const r of results) {
      expect(r.items).toHaveLength(10);
      for (const it of r.items) {
        expect(it.score).toBeGreaterThanOrEqual(0);
        expect(it.score).toBeLessThanOrEqual(20);
      }
      expect(r.totalScore).toBeLessThanOrEqual(HEPAN_MAX_SCORE);
      expect(r.totalScore).toBe(r.items.reduce((s, i) => s + i.score, 0));
    }
  });

  it('总分分布：mean ≈ 128、p15 ≈ 113、p55 ≈ 130、p90 ≈ 147（档位锚点，v6.1 重标）', () => {
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    expect(mean).toBeGreaterThan(121);
    expect(mean).toBeLessThan(135);
    expect(quantile(totals, 0.15)).toBeGreaterThan(106);
    expect(quantile(totals, 0.15)).toBeLessThan(120);
    expect(quantile(totals, 0.55)).toBeGreaterThan(124);
    expect(quantile(totals, 0.55)).toBeLessThan(137);
    expect(quantile(totals, 0.9)).toBeGreaterThan(140);
    expect(quantile(totals, 0.9)).toBeLessThan(154);
  });

  it('档位占比落在合理区间：最高档稀有、最低档可达（这是 v4 修的既有缺陷）', () => {
    // 旧口径实测 天作之合 38.7% / 需磨合 0%，两个档位都失去意义
    // v6.1 阈值 147/130/113 实测占比 10.5% / 36.8% / 38.5% / 14.2%
    const tian = shares((t) => t >= 147);
    const liang = shares((t) => t >= 130 && t < 147);
    const ping = shares((t) => t >= 113 && t < 130);
    const mo = shares((t) => t < 113);
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

  it('v6 新增两项有真实方差（不许被基准分压成常数）', () => {
    const pick = (title: string) =>
      results.map((r) => r.items.find((i) => i.title === title)!.score).sort((a, b) => a - b);
    // 旺衰互动：一强一弱（20）与双强/双弱（≤10）都必须可达
    const ws = pick('旺衰互动');
    expect(ws[ws.length - 1]).toBe(20);
    expect(ws[0]).toBeLessThanOrEqual(10);
    // 气候与用神：同季 + 用神双交集（20）与寒暖相对 + 共忌（低位）都必须可达
    const cl = pick('气候与用神');
    expect(cl[cl.length - 1]).toBe(20);
    expect(cl[0]).toBeLessThanOrEqual(9);
  });

  it('每一项的 desc 都非空（页面会渲染成空白的就是 bug）', () => {
    for (const r of results.slice(0, 40)) {
      for (const it of r.items) {
        expect(it.desc.trim().length).toBeGreaterThan(8);
      }
    }
  });

  it('忌神完整口径：personChart.jiShen = recommendYongShen.xiShen（与用神恒不相交）', () => {
    // 关键不变量：同一个五行不能既是喜用又是忌神（否则「喜用互补」会同时 +6 和 −6）。
    // recommendYongShen 末尾有 `xiShen.filter(wx => !yongShen.includes(wx))`，这一条钉住它。
    const sample = Array.from({ length: 120 }, (_, i) =>
      buildPerson(1940 + ((i * 7) % 66), 1 + ((i * 5) % 12), 1 + ((i * 3) % 28), (i * 11) % 24, 30, i % 2 ? 'male' : 'female'),
    );
    let differs = 0;
    for (const p of sample) {
      expect(p.yongShen.filter((w) => p.jiShen.includes(w))).toEqual([]);
      // 与「轻量扶抑兜底」必须真的分叉（否则说明完整口径根本没生效）
      const fallback = deriveJiShen(p.dayWx, p.strengthLevel, p.yongShen);
      if (fallback.join('|') !== p.jiShen.join('|')) differs++;
    }
    expect(differs / sample.length).toBeGreaterThan(0.1);
  });
});
