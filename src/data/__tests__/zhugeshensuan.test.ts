import { describe, it, expect } from 'vitest';
import { ZHUGES_LOTS, getZhugeLotByStrokes } from '../zhugeshensuan';
import { HANZI_TRAD_STROKES } from '../hanziStrokes';

describe('诸葛神数笔画数据', () => {
  it('康熙笔画：简体字映射繁体笔画数', () => {
    expect(HANZI_TRAD_STROKES['天']).toBe(4);
    expect(HANZI_TRAD_STROKES['飞']).toBe(9);   // 飛九画
    expect(HANZI_TRAD_STROKES['车']).toBe(7);   // 車七画
    expect(HANZI_TRAD_STROKES['福']).toBe(13);
    expect(HANZI_TRAD_STROKES['汉']).toBe(14);  // 漢十四画
  });

  it('数据完整性：384签且字段齐全', () => {
    expect(ZHUGES_LOTS).toHaveLength(384);
    for (let i = 0; i < 384; i++) {
      const lot = ZHUGES_LOTS[i];
      expect(lot.index).toBe(i + 1);
      expect(lot.poem.length).toBeGreaterThan(2);
      expect(lot.explanation.length).toBeGreaterThan(2);
      expect(lot.interpretation.length).toBeGreaterThan(2);
    }
  });

  it('签文内容抽样：第1签与第384签为传世原文', () => {
    expect(ZHUGES_LOTS[0].poem).toContain('天门一挂榜');
    expect(ZHUGES_LOTS[383].poem).toContain('人非孔颜鲜能无过');
  });
});

describe('诸葛神数取签算法', () => {
  it('飞天车：947递减384两次得179（与传世算法一致）', () => {
    const r = getZhugeLotByStrokes('飞', '天', '车');
    expect(r.lotIndex).toBe(179);
    expect(r.lot.index).toBe(179);
    expect(r.lot.poem).toContain('笑嘻嘻');
  });

  it('人大山：233直接命中', () => {
    expect(getZhugeLotByStrokes('人', '大', '山').lotIndex).toBe(233);
  });

  it('恰十画按零算：高(10)书(10)马(10) → 000 → 第384签', () => {
    const r = getZhugeLotByStrokes('高', '书', '马');
    expect(r.lotIndex).toBe(384);
    expect(r.lot.index).toBe(384);
  });

  it('任取三字签号均在1-384之间', () => {
    const samples = [['天', '地', '人'], ['诸', '葛', '亮'], ['爱', '情', '美'], ['中', '国', '龙']];
    for (const [a, b, c] of samples) {
      const { lotIndex } = getZhugeLotByStrokes(a, b, c);
      expect(lotIndex).toBeGreaterThanOrEqual(1);
      expect(lotIndex).toBeLessThanOrEqual(384);
    }
  });
});
