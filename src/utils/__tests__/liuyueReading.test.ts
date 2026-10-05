import { describe, it, expect } from 'vitest';
import { buildLiuYueList, LIUYUE_TEMPLATES, YUN_YUE_SUFFIX } from '../liuyueReading';

const NOW = new Date(2026, 9, 5); // 2026-10-05，固定时钟防跨年边界漂移

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
