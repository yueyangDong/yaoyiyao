import { describe, it, expect } from 'vitest';
import { ziwei } from '@ziweijs/core';
import { Solar } from 'lunar-typescript';
import { enrichGongData, getMingShenGongBranch } from '../ziweiPalaceData';
import { recalcSihua } from '../ziweiSihuaFlying';
import { getAllPalaceDeepReadings } from '../ziweiPalaceDeep';
import { generateSihuaDeepReading } from '../ziweiSihuaDeep';
import { palaceScoreOf, PALACE_JI_STARS, PALACE_XIONG_STARS } from '../ziweiPalaceScore';

/**
 * 紫微十二宫：宫位判据的分布守卫。
 *
 * 为什么需要：宫位解读最典型的失效方式**不是报错，而是静默变少或变套话**——
 *   · `getAllPalaceDeepReadings` 里 `if (!g) continue`：宫名对不上就少一条，
 *     用户看到 11 个宫，页面上什么提示都没有；
 *   · 空宫（命无正曜）如果没有走到借宫分支，会输出一段"本宫无主星"就结束，
 *     看起来像正常解读，其实是缺口；注意空宫有**两条**合法出口（宫内有辅星四化时
 *     先走四化解读），断言只钉其中会静默退化的那条，别混成一条；
 *   · 文案若按宫名索引静态句（"命宫的人主见强"），换任何盘都一字不差——
 *     这类套话每个单盘测试都能过，只有跨盘统计它的**重复率**才抓得到。
 *
 * 这里钉的是**量级与结构**，不是某一盘的结论：判据小改无关痛痒，
 * 但如果哪天宫位少一段、空宫不借了、或文案退化成静态句，这几条会立刻红。
 */

const GONG_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

/** 与 Ziwei.tsx 完全相同的管线：bySolar → enrichGongData → recalcSihua */
function buildGongs(y: number, m: number, d: number, h: number, gender: 'male' | 'female'): any[] {
  const sol = Solar.fromYmdHms(y, m, d, h, 0, 0);
  const lu = sol.getLunar();
  const result: any = ziwei.bySolar({
    name: '', gender, date: new Date(y, m - 1, d, h, 0, 0), language: 'zh-CN',
  } as any);
  const lunarMonthAbs = Math.abs(lu.getMonth());
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
  return gongData;
}

/** 固定取样：5 年 × 12 月 × 2 日 × 2 时辰 = 240 盘（确定性，不 flaky） */
function sample() {
  const perPalaceTexts = new Map<string, string[]>();
  const scoreLevels: Record<string, number> = { 吉: 0, 中: 0, 凶: 0 };
  let charts = 0;
  let palaces = 0;
  let minSections = Infinity;
  let maxSections = 0;
  /** 空宫的两种合法出口（见下方断言注释）：走四化解读 / 走本模块的空宫借宫分支 */
  const empty = { total: 0, viaSihua: 0, viaBorrow: 0, withoutBorrow: [] as string[] };
  /** 文案里出现 undefined / NaN / [object Object] —— 键名错配的典型显形 */
  const dirtyText: string[] = [];

  for (let y = 1990; y <= 1994; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      for (const d of [3, 13]) {
        for (const h of [2, 14]) {
          const gender = (y + m + d + h) % 2 === 0 ? 'male' : 'female';
          const gongs = buildGongs(y, m, d, h, gender as 'male' | 'female');
          charts += 1;

          // ① 每宫吉凶标签（页面标签的唯一出口）
          for (const g of gongs) {
            scoreLevels[palaceScoreOf(g).level] += 1;
            palaces += 1;
          }

          // ② 十二宫深度解读
          const readings = getAllPalaceDeepReadings(gongs);
          expect(readings.length, `${y}-${m}-${d} ${h}时：只产出 ${readings.length} 个宫的解读`).toBe(12);

          for (const r of readings) {
            minSections = Math.min(minSections, r.sections.length);
            maxSections = Math.max(maxSections, r.sections.length);
            const text = r.sections.map((s) => `${s.heading}|${s.text}`).join('§');
            const arr = perPalaceTexts.get(r.gongName) || [];
            arr.push(text);
            perPalaceTexts.set(r.gongName, arr);

            if (/undefined|NaN|\[object Object\]/.test(text)) {
              dirtyText.push(`${y}-${m}-${d} ${h}时 ${r.gongName}：${text.slice(0, 120)}`);
            }

            // ③ 空宫不能"输出一段就结束"。
            //   ⚠️ 空宫有**两条**合法出口，别混成一条（第一版就栽在这）：
            //     · 宫内有辅星带生年四化/自化（文昌、文曲、左辅、右弼 常见）→
            //       `generateSihuaDeepReading` 先行返回，正文讲的是那颗辅星的四化；
            //     · 宫内无任何四化 → 才落到 `ziweiPalaceDeep` 的空宫分支，必须借对宫。
            //   前者不提借宫**不是缺口**：宫位卡片（Ziwei.tsx「空宫·借对宫论」小字）
            //   与命宫解读已各标一次。这里只钉后者——它才是会静默退化的那条。
            const g = gongs.find((x) => String(x.name).replace(/宫$/, '') === r.gongName.replace(/宫$/, ''));
            if ((g?.majorStars || []).length === 0) {
              empty.total += 1;
              if (generateSihuaDeepReading(g)) {
                empty.viaSihua += 1;
              } else {
                empty.viaBorrow += 1;
                const first = r.sections[0]?.heading || '';
                if (!/空宫借对宫论|空而无借/.test(first)) {
                  empty.withoutBorrow.push(`${r.gongName} ← ${first}`);
                }
              }
            }
          }
        }
      }
    }
  }
  return { perPalaceTexts, scoreLevels, charts, palaces, minSections, maxSections, empty, dirtyText };
}

describe('紫微十二宫：宫位判据分布', () => {
  const s = sample();

  it('十二宫全覆盖：每盘都产出 12 个宫的解读（少一个就是静默缺失）', () => {
    expect(s.charts).toBe(240);
    expect(s.perPalaceTexts.size, `只覆盖 ${s.perPalaceTexts.size} 个宫名`).toBe(12);
    for (const name of GONG_ORDER) {
      const n = s.perPalaceTexts.get(name)?.length ?? 0;
      expect(n, `${name} 只在 ${n}/240 盘里有解读`).toBe(240);
    }
  });

  it('每宫段数稳定且不为空（结构塌缩会立刻显形）', () => {
    expect(s.minSections, `最少只有 ${s.minSections} 段`).toBeGreaterThanOrEqual(3);
    expect(s.maxSections, `最多 ${s.maxSections} 段——若某分支多塞了一段，这里会红`).toBeLessThanOrEqual(5);
  });

  it('空宫（走本模块分支的）必须借到东西：借对宫或明确"空而无借"', () => {
    // 先钉量级：空宫约占 16%（与 hepan.ts 的 1728 组实测 16% 同口径）。
    // 比例大幅漂移说明排盘或 enrich 出了问题，不是文案问题。
    const total = s.palaces;
    const rate = s.empty.total / total;
    expect(rate, `空宫占 ${(rate * 100).toFixed(1)}%，与已知的 16% 口径差太远`).toBeGreaterThan(0.10);
    expect(rate, `空宫占 ${(rate * 100).toFixed(1)}%，与已知的 16% 口径差太远`).toBeLessThan(0.24);
    // 两条出口都得真的被走到过——缺一条说明判据分支塌了
    expect(s.empty.viaBorrow, '空宫没有一盘落到借宫分支').toBeGreaterThan(0);
    expect(s.empty.viaSihua, '空宫没有一盘落到四化分支（辅星四化是否被 enrich 吃掉了？）').toBeGreaterThan(0);
    expect(s.empty.viaBorrow + s.empty.viaSihua).toBe(s.empty.total);

    expect(
      s.empty.withoutBorrow,
      `这些空宫走了本模块却没借宫：\n${s.empty.withoutBorrow.slice(0, 5).join('\n')}`,
    ).toEqual([]);
  });

  it('文案不得含 undefined / NaN / [object Object]（键名错配的典型显形）', () => {
    // GONG_DOMAIN、STAR_NATURE、GONG_JI_PAIN 都是按名字索引的 Record：
    // 宫名少个「宫」、星名换个别名，查不到就是 undefined 拼进正文，
    // 页面上照常渲染、测试也不会报——只有扫全文才抓得到。
    expect(s.dirtyText.length, `正文里拼进了占位符：\n${s.dirtyText.slice(0, 5).join('\n')}`).toBe(0);
  });

  it('宫位吉凶三档都出现，且没有哪一档压过九成（防恒吉/恒凶）', () => {
    const { 吉, 中, 凶 } = s.scoreLevels;
    const total = 吉 + 中 + 凶;
    expect(total).toBe(s.palaces);
    for (const [name, n] of Object.entries({ 吉, 中, 凶 })) {
      const rate = n / total;
      expect(n, `「${name}」一档都没出现——判据可能恒假`).toBeGreaterThan(0);
      expect(rate, `「${name}」占 ${(rate * 100).toFixed(1)}%，判据可能恒真`).toBeLessThan(0.9);
    }
  });

  it('反套话：同一宫位在 240 盘上的整段文案，最高频占比不得超过六成', () => {
    // 尺子与占卜四板块一致（docs/divination-consistency.md）：槽位最高频 <60%。
    // 宫位文案若按宫名索引静态句，换任何盘都一字不差 → 这里会是 100%。
    const report: string[] = [];
    for (const [name, texts] of s.perPalaceTexts) {
      const freq = new Map<string, number>();
      for (const t of texts) freq.set(t, (freq.get(t) || 0) + 1);
      const top = Math.max(...freq.values());
      const rate = top / texts.length;
      report.push(`${name} ${(rate * 100).toFixed(0)}%`);
      expect(
        rate,
        `${name} 的整段解读最高频占 ${(rate * 100).toFixed(0)}%（${top}/${texts.length}），是套话`,
      ).toBeLessThan(0.6);
    }
    // 落到日志里便于人工看趋势：判据改动后这几个数字应当动，但都该远低于 60%
    expect(report.length).toBe(12);
  });

  it('吉星/凶星名单与宫位判据同源（改名不同步会静默改变全部分档）', () => {
    // 这两张表是 palaceScoreOf 的唯一依据。演算用的辅星名单（ziweiGe.JI_STARS）
    // 与本表**刻意不同**（那边只认辅星，这边主星也计），这条只钉"非空且不重叠"。
    expect(PALACE_JI_STARS.size).toBeGreaterThan(10);
    expect(PALACE_XIONG_STARS.size).toBeGreaterThan(5);
    const overlap = [...PALACE_JI_STARS].filter((n) => PALACE_XIONG_STARS.has(n));
    expect(overlap, `同一颗星不能既是吉又是凶：${overlap.join('、')}`).toEqual([]);
  });
});
