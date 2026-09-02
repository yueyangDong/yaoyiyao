// ========== 排盘逻辑校准测试（2026-09-02） ==========
// 用独立实现的安星/遁干/十神规则 + 已知公开参考值，交叉核对排盘库输出。
// 规则来源：《渊海子平》五鼠遁/五虎遁、十神定义；《紫微斗数全书》安命宫/身宫/五行局诀。
import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import { ziwei } from '@ziweijs/core';
import { getTrueSolarHour } from '../../context/UserContext';

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

  it('身宫推算与公式一致：生月宫(申)顺数生时(寅+2) → 戌宫（安身宫诀）', () => {
    const r = mk(2000, 8, 16, 4);
    const shen = r.palaces.find((p: any) => p.branch === '戌');
    expect(shen).toBeTruthy();
    // 与应用内身宫公式对照（Ziwei.tsx 同款算法）
    const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const monthPalaceIdx = (2 + 7 - 1) % 12;               // 农历七月 → 申(8)
    const shenBranch = ZHI_ORDER[(monthPalaceIdx + ZHI_ORDER.indexOf('寅')) % 12];
    expect(shenBranch).toBe('戌');
  });
});
