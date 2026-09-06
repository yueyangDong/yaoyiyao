import { describe, it, expect } from 'vitest';
import { guaShortToFull, HEXAGRAM_TEXTS } from '../liuyaoTexts';

describe('卦名简称→全名映射', () => {
  it('八纯卦：乾→乾为天', () => {
    expect(guaShortToFull('乾')).toBe('乾为天');
    expect(guaShortToFull('坤')).toBe('坤为地');
    expect(guaShortToFull('坎')).toBe('坎为水');
    expect(guaShortToFull('离')).toBe('离为火');
    expect(guaShortToFull('震')).toBe('震为雷');
    expect(guaShortToFull('艮')).toBe('艮为山');
    expect(guaShortToFull('巽')).toBe('巽为风');
    expect(guaShortToFull('兑')).toBe('兑为泽');
  });

  it('上下卦结构卦：泰→地天泰、谦→地山谦、既济→水火既济', () => {
    expect(guaShortToFull('泰')).toBe('地天泰');
    expect(guaShortToFull('谦')).toBe('地山谦');
    expect(guaShortToFull('既济')).toBe('水火既济');
    expect(guaShortToFull('噬嗑')).toBe('火雷噬嗑');
    expect(guaShortToFull('归妹')).toBe('雷泽归妹');
  });

  it('64卦简称全覆盖且无歧义', () => {
    const shorts = new Set<string>();
    for (const full of Object.keys(HEXAGRAM_TEXTS)) {
      const short = full.includes('为') ? full[0] : full.slice(2);
      expect(guaShortToFull(short)).toBe(full);
      shorts.add(short);
    }
    // 64卦应有64个不同简称（八纯卦简称不与他卦冲突）
    expect(shorts.size).toBe(64);
  });

  it('未知名称原样返回', () => {
    expect(guaShortToFull('乾为天')).toBe('乾为天');
    expect(guaShortToFull('不存在')).toBe('不存在');
    expect(guaShortToFull('')).toBe('');
  });
});
