/**
 * 打包体积护栏：iching-shifa 厂内化（剥离《高岛易断》全文）。
 *
 * 背景：上游把 64 卦占例（~620 KB，含 `"case"`/`断曰` 长文）和排盘代码打进同一个
 * ESM 文件，且在模块顶层 `for` 循环建索引（副作用），rollup/esbuild 摇不掉——
 * 只 import 4 个排盘函数也会带出约 1.5 MB，六爻页 chunk 因此到 2.23 MB。
 *
 * 这组测试钉三件事：
 *   1. vendor 副本确实是剥离版（不是被换回 node_modules 原包）；
 *   2. 剥离没有伤到判据（排盘与 explanation 都还在）；
 *   3. vite 与 vitest 两处 alias 同源——否则「测试跑一套、线上发另一套」。
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { decodePan, threeNumberQiGua, manualQiGua } from 'iching-shifa';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('iching-shifa 厂内化（打包体积护栏）', () => {
  it('vendor 副本是剥离版：不含《高岛易断》数据、体积远小于上游', () => {
    const src = read('../../vendor/iching-shifa/index.js');
    // 剥离标记
    expect(src).toContain('const hexagrams = [];');
    // 高岛易断的正文（「断曰：…」带全角冒号）必须不存在。
    // ⚠️ 不能直接断言不含「断曰」二字——本文件头部的说明注释里就有这个词。
    expect(src).not.toContain('断曰：');
    expect(src).not.toContain('明治');
    // 上游原包 1.6 MB；剥离后约 55 KB。上限给到 120 KB，留足注释余量。
    expect(src.length).toBeLessThan(120_000);
  });

  it('剔除数据没有伤到判据：排盘字段与 explanation 都还在', () => {
    const pan = decodePan('789789', { year: 2026, month: 11, day: 23, hour: 10 });
    expect(pan.benGua.guaName).toBeTruthy();
    expect(pan.benGua.yaoList).toHaveLength(6);
    expect(pan.zhiGua.guaName).toBeTruthy();
    expect(pan.dayKong).toBeTruthy();
    // 页面有 `pan.explanation || '暂无自动断语'` 的兜底，剥离后不许变成空串
    expect(pan.explanation.length).toBeGreaterThan(10);
    // explanation 由短卦辞/爻辞拼出（形如「动爻二根，以本卦二变爻辞占…」），
    // 不依赖被剥离的占例数据，但必须仍然给出断语而不是空串
    expect(pan.explanation).toMatch(/[爻卦]/);
  });

  it('起卦三入口仍然可用，且同一输入结果稳定', () => {
    expect(threeNumberQiGua(3, 4, 5)).toBe(threeNumberQiGua(3, 4, 5));
    expect(manualQiGua('789789')).toBe(manualQiGua('789789'));
    expect(typeof threeNumberQiGua(1, 2, 3)).toBe('string');
  });

  it('⚠️ vite 与 vitest 的 alias 必须同源（否则测试与线上跑的是两份代码）', () => {
    const vite = read('../../../vite.config.ts');
    const vitest = read('../../../vitest.config.ts');
    expect(vite).toContain("'iching-shifa': fileURLToPath");
    expect(vitest).toContain("'iching-shifa': fileURLToPath");
    // externalize 的 node_modules 依赖不走 alias，必须内联
    expect(vitest).toContain("'iching-shifa']");
    // 类型解析也要跟上，否则 tsc 找不到声明
    const tsconfig = read('../../../tsconfig.json');
    expect(tsconfig).toContain('"iching-shifa": ["src/vendor/iching-shifa/index.d.ts"]');
  });
});
