import { describe, it, expect } from 'vitest';
import { calcWuxingStats, analyzeWuxingFlow, annotateDayunFlow } from '../wuxingFlow';
import type { PillarData } from '../../pages/Bazi';

const mk = (pillar: string, tianGan: string, diZhi: string, cangGan: string[] = []): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan, shiShen: '', shiShenZhi: '', nayin: '',
});

/** 均衡盘：天干甲丙戊庚 + 地支子寅辰申，五行俱全且占比均匀（cangGan 置空便于手算） */
const balanced = (): PillarData[] => [
  mk('年柱', '甲', '子'),
  mk('月柱', '丙', '寅'),
  mk('日柱', '戊', '辰'),
  mk('时柱', '庚', '申'),
];

describe('calcWuxingStats（自页面迁移，口径回归）', () => {
  it('天干+地支本气+藏干逐项计数，级别按均值比较', () => {
    const s = calcWuxingStats(balanced());
    // 木=甲+寅=2；火=丙=1；土=戊+辰=2；金=庚+申=2；水=子=1（total 8）
    expect(s['木'].count).toBe(2);
    expect(s['火'].count).toBe(1);
    expect(s['土'].count).toBe(2);
    expect(s['金'].count).toBe(2);
    expect(s['水'].count).toBe(1);
    // avg=1.6, max=2：与最大值并列且 >1.92 判旺；<1.12 判弱
    expect(s['木'].level).toBe('旺');
    expect(s['火'].level).toBe('弱');
    expect(s['水'].level).toBe('弱');
  });

  it('藏干逐字计入对应五行', () => {
    const s = calcWuxingStats([mk('年柱', '甲', '寅', ['甲', '丙', '戊'])]);
    // 木：天干甲+地支寅+藏干甲=3；火：藏干丙=1；土：藏干戊=1
    expect(s['木'].count).toBe(3);
    expect(s['火'].count).toBe(1);
    expect(s['土'].count).toBe(1);
  });
});

describe('analyzeWuxingFlow 五行流通', () => {
  it('均衡盘：周流不息，五链全通，主路线贯穿全环', () => {
    const r = analyzeWuxingFlow(balanced(), '土');
    expect(r.rating).toBe('周流不息');
    expect(r.links.every((l) => l.state === '畅通')).toBe(true);
    expect(r.summary).toContain('木→火→土→金→水');
    // 均衡盘无归聚点（最大占比 25% < 45%）
    expect(r.converge).toBeNull();
  });

  it('均衡盘：两强相战有通关（贪生忘克）', () => {
    const r = analyzeWuxingFlow(balanced(), '土');
    expect(r.bridges.length).toBeGreaterThan(0);
    expect(r.bridges.every((b) => b.state === '通关')).toBe(true);
    expect(r.bridges.some((b) => b.note.includes('贪生忘克'))).toBe(true);
  });

  it('缺火盘：木生火断链，评级局部受阻，补火为疏通首招（与用神同向时显式提示）', () => {
    const pillars: PillarData[] = [
      mk('年柱', '甲', '子'),
      mk('月柱', '庚', '申'),
      mk('日柱', '戊', '辰'),
      mk('时柱', '壬', '子'),
    ];
    const r = analyzeWuxingFlow(pillars, '土', ['火']);
    expect(r.rating).toBe('局部受阻');
    expect(r.summary).toContain('缺火');
    const woodFire = r.links.find((l) => l.from === '木' && l.to === '火');
    expect(woodFire?.state).toBe('断链');
    // 补火建议 + 用神同向提示
    const tip = r.tips.find((t) => t.includes('补「火」'));
    expect(tip).toBeTruthy();
    expect(tip).toContain('用神');
    // 火生土链同样断（无源火），但补火建议不应重复出现
    expect(r.tips.filter((t) => t.includes('「火」')).length).toBe(1);
  });

  it('木壅塞盘：木生火判壅塞，气聚日主，补火分洪/补金疏通并存', () => {
    const pillars: PillarData[] = [
      mk('年柱', '甲', '寅', ['甲', '丙', '戊']),
      mk('月柱', '乙', '卯', ['乙']),
      mk('日柱', '甲', '辰', ['戊', '乙', '癸']),
      mk('时柱', '乙', '亥', ['壬', '甲']),
    ];
    const r = analyzeWuxingFlow(pillars, '木');
    const woodFire = r.links.find((l) => l.from === '木' && l.to === '火');
    expect(woodFire?.state).toBe('壅塞');
    expect(woodFire?.note).toContain('木');
    // 木占比 11/18 ≈ 61% → 归聚于木，日主亦木
    expect(r.converge?.wx).toBe('木');
    expect(r.converge?.note).toContain('气聚日主');
    // 缺金 → 土生金断链 → 补金建议
    const goldTip = r.tips.find((t) => t.includes('补「金」'));
    expect(goldTip).toBeTruthy();
    // 壅塞提示：补火分洪
    expect(r.tips.some((t) => t.includes('分洪'))).toBe(true);
  });

  it('缺两行判严重断流；土克水相战缺通关时给出窗口期提示', () => {
    const pillars: PillarData[] = [
      mk('年柱', '甲', '子'),
      mk('月柱', '壬', '子'),
      mk('日柱', '戊', '辰'),
      mk('时柱', '癸', '亥'),
    ];
    // 木1 水5 土2 → 缺火、金
    const r = analyzeWuxingFlow(pillars, '土');
    expect(r.rating).toBe('严重断流');
    // 土克水：土 2/8=25%、水 5/8=62.5% 均达标 → 入场；通关行金缺失 → 通关乏力
    const bridge = r.bridges.find((b) => b.a === '土' && b.b === '水');
    expect(bridge?.state).toBe('通关乏力');
    expect(bridge?.note).toContain('金');
    expect(r.tips.some((t) => t.includes('化战为和'))).toBe(true);
  });

  it('归聚点与日主的不同关系给出不同结论（克日主 → 压力提示）', () => {
    // 木壅塞盘但日主为土（被木克）
    const pillars: PillarData[] = [
      mk('年柱', '甲', '寅', ['甲', '丙', '戊']),
      mk('月柱', '乙', '卯', ['乙']),
      mk('日柱', '戊', '辰', ['戊', '乙', '癸']),
      mk('时柱', '乙', '亥', ['壬', '甲']),
    ];
    const r = analyzeWuxingFlow(pillars, '土');
    expect(r.converge?.wx).toBe('木');
    expect(r.converge?.note).toContain('克你');
  });
});

/** 缺火盘（与上面用例同构）：木1 金2 土2 水3 */
const noFire = (): PillarData[] => [
  mk('年柱', '甲', '子'),
  mk('月柱', '庚', '申'),
  mk('日柱', '戊', '辰'),
  mk('时柱', '壬', '子'),
];

describe('annotateDayunFlow 大运应期', () => {
  it('缺行元素出现在大运干支 → 注记补齐窗口，firstFix 给出第一步（未触及时给主动补法）', () => {
    const flow = analyzeWuxingFlow(noFire(), '土', ['火']);
    const steps = [
      { ganZhi: '癸亥', startAge: 3, endAge: 12 },
      { ganZhi: '甲子', startAge: 13, endAge: 22 },
      { ganZhi: '乙丑', startAge: 23, endAge: 32 },
      { ganZhi: '丙寅', startAge: 33, endAge: 42 },
    ];
    const anno = annotateDayunFlow(steps, flow);
    expect(anno.stepNotes).toHaveLength(4);
    expect(anno.stepNotes[0]).toHaveLength(0); // 癸亥：水水，与火无关
    expect(anno.stepNotes[3][0]).toContain('补齐断链'); // 丙寅：丙火补上
    expect(anno.firstFix.some((t) => t.includes('火') && t.includes('丙寅运'))).toBe(true);
    // 没有火运时给出主动补法
    const anno2 = annotateDayunFlow(steps.slice(0, 3), flow);
    expect(anno2.firstFix.some((t) => t.includes('火') && t.includes('未见补齐'))).toBe(true);
  });

  it('通关乏力战局在大运见通关行 → 注记通关得力 + firstFix 窗口期', () => {
    // 土克水缺通关行金（甲子/壬子/戊辰/癸亥）
    const pillars: PillarData[] = [
      mk('年柱', '甲', '子'),
      mk('月柱', '壬', '子'),
      mk('日柱', '戊', '辰'),
      mk('时柱', '癸', '亥'),
    ];
    const flow = analyzeWuxingFlow(pillars, '土');
    const steps = [{ ganZhi: '庚申', startAge: 1, endAge: 10 }];
    const anno = annotateDayunFlow(steps, flow);
    // 庚申纯金：既补金断链又通关
    expect(anno.stepNotes[0].some((n) => n.includes('通关得力'))).toBe(true);
    expect(anno.firstFix.some((t) => t.includes('通关') && t.includes('庚申运'))).toBe(true);
    // 金被补上；火仍未见 → 主动补法
    expect(anno.firstFix.some((t) => t.includes('火') && t.includes('未见补齐'))).toBe(true);
  });

  it('壅塞行再现于大运 → 提示壅塞加剧', () => {
    const pillars: PillarData[] = [
      mk('年柱', '甲', '寅', ['甲', '丙', '戊']),
      mk('月柱', '乙', '卯', ['乙']),
      mk('日柱', '甲', '辰', ['戊', '乙', '癸']),
      mk('时柱', '乙', '亥', ['壬', '甲']),
    ];
    const flow = analyzeWuxingFlow(pillars, '木');
    const anno = annotateDayunFlow([{ ganZhi: '甲寅', startAge: 20, endAge: 29 }], flow);
    expect(anno.stepNotes[0].some((n) => n.includes('壅塞'))).toBe(true);
  });
});
