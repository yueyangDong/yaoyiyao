import { describe, it, expect } from 'vitest';
import type { PillarData } from '../../pages/Bazi';
import { analyzeGanZhiInteraction, analyzeDayunFlow, PEACH_TABLES, type InteractionKind } from '../liunianInteraction';
import { DZ_ORDER, DZ_CHONG, DZ_HE, DZ_HAI, DZ_XING } from '../diZhiRelations';
import { ganZhiOfYear } from '../liunianReading';
import { GAN_WX, tenGodOf } from '../wuXingRelations';

const P = (pillar: string, tianGan: string, diZhi: string): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});

const NAMES = ['年柱', '月柱', '日柱', '时柱'];

/** 由 [天干, 地支] 四组造盘；日柱为第 3 组（配偶宫 = 日支） */
function mk(pillars: [string, string][]) {
  const list = pillars.map(([g, z], i) => P(NAMES[i], g, z));
  return { pillars: list, dayGan: list[2].tianGan, dayWx: GAN_WX[list[2].tianGan] || '' };
}

describe('干支 → 年份：2026 必须是丙午', () => {
  it('ganZhiOfYear(2026) = 丙午', () => {
    expect(ganZhiOfYear(2026).ganZhi).toBe('丙午');
    expect(ganZhiOfYear(2026).wx).toBe('火');
    // 对照组：不要用"看起来很对"的年份当锚点
    expect(ganZhiOfYear(2024).ganZhi).toBe('甲辰');
    expect(ganZhiOfYear(2025).ganZhi).toBe('乙巳');
  });
});

describe('丙午年 · 地支互动', () => {
  it('命局日支为子 → 子午冲，且直指配偶宫', () => {
    const c = mk([['甲', '寅'], ['丙', '寅'], ['戊', '子'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', label: '2026年' });
    expect(r.spousePalace).toBe('六冲');
    const hit = r.hits.find((h) => h.kind === '六冲' && h.pillar === '日柱');
    expect(hit).toBeDefined();
    expect(hit!.char).toBe('子');
    expect(hit!.domain).toBe('自身与配偶宫');
    expect(hit!.spousePalace).toBe(true);
    expect(r.loveNote).toContain('配偶宫被冲');
  });

  it('命局日支为未 → 午未六合，配偶宫被牵动', () => {
    const c = mk([['甲', '寅'], ['丙', '寅'], ['戊', '未'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', label: '2026年' });
    expect(r.spousePalace).toBe('六合');
    expect(r.loveNote).toContain('配偶宫被合');
  });

  it('午与寅戌成三合火局（补第三支 = 全合）', () => {
    const c = mk([['甲', '寅'], ['丙', '寅'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const sh = r.hits.find((h) => h.kind === '三合');
    expect(sh).toBeDefined();
    expect(sh!.text).toContain('寅午戌');
    expect(sh!.text).toContain('全合');
  });

  it('只补一支 → 半合，且注明旺支与否', () => {
    // 命局只有寅（缺戌），午与寅成半合；午为四正旺支 → 力量不弱
    const c = mk([['甲', '寅'], ['丙', '辰'], ['戊', '巳'], ['壬', '丑']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const sh = r.hits.find((h) => h.kind === '三合');
    expect(sh).toBeDefined();
    expect(sh!.text).toContain('半合');
    expect(sh!.text).toContain('旺支');
  });

  it('午与丑相害（六害表）', () => {
    const c = mk([['甲', '丑'], ['丙', '辰'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    expect(r.hits.some((h) => h.kind === '相害' && h.pillar === '年柱')).toBe(true);
  });
});

describe('伏吟 / 反吟', () => {
  it('岁运与某柱干支全同 → 伏吟，指向该柱领域', () => {
    const c = mk([['丙', '午'], ['甲', '子'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const fy = r.hits.find((h) => h.kind === '伏吟');
    expect(fy).toBeDefined();
    expect(fy!.pillar).toBe('年柱');
    expect(fy!.tone).toBe('bad');
  });

  it('仅地支相同（干支不同）→ 支伏吟，措辞区分于全伏吟', () => {
    const c = mk([['甲', '午'], ['丙', '辰'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const fy = r.hits.find((h) => h.kind === '伏吟');
    expect(fy).toBeDefined();
    expect(fy!.text).toContain('支伏吟');
  });

  it('天克地冲 → 反吟，且同柱不再重复列六冲', () => {
    const c = mk([['壬', '子'], ['甲', '寅'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const f = r.hits.find((h) => h.kind === '反吟');
    expect(f).toBeDefined();
    expect(f!.pillar).toBe('年柱');
    expect(r.hits.some((h) => h.kind === '六冲' && h.pillar === '年柱')).toBe(false);
  });

  it('天干相合但地支无冲（丙辛合）→ 只出五合，不出反吟', () => {
    const c = mk([['辛', '巳'], ['甲', '寅'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    expect(r.hits.some((h) => h.kind === '天干五合' && h.pillar === '年柱')).toBe(true);
    expect(r.hits.some((h) => h.kind === '反吟')).toBe(false);
  });
});

describe('喜忌定向：破坏性作用要取反', () => {
  it('日主木身强（忌水/木）→ 午冲子水 = 冲掉忌神，判吉', () => {
    const c = mk([['甲', '子'], ['丙', '寅'], ['甲', '寅'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', strengthLevel: '身强' });
    const hit = r.hits.find((h) => h.kind === '六冲')!;
    expect(hit.tone).toBe('good');
  });

  it('日主木身弱、以水木为用神 → 午冲子水 = 冲伤用神，判凶', () => {
    const c = mk([['甲', '子'], ['丙', '寅'], ['甲', '寅'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', strengthLevel: '身弱', yongShen: ['水', '木'] });
    const hit = r.hits.find((h) => h.kind === '六冲')!;
    expect(hit.tone).toBe('bad');
  });

  it('未传旺衰 → 不做喜忌定向，中性（保证旧调用方行为不变）', () => {
    const c = mk([['甲', '子'], ['丙', '寅'], ['甲', '寅'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const hit = r.hits.find((h) => h.kind === '六冲')!;
    expect(hit.tone).toBe('neutral');
  });
});

describe('十神（丙年对各日主）', () => {
  it('丙火对庚为七杀、对辛为正官、对壬为偏财、对甲为食神、对戊为偏印', () => {
    expect(tenGodOf('庚', '丙')).toBe('七杀');
    expect(tenGodOf('辛', '丙')).toBe('正官');
    expect(tenGodOf('壬', '丙')).toBe('偏财');
    expect(tenGodOf('甲', '丙')).toBe('食神');
    expect(tenGodOf('戊', '丙')).toBe('偏印');
  });

  it('丙年对癸日主为「正财」，并标记为男命的妻星引动', () => {
    const c = mk([['甲', '寅'], ['丙', '辰'], ['癸', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', gender: 'male' });
    expect(r.shiShen).toBe('正财');
    expect(r.relation).toBe('cai');
    expect(r.loveNote).toContain('妻星');
  });

  it('丙年对辛日主为「正官」，女命则标记为夫星引动', () => {
    const c = mk([['甲', '寅'], ['丙', '辰'], ['辛', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', gender: 'female' });
    expect(r.shiShen).toBe('正官');
    expect(r.loveNote).toContain('夫星');
  });
});

describe('流年桃花', () => {
  it('丙午年的红鸾在酉、天喜在卯、咸池在卯', () => {
    expect(PEACH_TABLES.hongLuan['午']).toBe('酉');
    expect(PEACH_TABLES.tianXi['午']).toBe('卯');
    // 寅午戌年见卯为咸池（三合局取桃花）
    expect(PEACH_TABLES.xianChi['午']).toBe('卯');
    expect(PEACH_TABLES.xianChi['子']).toBe('酉');
  });

  it('命局有酉 → 红鸾落在该柱', () => {
    const c = mk([['甲', '酉'], ['丙', '寅'], ['戊', '辰'], ['壬', '戌']]);
    const r = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午' });
    const hl = r.peach.find((x) => x.name === '红鸾');
    expect(hl).toBeDefined();
    expect(hl!.branch).toBe('酉');
    expect(hl!.pillar).toBe('年柱');
  });
});

describe('不变量：换位置必须换话', () => {
  it('同一个「子」落在年支与日支 → 领域不同、文案必须不同', () => {
    const atYear = analyzeGanZhiInteraction({ ...mk([['甲', '子'], ['丙', '寅'], ['戊', '辰'], ['壬', '戌']]), ganZhi: '丙午' });
    const atDay = analyzeGanZhiInteraction({ ...mk([['甲', '寅'], ['丙', '辰'], ['戊', '子'], ['壬', '戌']]), ganZhi: '丙午' });
    const a = atYear.hits.find((h) => h.kind === '六冲')!;
    const b = atDay.hits.find((h) => h.kind === '六冲')!;
    expect(a.domain).not.toBe(b.domain);
    expect(a.text).not.toBe(b.text);
    expect(a.spousePalace).toBe(false);
    expect(b.spousePalace).toBe(true);
  });
});

describe('全量表扫描：冲/合/害/刑 一个都不能漏判', () => {
  it('12 个流年支 × 12 个命局支：按「冲>合>刑>害」取最强，且与关系表逐项等值', () => {
    // 为什么会有一对地支同时落进多张表：
    //   丑未 / 寅申 —— 既是六冲，又同属三刑（丑戌未、寅巳申）；
    //   巳申       —— 既是六合，又同属三刑；寅巳 —— 既相刑又相害。
    // 引擎（与 shenShaPower 的制化系数顺序一致）只取最强的一条：冲 > 合 > 刑 > 害。
    // 本用例同时钉住「表内容」与「优先级」——两条任一改动都会红。
    const RANK: [InteractionKind, (a: string, b: string) => boolean][] = [
      ['六冲', (a, b) => DZ_CHONG[a] === b],
      ['六合', (a, b) => DZ_HE[a] === b],
      ['相刑', (a, b) => (DZ_XING[a] || []).includes(b)],
      ['相害', (a, b) => DZ_HAI[a] === b],
    ];
    const bad: string[] = [];
    for (const flowZhi of DZ_ORDER) {
      for (const zhi of DZ_ORDER) {
        // 被测量的支放在**年柱**；月/日/时三柱固定，各有可能产生自己的互动，
        // 故只取「年柱」这一柱的 kind 来比对（否则会被其他柱的同类互动掩盖）。
        const c = mk([['甲', zhi], ['丙', '辰'], ['戊', '辰'], ['壬', '戌']]);
        const r = analyzeGanZhiInteraction({ ...c, ganZhi: '甲' + flowZhi });
        const yearKinds = new Set(r.hits.filter((h) => h.pillar === '年柱').map((h) => h.kind));
        const hits = RANK.filter(([, fn]) => fn(flowZhi, zhi)).map(([k]) => k);
        const winner = hits[0] ?? null; // 按 RANK 顺序，第一个命中的即最强
        for (const [kind] of RANK) {
          const shouldEmit = kind === winner;
          const emitted = yearKinds.has(kind);
          if (shouldEmit !== emitted) bad.push(`${flowZhi}${zhi} ${kind}（期望${shouldEmit} 实得${emitted}）`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('每一年的流年互动都能算出领域分组（不出现空标题/空句子）', () => {
    const c = mk([['甲', '子'], ['丙', '寅'], ['戊', '午'], ['壬', '戌']]);
    for (let y = 2024; y <= 2033; y++) {
      const r = analyzeGanZhiInteraction({ ...c, ganZhi: ganZhiOfYear(y).ganZhi, label: `${y}年` });
      expect(r.headline.length).toBeGreaterThan(10);
      for (const d of r.domains) {
        expect(d.domain.length).toBeGreaterThan(0);
        for (const n of d.notes) expect(n.trim().length).toBeGreaterThan(10);
      }
    }
  });
});

describe('大运与流年同构', () => {
  it('analyzeDayunFlow 与 analyzeGanZhiInteraction 判据一致，只是文言前缀不同', () => {
    const c = mk([['甲', '寅'], ['丙', '辰'], ['戊', '子'], ['壬', '戌']]);
    const a = analyzeDayunFlow('丙午', c);
    const b = analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', label: '当前大运' });
    expect(a.label).toBe('当前大运');
    expect(a.hits.map((h) => h.kind)).toEqual(b.hits.map((h) => h.kind));
    expect(a.spousePalace).toBe(b.spousePalace);
  });
});

// ========== 时间尺度（流年 / 大运 / 流月 / 流日） ==========
// 同一套判据，四种尺度只有时间词不同。这一组用例的存在意义：把"流年措辞套到别的尺度上"
// 这类错挡住——它不会报错，只会写出"这步运今年最动""流日甲木为财，今年感情机会…"这种句子。
describe('时间尺度：时间词必须跟着 era 走，且不串味', () => {
  // 四支皆寅、大运甲子（子与寅无任何关系）→ 走"无冲无合"的兜底句，四句可直接对比
  const quiet = mk([['甲', '寅'], ['丙', '寅'], ['戊', '寅'], ['壬', '寅']]);

  it('默认 era = year，且结果回传 era 供调用方选措辞', () => {
    const r = analyzeGanZhiInteraction({ ...quiet, ganZhi: '甲子' });
    expect(r.era).toBe('year');
    expect(r.headline).toContain('属平顺之年');
  });

  it('四种尺度的"无冲无合"句与配偶宫句各不相同', () => {
    const cases: Array<['year' | 'decade' | 'month' | 'day', string, string]> = [
      ['year', '属平顺之年', '配偶宫今年无直接冲合'],
      ['decade', '属平顺的十年', '配偶宫这十年无直接冲合'],
      ['month', '属平顺之月', '配偶宫本月无直接冲合'],
      ['day', '属平顺之日', '配偶宫今日无直接冲合'],
    ];
    for (const [era, spanWord, spouseWord] of cases) {
      const r = analyzeGanZhiInteraction({ ...quiet, ganZhi: '甲子', era });
      expect(r.era).toBe(era);
      expect(r.headline, `${era} 的兜底时间词`).toContain(spanWord);
      expect(r.loveNote, `${era} 的配偶宫时间词`).toContain(spouseWord);
    }
  });

  it('岁运本身在文案里的称呼（流年 / 大运 / 流月 / 流日）不串味', () => {
    // 日主甲木，戊土为"我克" = 财 → 男命走 starNote 分支
    const c = mk([['甲', '寅'], ['丙', '寅'], ['甲', '子'], ['壬', '戌']]);
    const year = analyzeGanZhiInteraction({ ...c, ganZhi: '戊午', era: 'year', gender: 'male' });
    const day = analyzeGanZhiInteraction({ ...c, ganZhi: '戊午', era: 'day', gender: 'male' });
    expect(year.loveNote).toContain('流年偏财为财');
    expect(day.loveNote).toContain('流日偏财为财');
    expect(day.loveNote).not.toContain('流年');
  });

  it('伏吟句用该尺度下的"一段时间"说法，不硬写"这一年"', () => {
    // 大运甲子 与 命局日柱甲子 天干地支全同 → 全伏吟
    const c = mk([['甲', '寅'], ['丙', '寅'], ['甲', '子'], ['壬', '戌']]);
    const year = analyzeGanZhiInteraction({ ...c, ganZhi: '甲子', era: 'year' });
    const month = analyzeGanZhiInteraction({ ...c, ganZhi: '甲子', era: 'month' });
    expect(year.spousePalace).toBe('伏吟');
    expect(month.spousePalace).toBe('伏吟');
    expect(year.loveNote).toContain('流年与日支同支');
    expect(month.loveNote).toContain('流月与日支同支');
    expect(month.loveNote).toContain('这个月关系议题会反复');
    expect(month.loveNote).not.toContain('这一年');
  });

  it('桃花只在流年 / 大运产出：流月与流日的颗粒度过细，不再输出', () => {
    // 丙午年 → 红鸾在酉、天喜在卯、咸池在卯
    const c = mk([['甲', '寅'], ['丙', '酉'], ['戊', '子'], ['壬', '戌']]);
    expect(analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', era: 'year' }).peach.length).toBeGreaterThan(0);
    expect(analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', era: 'decade' }).peach.length).toBeGreaterThan(0);
    expect(analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', era: 'month' }).peach).toHaveLength(0);
    expect(analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', era: 'day' }).peach).toHaveLength(0);
  });

  it('判据与尺度无关：四种尺度算出的 hits / spousePalace 完全一致', () => {
    const c = mk([['甲', '寅'], ['丙', '酉'], ['戊', '子'], ['壬', '戌']]);
    const eras = ['year', 'decade', 'month', 'day'] as const;
    const results = eras.map((era) => analyzeGanZhiInteraction({ ...c, ganZhi: '丙午', era }));
    const sig = (r: typeof results[number]) => r.hits.map((h) => `${h.kind}|${h.pillar}`).join(',');
    for (const r of results.slice(1)) {
      expect(sig(r)).toBe(sig(results[0]));
      expect(r.spousePalace).toBe(results[0].spousePalace);
    }
  });
});
