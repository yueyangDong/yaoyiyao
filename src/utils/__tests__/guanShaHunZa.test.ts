import { describe, it, expect } from 'vitest';
import { analyzeGuanShaHunZa } from '../guanShaHunZa';
import type { PillarData } from '../../pages/Bazi';

/** 造一柱：pillar 名、天干、地支、藏干、天干十神 */
const mk = (
  pillar: string, tianGan: string, diZhi: string,
  cangGan: string[], shiShen: string,
): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi, cangGan, shiShen, shiShenZhi: '', nayin: '',
});

// 十神口径：甲日 → 辛正官 / 庚七杀 / 丙食神 / 丁伤官 / 乙劫财 / 壬偏印
//           乙日 → 庚正官 / 辛七杀 / 丁食神 / 丙伤官

describe('analyzeGuanShaHunZa · 齐透门槛', () => {
  it('官透杀藏（七杀只在地支藏干）→ 不构成混杂', () => {
    // 甲日：辛官透年干，庚杀只藏日支申中——「露官藏杀只论官」
    const ps = [
      mk('年柱', '辛', '酉', ['辛'], '正官'),
      mk('月柱', '甲', '子', ['癸'], '比肩'),
      mk('日柱', '甲', '申', ['庚', '壬', '戊'], '日主'),
      mk('时柱', '丁', '卯', ['乙'], '伤官'),
    ];
    expect(analyzeGuanShaHunZa(ps, '甲', '身弱').tier).toBeNull();
  });

  it('缺数据安全返回，不抛错', () => {
    expect(analyzeGuanShaHunZa([], '甲', '身弱').tier).toBeNull();
    expect(analyzeGuanShaHunZa([mk('年柱', '辛', '酉', ['辛'], '正官')], '', '身弱').tier).toBeNull();
  });
});

describe('analyzeGuanShaHunZa · 去留取清', () => {
  it('去杀留官：阳日食神有力制杀 → 上等', () => {
    // 甲日：辛官 + 庚杀齐透，丙食神透时干、坐下午火（丁）为根、无印夺食。
    // 丙辛合是「合官留官」不是绊——阳日食神的五合对象恒为正官。
    const ps = [
      mk('年柱', '辛', '丑', ['己', '癸', '辛'], '正官'),
      mk('月柱', '庚', '午', ['丁', '己'], '七杀'),
      mk('日柱', '甲', '寅', ['甲', '丙', '戊'], '日主'),
      mk('时柱', '丙', '子', ['癸'], '食神'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '中和');
    expect(r.tier).toBe('去杀留官');
    expect(r.score).toBe('上等');
    expect(r.basis.join(' ')).toContain('有力制去七杀');
    expect(r.basis.join(' ')).toContain('阳日干食神');
    expect(r.detail).toContain('去杀留官当论贵');
  });

  it('去官留杀：阴日伤官有力制官（合杀留杀）→ 中上', () => {
    // 乙日：庚官 + 辛杀齐透，丙伤官透时干、坐下巳火（丙）为根。
    // ⚠️ 回归钉：丙与辛杀五合——阴日伤官的五合对象恒为七杀，是「留杀」不是「制杀」，
    //    不得把丙同时算进制杀、制官两个篮子（旧版会误判「官杀俱去」）。
    const ps = [
      mk('年柱', '庚', '辰', ['戊', '乙', '癸'], '正官'),
      mk('月柱', '辛', '巳', ['丙', '戊', '庚'], '七杀'),
      mk('日柱', '乙', '卯', ['乙'], '日主'),
      mk('时柱', '丙', '子', ['癸'], '伤官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '乙', '中和');
    expect(r.tier).toBe('去官留杀');
    expect(r.score).toBe('中上');
    expect(r.basis.join(' ')).toContain('阴日伤官能去官又能留杀');
  });

  it('阳日伤官单去官不取清：「但能去官、不能留杀」，无劫刃合杀 → 落分档', () => {
    // 甲日：辛官 + 庚杀齐透，丁伤官有力（午火为根）制官，但无乙劫合庚杀。
    // 阳日伤官去官后杀仍无制 → 不算取清；杀无制 + 身弱 → 混而无制，理由链须留痕。
    const ps = [
      mk('年柱', '辛', '卯', ['乙'], '正官'),
      mk('月柱', '庚', '午', ['丁', '己'], '七杀'),
      mk('日柱', '甲', '寅', ['甲', '丙', '戊'], '日主'),
      mk('时柱', '丁', '丑', ['己', '癸', '辛'], '伤官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '身弱');
    expect(r.tier).toBe('混而无制');
    expect(r.basis.join(' ')).toContain('但能去官、不能留杀');
  });

  it('合杀留官：劫财合杀（乙庚合）→ 中上', () => {
    // 甲日：庚杀被乙劫财合住——「合杀忘贱」，官星独清
    const ps = [
      mk('年柱', '乙', '丑', ['己', '癸', '辛'], '劫财'),
      mk('月柱', '庚', '午', ['丁', '己'], '七杀'),
      mk('日柱', '甲', '申', ['庚', '壬', '戊'], '日主'),
      mk('时柱', '辛', '未', ['己', '丁', '乙'], '正官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '中和');
    expect(r.tier).toBe('合杀留官');
    expect(r.score).toBe('中上');
    expect(r.detail).toContain('合住七杀');
  });

  it('合官留杀：官被合去 → 中等（「合官不为贵」降档）', () => {
    // 甲日：辛官被丙合（丙无根虚浮、构不成制杀），庚杀无合 → 以杀论格但贵气打折
    const ps = [
      mk('年柱', '丙', '子', ['癸'], '食神'),
      mk('月柱', '庚', '申', ['庚', '壬', '戊'], '七杀'),
      mk('日柱', '甲', '辰', ['戊', '乙', '癸'], '日主'),
      mk('时柱', '辛', '酉', ['辛'], '正官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '中和');
    expect(r.tier).toBe('合官留杀');
    expect(r.score).toBe('中等');
    expect(r.basis.join(' ')).toContain('合官不为贵');
  });
});

describe('analyzeGuanShaHunZa · 无去留时的三档', () => {
  // 辛官 + 庚杀齐透，天干无食伤/印/合杀之字
  const bare = () => [
    mk('年柱', '辛', '酉', ['辛'], '正官'),
    mk('月柱', '庚', '寅', ['甲', '丙', '戊'], '七杀'),
    mk('日柱', '甲', '午', ['丁', '己'], '日主'),
    mk('时柱', '辛', '未', ['己', '丁', '乙'], '正官'),
  ];

  it('官杀集结：身强能任 → 不作混杂论（中等）', () => {
    const r = analyzeGuanShaHunZa(bare(), '甲', '身强');
    expect(r.tier).toBe('官杀集结');
    expect(r.score).toBe('中等');
    expect(r.basis.join(' ')).toContain('能任官杀');
  });

  it('混而无制：身弱不能任、全无救应 → 下等（文案给出路不恐吓）', () => {
    const r = analyzeGuanShaHunZa(bare(), '甲', '身弱');
    expect(r.tier).toBe('混而无制');
    expect(r.score).toBe('下等');
    expect(r.detail).toContain('去一留一');
  });

  it('混而有制：有制化手段但无力（食伤无根虚浮）→ 中下', () => {
    // 丁伤官透但四柱无火根（丑申辰酉皆无丙丁）——救应存在、使不上劲
    const ps = [
      mk('年柱', '丁', '丑', ['己', '癸', '辛'], '伤官'),
      mk('月柱', '庚', '申', ['庚', '壬', '戊'], '七杀'),
      mk('日柱', '甲', '辰', ['戊', '乙', '癸'], '日主'),
      mk('时柱', '辛', '酉', ['辛'], '正官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '身弱');
    expect(r.tier).toBe('混而有制');
    expect(r.score).toBe('中下');
    expect(r.basis.join(' ')).toContain('无根虚浮');
  });

  it('混而有制：印透无根同样计入（化杀无力）', () => {
    // 壬偏印透但四柱无水根（午寅戌皆无壬癸亥子）——想化杀化不动
    const ps = [
      mk('年柱', '壬', '午', ['丁', '己'], '偏印'),
      mk('月柱', '庚', '寅', ['甲', '丙', '戊'], '七杀'),
      mk('日柱', '甲', '戌', ['戊', '辛', '丁'], '日主'),
      mk('时柱', '辛', '酉', ['辛'], '正官'),
    ];
    const r = analyzeGuanShaHunZa(ps, '甲', '身弱');
    expect(r.tier).toBe('混而有制');
    expect(r.basis.join(' ')).toContain('无根');
  });
});
