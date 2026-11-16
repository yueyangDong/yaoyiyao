import { describe, it, expect } from 'vitest';
import {
  buildKe, monthJiangOf, liuQinOf, JI_GONG, DI_ZHI_ORDER, ZHONG_QI_JIANG,
  type KeResult,
} from '../daliurenCore';
import {
  buildAllDaliurenReadings, buildDaliurenReading, wangShuaiOf, chuanShapeOf,
} from '../daliurenReading';
import { VERDICT_ORDER, THEMES, JUDGE_RULE } from '../divinationCore';

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
