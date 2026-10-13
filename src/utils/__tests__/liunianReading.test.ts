// 流年白话 desc 的三条不变量：
//   ① 一句话里不许出现命理术语 —— 用户"看不懂"的就是这些词（旧版是「印绶之年」「官杀之年」）；
//   ② 基调必须由「年干五行 ∈ 用神 / 忌神」决定 —— 同为官杀，用神年与忌神年**必须**说不同的话。
//      旧版只看天干五行 vs 日主、不看喜忌，于是同一张卡片上 desc 说"有压力有挑战"、
//      下面按喜忌算出的领域标签却写"事业 · 顺"，两套说法打架；
//   ③ 长度有硬约束 —— 「一句话看懂你的八字」直接引用 desc，整段有 240 字上限
//      （见 plainConclusion.test.ts 的长度回归）。
import { describe, it, expect } from 'vitest';
import { calcLiuNianItem, buildLiuNianList, ganZhiOfYear } from '../liunianReading';

const DAY_GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 命理术语黑名单：desc 是给普通用户看的第一句话，出现任何一个都算回归 */
const TERMS = [
  '日主', '印绶', '印星', '食伤', '官杀', '比和', '比劫',
  '正官', '七杀', '正财', '偏财', '正印', '偏印', '劫财', '比肩', '食神', '伤官',
  '天干', '地支', '十神', '五行', '命局', '岁运', '流年', '大运', '八字', '用神', '忌神',
];

describe('liunianReading', () => {
  it('干支：甲子起于公元 4 年，2026 为丙午', () => {
    const g = ganZhiOfYear(2026);
    expect(g.ganZhi).toBe('丙午');
    expect(g.wx).toBe('火');
    expect(ganZhiOfYear(2025).ganZhi).toBe('乙巳');
    // 60 年一甲子
    expect(ganZhiOfYear(2086).ganZhi).toBe('丙午');
  });

  it('desc 不含命理术语（10 个日主 × 10 年全覆盖）', () => {
    for (const dayGan of DAY_GANS) {
      const list = buildLiuNianList(2026, dayGan, { yongShen: ['火'], jiShen: ['金'] });
      for (const item of list) {
        for (const t of TERMS) {
          expect(item.desc, `${dayGan}日主 ${item.year}年 desc 含术语「${t}」：${item.desc}`).not.toContain(t);
        }
      }
    }
  });

  it('desc 长度上限 30 字（结论卡 240 字回归的前提）', () => {
    for (const dayGan of DAY_GANS) {
      for (const opts of [{}, { yongShen: ['火'] }, { jiShen: ['火'] }, { yongShen: ['火'], jiShen: ['金'] }]) {
        for (const item of buildLiuNianList(2026, dayGan, opts)) {
          expect(item.desc.length, `${dayGan} ${item.year}：${item.desc}`).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('十年列表恒为 10 条，年份连续', () => {
    const list = buildLiuNianList(2026, '庚');
    expect(list).toHaveLength(10);
    expect(list.map((x) => x.year)).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]);
  });

  it('喜忌定向：同为官杀年，用神年 / 忌神年 / 不传喜忌 各说各的话', () => {
    // 2026 丙午（火）；日主庚金 → 火克金 → 官杀大类
    const onYong = calcLiuNianItem(2026, '庚', { yongShen: ['火'] });
    const onJi = calcLiuNianItem(2026, '庚', { yongShen: ['木'], jiShen: ['火'] });
    const neither = calcLiuNianItem(2026, '庚');
    expect(onYong.desc).toContain('责任加身');
    expect(onJi.desc).toContain('压力偏大');
    // 没给喜忌时不下吉凶判断，只说这一年"是干什么的"
    expect(neither.desc).toContain('守住本分');
    expect(new Set([onYong.desc, onJi.desc, neither.desc]).size).toBe(3);
  });

  it('主题随日主变：同一年的 desc 不该对所有日主都一样', () => {
    // 丙午之火：对庚金是克我（官杀），对甲木是我生（食伤）
    const geng = calcLiuNianItem(2026, '庚', { yongShen: ['火'] });
    const jia = calcLiuNianItem(2026, '甲', { yongShen: ['火'] });
    expect(geng.desc).not.toBe(jia.desc);
    expect(jia.desc).toContain('点子最容易出成果');
  });

  it('忌神走完整口径：传了 jiShen 就以它为准，不再走扶抑兜底', () => {
    // 身强庚金走扶抑兜底时，忌神是「土 / 金」（印、比劫），不含火
    const opts = { yongShen: ['水'], strengthLevel: '身强' };
    expect(calcLiuNianItem(2026, '庚', opts).desc).toContain('守住本分');
    // 完整口径能把火判成忌神（从格 / 破用变忌等），话术立刻跟着变
    expect(calcLiuNianItem(2026, '庚', { ...opts, jiShen: ['火'] }).desc).toContain('压力偏大');
  });

  it('算不出十神时退化为"只讲基调"，不抛错也不说反', () => {
    // 缺日干 → tenGodOf 返回空 → 没有主题，只有基调
    const good = calcLiuNianItem(2026, '', { yongShen: ['火'] });
    expect(good.desc).toContain('走得顺');
    const bad = calcLiuNianItem(2026, '', { jiShen: ['火'] });
    expect(bad.desc).toContain('偏逆');
    const flat = calcLiuNianItem(2026, '');
    expect(flat.desc).toContain('平稳');
  });

  it('用神与忌神同时命中同一五行时不矛盾：用神优先（与全站"用神 ∩ 忌神 = ∅"一致的前提下）', () => {
    // 该不变量在上游已保证（见 hepanCalibration 的忌神完整口径用例），此处只钉住取值顺序：
    // 一旦上游失守、同一五行两边都有，desc 必须说"顺"而不是"逆"——绝不能出现自相矛盾的两句话
    const item = calcLiuNianItem(2026, '庚', { yongShen: ['火'], jiShen: ['火'] });
    expect(item.desc).toContain('责任加身');
  });
});
