import { describe, it, expect } from 'vitest';
import { analyzeLove, analyzeCareer, analyzeHealth, analyzeSocial, recommendYongShen } from '../baziAnalysis';
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

describe('喜用神调候（穷通宝鉴逐月）', () => {
  it('癸水逐月喜用与穷通宝鉴提要一致', () => {
    // 用户提供的《穷通宝鉴》癸水逐月提要校验
    const cases: Record<string, string[]> = {
      '寅': ['金', '火'],
      '卯': ['金'],
      '辰': ['火', '金', '木'],
      '巳': ['金'],
      '午': ['金', '水'],
      '未': ['金', '水'],
      '申': ['火', '木'],
      '酉': ['金', '火'],
      '戌': ['金', '木', '水'],
      '亥': ['金', '土', '火'],
      '子': ['火', '金'],
      '丑': ['火'],
    };
    for (const [month, expected] of Object.entries(cases)) {
      const r = recommendYongShen('水', '中和', undefined, '癸', month);
      // 调候用神必须全部出现
      for (const y of expected) {
        expect(r.yongShen).toContain(y);
      }
      // 描述中应包含调候说明
      expect(r.desc).toContain('调候');
    }
  });

  it('癸水生于巳月（夏）：调候用神为金，辛金女可补', () => {
    // 核心场景：男癸水生于夏季，喜用神必须含金
    const r = recommendYongShen('水', '身强', undefined, '癸', '巳');
    expect(r.yongShen).toContain('金');
    // 即使身强扶抑喜火土，调候金仍优先出现
    expect(r.yongShen).toContain('金');
  });

  it('合盘场景：癸水男（巳月生）+ 辛金女 → 女方日主补男方喜用', () => {
    const male = recommendYongShen('水', '中和', undefined, '癸', '巳');
    // 男方喜用含金 → 辛金（金）日主正好补充
    expect(male.yongShen).toContain('金');
    const femaleDayWx = '金'; // 辛金
    expect(male.yongShen.includes(femaleDayWx)).toBe(true);
  });

  it('调候优先于扶抑：癸水午月身强仍喜金水（不被火土覆盖）', () => {
    const r = recommendYongShen('水', '身强', undefined, '癸', '午');
    // 调候：金水；扶抑身强：火（财）、土（官杀）
    expect(r.yongShen).toContain('金');
    expect(r.yongShen).toContain('水');
  });

  it('不传 dayGan/monthZhi 时回退到纯扶抑（兼容旧调用）', () => {
    const r = recommendYongShen('水', '身弱');
    // 身弱水扶抑喜金（印）水（比劫）
    expect(r.yongShen).toContain('金');
    expect(r.yongShen).toContain('水');
  });

  it('辛金逐月调候：夏生喜水金、冬生喜火土', () => {
    const summer = recommendYongShen('金', '中和', undefined, '辛', '午');
    expect(summer.yongShen).toContain('水');
    const winter = recommendYongShen('金', '中和', undefined, '辛', '子');
    expect(winter.yongShen).toContain('火');
  });

  // ==== 喜用三体系合并（调候×扶抑×格局）——依用户命理反馈修正 ====

  it('冬月癸水身强（用户验收场景）：喜木火土、忌金水——辛金滋扶舍去、食伤补全', () => {
    const r = recommendYongShen('水', '身强', undefined, '癸', '子');
    // 调候[火,金]→身强舍金留火；扶抑身强补全食伤木：喜=火土木
    expect(r.yongShen.sort()).toEqual(['土', '木', '火'].sort());
    // 忌=印比（金水）；破用若水旺水亦在内
    expect(r.xiShen).toContain('金');
    expect(r.xiShen).toContain('水');
    expect(r.desc).toContain('舍去');
    // 喜忌互斥（旧版火金同入喜忌的矛盾已修）
    for (const x of r.xiShen) expect(r.yongShen).not.toContain(x);
  });

  it('旧版忌神方向修正：调候之金不再推出「忌木」——克用神者才可入忌且须旺', () => {
    const r = recommendYongShen('水', '身强', undefined, '癸', '子');
    // 旧 bug：WX_KE['金']='木' 把木推入忌；木现为身强食伤（喜用）
    expect(r.xiShen).not.toContain('木');
  });

  it('身弱忌神补全：甲木身弱忌官杀金、财土、食伤火（旧版只忌财）', () => {
    const r = recommendYongShen('木', '身弱');
    expect(r.yongShen).toContain('水');
    expect(r.yongShen).toContain('木');
    expect(r.xiShen).toContain('金');
    expect(r.xiShen).toContain('土');
    expect(r.xiShen).toContain('火');
  });

  it('破用变忌：土为用神而木旺克土 → 木由平转忌并提示火通关', () => {
    // 癸亥月身弱：调候取【金土火】（水旺且寒——庚辛金生水、戊土制水、丁火暖局），扶抑取【金水】
    // → 用神中含【土】，而木是身弱之食伤（不在喜用中）；局中木旺克土 → 木入忌、取火通关。
    // ⚠️ 不要改用「火旺克金」来构造本用例：癸亥调候本身已含火，火在喜用中会被
    //    「克用神者若本身在喜用中，以通关论不移忌」的守护跳过（见下一条用例）。
    const wxStats = { '木': { count: 6, level: '旺' } } as never;
    const r = recommendYongShen('水', '身弱', wxStats, '癸', '亥');
    expect(r.yongShen).toContain('土');     // 调候之土在用神中
    expect(r.yongShen).not.toContain('木'); // 身弱水，木为食伤（忌）
    expect(r.xiShen).toContain('木');       // 木旺克土 → 破用转忌
    expect(r.desc).toContain('通关');
    expect(r.desc).toContain('火');         // 通关神 = 泄木生土（木生火、火生土）
  });

  it('破用之守护：克用神者若本身已在喜用中，只以通关论、不移忌（癸亥调候含火，火克金而不入忌）', () => {
    const wxStats = { '火': { count: 6, level: '旺' } } as never;
    const r = recommendYongShen('水', '身弱', wxStats, '癸', '亥');
    expect(r.yongShen).toContain('金');
    expect(r.yongShen).toContain('火');     // 癸亥调候之丁火暖局，本就在喜用内
    expect(r.xiShen).not.toContain('火');   // 故火虽旺且克金，也不得入忌
  });

  it('破用不移喜：克用神者若本身在喜用中（身强喜木又木克土），以通关论', () => {
    // 癸水子月身强：喜用含木（食伤）与土（官杀），木克土但木在喜用中 → 木不入忌
    const wxStats = { '木': { count: 5, level: '旺' } } as never;
    const r = recommendYongShen('水', '身强', wxStats, '癸', '子');
    expect(r.yongShen).toContain('木');
    expect(r.xiShen).not.toContain('木');
  });

  it('从财格：身极弱 + 月支本气为财（甲木生丑月）→ 喜财食伤、忌印比（喜忌反转）', () => {
    const r = recommendYongShen('木', '身极弱', undefined, '甲', '丑');
    // 丑本气己土为甲之财 → 从财：喜土（财）火（食伤），忌水（印）木（比劫）
    expect(r.yongShen.sort()).toEqual(['土', '火'].sort());
    expect(r.xiShen.sort()).toEqual(['水', '木'].sort());
    expect(r.desc).toContain('从财');
  });

  it('从儿格：身极弱 + 月支本气为食伤（甲木生午月）→ 喜食伤财、忌印官（喜忌反转）', () => {
    const r = recommendYongShen('木', '身极弱', undefined, '甲', '午');
    // 午本气丁火为甲之伤官 → 从儿：喜火（食伤）土（财），忌水（印）金（官杀）
    expect(r.yongShen.sort()).toEqual(['火', '土'].sort());
    expect(r.xiShen.sort()).toEqual(['水', '金'].sort());
    expect(r.desc).toContain('从儿');
  });

  it('从杀格：身极弱 + 月支本气为官杀（甲木生酉月）→ 喜官财、忌印比（喜忌反转）', () => {
    const r = recommendYongShen('木', '身极弱', undefined, '甲', '酉');
    // 酉本气辛金为甲之正官 → 从杀：喜金（官）土（财），忌水（印）木（比劫）
    expect(r.yongShen.sort()).toEqual(['金', '土'].sort());
    expect(r.xiShen.sort()).toEqual(['水', '木'].sort());
    expect(r.desc).toContain('从杀');
  });

  it('从旺：身极强 + 克泄耗俱弱（甲木满盘水木）→ 喜印比、忌克泄耗（喜忌反转）', () => {
    const wxStats = {
      '金': { count: 0, level: '缺' },
      '土': { count: 1, level: '弱' },
      '火': { count: 1, level: '弱' },
    } as never;
    const r = recommendYongShen('木', '身极强', wxStats, '甲', '寅');
    // 从旺：喜水（印）木（比劫），忌土（财）金（官杀）火（食伤）
    expect(r.yongShen.sort()).toEqual(['水', '木'].sort());
    expect(r.xiShen.sort()).toEqual(['土', '金', '火'].sort());
    expect(r.desc).toContain('从旺');
  });

  it('身极强但克泄有力（不从旺）：仍走调候+扶抑正路', () => {
    const wxStats = {
      '金': { count: 4, level: '旺' },
      '土': { count: 3, level: '适中' },
      '火': { count: 3, level: '适中' },
    } as never;
    const r = recommendYongShen('木', '身极强', wxStats, '甲', '寅');
    // 不从旺 → 身强扶抑：喜财土、官杀金、食伤火
    expect(r.yongShen).toContain('金');
    expect(r.yongShen).toContain('土');
    expect(r.yongShen).toContain('火');
    expect(r.desc).not.toContain('从旺');
  });
});
