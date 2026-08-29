import { describe, it, expect } from 'vitest';
import { analyzeHePan, type HePanInput } from '../hepan';
import type { PillarData } from '../../pages/Bazi';

const mk = (tianGan: string, diZhi: string): PillarData => ({
  pillar: '年柱', ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});

function input(over: Partial<HePanInput> = {}): HePanInput {
  const base = {
    mine: {
      pillars: [mk('壬', '子'), mk('癸', '丑'), mk('癸', '酉'), mk('壬', '戌')],
      dayWx: '水', zodiac: '鼠', nayin: '剑锋金', yongShen: ['木', '火'],
    },
    partner: {
      pillars: [mk('甲', '寅'), mk('乙', '卯'), mk('甲', '午'), mk('丙', '辰')],
      dayWx: '木', zodiac: '牛', nayin: '炉中火', yongShen: ['水', '金'],
    },
  };
  return { ...base, ...over } as HePanInput;
}

describe('analyzeHePan', () => {
  it('五行相生：水我 + 木对方 → 日主五行分高', () => {
    const r = analyzeHePan(input());
    const item = r.items.find(i => i.title.includes('日主'));
    expect(item).toBeTruthy();
    expect(item!.score).toBeGreaterThanOrEqual(14);
  });

  it('五行相克：水我 + 土对方 → 日主五行分低', () => {
    const r = analyzeHePan(input({ partner: { ...input().partner, dayWx: '土' } }));
    const item = r.items.find(i => i.title.includes('日主'));
    expect(item!.score).toBeLessThanOrEqual(10);
  });

  it('生肖六合（鼠牛）→ 满分；六冲（鼠马）→ 低分', () => {
    const he = analyzeHePan(input());
    const heItem = he.items.find(i => i.title.includes('生肖'));
    expect(heItem!.score).toBeGreaterThanOrEqual(16);

    const chong = analyzeHePan(input({ partner: { ...input().partner, zodiac: '马' } }));
    const chongItem = chong.items.find(i => i.title.includes('生肖'));
    expect(chongItem!.score).toBeLessThanOrEqual(8);
  });

  it('喜用神互补：对方日主=我方用神 → 满分', () => {
    // 我方用神含木，对方日主木
    const r = analyzeHePan(input());
    const item = r.items.find(i => i.title.includes('喜用'));
    expect(item!.score).toBe(20);
  });

  it('总分档位与 items 数量正确', () => {
    const r = analyzeHePan(input());
    expect(r.totalScore).toBeGreaterThanOrEqual(0);
    expect(r.totalScore).toBeLessThanOrEqual(100);
    expect(r.items.length).toBe(7); // 八字5项 + 紫微2项
    expect(['天作之合', '良缘', '平常', '需磨合']).toContain(r.level);
  });

  it('desc 由数据生成且非空（无固定模板）', () => {
    const a = analyzeHePan(input());
    const b = analyzeHePan(input({ partner: { ...input().partner, zodiac: '马', dayWx: '火' } }));
    expect(a.summary.length).toBeGreaterThan(0);
    expect(a.summary).not.toBe(b.summary);
  });
});
