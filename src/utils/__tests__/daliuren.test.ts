import { describe, it, expect } from 'vitest';
import {
  buildKe, monthJiangOf, liuQinOf, JI_GONG, DI_ZHI_ORDER, ZHONG_QI_JIANG,
  type KeResult,
} from '../daliurenCore';
import {
  buildAllDaliurenReadings, buildDaliurenActions, buildKeGe,
  buildDaliurenReading, buildDaliurenTiming, wangShuaiOf, chuanShapeOf,
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

/* ------------------------------------------------------------------ *
 * 行动层：把盘面翻成「找谁、往哪走、怎么推」
 * 锚点盘同上：元首课，三传 酉(官鬼,勾陈)→辰(妻财,玄武,空)→亥(父母)，空亡辰/巳，驿马申。
 * ------------------------------------------------------------------ */

describe('行动层', () => {
  const ke = keOf(ANCHOR);
  const of = (t?: Parameters<typeof buildDaliurenActions>[1]) => buildDaliurenActions(ke, t, 'male');
  const pick = (t: Parameters<typeof buildDaliurenActions>[1], kind: string) =>
    of(t).find((a) => a.kind === kind)!;

  it('四类动作齐备：找人 / 方向 / 方式 / 避坑（页面按这四类分条）', () => {
    const kinds = of('事业').map((a) => a.kind);
    expect(kinds).toEqual(['找人', '方向', '方式', '避坑']);
    // 换主题也不能塌成三条：课体恒在，方向恒给
    for (const th of THEMES) {
      const ks = buildDaliurenActions(ke, th, 'male').map((a) => a.kind);
      expect(ks).toContain('找人');
      expect(ks).toContain('方向');
      expect(ks).toContain('方式');
      expect(ks).toContain('避坑');
    }
  });

  it('每条都要带可核对的盘面依据，且不留空串、不写「缺数据」', () => {
    for (const th of THEMES) {
      for (const a of buildDaliurenActions(ke, th, 'male')) {
        expect(a.action.length).toBeGreaterThan(6);
        expect(a.basis.length).toBeGreaterThan(6);
        expect(a.action).not.toContain('缺数据');
        expect(a.basis).not.toContain('缺数据');
        // basis 必须能被用户对着盘核：含地支、天将、课体、方位之一
        expect(a.basis).toMatch(/[子丑寅卯辰巳午未申酉戌亥]|天将|课体|驿马/);
      }
    }
  });

  it('⚠️ 同一颗天将换主题就是另一类人：事业「勾陈＝老经办」，健康「勾陈＝老病历」', () => {
    const career = pick('事业', '找人');
    const med = pick('健康', '找人');
    expect(career.basis).toContain('勾陈');
    expect(med.basis).toContain('勾陈');
    expect(career.action).toContain('经办');
    expect(med.action).toContain('病历');
    expect(career.action).not.toBe(med.action);
  });

  it('⚠️ 凶将不是人选：类神乘玄武时，「找人」必须回落到吉将并说明理由', () => {
    // 财运：妻财乘玄武（辰），玄武主「没说清的部分」，不能当「该去找的人」
    const money = pick('财运', '找人');
    expect(money.basis).toContain('玄武');
    expect(money.basis).toContain('不是人选');
    expect(money.action).not.toContain('暗处的人');
    expect(money.action).toContain('还没现形');
    // 爱情题回落的是牵线人，不是「有第三方没说清的人」
    expect(pick('爱情', '找人').action).toContain('牵线人');
    expect(pick('爱情', '找人').action).not.toContain('第三方');
  });

  it('⚠️ 「空」的提醒分主题：财运说别付钱，爱情说别摊牌，两者不能互换', () => {
    const money = pick('财运', '方式').action;
    const love = pick('爱情', '方式').action;
    expect(money).toContain('付钱');
    expect(love).toContain('摊牌');
    expect(love).not.toContain('付钱');
    expect(money).not.toContain('摊牌');
    // 问健康的人不该被嘱咐「定金」「签字」
    expect(pick('健康', '方式').action).not.toContain('定金');
    expect(pick('健康', '方式').action).not.toContain('签字');
  });

  it('⚠️ 方向锚点不落旬空之支：妻财辰空 → 改锚三传中不空的那一支', () => {
    expect(ke.flags.kongZhi).toContain('辰');
    const d = pick('财运', '方向');
    expect(d.basis).toContain('旬空');
    expect(d.basis).not.toContain('锚定辰');
    // 通盘检查：任何主题给出的锚定支都不能是空支
    for (const th of THEMES) {
      const basis = pick(th, '方向').basis;
      const m = basis.match(/锚定(.)/);
      if (m) expect(ke.flags.kongZhi.includes(m[1])).toBe(false);
    }
  });

  it('方式由课体定，且 manner 文本跨主题通用（不写只适合事业的「走审批」）', () => {
    const way = pick('健康', '方式');
    expect(way.basis).toContain(ke.keTi.name);
    expect(way.action).not.toContain('审批');
    expect(way.action).not.toContain('客户');
  });

  it('避坑必须落在具体盘面事实上：要么对面压过来、要么重空、要么天将、要么伏吟', () => {
    for (const th of THEMES) {
      const p = pick(th, '避坑');
      expect(p.basis).toMatch(/克|旬空|乘|伏吟/);
    }
  });

  it('⚠️ 天将按「天盘支」取，不按「在哪一课取到」：类神从四课取到时也要有将名', () => {
    // 这张盘的妻财不在三传，落「日干上神」（子）乘太常——若只读三传的 tianJiang，
    // 就会写出「妻财乘落…」这种断句
    const sk = keOf(new Date(2026, 10, 1, 1, 0), { hourZhi: '戌' });
    const a = buildDaliurenActions(sk, '爱情', 'male').find((x) => x.kind === '找人')!;
    expect(a.basis).toContain('日干上神');
    expect(a.basis).toContain('太常');
    expect(a.basis).not.toMatch(/乘[（落，。；）]/);
    expect(a.action).toContain('熟人');
  });

  it('天将不会缺席：任意盘任意主题下，「乘」后面必须跟将名', () => {
    const dates = [
      new Date(2026, 10, 1, 1, 0), new Date(2026, 10, 8, 9, 0), new Date(2026, 10, 16, 16, 35),
      new Date(2026, 6, 10, 12, 0), new Date(2026, 0, 20, 6, 0),
    ];
    for (const d of dates) {
      const k = keOf(d);
      for (const th of THEMES) {
        for (const a of buildDaliurenActions(k, th, 'male')) {
          expect(a.basis).not.toMatch(/乘[（落，。；）]/);
          expect(a.action).not.toMatch(/乘[（落，。；）]/);
        }
      }
    }
  });

  it('⚠️ 防套话：换盘必须换话（同一套句子换个盘还成立就是套话）', () => {
    const other = keOf(new Date(2026, 6, 10, 12, 0));
    const a = buildDaliurenActions(ke, '事业', 'male');
    const b = buildDaliurenActions(other, '事业', 'male');
    const dirA = a.find((x) => x.kind === '方向')!;
    const dirB = b.find((x) => x.kind === '方向')!;
    expect(dirA.basis).not.toBe(dirB.basis);
  });

  it('不使用承诺式措辞，也不给医疗/法律/财务的指令', () => {
    const all = THEMES.flatMap((th) => buildDaliurenActions(ke, th, 'male'))
      .map((a) => a.action + a.basis).join('');
    for (const banned of ['一定会', '必然', '保证', '绝对', '必定']) {
      expect(all.includes(banned)).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 课格：这张盘的「气象」
 *
 * ⚠️ 课格与「课体」不是一个维度：课体说三传怎么取（元首/涉害/伏吟…），
 * 课格说整张盘长什么样（成局/连茹/禄/六纯…）。所以课格**不改课体、不产分数**。
 * ------------------------------------------------------------------ */

describe('课格', () => {
  const geOf = (d: Date, o?: Parameters<typeof buildKe>[1]) => buildKeGe(buildKe(d, o));
  const names = (d: Date, o?: Parameters<typeof buildKe>[1]) => geOf(d, o).map((g) => g.name);

  it('至少一条、格名不重复、每条都有可核对的白话与依据', () => {
    for (let mo = 0; mo < 12; mo += 2) {
      const gs = geOf(new Date(2026, mo, 11, 10, 0));
      expect(gs.length).toBeGreaterThanOrEqual(1);
      expect(new Set(gs.map((g) => g.name)).size).toBe(gs.length);
      for (const g of gs) {
        expect(g.plain.length).toBeGreaterThan(8);
        expect(g.basis.length).toBeGreaterThan(8);
        expect(g.basis).toMatch(/[子丑寅卯辰巳午未申酉戌亥]/);
      }
    }
  });

  it('三合成局：三传恰见三合三支才论格，四局各对应一个格名', () => {
    // 三传 → 局：巳酉丑金 / 亥卯未木 / 寅午戌火 / 申子辰水（锚点盘手算核对过）
    expect(names(new Date(2026, 10, 8, 10, 0), { hourZhi: '亥' })).toContain('从革格');
    expect(names(new Date(2026, 1, 27, 10, 0), { hourZhi: '未' })).toContain('曲直格');
    expect(names(new Date(2026, 1, 19, 10, 0), { hourZhi: '卯' })).toContain('炎上格');
    expect(names(new Date(2026, 0, 11, 10, 0), { hourZhi: '酉' })).toContain('润下格');
  });

  it('稼穑：三传皆土（辰戌丑未）论稼穑格，且不再叠一个三合格', () => {
    const k = buildKe(new Date(2026, 0, 3, 10, 0), { hourZhi: '丑' });
    expect(k.sanChuan.map((s) => s.zhi).sort()).toEqual(['丑', '戌', '未'].sort());
    const ns = buildKeGe(k).map((g) => g.name);
    expect(ns).toContain('稼穑格');
    expect(ns).not.toContain('曲直格');
    expect(ns).not.toContain('炎上格');
  });

  it('连茹：三支依次相连才论，进为顺、退为逆', () => {
    // 三传 亥→子→丑（进）、子→亥→戌（退）
    expect(names(new Date(2026, 6, 10, 10, 0), { hourZhi: '午' })).toContain('进连茹');
    expect(names(new Date(2026, 0, 3, 10, 0), { hourZhi: '寅' })).toContain('退连茹');
  });

  it('伏吟盘不会误判成连茹（三传有同支，间距为 0 不是 1）', () => {
    const fu = buildKe(new Date(2026, 10, 16, 0, 30), { hourZhi: '子', jiangZhi: '子' });
    expect(fu.flags.fuYin).toBe(true);
    const ns = buildKeGe(fu).map((g) => g.name);
    expect(ns).not.toContain('进连茹');
    expect(ns).not.toContain('退连茹');
  });

  it('禄：入三传 与 临日辰 互斥，只出一条', () => {
    // 丙日，禄在巳，三传 酉/丑/巳 → 禄入末传
    const k = buildKe(new Date(2026, 10, 8, 10, 0), { hourZhi: '亥' });
    expect(k.dateInfo.dayGan).toBe('丙');
    const ns = buildKeGe(k).map((g) => g.name);
    expect(ns).toContain('禄入三传');
    expect(ns).not.toContain('禄临日辰');
    // 甲日，禄在寅，末传寅
    expect(names(new Date(2026, 0, 20, 10, 0), { hourZhi: '卯' })).toContain('禄入三传');
  });

  it('六纯：四课上神与三传共七支全阳 / 全阴各有一格', () => {
    expect(names(new Date(2026, 1, 19, 10, 0), { hourZhi: '丑' })).toContain('六纯·纯阳');
    expect(names(new Date(2026, 3, 5, 10, 0), { hourZhi: '辰' })).toContain('六纯·纯阴');
  });

  it('⚠️ 不许有「几乎恒真」的判据：三传失令必须在三成以下（常态不能写成不利）', () => {
    const HOURS = ['子', '卯', '午', '酉'];
    let total = 0;
    let weak = 0;
    for (let mo = 0; mo < 12; mo++) {
      for (const h of HOURS) {
        const gs = geOf(new Date(2026, mo, 11, 10, 0), { hourZhi: h });
        total++;
        if (gs.some((g) => g.name === '三传失令')) weak++;
      }
    }
    // 旧判据是「休囚死 ≥2」→ 十二支里旺相恒只占四支，几乎每盘都成立（实测 100%）
    expect(total).toBe(48);
    expect(weak / total).toBeLessThan(0.35);
    expect(weak).toBeGreaterThan(0); // 也不能反过来永不成立
  });

  it('⚠️ 结构上不可达的格不得复活：三传全空 / 三传同一类 都已删除', () => {
    // 旬空恒为一对（如寅卯），三传三支要全空必须三支都落进同一对 → 需两支相同，
    // 而两支相同只出现在伏吟/返吟，其取传法又不与空亡对重合 → 永远不可达。
    const HOURS = ['子', '卯', '午', '酉'];
    for (let mo = 0; mo < 12; mo++) {
      for (const h of HOURS) {
        const ns = geOf(new Date(2026, mo, 11, 10, 0), { hourZhi: h }).map((g) => g.name);
        expect(ns).not.toContain('三传全空');
        // 「六亲全同」只可能发生在三传同五行，那必然已是成局格 → 单出就是同一件事说两遍
        expect(ns).not.toContain('三传同一类');
      }
    }
  });

  it('与判读解耦：不产分数、不改课体与三传', () => {
    const k = buildKe(new Date(2026, 10, 8, 10, 0), { hourZhi: '亥' });
    const before = `${k.keTi.name}|${k.sanChuan.map((s) => s.zhi + s.tianJiang).join(',')}`;
    const gs = buildKeGe(k);
    // 只允许这三个字段：后人不许往这里塞 score/weight 把展示层改成判据层
    for (const g of gs) expect(Object.keys(g).sort()).toEqual(['basis', 'name', 'plain']);
    expect(`${k.keTi.name}|${k.sanChuan.map((s) => s.zhi + s.tianJiang).join(',')}`).toBe(before);
    // 判读层的分值也不该因为调用过课格而变化
    const a = buildDaliurenReading(k, '事业', 'male').score;
    buildKeGe(k);
    expect(buildDaliurenReading(k, '事业', 'male').score).toBe(a);
  });

  it('稳定且防套话：同盘重算一致，异盘的组合不同', () => {
    const d1 = new Date(2026, 10, 8, 10, 0);
    const d2 = new Date(2026, 6, 10, 10, 0);
    expect(JSON.stringify(geOf(d1, { hourZhi: '亥' }))).toBe(JSON.stringify(geOf(d1, { hourZhi: '亥' })));
    expect(JSON.stringify(geOf(d1, { hourZhi: '亥' }))).not.toBe(JSON.stringify(geOf(d2, { hourZhi: '午' })));
  });

  it('不用承诺式措辞', () => {
    const all = [new Date(2026, 10, 8, 10, 0), new Date(2026, 1, 19, 10, 0), new Date(2026, 3, 5, 10, 0)]
      .flatMap((d) => geOf(d).map((g) => g.plain + g.basis)).join('');
    for (const banned of ['一定会', '必然', '保证', '绝对', '必定', '百分之']) {
      expect(all.includes(banned)).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 去套话：判据是「这句换任何盘还成立吗？」
 *
 * ⚠️ 这一组是回归护栏。曾经的情况：课体证据在 90 张盘上一字不差、
 *    天将证据在 21 张盘上一字不差、advice 按档位出（六成盘同句）、
 *    课格 20 条的 plain 全是常量。改文案时若把落点弄丢，这里会红。
 * ------------------------------------------------------------------ */

describe('去套话（跨盘不变量）', () => {
  const HOURS = ['子', '卯', '午', '酉'];
  const sample: ReturnType<typeof buildKe>[] = [];
  for (let mo = 0; mo < 12; mo++) {
    for (const h of HOURS) sample.push(buildKe(new Date(2026, mo, 11, 10, 0), { hourZhi: h }));
  }

  /** 收集「槽位 → 文本数组」 */
  const slotsOf = () => {
    const slots: Record<string, string[]> = {};
    const put = (k: string, v: string) => { (slots[k] ||= []).push(v); };
    for (const ke of sample) {
      for (const r of buildAllDaliurenReadings(ke, 'male')) {
        put(`${r.theme}|advice`, r.advice);
        for (const e of r.evidence) put(`${r.theme}|ev.${e.label}`, e.detail);
      }
      for (const th of THEMES) {
        for (const a of buildDaliurenActions(ke, th, 'male')) put(`${th}|act.${a.kind}`, a.action);
      }
      for (const g of buildKeGe(ke)) put(`keGe|${g.name}`, g.plain);
    }
    return slots;
  };

  it('⚠️ 没有「一槽一句」：任何槽位在 12 张以上样本里，最高频说法不得超过六成', () => {
    const slots = slotsOf();
    const bad: string[] = [];
    for (const [slot, arr] of Object.entries(slots)) {
      if (arr.length < 12) continue; // 稀有格（如纯阳）样本少，不适用
      const cnt: Record<string, number> = {};
      for (const v of arr) cnt[v] = (cnt[v] || 0) + 1;
      const top = Math.max(...Object.values(cnt));
      if (top / arr.length >= 0.6) {
        bad.push(`${slot}: ${((top / arr.length) * 100).toFixed(0)}% ×${arr.length} —— ${Object.keys(cnt).find((k) => cnt[k] === top)!.slice(0, 40)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('天将证据必须带落点（哪一步、哪一支），不能只写「X 乘 Y——主……」', () => {
    for (const ke of sample.slice(0, 12)) {
      for (const r of buildAllDaliurenReadings(ke, 'male')) {
        for (const e of r.evidence.filter((x) => x.label.startsWith('天将·'))) {
          expect(e.detail).toContain('落在');
          expect(e.detail).toMatch(/初传|中传|末传|日干上神|日支上神/);
          // 同一颗天将乘同一六亲的固定尾句已经删掉，不许回来
          expect(e.detail).not.toContain('不改事情的方向');
        }
      }
    }
  });

  it('课体证据必须带上这一次的三传，不能只报课体名', () => {
    for (const ke of sample.slice(0, 12)) {
      const zhis = ke.sanChuan.map((s) => s.zhi);
      for (const r of buildAllDaliurenReadings(ke, 'male')) {
        for (const e of r.evidence.filter((x) => x.label.startsWith('课体·'))) {
          expect(zhis.some((z) => e.detail.includes(z))).toBe(true);
          expect(e.detail).toContain('起手');
        }
      }
    }
  });

  it('advice 必须是「档位原则 + 这张盘的落点」，落点缺了就等于套话', () => {
    for (const ke of sample.slice(0, 12)) {
      for (const r of buildAllDaliurenReadings(ke, 'male')) {
        expect(r.advice).toMatch(/起手|落在中间|收尾|你这一头|对面那一头|没摆到明面上/);
        expect(r.advice.length).toBeGreaterThan(42);
      }
    }
  });

  it('⚠️ 不同盘的两份文案不能读成同一篇：整句重复率平均 <0.35、最高 <0.85', () => {
    const texts = sample.slice(0, 16).map((ke) => {
      const buf: string[] = [];
      for (const r of buildAllDaliurenReadings(ke, 'male')) buf.push(r.summary, r.advice, ...r.evidence.map((e) => e.detail));
      for (const a of buildDaliurenActions(ke, '事业', 'male')) buf.push(a.action);
      for (const g of buildKeGe(ke)) buf.push(g.plain);
      return buf.join('。');
    });
    const sents = (s: string) => new Set(s.split(/[。；！？]/).map((x) => x.trim()).filter((x) => x.length > 8));
    const S = texts.map(sents);
    let sum = 0;
    let cnt = 0;
    let mx = 0;
    for (let i = 0; i < S.length; i++) {
      for (let j = i + 1; j < S.length; j++) {
        // 三传课体完全相同的两张盘，话接近是对的——那不是套话，是同一张盘
        let inter = 0;
        for (const g of S[i]) if (S[j].has(g)) inter++;
        const rate = inter / Math.min(S[i].size, S[j].size);
        sum += rate;
        cnt++;
        if (rate > mx) mx = rate;
      }
    }
    expect(sum / cnt).toBeLessThan(0.35);
    expect(mx).toBeLessThan(0.85);
  });

  it('同一张盘的六个主题，advice 不能六份都一样（档位句随主题换）', () => {
    const ke = keOf(ANCHOR);
    const advices = buildAllDaliurenReadings(ke, 'male').map((r) => r.advice);
    expect(new Set(advices).size).toBeGreaterThanOrEqual(4);
  });
});
