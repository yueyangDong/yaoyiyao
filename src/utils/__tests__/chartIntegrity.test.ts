import { describe, it, expect } from 'vitest';
import { buildRawChart, buildPerson, dayunStepsOf } from '../personChart';
import { calcShenSha, SHENSHA_PLAIN } from '../shenSha';

/**
 * 排盘完整性审计。
 *
 * 与其它测试的区别：这里**不复用被测代码的判断**，而是按定义另算一遍再对账。
 * 十神是按「日主五行 + 阴阳」定义的纯函数，独立实现一遍就能验出
 * 「取柱时把某柱的天干/藏干错位」这类静默错误（错位不会报错，只会算错）。
 *
 * 同时覆盖排盘最容易出错的四类边界：
 *   1) 立春换年（不是元旦）
 *   2) 节气换月（不是农历初一）
 *   3) 晚子时 23:00–23:59 的日柱归属
 *   4) 真太阳时校正跨午夜（dayOffset）
 */

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 天干 → [五行, 阴阳]（阳=true） */
const GAN_WX_YY: Record<string, [string, boolean]> = {
  甲: ['木', true], 乙: ['木', false],
  丙: ['火', true], 丁: ['火', false],
  戊: ['土', true], 己: ['土', false],
  庚: ['金', true], 辛: ['金', false],
  壬: ['水', true], 癸: ['水', false],
};
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/**
 * 十神：只依赖「日干五行/阴阳」与「目标干五行/阴阳」，与任何库无关。
 * 同我：同阴阳=比肩、异=劫财；我生：同=食神、异=伤官；
 * 我克：同=偏财、异=正财；克我：同=七杀、异=正官；生我：同=偏印、异=正印。
 */
function shiShenOf(dayGan: string, target: string): string {
  const [dWx, dYy] = GAN_WX_YY[dayGan];
  const [tWx, tYy] = GAN_WX_YY[target];
  const same = dYy === tYy;
  if (tWx === dWx) return same ? '比肩' : '劫财';
  if (SHENG[dWx] === tWx) return same ? '食神' : '伤官';
  if (KE[dWx] === tWx) return same ? '偏财' : '正财';
  if (KE[tWx] === dWx) return same ? '七杀' : '正官';
  if (SHENG[tWx] === dWx) return same ? '偏印' : '正印';
  throw new Error(`十神无法判定：${dayGan} → ${target}`);
}

/** 确定性伪随机（避免 flaky；同一 seed 永远同一批盘） */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function sampleCharts(n: number, seed = 20261123) {
  const rand = rng(seed);
  const out: { label: string; y: number; m: number; d: number; h: number; mi: number; g: string }[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1930 + Math.floor(rand() * 90);
    const m = 1 + Math.floor(rand() * 12);
    const d = 1 + Math.floor(rand() * 28);
    const h = Math.floor(rand() * 24);
    const mi = Math.floor(rand() * 60);
    const g = rand() < 0.5 ? 'male' : 'female';
    out.push({ label: `${y}-${m}-${d} ${h}:${mi} ${g}`, y, m, d, h, mi, g });
  }
  return out;
}

describe('排盘完整性（独立对账）', () => {
  it('四柱：干支自洽、藏干合法、纳音非空', () => {
    for (const c of sampleCharts(120)) {
      const { pillars } = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      expect(pillars.map((p) => p.pillar)).toEqual(['年柱', '月柱', '日柱', '时柱']);
      for (const p of pillars) {
        expect(GAN, `${c.label} ${p.pillar} 天干非法：${p.tianGan}`).toContain(p.tianGan);
        expect(ZHI, `${c.label} ${p.pillar} 地支非法：${p.diZhi}`).toContain(p.diZhi);
        expect(p.ganZhi, `${c.label} ${p.pillar} ganZhi 与干支不符`).toBe(p.tianGan + p.diZhi);
        expect(p.cangGan.length, `${c.label} ${p.pillar} 藏干为空`).toBeGreaterThan(0);
        for (const g of p.cangGan) expect(GAN, `${c.label} 藏干非法：${g}`).toContain(g);
        expect(p.nayin, `${c.label} ${p.pillar} 纳音为空`).toBeTruthy();
      }
    }
  });

  it('天干十神：与独立实现逐柱一致（含日柱=日主）', () => {
    const bad: string[] = [];
    for (const c of sampleCharts(120)) {
      const { pillars, dayGan } = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      for (const p of pillars) {
        const got = p.shiShen;
        if (p.pillar === '日柱') {
          // 日干对自身：各库措辞不同（日主/元男/比肩），只要求非空且不含他柱错位迹象
          if (!got) bad.push(`${c.label} 日柱 shiShen 为空`);
          continue;
        }
        const want = shiShenOf(dayGan, p.tianGan);
        if (got !== want) bad.push(`${c.label} ${p.pillar} ${p.tianGan}：页面=${got} 应为=${want}`);
      }
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });

  it('地支藏干十神：与独立实现一致（多位用 / 分隔）', () => {
    const bad: string[] = [];
    for (const c of sampleCharts(80)) {
      const { pillars, dayGan } = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      for (const p of pillars) {
        const got = (p.shiShenZhi || '').split('/').filter(Boolean);
        const want = p.cangGan.map((g) => shiShenOf(dayGan, g));
        if (got.join('/') !== want.join('/')) {
          bad.push(`${c.label} ${p.pillar} 藏干${p.cangGan}：页面=${got.join('/')} 应为=${want.join('/')}`);
        }
      }
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });

  it('用神与忌神恒不相交', () => {
    const bad: string[] = [];
    for (const c of sampleCharts(150)) {
      const p = buildPerson(c.y, c.m, c.d, c.h, c.mi, c.g);
      const both = p.yongShen.filter((w) => p.jiShen.includes(w));
      if (both.length) bad.push(`${c.label} 同时为用为忌：${both.join(',')}（用=${p.yongShen} 忌=${p.jiShen}）`);
      if (!p.yongShen.length) bad.push(`${c.label} 用神为空`);
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });

  it('同一输入重复计算完全一致（无跨调用状态泄漏）', () => {
    // ⚠️ 不能直接 JSON.stringify 整个 PersonChart：它带 eightChar，而
    //    EightChar ↔ Lunar 互相引用（循环结构），stringify 会抛。只投影可比较的纯数据。
    const project = (p: ReturnType<typeof buildPerson>) => ({
      dayGan: p.dayGan,
      dayWx: p.dayWx,
      dayZhi: p.dayZhi,
      pillars: p.pillars,
      strengthLevel: p.strengthLevel,
      yongShen: p.yongShen,
      jiShen: p.jiShen,
      nayin: p.nayin,
      zodiac: p.zodiac,
      shenSha: p.shenSha,
      ziwei: p.ziwei,
    });
    for (const c of sampleCharts(20)) {
      const a = buildPerson(c.y, c.m, c.d, c.h, c.mi, c.g);
      const b = buildPerson(c.y, c.m, c.d, c.h, c.mi, c.g);
      expect(project(a), `${c.label} 两次计算结果不一致`).toEqual(project(b));
    }
  });
});

describe('排盘边界情况', () => {
  it('立春换年：年柱按立春而非元旦', () => {
    // 1990 年立春在 2 月 4 日。1 月下旬仍属己巳年，2 月中旬已进庚午年。
    const before = buildRawChart(1990, 1, 20, 12, 0);
    const after = buildRawChart(1990, 2, 20, 12, 0);
    expect(before.pillars[0].ganZhi).toBe('己巳');
    expect(after.pillars[0].ganZhi).toBe('庚午');
    // 元旦当天不能算新年
    expect(buildRawChart(1990, 1, 1, 12, 0).pillars[0].ganZhi).toBe('己巳');
  });

  it('节气换月：月柱按节令而非农历初一', () => {
    // 1990 年立春 2/4 → 1 月属丑月、2 月下旬属寅月
    const chou = buildRawChart(1990, 1, 20, 12, 0);
    const yin = buildRawChart(1990, 2, 20, 12, 0);
    expect(chou.pillars[1].diZhi).toBe('丑');
    expect(yin.pillars[1].diZhi).toBe('寅');
  });

  it('晚子时：23:30 的两派日柱归属可切，且只在子时分歧', () => {
    const lateZi2 = buildRawChart(1990, 6, 15, 23, 30, 0, 'solar', false, 2);
    const lateZi1 = buildRawChart(1990, 6, 15, 23, 30, 0, 'solar', false, 1);
    const noon2 = buildRawChart(1990, 6, 15, 12, 0, 0, 'solar', false, 2);
    const noon1 = buildRawChart(1990, 6, 15, 12, 0, 0, 'solar', false, 1);

    // 子时：时柱地支必须是子
    expect(lateZi2.pillars[3].diZhi).toBe('子');
    expect(lateZi1.pillars[3].diZhi).toBe('子');
    // 两派在晚子时对日柱有分歧
    expect(lateZi1.pillars[2].ganZhi).not.toBe(lateZi2.pillars[2].ganZhi);
    // 非子时不分歧
    expect(noon1.pillars[2].ganZhi).toBe(noon2.pillars[2].ganZhi);
  });

  it('真太阳时跨午夜：dayOffset 必须把日柱推到次日', () => {
    const base = buildRawChart(1990, 6, 15, 23, 50, 0);
    const next = buildRawChart(1990, 6, 15, 23, 50, 1);
    const expectNext = buildRawChart(1990, 6, 16, 23, 50, 0);
    expect(next.pillars[2].ganZhi).toBe(expectNext.pillars[2].ganZhi);
    expect(next.pillars[2].ganZhi).not.toBe(base.pillars[2].ganZhi);
  });

  it('农历闰月输入：闰月与其同名平月不是同一天', () => {
    // 2020 年闰四月。平四月初一 vs 闰四月初一
    const leap = buildRawChart(2020, 4, 1, 12, 0, 0, 'lunar', true);
    const flat = buildRawChart(2020, 4, 1, 12, 0, 0, 'lunar', false);
    expect(leap.solar.toYmd()).not.toBe(flat.solar.toYmd());
    // 闰月在平月之后
    expect(leap.solar.toYmd() > flat.solar.toYmd()).toBe(true);
  });
});

describe('大运', () => {
  it('起运前小运 + 10 步大运，干支按年干阴阳×性别顺逆连推', () => {
    // 顺逆由「年干阴阳 × 性别」定，不是只看性别：
    //   阳年男 / 阴年女 → 顺行；阴年男 / 阳年女 → 逆行。
    const cases = [
      { y: 1990, m: 6, d: 15, h: 12, g: 'male', forward: true, why: '庚午年(阳) 男 → 顺' },
      { y: 1990, m: 6, d: 15, h: 12, g: 'female', forward: false, why: '庚午年(阳) 女 → 逆' },
      { y: 1991, m: 6, d: 15, h: 12, g: 'male', forward: false, why: '辛未年(阴) 男 → 逆' },
      { y: 1991, m: 6, d: 15, h: 12, g: 'female', forward: true, why: '辛未年(阴) 女 → 顺' },
    ];
    for (const c of cases) {
      const { eightChar, pillars } = buildRawChart(c.y, c.m, c.d, c.h, 0);
      const steps = dayunStepsOf(eightChar, c.g);
      // 11 = 起运前小运 1 段 + 大运 10 步
      expect(steps.length, `${c.why} 步数`).toBe(11);
      expect(steps[0].isPreStart, `${c.why} 第 1 段应为起运前小运`).toBe(true);
      expect(steps[0].ganZhi).toBe('—');

      const idx = (gz: string) => {
        const gi = GAN.indexOf(gz[0]);
        const zi = ZHI.indexOf(gz[1]);
        for (let k = 0; k < 60; k++) if (k % 10 === gi && k % 12 === zi) return k;
        return -1;
      };
      const start = idx(pillars[1].ganZhi);
      for (let i = 1; i < steps.length; i++) {
        const want = c.forward
          ? (start + i) % 60
          : (start - i + 600) % 60;
        expect(idx(steps[i].ganZhi), `${c.why} 第${i}步应为 ${want}，实际 ${steps[i].ganZhi}`).toBe(want);
        if (i > 1) expect(steps[i].startAge, `${c.why} 第${i}步年龄不连续`).toBe(steps[i - 1].endAge + 1);
      }
    }
  });
});

describe('神煞', () => {
  it('输出的神煞名都在 SHENSHA_PLAIN 登记表内，且有释义', () => {
    // 页面「神煞一览」按名字查 SHENSHA_PLAIN 取白话释义。
    // 名字未登记 → 用户看到的是一张没有解释的名词表（静默失效，不会报错）。
    const bad: string[] = [];
    for (const c of sampleCharts(60)) {
      const { pillars } = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      const list = calcShenSha(pillars, c.g === 'female' ? 'female' : 'male');
      for (const item of list) {
        if (!(item.name in SHENSHA_PLAIN)) bad.push(`${c.label} → ${item.name}`);
        if (!item.desc) bad.push(`${c.label} → ${item.name} 释义为空`);
        if (!['吉', '凶', '平'].includes(item.type)) bad.push(`${c.label} → ${item.name} 吉凶值非法：${item.type}`);
      }
    }
    expect([...new Set(bad)], `神煞未登记：\n${[...new Set(bad)].slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('同柱同名神煞不重复', () => {
    const bad: string[] = [];
    for (const c of sampleCharts(60)) {
      const { pillars } = buildRawChart(c.y, c.m, c.d, c.h, c.mi);
      const list = calcShenSha(pillars, c.g === 'female' ? 'female' : 'male');
      const seen = new Set<string>();
      for (const it of list) {
        const key = `${it.name}@${it.pillar}`;
        if (seen.has(key)) bad.push(`${c.label} 重复：${key}`);
        seen.add(key);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});
