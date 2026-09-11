// ========== 排盘逻辑校准测试（2026-09-02） ==========
// 用独立实现的安星/遁干/十神规则 + 已知公开参考值，交叉核对排盘库输出。
// 规则来源：《渊海子平》五鼠遁/五虎遁、十神定义；《紫微斗数全书》安命宫/身宫/五行局诀。
import { describe, it, expect } from 'vitest';
import { Solar, Lunar } from 'lunar-typescript';
import { ziwei } from '@ziweijs/core';
import { getTrueSolarHour, correctSolarTime } from '../../context/UserContext';
import { analyzeDayMasterStrength, recommendYongShen } from '../../utils/baziAnalysis';
import { enrichGongData, getMingShenGongBranch } from '../../utils/ziweiPalaceData';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 五鼠遁（日干定时干）：甲己→甲子起；五虎遁（年干定月干）：甲己→丙寅起
const ratStart = (g: string) => ['甲', '丙', '戊', '庚', '壬'][GAN.indexOf(g) % 5];
const tigerStart = (g: string) => ['丙', '戊', '庚', '壬', '甲'][GAN.indexOf(g) % 5];
const WX = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' } as Record<string, string>;
const YANG = ['甲', '丙', '戊', '庚', '壬'];
const SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' } as Record<string, string>;
const KE = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' } as Record<string, string>;
/** 十神：a=日干(我), b=他干。我克=财、克我=官杀、我生=食伤、生我=印、同类=比劫 */
function shiShen(a: string, b: string): string {
  const wa = WX[a], wb = WX[b];
  const sameYy = YANG.includes(a) === YANG.includes(b);
  if (wa === wb) return sameYy ? '比肩' : '劫财';
  if (SHENG[wa] === wb) return sameYy ? '食神' : '伤官';
  if (SHENG[wb] === wa) return sameYy ? '偏印' : '正印';
  if (KE[wa] === wb) return sameYy ? '偏财' : '正财';
  if (KE[wb] === wa) return sameYy ? '七杀' : '正官';
  return '?';
}

describe('八字排盘校准（lunar-typescript）', () => {
  it('节气换界（已知参考）：2024-02-04 16:26 立春，前后年月柱换界', () => {
    const before = Solar.fromYmdHms(2024, 2, 4, 10, 0, 0).getLunar().getEightChar();
    expect(before.getYear()).toBe('癸卯');
    expect(before.getMonth()).toBe('乙丑');
    const after = Solar.fromYmdHms(2024, 2, 4, 18, 0, 0).getLunar().getEightChar();
    expect(after.getYear()).toBe('甲辰');
    expect(after.getMonth()).toBe('丙寅');
  });

  it('早晚子时（默认流派 sect=2：晚子时日柱算当天）', () => {
    const late = Solar.fromYmdHms(2024, 2, 4, 23, 30, 0).getLunar().getEightChar();
    const early = Solar.fromYmdHms(2024, 2, 5, 0, 30, 0).getLunar().getEightChar();
    expect(late.getSect()).toBe(2);
    expect(late.getDay()).toBe('戊戌');   // 当天日柱
    expect(early.getDay()).toBe('己亥');  // 次日日柱
    // 两派时柱同为次日(己亥)五鼠遁的甲子时
    expect(late.getTime()).toBe('甲子');
    expect(early.getTime()).toBe('甲子');
  });

  it('五鼠遁/五虎遁/十神 与独立实现全量一致（2400 时辰采样）', () => {
    let checked = 0;
    for (let d = 0; d < 600; d++) {
      const s = Solar.fromYmd(2020, 1, 1).next(d * 3 + 1);
      for (const h of [1, 7, 13, 19]) {
        const ec = Solar.fromYmdHms(s.getYear(), s.getMonth(), s.getDay(), h, 30, 0).getLunar().getEightChar();
        // 五鼠遁：时干 = 起点 + 时支序
        const tExpect = GAN[(GAN.indexOf(ratStart(ec.getDayGan())) + ZHI.indexOf(ec.getTimeZhi())) % 10];
        expect(ec.getTimeGan()).toBe(tExpect);
        // 五虎遁：月干 = 起点 + (月支序 - 寅序)
        const mExpect = GAN[(GAN.indexOf(tigerStart(ec.getYearGan())) + ((ZHI.indexOf(ec.getMonthZhi()) - 2 + 12) % 12)) % 10];
        expect(ec.getMonthGan()).toBe(mExpect);
        // 十神（日干为基准；日柱自身返回"日主"为库的约定）
        expect(ec.getYearShiShenGan()).toBe(shiShen(ec.getDayGan(), ec.getYearGan()));
        expect(ec.getMonthShiShenGan()).toBe(shiShen(ec.getDayGan(), ec.getMonthGan()));
        expect(ec.getTimeShiShenGan()).toBe(shiShen(ec.getDayGan(), ec.getTimeGan()));
        checked++;
      }
    }
    expect(checked).toBe(2400);
  });
});

describe('真太阳时校正（getTrueSolarHour）', () => {
  it('经度差校正：乌鲁木齐(87.6°E) 12:00 → 09:50（早 2 小时 10 分）', () => {
    const r = getTrueSolarHour(12, 0, 87.6);
    expect(r.hour).toBe(9);
    expect(r.minute).toBe(50);
    expect(r.dayOffset).toBe(0);
  });

  it('跨午夜回退：乌鲁木齐 00:10 → 前一日 22:00（dayOffset=-1，否则日柱错一天）', () => {
    const r = getTrueSolarHour(0, 10, 87.6);
    expect(r.dayOffset).toBe(-1);
    expect(r.hour).toBe(22);
  });

  it('跨午夜进位：佳木斯(130.3°E) 23:30 → 次日 00:11（dayOffset=1）', () => {
    const r = getTrueSolarHour(23, 30, 130.3);
    expect(r.dayOffset).toBe(1);
    expect(r.hour).toBe(0);
    expect(r.minute).toBe(11);
  });

  it('均时差：11 月初 EoT≈+16 分钟（date 传入时生效）', () => {
    const withEot = getTrueSolarHour(12, 0, 120, new Date(2024, 10, 3));
    expect(withEot.hour).toBe(12);
    expect(withEot.minute).toBeGreaterThanOrEqual(15);
    const noEot = getTrueSolarHour(12, 0, 120);
    expect(noEot.minute).toBe(0);
  });

  it('舍入边界：分钟四舍五入不得产出 minute=60（南京 118.8°E，2 月中旬 EoT≈-14 分，12:19）', () => {
    // 旧实现先拆 hour 再 round(minute)：719.71 分 → hour=11, minute=60，lunar-typescript 直接抛 "wrong minute 60"
    const r = getTrueSolarHour(12, 19, 118.8, new Date(2024, 1, 20));
    expect(r.minute).toBeGreaterThanOrEqual(0);
    expect(r.minute).toBeLessThan(60);
    // 总分钟数 719.71 先取整为 720 → 12:00（hour 同步进位，三者自洽）
    expect(r.hour).toBe(12);
    expect(r.minute).toBe(0);
    expect(r.dayOffset).toBe(0);
  });

  it('correctSolarTime：lng=120（经度差为 0）均时差仍然生效——EoT 与经度无关', () => {
    const r = correctSolarTime({ year: 2024, month: 11, day: 3, hour: 12, minute: 0, lng: 120 });
    expect(r.hour).toBe(12);
    expect(r.minute).toBeGreaterThanOrEqual(15);
  });

  it('correctSolarTime：农历输入按对应公历日算 EoT（农历 2000-7-17 ≙ 公历 2000-8-16）', () => {
    const viaLunar = correctSolarTime({ year: 2000, month: 7, day: 17, hour: 12, minute: 0, lng: 120, calendar: 'lunar' });
    const viaSolar = getTrueSolarHour(12, 0, 120, new Date(2000, 7, 16));
    expect(viaLunar).toEqual(viaSolar);
    // 反例：若错把农历 7-17 当公历 7-17，EoT 不同（-3.66 分 vs -5.88 分）
    const wrong = getTrueSolarHour(12, 0, 120, new Date(2000, 6, 17));
    expect(viaLunar.minute).not.toBe(wrong.minute);
  });
});

describe('紫微排盘校准（@ziweijs/core）', () => {
  // 参考盘：2000-08-16 寅时 男 → 庚辰年七月十七寅时
  // 命宫诀：寅起正月顺数至七月(申)，申起子时逆数至寅时(退2) → 午宫；宫干五虎遁庚年→壬午
  // 身宫诀：生月宫(申)起子时顺数至寅时(进2) → 戌宫
  // 五行局：命宫壬午纳音杨柳木 → 木三局
  const mk = (y: number, mo: number, d: number, h: number) =>
    ziwei.bySolar({ name: '', gender: 'male', date: new Date(y, mo - 1, d, h, 0, 0), language: 'zh-CN' } as any);

  it('命宫宫位/宫干：午宫壬午（安命宫诀 + 五虎遁）', () => {
    const r = mk(2000, 8, 16, 4);
    const ming = r.palaces.find((p: any) => p.name === '命宫')!;
    expect(ming.branch).toBe('午');
    expect(ming.stem).toBe('壬');
  });

  it('五行局：命宫壬午纳音杨柳木 → 木三局', () => {
    const r = mk(2000, 8, 16, 4);
    expect(r.fiveElementName).toBe('木三局');
  });

  it('十二宫次序：命宫定，其余按逆时针十二宫排布', () => {
    const r = mk(2000, 8, 16, 4);
    const names = r.palaces.map((p: any) => p.name);
    expect(names).toContain('夫妻');
    expect(names).toContain('财帛');
    expect(names).toContain('官禄');
    // 十二宫不重不漏
    expect(new Set(names).size).toBe(12);
  });

  it('命宫/身宫：安命身诀与 core 排盘互验（2000-08-16 寅时）', () => {
    const r = mk(2000, 8, 16, 4);
    const lu = Lunar.fromDate(new Date(2000, 7, 16, 4, 0));
    const { mingGongBranch, shenGongBranch, monthPalaceBranch } = getMingShenGongBranch(Math.abs(lu.getMonth()), lu.getTimeZhi());
    expect(monthPalaceBranch).toBe('申');  // 农历七月 → 月宫申
    expect(shenGongBranch).toBe('戌');     // 月宫申 + 寅(2) = 戌（身宫顺数生时）
    // core 命宫与独立公式命宫互验；身宫落宫存在
    const ming = r.palaces.find((p: any) => p.name === '命宫')!;
    expect(ming.branch).toBe(mingGongBranch);
    expect(r.palaces.find((p: any) => p.branch === shenGongBranch)).toBeTruthy();
  });
});

describe('紫微排盘校准（2004-08-10 09:55 女·文墨天机参考盘）', () => {
  // 参考盘：文墨天机专业版 2.5.16 → 阳女·火六局·命宫丙寅·紫微破军在丑·6岁起运阳女逆行。
  // 旧版 @ziweijs/core 用 (干序/2+支序/2-1)%5 推五行局，与六十甲子纳音不符：
  // 命宫丙寅（炉中火→火六局）被误判为土五局，导致紫微安星、十四主星、大限全部错位。
  // 已厂内化修复并按真实纳音表重算（src/vendor/ziweijs-core，vite/vitest alias 重定向）。
  const r: any = ziwei.bySolar({ name: '', gender: 'female', date: new Date(2004, 7, 10, 9, 55, 0), language: 'zh-CN' });
  const byName = (n: string) => r.palaces.find((p: any) => p.name === n);
  const majorNames = (n: string) => (byName(n).majorStars || []).map((s: any) => s.name);
  const yt = (n: string) =>
    Object.fromEntries((byName(n).majorStars || []).filter((s: any) => s.YT).map((s: any) => [s.name, s.YT.name]));

  it('阴阳属性与五行局：甲申年阳干生女 → 阳女；命宫丙寅纳音炉中火 → 火六局', () => {
    expect(r.gender).toBe('阳女');
    expect(r.fiveElementName).toBe('火六局');
    expect(r.fiveElementNum).toBe(6);
  });

  it('紫微落宫：丑宫', () => {
    expect(r.ziweiBranch).toBe('丑');
  });

  it('命宫丙寅，十四主星落宫与文墨天机一致', () => {
    expect(byName('命宫').stem + byName('命宫').branch).toBe('丙寅'); // 命宫空宫（借对宫）
    expect(majorNames('兄弟')).toEqual(['紫微', '破军']);
    expect(majorNames('夫妻')).toEqual(['天机']);
    expect(majorNames('子女')).toEqual([]);
    expect(majorNames('财帛')).toEqual(['太阳']);
    expect(majorNames('疾厄')).toEqual(['武曲', '七杀']);
    expect(majorNames('迁移')).toEqual(['天同', '天梁']);
    expect(majorNames('交友')).toEqual(['天相']);
    expect(majorNames('官禄')).toEqual(['巨门']);
    expect(majorNames('田宅')).toEqual(['廉贞', '贪狼']);
    expect(majorNames('福德')).toEqual(['太阴']);
    expect(majorNames('父母')).toEqual(['天府']);
  });

  it('生年四化（甲干：廉贞禄/破军权/武曲科/太阳忌）', () => {
    expect(yt('田宅')).toEqual({ '廉贞': '禄' });
    expect(yt('兄弟')).toEqual({ '破军': '权' });
    expect(yt('疾厄')).toEqual({ '武曲': '科' });
    expect(yt('财帛')).toEqual({ '太阳': '忌' });
  });

  it('大限：火六局6岁起运，阳女逆行（命6~15、兄16~25…父116~125）', () => {
    const expected: Record<string, [number, number]> = {
      '命宫': [6, 15], '兄弟': [16, 25], '夫妻': [26, 35], '子女': [36, 45],
      '财帛': [46, 55], '疾厄': [56, 65], '迁移': [66, 75], '交友': [76, 85],
      '官禄': [86, 95], '田宅': [96, 105], '福德': [106, 115], '父母': [116, 125],
    };
    for (const [name, range] of Object.entries(expected)) {
      expect(byName(name).horoscopeRanges).toEqual(range);
    }
  });

  it('甲级辅星安星（enrichGongData 补齐，逐星对照文墨天机）', () => {
    const gongData: any[] = r.palaces.map((p: any) => ({
      name: p.name, stem: p.stem, branch: p.branch, majorStars: p.majorStars, minorStars: [], minorStarDetails: [],
    }));
    enrichGongData(gongData, {
      fiveElementName: r.fiveElementName, yearGan: '甲', yearZhi: '申', gender: 'female',
      hourZhi: '巳', monthNum: 6,
    });
    const minors = (n: string) => gongData.find((g) => g.name === n)!.minorStarDetails.map((s: any) => s.name);
    expect(minors('命宫')).toEqual(expect.arrayContaining(['禄存', '天马', '天刑']));
    expect(minors('父母')).toEqual(expect.arrayContaining(['擎羊', '铃星']));
    expect(minors('兄弟')).toEqual(expect.arrayContaining(['陀罗', '天魁', '天喜']));
    expect(minors('交友')).toEqual(expect.arrayContaining(['天钺', '火星', '红鸾']));
    expect(minors('福德')).toEqual(expect.arrayContaining(['地劫']));
    expect(minors('官禄')).toEqual(expect.arrayContaining(['地空', '天姚']));
  });

  it('命宫/身宫公式：月宫未——命宫=未-巳=寅（与core互验），身宫=未+巳=子（夫妻宫）', () => {
    const { mingGongBranch, shenGongBranch, monthPalaceBranch } = getMingShenGongBranch(6, '巳');
    expect(monthPalaceBranch).toBe('未');
    expect(mingGongBranch).toBe('寅');
    expect(shenGongBranch).toBe('子');
    expect(byName('命宫').branch).toBe(mingGongBranch);     // core 命宫 = 安命诀
    expect(byName('夫妻').branch).toBe(shenGongBranch);     // 盘面"夫妻·身"标记落点
  });

  it('子时/午时命身同宫，卯时命身对冲（命身两宫关于月宫对称）', () => {
    // 逆数/顺数生时：偏移6时 ±6 ≡ 同宫（子、午时命身同宫），偏移3时相距6宫（卯酉对冲）
    expect(getMingShenGongBranch(6, '子').shenGongBranch).toBe(getMingShenGongBranch(6, '子').mingGongBranch);
    expect(getMingShenGongBranch(6, '午').shenGongBranch).toBe(getMingShenGongBranch(6, '午').mingGongBranch);
    const mao = getMingShenGongBranch(6, '卯');
    expect((ZHI.indexOf(mao.shenGongBranch) - ZHI.indexOf(mao.mingGongBranch) + 12) % 12).toBe(6);
    // 对称性：命宫 + 身宫 ≡ 2×月宫 (mod 12)
    const you = getMingShenGongBranch(6, '酉');
    expect((ZHI.indexOf(you.mingGongBranch) + ZHI.indexOf(you.shenGongBranch)) % 12)
      .toBe((2 * ZHI.indexOf(you.monthPalaceBranch)) % 12);
  });

  it('晚子时（23点）换日：农历基准与 core fixLateZiHour 对齐（除夕23点生）', () => {
    // 2004-01-21 23:00 = 癸未年除夕，次日为甲申年正月初一：
    // core 排盘按换日后（甲申年正月）定月宫与年干四化，应用侧必须同步 lu.next(1)，
    // 否则身宫/年干支/天刑天姚按癸未年腊月计算而错位
    const lu = Lunar.fromDate(new Date(2004, 0, 21, 23, 0));
    expect(lu.getMonth()).toBe(12);
    expect(lu.next(1).getMonth()).toBe(1);
    // 正月月宫=寅，子时命身同宫 → core 命宫应在寅（若 core 不换日则按腊月得丑，可证换日）
    const rl: any = ziwei.bySolar({ name: '', gender: 'male', date: new Date(2004, 0, 21, 23, 0), language: 'zh-CN' });
    const ming = rl.palaces.find((p: any) => p.name === '命宫');
    expect(ming.branch).toBe('寅');
    expect(ming.branch).toBe(getMingShenGongBranch(Math.abs(lu.next(1).getMonth()), '子').mingGongBranch);
  });

  it('纳音五行局全量校验：独立六十甲子表逐例核对（204 例采样）', () => {
    // 独立实现的六十甲子序列与三十对纳音五行（甲子乙丑金 … 壬戌癸亥水）
    const JIAZI = [
      '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
      '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
      '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
      '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
      '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
      '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
    ];
    const NA_YIN = ['金', '火', '木', '土', '金', '火', '水', '土', '金', '木', '水', '土', '火', '木', '水', '金', '火', '木', '土', '金', '火', '水', '土', '金', '木', '水', '土', '火', '木', '水'];
    const VALUE: Record<string, number> = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
    let checked = 0;
    for (let y = 1948; y <= 2044; y += 6) {
      for (let m = 1; m <= 12; m += 2) {
        for (const h of [3, 15]) {
          const res: any = ziwei.bySolar({ name: '', gender: 'male', date: new Date(y, m - 1, 15, h, 0, 0), language: 'zh-CN' });
          const ming = res.palaces.find((p: any) => p.name === '命宫');
          const j = JIAZI.indexOf(ming.stem + ming.branch);
          expect(j).toBeGreaterThanOrEqual(0);
          expect(res.fiveElementNum).toBe(VALUE[NA_YIN[Math.floor(j / 2)]]);
          checked++;
        }
      }
    }
    expect(checked).toBe(204);
  });
});

describe('身强身弱与用神口径（八字页/合盘共用同一规则源）', () => {
  // 甲木日主生申月（金旺），官杀（庚）透干，地支无木根、无水印 → 身弱
  const pillars = [
    { pillar: '年柱', ganZhi: '庚申', tianGan: '庚', diZhi: '申', shiShen: '七杀' },
    { pillar: '月柱', ganZhi: '甲申', tianGan: '甲', diZhi: '申', shiShen: '比肩' },
    { pillar: '日柱', ganZhi: '甲午', tianGan: '甲', diZhi: '午', shiShen: '日主' },
    { pillar: '时柱', ganZhi: '庚午', tianGan: '庚', diZhi: '午', shiShen: '七杀' },
  ];

  it('甲木生申月、金多无印根 → 判定身弱', () => {
    const s = analyzeDayMasterStrength('甲', '申', pillars as any);
    expect(['身弱', '身极弱']).toContain(s.level);
  });

  it('身弱用神 = 印星（生我者=水）+ 比劫（同我者=木），绝不含食伤（我生者=火）', () => {
    const s = analyzeDayMasterStrength('甲', '申', pillars as any);
    const rec = recommendYongShen('木', s.level);
    expect(rec.yongShen).toContain('水');  // 印星
    expect(rec.yongShen).toContain('木');  // 比劫
    expect(rec.yongShen).not.toContain('火'); // 食伤泄身——旧合盘 bug 误取此方向
    expect(rec.yongShen).not.toContain('金'); // 官杀克身
  });
});
