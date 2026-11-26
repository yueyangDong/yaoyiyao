// ========== 八字排盘 × tyme4ts 交叉校验（两套独立历法库互为对照） ==========
//
// 四柱本体一直只信 lunar-typescript 一家。本文件用项目里另一套独立历法库 tyme4ts
// （节气/干支/纳音/十神/藏干/童限各有自己的实现）做差分校验：
// 两家在随机盘上逐项一致，才说明「排盘结果」不是某一家的实现偏差。
//
// 口径说明：
//   - 月柱以节气定界。两家节气时刻算法不同（均时差/地球轨道模型），
//     节气交接前后 ±30 分钟出生的盘允许不一致 —— 采样时直接跳过这段窗口；
//   - 晚子时（23:00–23:59）单独用 sect 1/2 两档校验，不混进主采样；
//   - 起运岁数两家算法不同（3 天折 1 年 vs 精确分钟折算），只要求差 ≤ 1 岁、起运年份差 ≤ 1。

import { describe, it, expect } from 'vitest';
import * as tyme from 'tyme4ts';
import { Solar } from 'lunar-typescript';
import { diShiOf } from '../shenShaPower';
import { buildRawChart, dayunStepsOf } from '../personChart';

/** 固定种子的伪随机（LCG）：每次跑都是同一批盘，失败可复现 */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const rnd = makeRng(20261126);
/** 随机公历生日（1940-01-01 ~ 2026-10-31），且避开节气交接 ±30 分钟 */
function randomDate(): { y: number; m: number; d: number; h: number; mi: number } {
  const start = Date.UTC(1940, 0, 1);
  const end = Date.UTC(2026, 9, 31);
  for (;;) {
    const t = new Date(start + rnd() * (end - start));
    const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
    // 时辰：整点 + 0~59 分；避开 23 点（晚子时另测）
    const h = Math.floor(rnd() * 23);
    const mi = Math.floor(rnd() * 60);
    // 节气交接窗口：用 lunar-typescript 的节气表判断（离任一节气时刻不足 30 分钟就重抽）
    const birthMs = Date.UTC(y, m - 1, d, h, mi);
    const jieQi = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getJieQiTable();
    let near = false;
    for (const s of Object.values(jieQi) as Solar[]) {
      const jMs = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute());
      if (Math.abs(jMs - birthMs) < 30 * 60 * 1000) { near = true; break; }
    }
    if (near) return randomDate();
    return { y, m, d, h, mi };
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 六十甲子序号（0=甲子）：干支各自取模后求唯一解 */
function ganZhiIndex(gz: string): number {
  const T = '甲乙丙丁戊己庚辛壬癸', D = '子丑寅卯辰巳午未申酉戌亥';
  const t = T.indexOf(gz.charAt(0)), d = D.indexOf(gz.charAt(1));
  for (let i = 0; i < 60; i++) if (i % 10 === t && i % 12 === d) return i;
  return -1;
}

describe('四柱 × tyme4ts：随机 400 盘逐项交叉校验', () => {
  const samples = Array.from({ length: 400 }, () => randomDate());

  it('年/月/日/时四柱干支一致', () => {
    const bad: string[] = [];
    for (const c of samples) {
      const ours = buildRawChart(c.y, c.m, c.d, c.h, c.mi).pillars.map((p) => p.ganZhi);
      const theirs = tyme.SolarTime.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0).getSixtyCycleHour().getEightChar().toString().split(' ');
      if (ours.join(' ') !== theirs.join(' ')) bad.push(`${c.y}-${pad(c.m)}-${pad(c.d)} ${pad(c.h)}:${pad(c.mi)} 我们=${ours.join(' ')} tyme=${theirs.join(' ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('纳音一致', () => {
    const bad: string[] = [];
    for (const c of samples) {
      const ours = buildRawChart(c.y, c.m, c.d, c.h, c.mi).pillars.map((p) => p.nayin);
      const te = tyme.SolarTime.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0).getSixtyCycleHour().getEightChar();
      const theirs = [te.getYear(), te.getMonth(), te.getDay(), te.getHour()].map((x) => x.getSound().getName());
      if (ours.join(' ') !== theirs.join(' ')) bad.push(`${c.y}-${c.m}-${c.d} 我们=${ours.join(' ')} tyme=${theirs.join(' ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('十神（天干）一致：按五行生克 + 阴阳独立推一遍', () => {
    // 独立实现（不借任何库）：同我比劫、我生食伤、我克财、克我官杀、生我印；同阴阳为偏/比/杀/食，异阴阳为正/劫/伤/官
    const T = '甲乙丙丁戊己庚辛壬癸';
    const WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
    const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    const KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
    const star = (d: string, o: string, isDay: boolean) => {
      const di = T.indexOf(d), oi = T.indexOf(o);
      const sameYinYang = di % 2 === oi % 2;
      if (di === oi) return isDay ? '日主' : '比肩';
      const a = WX[di], b = WX[oi];
      if (a === b) return sameYinYang ? '比肩' : '劫财';
      if (SHENG[b] === a) return sameYinYang ? '偏印' : '正印';
      if (SHENG[a] === b) return sameYinYang ? '食神' : '伤官';
      if (KE[a] === b) return sameYinYang ? '偏财' : '正财';
      return sameYinYang ? '七杀' : '正官';
    };
    const bad: string[] = [];
    for (const c of samples) {
      const raw = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      const ours = raw.pillars.map((p) => p.shiShen);
      const theirs = raw.pillars.map((p, i) => star(raw.dayGan, p.tianGan, i === 2));
      if (ours.join(' ') !== theirs.join(' ')) bad.push(`${c.y}-${c.m}-${c.d} 我们=${ours.join(' ')} 公式=${theirs.join(' ')}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('藏干一致（按集合比，不比顺序）', () => {
    const bad: string[] = [];
    for (const c of samples) {
      const ours = buildRawChart(c.y, c.m, c.d, c.h, c.mi).pillars.map((p) => [...(p.cangGan as string[])].sort().join(''));
      const te = tyme.SolarTime.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0).getSixtyCycleHour().getEightChar();
      const theirs = [te.getYear(), te.getMonth(), te.getDay(), te.getHour()].map((x) => x.getEarthBranch().getHideHeavenStems().map((s) => s.getName()).sort().join(''));
      if (ours.join(' ') !== theirs.join(' ')) bad.push(`${c.y}-${c.m}-${c.d} 我们=${ours.join(' ')} tyme=${theirs.join(' ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('空亡一致', () => {
    const DZ = '子丑寅卯辰巳午未申酉戌亥';
    const bad: string[] = [];
    for (const c of samples) {
      const raw = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      const ours = [raw.eightChar.getYearXunKong(), raw.eightChar.getMonthXunKong(), raw.eightChar.getDayXunKong(), raw.eightChar.getTimeXunKong()];
      const theirs = raw.pillars.map((p) => {
        // 旬首 = 干支序号向下取整到 10 的倍数；旬空 = 旬首之后第 10、11 位的地支
        const idx = ganZhiIndex(p.ganZhi);
        const base = idx - (idx % 10);
        return DZ[(base + 10) % 12] + DZ[(base + 11) % 12];
      });
      if (ours.join(' ') !== theirs.join(' ')) bad.push(`${c.y}-${c.m}-${c.d} 我们=${ours.join(' ')} 公式=${theirs.join(' ')}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('地势（十二长生）：各柱自己的天干落在自己的地支上', () => {
    // ⚠️ lunar-typescript 的 getXDiShi 一律用**日干**去查四支——不是通行的「各柱干支自坐」口径。
    //    通行：年柱地势 = 年干在年支的十二长生（如 甲子 = 沐浴），与日干无关。
    //    2026-11-26 修：地势改走 diShiOf（= shenShaPower.changShengOf，各柱自坐）。
    expect(diShiOf('甲', '子')).toBe('沐浴');
    expect(diShiOf('丙', '寅')).toBe('长生');
    expect(diShiOf('己', '丑')).toBe('墓');
    expect(diShiOf('庚', '午')).toBe('沐浴');
    expect(diShiOf('壬', '申')).toBe('长生');
    expect(diShiOf('癸', '卯')).toBe('长生');
    expect(diShiOf('辛', '子')).toBe('长生');
    expect(diShiOf('乙', '午')).toBe('长生');
    expect(diShiOf('丁', '酉')).toBe('长生');
    expect(diShiOf('戊', '寅')).toBe('长生');
    // 库的口径（日干查四支）与通行口径在「年干≠日干」时必然不同——这就是修复的依据
    const lib = Solar.fromYmdHms(2006, 9, 12, 15, 0, 0).getLunar().getEightChar(); // 丙戌 丁酉 甲辰 壬申
    expect(lib.getDayGan()).not.toBe(lib.getYearGan());
    expect(lib.getYearDiShi()).not.toBe(diShiOf(lib.getYearGan(), lib.getYearZhi()));
    expect(diShiOf('丙', '戌')).toBe('墓');
  });

  it('大运：顺逆 / 首步干支 / 起运虚岁 / 起运时间一致（男女各半）', () => {
    const bad: string[] = [];
    for (const c of samples.slice(0, 200)) {
      for (const g of ['male', 'female'] as const) {
        const raw = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
        const yun = raw.eightChar.getYun(g === 'male' ? 1 : 0);
        const ty = tyme.ChildLimit.fromSolarTime(tyme.SolarTime.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0), g === 'male' ? 1 : 0);
        const oursFwd = yun.isForward();
        if (oursFwd !== ty.isForward()) bad.push(`${c.y}-${c.m}-${c.d} ${g} 顺逆 我们=${oursFwd} tyme=${ty.isForward()}`);
        // 首步大运干支
        const first = dayunStepsOf(raw.eightChar, g)[1];
        const tyFirst = ty.getStartDecadeFortune();
        if (first.ganZhi !== tyFirst.getSixtyCycle().getName()) bad.push(`${c.y}-${c.m} ${g} 首步 我们=${first.ganZhi} tyme=${tyFirst.getSixtyCycle().getName()}`);
        // 起运虚岁：取第一步大运的起始虚岁（steps[0] 是童限）。
        // 两家折算口径不同（3 天折 1 年 vs 精确折算），允许差 ≤ 1 岁
        const oursAge = first.startAge;
        const tyAge = tyFirst.getStartAge();
        if (Math.abs(oursAge - tyAge) > 1) bad.push(`${c.y}-${c.m} ${g} 起运虚岁 我们=${oursAge} tyme=${tyAge}`);
        // 起运年份： lunar-typescript 的 getStartYear 是「天数÷3 向下取整」，会比实际起运公历年小 1 左右；
        // 以首步大运的 startYear 为准比对
        if (Math.abs(first.startYear - tyFirst.getStartLunarYear().getYear()) > 1) bad.push(`${c.y}-${c.m} ${g} 起运年 我们=${first.startYear} tyme=${tyFirst.getStartLunarYear().getYear()}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
