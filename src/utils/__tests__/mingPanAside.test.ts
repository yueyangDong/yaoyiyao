import { describe, it, expect } from 'vitest';
import { buildMingPanAside } from '../mingPanAside';
import { buildRawChart } from '../personChart';

/* ------------------------------------------------------------------ *
 * 命盘旁参是**展示层**，不是判据层。
 *
 * 这一组测试盯的不是「算得对不对」（那是八字页的事），而是三件事：
 * ① 四柱必须与全站唯一出口 buildRawChart 完全一致（口径不能分叉）；
 * ② 结构上**不许出现分数/吉凶字段**（防止将来有人往这里加判据）；
 * ③ 缺信息时静默返回 null，不编造。
 * ------------------------------------------------------------------ */

const OK = {
  year: 2002, month: 12, day: 31, hour: 20, minute: 30,
  gender: 'male', calendar: 'solar' as const,
};

describe('命盘旁参', () => {
  it('四柱与 buildRawChart（全站唯一出口）逐字一致', () => {
    const aside = buildMingPanAside(OK)!;
    const raw = buildRawChart(2002, 12, 31, 20, 30);
    expect(aside.pillars.map((p) => p.ganZhi)).toEqual(raw.pillars.map((p) => p.ganZhi));
    // 八字页端到端校验的同一组基准：壬午 壬子 癸酉 壬戌
    expect(aside.pillars.map((p) => p.ganZhi)).toEqual(['壬午', '壬子', '癸酉', '壬戌']);
    expect(aside.dayGan).toBe('癸');
    expect(aside.dayWx).toBe('水');
  });

  it('结构里没有分数、档位、吉凶结论——这一层不产判据', () => {
    const d = buildMingPanAside(OK)!;
    const keys = Object.keys(d);
    expect(keys).not.toContain('score');
    expect(keys).not.toContain('verdict');
    expect(keys).not.toContain('level');
    // 序列化后也不许出现判吉凶的词（强弱档位『身弱』是结构描述，不在黑名单里）
    expect(JSON.stringify(d)).not.toMatch(/大吉|小凶|凶|吉凶|评分/);
  });

  it('用神与忌神恒不相交（与 PersonChart.jiShen 同口径）', () => {
    for (const y of [1984, 1990, 1995, 2001]) {
      const d = buildMingPanAside({ ...OK, year: y })!;
      expect(d.yongShen.filter((w) => d.jiShen.includes(w))).toEqual([]);
    }
  });

  it('当前大运按虚岁闭区间命中（端点不落空）', () => {
    const birthYear = 2002;
    const currentYear = 2026;
    const nominal = currentYear - birthYear + 1; // 25
    const d = buildMingPanAside({ ...OK, year: birthYear, currentYear })!;
    expect(d.dayun).not.toBeNull();
    expect(d.dayun!.startAge).toBeLessThanOrEqual(nominal);
    expect(d.dayun!.endAge).toBeGreaterThanOrEqual(nominal);
  });

  it('性别未知就不给大运（大运顺逆由年干阴阳×性别定，猜错整排反着走）', () => {
    const known = buildMingPanAside({ ...OK, gender: 'male' })!;
    expect(known.dayun).not.toBeNull();

    const unknown = buildMingPanAside({ ...OK, gender: null })!;
    expect(unknown.dayun).toBeNull();
    // 但四柱/强弱与性别无关，必须照常给出
    expect(unknown.pillars.map((p) => p.ganZhi)).toEqual(known.pillars.map((p) => p.ganZhi));
    expect(unknown.strengthPlain).toBe(known.strengthPlain);
  });

  it('性别兼容中文：档案里存的是「男/女」，不能只认 male/female', () => {
    const cn = buildMingPanAside({ ...OK, gender: '男' })!;
    const en = buildMingPanAside({ ...OK, gender: 'male' })!;
    expect(cn.dayun?.ganZhi).toBe(en.dayun?.ganZhi);
  });

  it('没填时辰就按午时推定并打标，且不做真太阳时校正', () => {
    const guessed = buildMingPanAside({ ...OK, hour: null, minute: null })!;
    expect(guessed.hourGuessed).toBe(true);
    expect(guessed.pillars[3].guessed).toBe(true);
    expect(guessed.pillars[0].guessed).toBe(false);

    // 时辰是推定的，传了 trueSolar 也应当被忽略（基准是假的，再校正只是制造假精确）
    const withTs = buildMingPanAside({
      ...OK, hour: null, minute: null,
      trueSolar: { hour: 9, minute: 17, dayOffset: 0 },
    })!;
    expect(withTs.pillars[3].ganZhi).toBe(guessed.pillars[3].ganZhi);
  });

  it('真太阳时校正会改变时柱（经度东移时支前移）', () => {
    const plain = buildMingPanAside({ ...OK, hour: 21, minute: 0 })!;
    const corrected = buildMingPanAside({
      ...OK, hour: 21, minute: 0,
      trueSolar: { hour: 19, minute: 30, dayOffset: 0 },
    })!;
    expect(corrected.pillars[3].ganZhi).not.toBe(plain.pillars[3].ganZhi);
  });

  it('农历闰月必须显式传 isLeap，否则整体错一个月', () => {
    const base = { year: 2023, month: 2, day: 1, hour: 10, minute: 0, gender: 'male', calendar: 'lunar' as const };
    const leap = buildMingPanAside({ ...base, isLeap: true })!;
    const normal = buildMingPanAside({ ...base, isLeap: false })!;
    expect(leap.pillars[1].ganZhi).not.toBe(normal.pillars[1].ganZhi);
    expect(leap.pillars[2].ganZhi).not.toBe(normal.pillars[2].ganZhi);
  });

  it('出生信息不全或越界就返回 null（页面整块不渲染，不写「请先填写」）', () => {
    expect(buildMingPanAside({ ...OK, year: 0 })).toBeNull();
    expect(buildMingPanAside({ ...OK, month: 0 })).toBeNull();
    expect(buildMingPanAside({ ...OK, day: 0 })).toBeNull();
    expect(buildMingPanAside({ ...OK, year: 1899 })).toBeNull();
    expect(buildMingPanAside({ ...OK, year: 2999 })).toBeNull();
  });

  it('颜色取五行表，不出现空字符串', () => {
    const d = buildMingPanAside(OK)!;
    for (const p of d.pillars) {
      expect(p.ganColor).toMatch(/var\(--wx-/);
      expect(p.zhiColor).toMatch(/var\(--wx-/);
    }
  });
});
