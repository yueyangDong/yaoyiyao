import { describe, it, expect } from 'vitest';
import { TERM_DICTIONARY, findTermsInText } from '../termDictionary';

describe('termDictionary', () => {
  it('has at least 60 entries, each with term and explain', () => {
    expect(TERM_DICTIONARY.length).toBeGreaterThanOrEqual(60);
    for (const e of TERM_DICTIONARY) {
      expect(e.term.length).toBeGreaterThan(0);
      expect(e.explain.length).toBeGreaterThan(0);
    }
  });

  it('findTermsInText returns matched entries', () => {
    const hits = findTermsInText('你是身强还是身弱？用神是火。');
    const terms = hits.map(h => h.term);
    expect(terms).toContain('身强');
    expect(terms).toContain('身弱');
    expect(terms).toContain('用神');
  });

  it('findTermsInText dedupes and prefers longer terms', () => {
    // 词典含「天乙贵人」和「贵人」时，文本出现「天乙贵人」只匹配长词
    const hits = findTermsInText('命带天乙贵人，一生有贵人相助。');
    const terms = hits.map(h => h.term);
    expect(terms.filter(t => t === '天乙贵人').length).toBe(1);
  });

  it('findTermsInText returns empty array for plain text', () => {
    expect(findTermsInText('今天天气不错')).toEqual([]);
  });
});
