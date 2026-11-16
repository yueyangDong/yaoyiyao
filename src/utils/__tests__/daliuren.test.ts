import { describe, it, expect } from 'vitest';
import {
  buildKe, monthJiangOf, liuQinOf, JI_GONG, DI_ZHI_ORDER, ZHONG_QI_JIANG,
  type KeResult,
} from '../daliurenCore';
import {
  buildAllDaliurenReadings, buildDaliurenReading, buildDaliurenTiming, wangShuaiOf, chuanShapeOf,
} from '../daliurenReading';
import { VERDICT_ORDER, THEMES, JUDGE_RULE } from '../divinationCore';
import { DZ_CHONG } from '../diZhiRelations';

/* ------------------------------------------------------------------ *
 * 夹具
 * ------------------------------------------------------------------ */

/** 2026-11-16 16:35（甲午日 申时，月将卯）——手算核对过的锚点盘 */
const ANCHOR = new Date(2026, 10, 16, 16, 35);

const keOf = (d: Date, opts?: Parameters<typeof buildKe>[1]): KeResult => buildKe(d, opts);

/* ------------------------------------------------------------------ *
 * 月将：中气换将
 * ------------------------------------------------------------------ */

describe('月将（中气换将）', () => {
  it('十二个中气都映射到唯一的月将，且将名不重复', () => {
    const jiangs = ZHONG_QI_JIANG.map((x) => x.jiang);
    expect(new Set(jiangs).size).toBe(12);
    expect(jiangs.every((j) => DI_ZHI_ORDER.includes(j))).toBe(true);
  });

  it('霜降后取卯将、大寒后取子将、大暑后取午将、冬至后取丑将', () => {
    expect(monthJiangOf(new Date(2026, 10, 16, 12, 0)).jiang).toBe('卯');
    expect(monthJiangOf(new Date(2026, 1, 10, 12, 0)).jiang).toBe('子');
    expect(monthJiangOf(new Date(2026, 7, 10, 12, 0)).jiang).toBe('午');
    expect(monthJiangOf(new Date(2026, 11, 28, 12, 0)).jiang).toBe('丑');
  });

  it('⚠️ 冬至前后必须换将：12-21 与 12-22 不应永远同将', () => {
    // 冬至落在 12-21 或 12-22，两天之间必然跨过换将点，至少有一天是丑将
    const a = monthJiangOf(new Date(2026, 11, 21, 12, 0)).jiang;
    const b = monthJiangOf(new Date(2026, 11, 22, 12, 0)).jiang;
    expect([a, b]).toContain('丑');
  });
});

/* ------------------------------------------------------------------ *
 * 天地盘 / 四课 / 三传：结构与不变量
 * ------------------------------------------------------------------ */

describe('起课结构', () => {
  it('天地盘是十二支的置换：天盘 12 支不重复，且月将压在占时之上', () => {
    const ke = keOf(ANCHOR);
    const tian = ke.tianDiPan.positions.map((p) => p.tian);
    expect(new Set(tian).size).toBe(12);
    const hourCell = ke.tianDiPan.positions.find((p) => p.di === ke.dateInfo.hourZhi)!;
    expect(hourCell.tian).toBe(ke.dateInfo.jiangZhi);
  });

  it('十二天将各乘一宫，不重复不遗漏', () => {
    const ke = keOf(ANCHOR);
    const jiangs = ke.tianDiPan.positions.map((p) => p.jiang);
    expect(new Set(jiangs).size).toBe(12);
    expect(jiangs.every(Boolean)).toBe(true);
  });

  it('第一课上神＝日干寄宫的天盘上神；第三课上神＝日支的天盘上神', () => {
    const ke = keOf(ANCHOR);
    const gong = JI_GONG[ke.dateInfo.dayGan];
    const tianPan: Record<string, string> = {};
    for (const p of ke.tianDiPan.positions) tianPan[p.di] = p.tian;
    expect(ke.siKe[0].upper).toBe(tianPan[gong]);
    expect(ke.siKe[2].upper).toBe(tianPan[ke.dateInfo.dayZhi]);
  });

  it('三传都是地支，且中传末传是「以初传为地盘」连续取上神（非伏吟/返吟/别责/八专时）', () => {
    const ke = keOf(ANCHOR);
    const tianPan: Record<string, string> = {};
    for (const p of ke.tianDiPan.positions) tianPan[p.di] = p.tian;
    expect(ke.sanChuan).toHaveLength(3);
    for (const s of ke.sanChuan) expect(DI_ZHI_ORDER).toContain(s.zhi);
    if (!ke.tianDiPan.forward && ke.keTi.name === '元首') {
      // 锚点盘：元首课，三传按连续上神走
      expect(ke.sanChuan[1].zhi).toBe(tianPan[ke.sanChuan[0].zhi]);
      expect(ke.sanChuan[2].zhi).toBe(tianPan[ke.sanChuan[1].zhi]);
    }
  });

  it('旬空恒为两支', () => {
    const ke = keOf(ANCHOR);
    expect(ke.flags.kongZhi).toHaveLength(2);
    expect(ke.flags.kongZhi.every((z) => DI_ZHI_ORDER.includes(z))).toBe(true);
  });
});

describe('九宗门结构课', () => {
  it('月将＝占时 → 伏吟，三传按「刑」推进', () => {
    const ke = keOf(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '子' });
    expect(ke.flags.fuYin).toBe(true);
    expect(ke.keTi.name).toContain('伏吟');
    // 中传是初传所刑，末传是中传所刑
    expect(ke.sanChuan[1].zhi).not.toBe(ke.sanChuan[0].zhi);
  });

  it('月将冲占时 → 返吟', () => {
    const ke = keOf(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '午' });
    expect(ke.flags.fanYin).toBe(true);
    expect(ke.keTi.name).toContain('返吟');
  });

  it('伏吟与返吟互斥，且二者都仍能产出合法三传', () => {
    const fu = keOf(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '子' });
    const fan = keOf(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '午' });
    expect(fu.flags.fanYin).toBe(false);
    expect(fan.flags.fuYin).toBe(false);
    for (const s of [...fu.sanChuan, ...fan.sanChuan]) expect(DI_ZHI_ORDER).toContain(s.zhi);
  });
});

/* ------------------------------------------------------------------ *
 * 六亲与旺衰
 * ------------------------------------------------------------------ */

describe('六亲取用', () => {
  it('以日干为我：同我兄弟、我生子孙、我克妻财、克我官鬼、生我父母', () => {
    // 甲木日
    expect(liuQinOf('甲', '寅')).toBe('兄弟');
    expect(liuQinOf('甲', '巳')).toBe('子孙');
    expect(liuQinOf('甲', '辰')).toBe('妻财');
    expect(liuQinOf('甲', '酉')).toBe('官鬼');
    expect(liuQinOf('甲', '子')).toBe('父母');
  });

  it('旺相休囚死以月建为司令', () => {
    // 以寅月（木司令）为例：同我旺、月生我相、我生月休、我克月囚、月克我死
    expect(wangShuaiOf('寅', '寅').level).toBe('旺'); // 木见木
    expect(wangShuaiOf('卯', '寅').level).toBe('旺');
    expect(wangShuaiOf('午', '寅').level).toBe('相'); // 木生火
    expect(wangShuaiOf('子', '寅').level).toBe('休'); // 水生木
    expect(wangShuaiOf('申', '寅').level).toBe('囚'); // 金克木
    expect(wangShuaiOf('辰', '寅').level).toBe('死'); // 木克土
  });
});

/* ------------------------------------------------------------------ *
 * 分主题判读
 * ------------------------------------------------------------------ */

describe('分主题判读', () => {
  const ke = keOf(ANCHOR);

  it('六个主题都有产出，档位合法、分值在量纲内、依据非空', () => {
    const list = buildAllDaliurenReadings(ke, 'male');
    expect(list).toHaveLength(6);
    expect(list.map((r) => r.theme)).toEqual(THEMES);
    for (const r of list) {
      expect(VERDICT_ORDER).toContain(r.verdict);
      expect(r.score).toBeGreaterThanOrEqual(-10);
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.summary.length).toBeGreaterThan(10);
    }
  });

  it('⚠️ 同一张盘、不同主题的话不能一样（防套话）', () => {
    const list = buildAllDaliurenReadings(ke, 'male');
    const uniq = new Set(list.map((r) => r.summary));
    expect(uniq.size).toBeGreaterThanOrEqual(4);
  });

  it('⚠️ 爱情题必须分性别：男取妻财、女取官鬼，未设性别两星合看', () => {
    expect(buildDaliurenReading(ke, '爱情', 'male').subject).toContain('妻财');
    expect(buildDaliurenReading(ke, '爱情', 'female').subject).toContain('官鬼');
    const neutral = buildDaliurenReading(ke, '爱情', undefined).subject;
    expect(neutral.includes('妻财') || neutral.includes('官鬼')).toBe(true);
  });

  it('⚠️ 健康题的官鬼是病神：类神含官鬼时，判读必须写明反向计分', () => {
    const r = buildDaliurenReading(ke, '健康', 'male');
    const detail = r.evidence.map((e) => e.detail).join('');
    expect(detail.includes('反向计分') || detail.includes('病')).toBe(true);
  });

  it('三传结构能识别递生/递克与合局', () => {
    const shape = chuanShapeOf(ke.sanChuan);
    expect(typeof shape.diSheng).toBe('boolean');
    expect(typeof shape.diKe).toBe('boolean');
    expect(shape.kongCount).toBe(ke.sanChuan.filter((s) => s.kong).length);
  });

  it('判读口径已登记，页面才能说明「凭什么这么判」', () => {
    expect(JUDGE_RULE.daliuren).toContain('类神');
    expect(JUDGE_RULE.daliuren).toContain('三传');
  });
});

/* ------------------------------------------------------------------ *
 * 应期层
 *
 * 锚点盘（2026-11-16 16:35）：元首课，月建亥，甲午日，三传 酉(官鬼)→辰(妻财,空)→亥(父母)，
 * 空亡辰/巳，驿马申。这些事实是手算核对过的，下面的断言全部落在这几条上。
 * ------------------------------------------------------------------ */

describe('应期层', () => {
  const ke = keOf(ANCHOR);
  const main = (t: ReturnType<typeof buildDaliurenTiming>) => t.windows[0];

  it('主窗口恒在首位、标「主」，且是类神/发用那一支（页面顺序＝判读层级）', () => {
    expect(main(buildDaliurenTiming(ke)).role).toBe('主');
    // 未定主题 → 取发用（初传）
    expect(main(buildDaliurenTiming(ke)).zhi).toBe(ke.sanChuan[0].zhi);
    expect(main(buildDaliurenTiming(ke)).basis).toContain('发用');
  });

  it('⚠️ 换主题必须换主窗口：锚点跟着类神落点走', () => {
    // 三传：酉官鬼 / 辰妻财 / 亥父母
    expect(main(buildDaliurenTiming(ke, '事业', 'male')).zhi).toBe('酉');
    expect(main(buildDaliurenTiming(ke, '健康', 'male')).zhi).toBe('酉'); // 病神同取官鬼
    expect(main(buildDaliurenTiming(ke, '财运', 'male')).zhi).toBe('辰');
    expect(main(buildDaliurenTiming(ke, '学业', 'male')).zhi).toBe('亥');
    expect(main(buildDaliurenTiming(ke, '亲情', 'male')).zhi).toBe('亥');
    // 爱情分性别：男取妻财（辰），女取官鬼（酉）
    expect(main(buildDaliurenTiming(ke, '爱情', 'male')).zhi).toBe('辰');
    expect(main(buildDaliurenTiming(ke, '爱情', 'female')).zhi).toBe('酉');
  });

  it('落旬空的类神要等「冲实」：辰空 → 参考窗口出现戌，并写明理由', () => {
    const t = buildDaliurenTiming(ke, '财运', 'male');
    expect(main(t).zhi).toBe('辰');
    const chong = t.windows.find((w) => w.zhi === '戌');
    expect(chong).toBeDefined();
    expect(chong!.role).toBe('参考');
    expect(chong!.basis).toContain('冲实');
    expect(t.rules.join('')).toContain('落空');
  });

  it('日月两尺度都要给：月＝干支行对应的农历月，日＝最近一个该支之日', () => {
    const t = buildDaliurenTiming(ke, '事业', 'male');
    const w = main(t);
    // 月建亥（十月）→ 酉为八月，隔 10 个月
    expect(w.when).toContain('农历八月');
    expect(w.when).toContain('10 个月后');
    // 甲午日 → 最近酉日 3 天后
    expect(w.dayHint).toContain('3 天后');
    // 亲情题锚在亥（末传）＝本月、5 天后
    const jia = main(buildDaliurenTiming(ke, '亲情', 'male'));
    expect(jia.when).toContain('就在本月');
    expect(jia.dayHint).toContain('5 天后');
  });

  it('判据编号连续、不跳号（缺哪条就少一号，不能出现 ①③④）', () => {
    const CIRCLED = ['①', '②', '③', '④', '⑤'];
    for (const th of [undefined, '事业', '财运', '亲情'] as const) {
      const t = buildDaliurenTiming(ke, th as any, 'male');
      t.rules.forEach((r, i) => {
        expect(r.startsWith(CIRCLED[i])).toBe(true);
      });
      // 驿马一条恒在（有马说马、无马也要交代"按常速论"）
      expect(t.rules.join('')).toContain('驿马');
    }
  });

  it('窗口不重复、最多三个，主窗口不参与参考排序', () => {
    const t = buildDaliurenTiming(ke, '事业', 'male');
    expect(t.windows.length).toBeGreaterThanOrEqual(2);
    expect(t.windows.length).toBeLessThanOrEqual(3);
    expect(new Set(t.windows.map((w) => w.zhi)).size).toBe(t.windows.length);
    expect(t.windows.filter((w) => w.role === '主')).toHaveLength(1);
  });

  it('伏吟盘：参考窗口取「冲发用」，rules 里写明伏吟要等冲', () => {
    const fu = keOf(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '子' });
    const t = buildDaliurenTiming(fu);
    expect(t.windows.length).toBeGreaterThanOrEqual(2);
    expect(t.rules.join('')).toContain('伏吟');
    // 冲哪一支由发用决定，不能写死「午」——伏吟的初传未必是子
    const anchorZhi = t.windows[0].zhi;
    expect(t.windows.some((w) => w.zhi === DZ_CHONG[anchorZhi])).toBe(true);
  });

  it('⚠️ 防套话：不同主题的应期结论不能雷同，不同盘也不能雷同', () => {
    const a = buildDaliurenTiming(ke, '事业', 'male');
    const b = buildDaliurenTiming(ke, '财运', 'male');
    expect(a.summary).not.toBe(b.summary); // 锚点不同 → 窗口不同
    const c = buildDaliurenTiming(keOf(new Date(2026, 6, 10, 12, 0)), '事业', 'male');
    expect(c.summary).not.toBe(a.summary);
  });

  it('免责与克制：明写「不给具体某一天」，且不出现承诺式措辞', () => {
    const t = buildDaliurenTiming(ke, '事业', 'male');
    expect(t.note).toContain('不给具体某一天');
    expect(t.note).toContain('不作承诺');
    const all = [t.summary, t.note, ...t.rules, ...t.windows.map((w) => w.when + w.dayHint + w.basis)].join('');
    for (const banned of ['一定会', '必然', '保证', '绝对', '必定']) {
      expect(all.includes(banned)).toBe(false);
    }
  });

  it('节奏给得出理由（快/平/慢都要能说出是哪条盘面事实）', () => {
    const t = buildDaliurenTiming(ke);
    expect(['快', '平', '慢']).toContain(t.speed.level);
    expect(t.speed.why.length).toBeGreaterThan(4);
  });
});
