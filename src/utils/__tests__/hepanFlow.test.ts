import { describe, it, expect } from 'vitest';
import type { PillarData } from '../../pages/Bazi';
import { analyzeHePanFlow, type HePanFlowPartyInput } from '../hepanFlow';
import { analyzeHePan, HEPAN_MAX_SCORE, type HePanInput } from '../hepan';

const mk = (tianGan: string, diZhi: string, pillar = '年柱'): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen: '', shiShenZhi: '', nayin: '',
});

/** 造一方：日支可控（配偶宫 = 日支） */
function partyOf(dayZhi: string, over: Partial<HePanFlowPartyInput> = {}): HePanFlowPartyInput {
  const pillars = [
    mk('甲', '寅', '年柱'), mk('丙', '寅', '月柱'), mk('戊', dayZhi, '日柱'), mk('壬', '戌', '时柱'),
  ];
  return {
    name: 'A',
    pillars,
    dayGan: '戊',
    dayWx: '土',
    gender: 'male',
    ...over,
  };
}

function hepanInput(): HePanInput {
  const mine = partyOf('子', { name: '我' });
  const partner = partyOf('未', { name: 'TA', gender: 'female' });
  return {
    mine: { ...mine, zodiac: '虎', nayin: '城墙土', yongShen: ['火'] },
    partner: { ...partner, zodiac: '虎', nayin: '城墙土', yongShen: ['火'] },
  } as unknown as HePanInput;
}

describe('合盘动态层 · 配偶宫（2026 丙午年）', () => {
  it('双方日支都为未 → 双方配偶宫同时被合 → 出「同时被合」的契机', () => {
    const r = analyzeHePanFlow({ mine: partyOf('未'), partner: partyOf('未'), year: 2026 });
    expect(r.mine.liunian.spousePalace).toBe('六合');
    expect(r.partner.liunian.spousePalace).toBe('六合');
    expect(r.opportunities.join('')).toContain('同时被合');
  });

  it('双方日支都为子 → 双方配偶宫同时被冲 → 出「同时被冲」的风险', () => {
    const r = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('子'), year: 2026 });
    expect(r.mine.liunian.spousePalace).toBe('六冲');
    expect(r.risks.join('')).toContain('同时被冲');
  });

  it('一方被冲、一方被合 → 提示"节奏错位"，且两个方向各有自己的措辞', () => {
    const r1 = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('未'), year: 2026 });
    expect(r1.risks.join('')).toContain('错位');
    const r2 = analyzeHePanFlow({ mine: partyOf('未'), partner: partyOf('子'), year: 2026 });
    // 交换后仍然是"错位"，但主语从"你这边被冲"变成"对方那边被冲"
    expect(r2.risks.join('')).toContain('错位');
    expect(r1.risks.join('')).not.toBe(r2.risks.join(''));
  });

  it('双方日支都不受引动 → 提示"维持节奏"', () => {
    const r = analyzeHePanFlow({ mine: partyOf('辰'), partner: partyOf('辰'), year: 2026 });
    expect(r.mine.liunian.spousePalace).toBe('无');
    expect(r.opportunities.join('')).toContain('维持节奏');
  });
});

describe('合盘动态层 · 对称性与档位', () => {
  it('交换双方输入 → 档位与主题不变（分数对称原则的延伸）', () => {
    const a = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('未', { gender: 'female' }), year: 2026 });
    const b = analyzeHePanFlow({ mine: partyOf('未', { gender: 'female' }), partner: partyOf('子'), year: 2026 });
    expect(b.level).toBe(a.level);
    expect(b.theme).toBe(a.theme);
  });

  it('档位只取 顺/平/需留意 三值，且 theme 带年份干支', () => {
    const r = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('未'), year: 2026 });
    expect(['顺', '平', '需留意']).toContain(r.level);
    expect(r.theme).toContain('丙午');
    expect(r.theme).toContain('2026');
  });

  it('level=需留意 时 risks 必然非空（不会只给一个负面档位却不解释）', () => {
    // 双方配偶宫同时被冲 + 女命食伤/男命比劫之类，很容易落到"需留意"
    const r = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('子'), year: 2026 });
    if (r.level === '需留意') expect(r.risks.length).toBeGreaterThan(0);
    expect(r.risks.length).toBeGreaterThan(0);
  });
});

describe('合盘动态层 · 大运 / 桃花 / 文案', () => {
  it('传了当前大运 → dayun 存在，且与大运干支对应；不传 → 为 null 且不崩', () => {
    const withYun = analyzeHePanFlow({
      mine: partyOf('子', { dayunGanZhi: '庚申' }),
      partner: partyOf('未', { dayunGanZhi: '辛酉' }),
      year: 2026,
    });
    expect(withYun.mine.dayun).not.toBeNull();
    expect(withYun.mine.dayun!.ganZhi).toBe('庚申');
    expect(withYun.partner.dayun!.ganZhi).toBe('辛酉');

    const noYun = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('未'), year: 2026 });
    expect(noYun.mine.dayun).toBeNull();
    expect(noYun.mine.dayunGanZhi).toBe('');
  });

  it('2026 红鸾在酉：命局有酉的一方 → 出"喜事位"契机', () => {
    const c = partyOf('子');
    c.pillars[0] = mk('甲', '酉', '年柱');
    const r = analyzeHePanFlow({ mine: c, partner: partyOf('辰', { gender: 'female' }), year: 2026 });
    expect(r.opportunities.join('')).toContain('红鸾');
  });

  it('每一方都给出可读的年度小结与影响领域（不出现空串）', () => {
    const r = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('午'), year: 2026 });
    for (const side of [r.mine, r.partner]) {
      expect(side.summary.trim().length).toBeGreaterThan(10);
      expect(side.liunian.headline.trim().length).toBeGreaterThan(10);
      for (const d of side.liunian.domains) {
        expect(d.domain.trim().length).toBeGreaterThan(0);
        for (const n of d.notes) expect(n.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('notice 必须说明本层不进总分', () => {
    const r = analyzeHePanFlow({ mine: partyOf('子'), partner: partyOf('未'), year: 2026 });
    expect(r.notice).toContain('不参与');
    expect(r.notice).toContain('总分');
  });
});

describe('分层保证：动态层随年份变，静态缘分分不变', () => {
  it('同一对盘换年份 → 动态层变化；静态缘分接口里根本没有年份', () => {
    const mine = partyOf('子');
    const partner = partyOf('午', { gender: 'female' });
    const y2026 = analyzeHePanFlow({ mine, partner, year: 2026 });
    const y2032 = analyzeHePanFlow({ mine, partner, year: 2032 });
    expect(y2026.ganZhi).toBe('丙午');
    expect(y2032.ganZhi).toBe('壬子');
    expect(y2026.theme).not.toBe(y2032.theme);
    // 子 vs 午：2026 冲、2032（壬子）则是子与子同支伏吟 —— 配偶宫状态必须不同
    expect(y2026.mine.liunian.spousePalace).not.toBe(y2032.mine.liunian.spousePalace);

    // 静态侧：160 分体系不带年份，返回结构里也不应有任何"动态层"字段
    const base = analyzeHePan(hepanInput());
    expect(HEPAN_MAX_SCORE).toBe(160);
    expect((base as unknown as Record<string, unknown>).flow).toBeUndefined();
    expect((base as unknown as Record<string, unknown>).hepanFlow).toBeUndefined();
    expect(Object.keys(base)).not.toContain('year');
  });
});
