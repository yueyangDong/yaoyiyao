import { describe, it, expect } from 'vitest';
import { analyzeLove, analyzeCareer, analyzeHealth, analyzeSocial } from '../baziAnalysis';
import type { PillarData } from '../../pages/Bazi';

const mk = (pillar: string, tianGan: string, diZhi: string, shiShen: string): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen, shiShenZhi: '', nayin: '',
});

// 甲木日主、夫妻宫坐午、月支子（冬）、两比肩主气
const pillarsJia = [
  mk('年柱', '甲', '子', '比肩'),
  mk('月柱', '丙', '子', '食神'),
  mk('日柱', '甲', '午', '比肩'),
  mk('时柱', '庚', '午', '七杀'),
];

// 癸水日主、夫妻宫坐酉、月支巳（夏）、无重复主气
const pillarsGui = [
  mk('年柱', '丁', '巳', '偏财'),
  mk('月柱', '乙', '巳', '食神'),
  mk('日柱', '癸', '酉', '比肩'),
  mk('时柱', '甲', '寅', '伤官'),
];

describe('八字五维解读差异化', () => {
  it('爱情解读：不同日主/夫妻宫产出显著不同文本', () => {
    const a = analyzeLove(pillarsJia, [], 'male', '甲', '午', []);
    const b = analyzeLove(pillarsGui, [], 'male', '癸', '酉', []);
    expect(a.spouseFeature).toContain('甲木日主');
    expect(b.spouseFeature).toContain('癸水日主');
    expect(a.spouseFeature).toContain('夫妻宫坐午火');
    expect(b.spouseFeature).toContain('夫妻宫坐酉金');
    expect(a.spouseFeature).not.toBe(b.spouseFeature);
  });

  it('夫妻宫12支画像：子与午描述不同', () => {
    const zi = analyzeLove([mk('日柱', '甲', '子', '比肩'), mk('月柱', '丙', '子', '食神'), mk('年柱', '戊', '辰', '偏财'), mk('时柱', '庚', '午', '七杀')], [], 'male', '甲', '子', []);
    const wu = analyzeLove(pillarsJia, [], 'male', '甲', '午', []);
    expect(zi.spouseFeature).toContain('智性恋');
    expect(wu.spouseFeature).toContain('热烈浪漫');
  });

  it('健康解读：月令调候——冬生与夏生底色不同', () => {
    const winter = analyzeHealth(pillarsJia, { '木': { count: 2, level: '旺' }, '火': { count: 2, level: '旺' }, '土': { count: 1, level: '中和' }, '金': { count: 2, level: '旺' }, '水': { count: 2, level: '旺' } }, '甲', '身强', []);
    const summer = analyzeHealth(pillarsGui, { '木': { count: 2, level: '旺' }, '火': { count: 2, level: '旺' }, '土': { count: 1, level: '中和' }, '金': { count: 2, level: '旺' }, '水': { count: 2, level: '旺' } }, '癸', '中和', []);
    expect(winter.bodyOverview).toContain('仲冬');
    expect(summer.bodyOverview).toContain('初夏');
    expect(winter.bodyOverview).toContain('甲木之人');
    expect(summer.bodyOverview).toContain('癸水之人');
  });

  it('事业解读：命局主气十神注入（两比肩 → 主气比肩）', () => {
    const r = analyzeCareer(pillarsJia, [], '身强', ['火'], '甲');
    expect(r.direction).toContain('命局主气是比肩');
  });

  it('事业解读：无主气时回落到日主专属赛道文案', () => {
    // 官星+比劫组合（避开食伤生财/官印相等分支），比劫3处仍会注入主气锚
    const ps = [
      mk('年柱', '戊', '戌', '正官'),
      mk('月柱', '癸', '亥', '比肩'),
      mk('日柱', '癸', '酉', '比肩'),
      mk('时柱', '癸', '亥', '比肩'),
    ];
    const r = analyzeCareer(ps, [], '中和', ['火'], '癸');
    expect(r.direction).toContain('癸水——雨露型人格');
  });

  it('社交解读：不同日主社交风格不同', () => {
    const a = analyzeSocial(pillarsJia, [], '甲');
    const b = analyzeSocial(pillarsGui, [], '癸');
    expect(a.socialTrait).toContain('主心骨');
    expect(b.socialTrait).toContain('观察者');
    expect(a.socialTrait).not.toBe(b.socialTrait);
  });

  it('桃花按地支差异化：桃花落午柱 → 午火桃花描述', () => {
    const r = analyzeLove(pillarsJia, [{ name: '桃花', pillar: '日柱' }], 'male', '甲', '午', []);
    expect(r.peachBlossom).toContain('午火桃花');
  });
});
