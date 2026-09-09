// 四化×十二宫内容库测试：结构完整性（12宫×4化×生年/自化）、内容非空、宫名与排盘一致
import { describe, it, expect } from 'vitest';
import { BIRTH_SIHUA_PALACE, SELF_SIHUA_PALACE, PALACE_NAMES } from '../ziweiSihuaPalaceContent';

const TYPES = ['禄', '权', '科', '忌'] as const;

describe('四化×十二宫内容库', () => {
  it('生年四化内容覆盖全部12宫×4化，内容详实', () => {
    for (const palace of PALACE_NAMES) {
      expect(BIRTH_SIHUA_PALACE[palace], `生年四化缺宫：${palace}`).toBeDefined();
      for (const t of TYPES) {
        const text = BIRTH_SIHUA_PALACE[palace][t];
        expect(text, `${palace}生年化${t}缺失`).toBeTruthy();
        expect(text.length, `${palace}生年化${t}内容过短`).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('自化内容覆盖全部12宫×4化，内容详实', () => {
    for (const palace of PALACE_NAMES) {
      expect(SELF_SIHUA_PALACE[palace], `自化缺宫：${palace}`).toBeDefined();
      for (const t of TYPES) {
        const text = SELF_SIHUA_PALACE[palace][t];
        expect(text, `${palace}自化${t}缺失`).toBeTruthy();
        expect(text.length, `${palace}自化${t}内容过短`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('宫名键无多余、无重复（与排盘宫名集合一致）', () => {
    const expected = [...PALACE_NAMES].sort().join(',');
    expect(Object.keys(BIRTH_SIHUA_PALACE).sort().join(',')).toBe(expected);
    expect(Object.keys(SELF_SIHUA_PALACE).sort().join(',')).toBe(expected);
  });

  it('生年与自化同宫同化含义有区分（不同文案）', () => {
    for (const palace of PALACE_NAMES) {
      for (const t of TYPES) {
        expect(BIRTH_SIHUA_PALACE[palace][t]).not.toBe(SELF_SIHUA_PALACE[palace][t]);
      }
    }
  });
});
