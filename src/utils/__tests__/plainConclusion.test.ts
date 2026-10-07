import { describe, it, expect } from 'vitest';
import {
  generateBaziPlainConclusion,
  generateZiweiPlainConclusion,
  generateLiuyaoPlainConclusion,
  generateDailyPlainConclusion,
  type BaziConclusionInput,
} from '../plainConclusion';

describe('plainConclusion', () => {
  // 基准盘：1985-03-12 08:00 男 → 乙丑 己卯 庚戌 庚辰，日主庚金，中和
  const base: BaziConclusionInput = {
    pillars: ['乙丑', '己卯', '庚戌', '庚辰'],
    dayGan: '庚',
    dayWx: '金',
    dayZhi: '戌',
    dayShiShenZhi: '偏印/劫财/正官',
    level: '中和',
    yongShen: ['火', '木', '土'],
    xiShen: [],
    wxStrongest: '土',
    wxWeakest: '火',
    currentDaYun: { ganZhi: '乙亥', startAge: 33, endAge: 42 },
    liuNian: {
      year: 2026,
      ganZhi: '丙午',
      wx: '火',
      desc: '流年「丙(火)」生日主——印绶之年！利学业考证、贵人相助，适合进修深造。',
    },
  };

  it('bazi: 四柱、日主与自坐、旺衰、用神全部落地', () => {
    const text = generateBaziPlainConclusion(base);
    expect(text).toContain('乙丑 己卯 庚戌 庚辰');
    expect(text).toContain('日主庚金坐戌土');
    expect(text).toContain('自坐偏印/劫财/正官');
    expect(text).toContain('中和');
    expect(text).toContain('火、木、土');
  });

  it('bazi: 报的是当前大运（含年龄段与十神），不再是「下一步大运」', () => {
    const text = generateBaziPlainConclusion(base);
    expect(text).toContain('你正走「乙亥」大运（33~42岁）');
    expect(text).toContain('乙属木');
    expect(text).not.toContain('下一步大运');
  });

  it('bazi: 流年参与生成', () => {
    const text = generateBaziPlainConclusion(base);
    expect(text).toContain('今年走到「丙午」');
    expect(text).toContain('印绶之年');
  });

  it('bazi: 换四柱必须改文案（旧版输出与四柱无关）', () => {
    const a = generateBaziPlainConclusion(base);
    const b = generateBaziPlainConclusion({ ...base, pillars: ['甲子', '丙寅', '庚戌', '辛巳'] });
    expect(a).not.toBe(b);
    expect(b).toContain('甲子 丙寅 庚戌 辛巳');
  });

  it('bazi: 换当前大运必须改文案', () => {
    const a = generateBaziPlainConclusion(base);
    const c = generateBaziPlainConclusion({
      ...base,
      currentDaYun: { ganZhi: '甲戌', startAge: 43, endAge: 52 },
    });
    expect(c).toContain('甲戌');
    expect(c).toContain('43~52岁');
    expect(c).not.toBe(a);
  });

  it('bazi: 换流年必须改文案', () => {
    const a = generateBaziPlainConclusion(base);
    const d = generateBaziPlainConclusion({
      ...base,
      liuNian: { year: 2027, ganZhi: '丁未', wx: '火', desc: '日主克流年「丁(火)」——财运之年！利求财，需付出努力。' },
    });
    expect(d).toContain('今年走到「丁未」');
    expect(d).not.toBe(a);
  });

  it('bazi: 大运天干落用神 / 不落用神，判断句不同', () => {
    // 丙=火，在 base 用神（火、木、土）内
    const on = generateBaziPlainConclusion({ ...base, currentDaYun: { ganZhi: '丙子', startAge: 23, endAge: 32 } });
    // 壬=水，不在
    const off = generateBaziPlainConclusion({ ...base, currentDaYun: { ganZhi: '壬申', startAge: 53, endAge: 62 } });
    expect(on).toContain('正落在用神上');
    expect(off).toContain('不在用神');
  });

  it('bazi: 未起运时给出蓄力期说明', () => {
    const text = generateBaziPlainConclusion({ ...base, currentDaYun: null });
    expect(text).toContain('起运之前');
  });

  it('bazi: 时柱为推定值时必须标注，不得当既定事实', () => {
    const text = generateBaziPlainConclusion({ ...base, hourUnknown: true });
    expect(text).toContain('时柱按午时推定');
  });

  it('长度上限：理论最坏组合仍不超过 240 字', () => {
    // 最坏来源：时柱推定标注(+9) / 三藏干自坐(+12) / 身极强 trait / 5 个用神
    // （调候 2 + 扶抑 3 去重，上限 5）/ 大运不在用神 + 最长的比劫 action / 最长流年 desc。
    // 任一文案加长都会顶破 240，故此处钉死；改文案请一并重跑本用例。
    const worst = generateBaziPlainConclusion({
      pillars: ['癸巳', '丙辰', '己丑', '戊辰'],
      dayGan: '己',
      dayWx: '土',
      dayZhi: '丑',
      dayShiShenZhi: '偏印/劫财/正官',
      hourUnknown: true,
      level: '身极强',
      yongShen: ['火', '木', '土', '水', '金'],
      xiShen: [],
      wxStrongest: '土',
      wxWeakest: '木',
      currentDaYun: { ganZhi: '戊申', startAge: 72, endAge: 81 },
      liuNian: {
        year: 2026,
        ganZhi: '丙午',
        wx: '火',
        desc: '流年「丙(火)」生日主——印绶之年！利学业考证、贵人相助，适合进修深造。',
      },
    });
    expect(worst.length).toBeLessThanOrEqual(240);
  });

  it('bazi: 身弱命强调帮扶', () => {
    const text = generateBaziPlainConclusion({
      ...base,
      dayGan: '甲', dayWx: '木', dayZhi: '子', dayShiShenZhi: '正印',
      level: '身弱',
      yongShen: ['水'], xiShen: [],
      wxStrongest: '土', wxWeakest: '水',
      currentDaYun: null,
      liuNian: null,
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
