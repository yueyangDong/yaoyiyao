import { describe, it, expect } from 'vitest';
import { ziwei } from '@ziweijs/core';
import { getAllPalaceDeepReadings, generatePalaceDeepReading } from '../ziweiPalaceDeep';
import { getAllSihuaDeepReadings } from '../ziweiSihuaDeep';

/** 真实盘（@ziweijs/core 排盘）→ gongData 结构 */
function realGongData(y = 2000, m = 8, d = 16, h = 4) {
  const r = ziwei.bySolar({ name: '', gender: 'male', date: new Date(y, m - 1, d, h, 0, 0), language: 'zh-CN' } as any);
  return r.palaces.map((p: any) => ({
    name: p.name,
    branch: p.branch,
    majorStars: (p.majorStars || []).map((s: any) => ({ name: s.name, sihua: s.YT?.name || null, sihuaSelf: null })),
    minorStarDetails: (p.minorStars || []).map((s: any) => ({ name: s.name, type: 'minor', sihua: s.YT?.name || null, sihuaSelf: null })),
  }));
}

describe('ziweiPalaceDeep 十二宫深度解读（含无四化宫）', () => {
  it('十二宫全覆盖：无论有无四化，都返回 12 条并保持十二宫顺序', () => {
    const gongs = realGongData();
    const out = getAllPalaceDeepReadings(gongs);
    expect(out).toHaveLength(12);
    expect(out[0].gongName).toBe('命宫');
    expect(out.map((x) => x.gongName)).toEqual(
      ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'],
    );
  });

  it('无四化的宫也有四段深度解读（原实现里这些宫是空白）', () => {
    const gongs = realGongData();
    const sihuaGongs = new Set(getAllSihuaDeepReadings(gongs).map((x) => x.gongName));
    const all = getAllPalaceDeepReadings(gongs);
    const noSihua = all.filter((x) => !sihuaGongs.has(x.gongName));

    expect(noSihua.length).toBeGreaterThan(0); // 真实盘必有未涉四化的宫
    for (const r of noSihua) {
      expect(r.sihua).toBeNull();
      expect(r.sections).toHaveLength(4);
      expect(r.sections[0].heading).toContain('底色');
      expect(r.sections[1].heading).toContain('星曜组合');
      expect(r.sections[2].heading).toContain('三方四正');
      expect(r.sections[3].heading).toContain('四化');
      // 每段都必须有实质内容，不能是空串
      for (const s of r.sections) expect(s.text.length).toBeGreaterThan(20);
    }
  });

  it('无四化宫的解释含宫位领域/本宫星曜/对宫/经营方向，且因宫而异', () => {
    const gongs = realGongData();
    const sihuaGongs = new Set(getAllSihuaDeepReadings(gongs).map((x) => x.gongName));
    const noSihua = getAllPalaceDeepReadings(gongs).filter((x) => !sihuaGongs.has(x.gongName));
    const floor = noSihua[0];
    const text = floor.sections.map((s) => s.text).join('');

    // 宫位领域导语来自 GONG_DOMAIN（每宫不同）
    expect(text).toContain('管的是');
    // 三方四正段必须落到具体宫名
    expect(text).toContain('三合');
    // 无化含义段必须说明"先天没有在这里下重注"
    expect(text).toContain('先天没有在这里下重注');

    // 不同宫的解释不允许雷同
    if (noSihua.length >= 2) {
      expect(noSihua[0].sections.map((s) => s.text).join(''))
        .not.toBe(noSihua[1].sections.map((s) => s.text).join(''));
    }
  });

  it('空宫（无主星）走借对宫论，不写成缺数据', () => {
    // 手工构造：命宫空宫、对宫迁移坐紫微
    const gongs = [
      { name: '命宫', branch: '子', majorStars: [], minorStarDetails: [] },
      { name: '迁移', branch: '午', majorStars: [{ name: '紫微', sihua: null }], minorStarDetails: [] },
      { name: '官禄', branch: '辰', majorStars: [{ name: '天府', sihua: null }], minorStarDetails: [] },
      { name: '财帛', branch: '申', majorStars: [], minorStarDetails: [] },
    ];
    const r = generatePalaceDeepReading(gongs[0], gongs)!;
    expect(r.sections[0].heading).toContain('借对宫');
    expect(r.sections[0].text).toContain('紫微');
    expect(r.sections[0].text).toContain('弹性大');
    expect(r.sections[0].text).not.toContain('数据缺失');
  });

  it('有四化的宫仍走四化深度解读（口径不被本模块覆盖）', () => {
    const gongs = [
      { name: '福德', branch: '子', majorStars: [{ name: '武曲', sihua: '忌', sihuaSelf: '科' }], minorStarDetails: [] },
      { name: '命宫', branch: '午', majorStars: [{ name: '七杀', sihua: null }], minorStarDetails: [] },
    ];
    const fu = generatePalaceDeepReading(gongs[0], gongs)!;
    expect(fu.sihua).toBe('忌');
    expect(fu.sections[0].heading).toContain('化忌的功课');
  });
});
