import { describe, it, expect } from 'vitest';
import { generateSihuaDeepReading, getAllSihuaDeepReadings } from '../ziweiSihuaDeep';

describe('generateSihuaDeepReading 四化深度解读', () => {
  it('福德宫武曲化忌·自化科：四段分层（对标专业排盘解读）', () => {
    const r = generateSihuaDeepReading({
      name: '福德',
      majorStars: [{ name: '武曲', sihua: '忌', sihuaSelf: '科' }],
      minorStarDetails: [],
    });
    expect(r).not.toBeNull();
    expect(r!.gongName).toBe('福德');
    expect(r!.starName).toBe('武曲');
    expect(r!.sihua).toBe('忌');
    expect(r!.sihuaSelf).toBe('科');
    expect(r!.sections).toHaveLength(4);
    // 第1段：化忌的功课（享福无能）
    expect(r!.sections[0].heading).toContain('化忌的功课');
    expect(r!.sections[0].text).toContain('享福无能');
    expect(r!.sections[0].text).toContain('福德宫管的是精神享受');
    // 第2段：自化科=体面的面具
    expect(r!.sections[1].heading).toContain('体面的面具');
    expect(r!.sections[1].text).toContain('表演性');
    // 第3段：忌×自化科的致命矛盾
    expect(r!.sections[2].heading).toContain('矛盾');
    expect(r!.sections[2].text).toContain('有修养');
    // 第4段：健康（武曲属金→肺/骨骼）
    expect(r!.sections[3].text).toContain('武曲');
    expect(r!.sections[3].text).toContain('骨骼');
  });

  it('财帛宫天府化禄（无自化）：含暗面提示与健康段', () => {
    const r = generateSihuaDeepReading({
      name: '财帛',
      majorStars: [{ name: '天府', sihua: '禄', sihuaSelf: null }],
      minorStarDetails: [],
    });
    expect(r!.sihua).toBe('禄');
    expect(r!.sihuaSelf).toBeNull();
    expect(r!.sections[0].text).toContain('化禄是天给的甜');
    expect(r!.sections.some((s) => s.heading.includes('暗面'))).toBe(true);
  });

  it('仅自化忌（无生年四化）：提示自我爆破与留存机制', () => {
    const r = generateSihuaDeepReading({
      name: '官禄',
      majorStars: [{ name: '七杀', sihua: null, sihuaSelf: '忌' }],
      minorStarDetails: [],
    });
    expect(r!.sihua).toBeNull();
    expect(r!.sihuaSelf).toBe('忌');
    expect(r!.sections[1].text).toContain('自我爆破');
    expect(r!.sections[2].text).toContain('留存机制');
  });

  it('生年忌+自化忌叠化：双重执念', () => {
    const r = generateSihuaDeepReading({
      name: '夫妻',
      majorStars: [{ name: '巨门', sihua: '忌', sihuaSelf: '忌' }],
      minorStarDetails: [],
    });
    expect(r!.sections[1].heading).toContain('叠化');
  });

  it('无四化星返回 null；辅星四化也能生成（如左辅化科）', () => {
    expect(generateSihuaDeepReading({
      name: '疾厄',
      majorStars: [{ name: '天同', sihua: null, sihuaSelf: null }],
      minorStarDetails: [{ name: '天魁', sihua: null, sihuaSelf: null }],
    })).toBeNull();

    const r = generateSihuaDeepReading({
      name: '命宫',
      majorStars: [{ name: '廉贞', sihua: null, sihuaSelf: null }],
      minorStarDetails: [{ name: '左辅', sihua: '科', sihuaSelf: null }],
    });
    expect(r!.starName).toBe('左辅');
    expect(r!.sihua).toBe('科');
  });
});

describe('getAllSihuaDeepReadings 全盘扫描', () => {
  it('只对有四化的宫生成，按十二宫顺序输出', () => {
    const gongData = [
      { name: '命宫', majorStars: [{ name: '七杀', sihua: null, sihuaSelf: null }], minorStarDetails: [{ name: '左辅', sihua: '科', sihuaSelf: null }] },
      { name: '兄弟', majorStars: [], minorStarDetails: [] },
      { name: '福德', majorStars: [{ name: '武曲', sihua: '忌', sihuaSelf: '科' }], minorStarDetails: [] },
      { name: '财帛', majorStars: [{ name: '天府', sihua: '禄', sihuaSelf: null }], minorStarDetails: [] },
    ];
    const out = getAllSihuaDeepReadings(gongData);
    expect(out.map((x) => x.gongName)).toEqual(['命宫', '财帛', '福德']); // 十二宫顺序：命宫→财帛→福德
  });
});
