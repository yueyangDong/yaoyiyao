import { describe, it, expect } from 'vitest';
import type { PillarData } from '../../pages/Bazi';
import { buildLiuYueList, buildLiuRiList, LIUYUE_TEMPLATES, YUN_YUE_SUFFIX } from '../liuyueReading';

const NOW = new Date(2026, 9, 5); // 2026-10-05，固定时钟防跨年边界漂移

const P = (pillar: string, tianGan: string, diZhi: string): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});
const NAMES = ['年柱', '月柱', '日柱', '时柱'];

/** 由 [天干, 地支] 四组造命局，返回 buildLiuYueList 需要的入库字段 */
function mk(pillars: [string, string][], extra: Record<string, unknown> = {}) {
  const list = pillars.map(([g, z], i) => P(NAMES[i], g, z));
  const dayWx = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' }[list[2].tianGan] || '';
  return { pillars: list, dayGan: list[2].tianGan, dayWx, ...extra };
}

/** 只取与日柱（配偶宫）相关的互动类型，便于比较两张盘 */
const dayKinds = (list: ReturnType<typeof buildLiuYueList>) =>
  list.flatMap((m) => (m.interaction?.hits || []).filter((h) => h.spousePalace).map((h) => `${m.monthName}:${h.kind}`));

describe('buildLiuYueList 流月推算', () => {
  it('固定时钟下输出 12 个月，月名与干支齐全', () => {
    const list = buildLiuYueList({ now: NOW, dayWx: '木' });
    expect(list).toHaveLength(12);
    expect(list[0].monthName).toBe('2026年10月');
    expect(list[11].monthName).toBe('2027年9月');
    for (const it of list) {
      expect(it.ganZhi.length).toBeGreaterThanOrEqual(2);
      expect(['木', '火', '土', '金', '水']).toContain(it.wx);
    }
  });

  it('基础话术按月令与日主关系归类（甲日主：同行为比和、水生为印）', () => {
    const list = buildLiuYueList({ now: NOW, dayWx: '木' });
    const sameAll = LIUYUE_TEMPLATES.same.join('|');
    const yinAll = LIUYUE_TEMPLATES.yin.join('|');
    for (const it of list) {
      if (it.wx === '木') expect(sameAll).toContain(it.desc.split('；')[0]);
      if (it.wx === '水') expect(yinAll).toContain(it.desc.split('；')[0]);
    }
  });

  it('叠加大运干支后：五类运月关系后缀全部随月令变化出现，不再一句话通吃', () => {
    // 大运庚午（支午 = 火）：月五行=土→运生月；木→月生运；水→月克运；金→运克月；火→同气
    const list = buildLiuYueList({ now: NOW, dayWx: '木', dayunGanZhi: '庚午' });
    const suffixes = list.map((it) => it.desc.split('；')[1] || '');
    const seen = new Set(suffixes.filter(Boolean));
    // 12 个月跨全五行，五种关系应全覆盖
    expect(seen.size).toBe(5);
    expect(seen).toEqual(new Set(Object.values(YUN_YUE_SUFFIX)));
    // 关系验证：月五行=土 时为「运生月」
    const earthMonth = list.find((it) => it.wx === '土');
    expect(earthMonth?.desc).toContain('大运生助月令');
    const waterMonth = list.find((it) => it.wx === '水');
    expect(waterMonth?.desc).toContain('月令与大运相左');
  });

  it('不传大运 → 无后缀（与旧版输出同构）', () => {
    const list = buildLiuYueList({ now: NOW, dayWx: '木' });
    expect(list.every((it) => !it.desc.includes('大运'))).toBe(true);
  });

  it('换一步大运，同月的后缀必须跟着变（因运而异）', () => {
    const a = buildLiuYueList({ now: NOW, dayWx: '木', dayunGanZhi: '庚午' }); // 支午=火
    const b = buildLiuYueList({ now: NOW, dayWx: '木', dayunGanZhi: '壬寅' }); // 支寅=木
    // 至少有一个月的后缀不同（实际上多数月都会不同）
    const diffs = a.filter((it, i) => it.desc !== b[i].desc);
    expect(diffs.length).toBeGreaterThan(0);
  });
});

// ========== 月柱 × 命局地支互动（2026-10-13 新增） ==========
// 此前流月只有「月令天干 vs 日主」的天干层，"某月冲你的日支"这类最有操作性的一条算不出来。
describe('流月地支互动', () => {
  const chartA = mk([['甲', '寅'], ['丙', '寅'], ['戊', '子'], ['壬', '戌']], { dayWx: '土' }); // 日支子
  const chartB = mk([['甲', '寅'], ['丙', '寅'], ['戊', '午'], ['壬', '戌']], { dayWx: '土' }); // 日支午

  it('不传 pillars / dayGan → interaction 缺省，行为与接入前完全一致', () => {
    const list = buildLiuYueList({ now: NOW, dayWx: '土' });
    expect(list).toHaveLength(12);
    expect(list.every((m) => m.interaction === undefined)).toBe(true);
  });

  it('传入命局 → 每月都有 interaction，era = month，label 等于月名', () => {
    const list = buildLiuYueList({ now: NOW, ...chartA });
    for (const m of list) {
      expect(m.interaction, `${m.monthName} 缺 interaction`).toBeDefined();
      expect(m.interaction!.era).toBe('month');
      expect(m.interaction!.label).toBe(m.monthName);
      expect(m.interaction!.ganZhi).toBe(m.ganZhi);
    }
  });

  it('同一批月份、两张不同的盘：与配偶宫的互动必须不同（因盘而异）', () => {
    const a = dayKinds(buildLiuYueList({ now: NOW, ...chartA }));
    const b = dayKinds(buildLiuYueList({ now: NOW, ...chartB }));
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    // 子日支遇子月 = 伏吟；午日支遇子月 = 六冲 —— 同一批月份不可能给出同样的结论
    expect(a).not.toEqual(b);
    expect(a.join('|')).not.toBe(b.join('|'));
  });

  it('互动按月变化：12 个月里至少出现两种不同的配偶宫互动', () => {
    // 日支子 → 一年中会依次遇到 子月（伏吟）、未月（六害/六合取强）、午月（六冲）
    const a = dayKinds(buildLiuYueList({ now: NOW, ...chartA }));
    expect(new Set(a.map((s) => s.split(':')[1])).size).toBeGreaterThanOrEqual(2);
  });

  it('喜忌定向生效：同一批月份，换用神后 tone 会变（说明月份确实吃到了 yongShen）', () => {
    const plain = buildLiuYueList({ now: NOW, ...chartA, strengthLevel: '身弱', yongShen: [] });
    const tuned = buildLiuYueList({ now: NOW, ...chartA, strengthLevel: '身弱', yongShen: ['水'] });
    const tones = (l: ReturnType<typeof buildLiuYueList>) =>
      l.flatMap((m) => (m.interaction?.hits || []).map((h) => h.tone)).join(',');
    expect(tones(plain)).not.toBe(tones(tuned));
  });
});

// ========== 流日推算（自 Bazi.tsx 的 handleLiuRi 迁入） ==========
describe('buildLiuRiList 流日推算', () => {
  const chartA = mk([['甲', '寅'], ['丙', '寅'], ['戊', '子'], ['壬', '戌']], { dayWx: '土' });

  it('输出当月全部天数，日号连续、干支齐全且与 lunar 口径一致', () => {
    const list = buildLiuRiList({ year: 2026, month: 2, ...chartA });
    expect(list).toHaveLength(28); // 2026-02 是 28 天
    expect(list.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    for (const d of list) {
      expect(d.ganZhi.length).toBe(2);
      expect(['木', '火', '土', '金', '水']).toContain(d.wx);
    }
    // 周末用独立字段标记，不覆盖 desc
    expect(list[0].weekend).toBe(true); // 2026-02-01 是周日
    expect(list[0].desc.length).toBeGreaterThan(0);
  });

  it('不传命局 → 无 interaction（与页面旧行为一致）', () => {
    const list = buildLiuRiList({ year: 2026, month: 2, dayWx: '土' });
    expect(list.every((d) => d.interaction === undefined)).toBe(true);
  });

  it('传入命局 → 每日都有 interaction（era = day，label 含年月日）', () => {
    const list = buildLiuRiList({ year: 2026, month: 2, ...chartA });
    for (const d of list) {
      expect(d.interaction, `${d.day} 日缺 interaction`).toBeDefined();
      expect(d.interaction!.era).toBe('day');
      expect(d.interaction!.label).toBe(`2026年2月${d.day}日`);
    }
  });

  it('同一天、两张不同的盘：互动结论必须不同（因盘而异）', () => {
    const chartB = mk([['甲', '寅'], ['丙', '寅'], ['戊', '午'], ['壬', '戌']], { dayWx: '土' });
    const a = buildLiuRiList({ year: 2026, month: 2, ...chartA });
    const b = buildLiuRiList({ year: 2026, month: 2, ...chartB });
    const sigA = a.map((d) => d.interaction!.hits.map((h) => `${h.kind}${h.pillar}`).join('')).join('|');
    const sigB = b.map((d) => d.interaction!.hits.map((h) => `${h.kind}${h.pillar}`).join('')).join('|');
    expect(sigA).not.toBe(sigB);
    // 一个月内应确实出现与配偶宫的互动（否则本用例没有判别力）
    expect(a.some((d) => d.interaction!.hits.some((h) => h.spousePalace))).toBe(true);
  });

  it('每个月的每一天都算得出结果（不因节气/月末边界抛错或留空）', () => {
    for (const month of [1, 2, 6, 12]) {
      const list = buildLiuRiList({ year: 2026, month, ...chartA });
      expect(list.length).toBeGreaterThanOrEqual(28);
      for (const d of list) {
        expect(d.ganZhi).not.toBe('--');
        expect(d.interaction!.headline.length).toBeGreaterThan(10);
      }
    }
  });
});
