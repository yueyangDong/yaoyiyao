import { describe, it, expect } from 'vitest';
import {
  generateBaziPlainConclusion,
  generateZiweiPlainConclusion,
  generateLiuyaoPlainConclusion,
  generateDailyPlainConclusion,
} from '../plainConclusion';

describe('plainConclusion', () => {
  it('bazi: 身强命含用神与五行倾向', () => {
    const text = generateBaziPlainConclusion({
      dayGan: '庚', dayWx: '金', level: '身强',
      yongShen: ['火'], xiShen: ['木'],
      wxStrongest: '金', wxWeakest: '火',
      dayunFirst: '丙午',
    });
    expect(text).toContain('庚金');
    expect(text).toContain('身强');
    expect(text).toContain('火');
    expect(text.length).toBeGreaterThan(30);
  });

  it('bazi: 身弱命强调帮扶', () => {
    const text = generateBaziPlainConclusion({
      dayGan: '甲', dayWx: '木', level: '身弱',
      yongShen: ['水'], xiShen: ['木'],
      wxStrongest: '土', wxWeakest: '水',
      dayunFirst: null,
    });
    expect(text).toContain('身弱');
    expect(text).toContain('水');
  });

  it('ziwei: 基于总评与亮点', () => {
    const text = generateZiweiPlainConclusion('整体运势稳中有升，事业有贵人相助。', '命宫紫微坐守');
    expect(text).toContain('紫微');
    expect(text.length).toBeGreaterThan(20);
  });

  it('liuyao: 静卦宜守', () => {
    const c = generateLiuyaoPlainConclusion('乾为天', 0, false);
    expect(c.verdict).toBe('宜守');
    expect(c.text).toContain('乾为天');
  });

  it('liuyao: 多动爻大动', () => {
    const c = generateLiuyaoPlainConclusion('水雷屯', 3, true);
    expect(c.verdict).toBe('大动');
  });

  it('daily: 综合宜忌与天气', () => {
    const text = generateDailyPlainConclusion(['宜嫁娶', '宜出行'], ['忌动土'], '晴', 26);
    expect(text).toContain('晴');
    expect(text).toContain('26');
  });
});
