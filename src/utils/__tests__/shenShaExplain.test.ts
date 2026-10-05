import { describe, it, expect } from 'vitest';
import { explainShenSha, explainShenShaMap, SHA_TRAIT } from '../shenShaExplain';
import { SHENSHA_PLAIN } from '../shenSha';
import type { PillarData } from '../../pages/Bazi';

const mk = (pillar: string, tianGan: string, diZhi: string, shiShen: string): PillarData => ({
  pillar, ganZhi: tianGan + diZhi, tianGan, diZhi,
  cangGan: [], shiShen, shiShenZhi: '', nayin: '',
});

/** 甲日主、月支卯（甲之帝旺/羊刃位）、时支酉（甲之胎位，冲卯） */
const pillars = (): PillarData[] => [
  mk('年柱', '庚', '申', '七杀'),
  mk('月柱', '乙', '卯', '劫财'),
  mk('日柱', '甲', '子', '偏印'),
  mk('时柱', '辛', '酉', '正官'),
];

describe('explainShenSha 本局解释', () => {
  it('每个落点都带定位（柱位+干支+长生）与因盘而异的作用结论', () => {
    const out = explainShenSha({
      pillars: pillars(),
      shenSha: [{ name: '天乙贵人', pillar: '月柱', type: '吉' }],
      strengthLevel: '身弱',
      yongShen: ['木'],
    });
    expect(out).toHaveLength(1);
    const it0 = out[0];
    expect(it0.positioning).toContain('月柱');
    expect(it0.positioning).toContain('乙卯');
    expect(it0.positioning).toContain('帝旺'); // 甲长生在亥，顺行至卯为帝旺
    // 月支卯属木 = 用神 → 吉煞落用神
    expect(it0.verdict).toContain('用神');
    // 身弱 → 借力措辞
    expect(it0.verdict).toContain('借力');
    expect(it0.text).toContain('月柱');
  });

  it('同名神煞换柱位 → 定位与阶段说明随之改变（不再是一句话通吃）', () => {
    const inMonth = explainShenSha({
      pillars: pillars(),
      shenSha: [{ name: '天乙贵人', pillar: '月柱', type: '吉' }],
      strengthLevel: '中和', yongShen: [],
    })[0];
    const inTime = explainShenSha({
      pillars: pillars(),
      shenSha: [{ name: '天乙贵人', pillar: '时柱', type: '吉' }],
      strengthLevel: '中和', yongShen: [],
    })[0];
    expect(inMonth.text).not.toBe(inTime.text);
    expect(inMonth.text).toContain('青年与父母兄弟');
    expect(inTime.text).toContain('晚年与子女');
    // 时支酉为甲之胎地，月支卯为帝旺 → 得地描述必须不同
    expect(inMonth.positioning).toContain('帝旺');
    expect(inTime.positioning).toContain('胎');
  });

  it('凶煞落空亡 + 被冲：给出避锋芒与力量被打散的组合结论', () => {
    // 时支酉落甲子旬空亡（甲子旬空戌亥，故用戌）：改用年柱戌验证空亡分支
    const ps: PillarData[] = [
      mk('年柱', '庚', '戌', '偏财'),
      mk('月柱', '乙', '卯', '劫财'),
      mk('日柱', '甲', '子', '偏印'),
      mk('时柱', '辛', '酉', '正官'),
    ];
    const out = explainShenSha({
      pillars: ps,
      shenSha: [{ name: '羊刃', pillar: '月柱', type: '凶' }],
      strengthLevel: '身强', yongShen: ['火'],
    })[0];
    // 月支卯被时支酉冲 → 制化句出现
    expect(out.verdict).toContain('冲');
    // 身强 + 凶煞 → 磨刀石
    expect(out.verdict).toContain('磨刀石');
    // 卯属木，用神为火 → 不在用神上
    expect(out.verdict).toContain('直接显现');
  });

  it('落空亡的煞单独给出"有名无实"提示（空亡自身除外，见 power 模型自指口径）', () => {
    // 甲子日 → 旬空戌亥；年支戌 = 空亡位
    const ps: PillarData[] = [
      mk('年柱', '庚', '戌', '偏财'),
      mk('月柱', '乙', '卯', '劫财'),
      mk('日柱', '甲', '子', '偏印'),
      mk('时柱', '辛', '酉', '正官'),
    ];
    const out = explainShenSha({
      pillars: ps,
      shenSha: [{ name: '将星', pillar: '年柱', type: '吉' }],
      strengthLevel: '中和', yongShen: [],
    })[0];
    expect(out.verdict).toContain('空亡');
    expect(out.verdict).toContain('有名无实');
  });

  it('explainShenShaMap 按 name|pillar 建索引，同名多柱各有一条', () => {
    const map = explainShenShaMap({
      pillars: pillars(),
      shenSha: [
        { name: '天乙贵人', pillar: '月柱', type: '吉' },
        { name: '天乙贵人', pillar: '时柱', type: '吉' },
      ],
      strengthLevel: '中和', yongShen: [],
    });
    expect(Object.keys(map).sort()).toEqual(['天乙贵人|时柱', '天乙贵人|月柱']);
    expect(map['天乙贵人|月柱'].text).not.toBe(map['天乙贵人|时柱'].text);
  });

  it('每颗神煞的解释都先报家门——包含该煞的本职短语', () => {
    const map = explainShenShaMap({
      pillars: pillars(),
      shenSha: [
        { name: '驿马', pillar: '时柱', type: '平' },
        { name: '羊刃', pillar: '月柱', type: '凶' },
        { name: '桃花', pillar: '日柱', type: '平' },
      ],
      strengthLevel: '身强', yongShen: [],
    });
    expect(map['驿马|时柱'].text).toContain(SHA_TRAIT['驿马']);
    expect(map['羊刃|月柱'].text).toContain(SHA_TRAIT['羊刃']);
    expect(map['桃花|日柱'].text).toContain(SHA_TRAIT['桃花']);
  });

  it('同盘同处境的不同神煞 → 措辞各不相同，不再共用一套话', () => {
    // 三颗都落月柱（同柱位、同喜忌处境），但类目不同：助力 / 才学 / 锋芒
    const map = explainShenShaMap({
      pillars: pillars(),
      shenSha: [
        { name: '天乙贵人', pillar: '月柱', type: '吉' },
        { name: '文昌', pillar: '月柱', type: '吉' },
        { name: '将星', pillar: '月柱', type: '吉' },
      ],
      strengthLevel: '身弱', yongShen: ['木'],
    });
    const t1 = map['天乙贵人|月柱'].text;
    const t2 = map['文昌|月柱'].text;
    const t3 = map['将星|月柱'].text;
    expect(t1).not.toBe(t2);
    expect(t2).not.toBe(t3);
    expect(t1).not.toBe(t3);
    // 类目主语各不相同：庇护 / 才气 / 锋芒
    expect(t1).toContain('庇护');
    expect(t2).toContain('才气');
    expect(t3).toContain('锋芒');
  });

  it('同类目不同煞（天乙贵人 vs 天德）同柱同处境 → 仍因报家门而不同', () => {
    const map = explainShenShaMap({
      pillars: pillars(),
      shenSha: [
        { name: '天乙贵人', pillar: '年柱', type: '吉' },
        { name: '天德', pillar: '年柱', type: '吉' },
      ],
      strengthLevel: '中和', yongShen: [],
    });
    const t1 = map['天乙贵人|年柱'].text;
    const t2 = map['天德|年柱'].text;
    expect(t1).not.toBe(t2);
    expect(t1).toContain('贵人提携');
    expect(t2).toContain('化险为夷');
  });

  it('SHA_TRAIT 与 SHENSHA_PLAIN 键集严格一致（新增神煞必须同步本职短语）', () => {
    expect(Object.keys(SHA_TRAIT).sort()).toEqual(Object.keys(SHENSHA_PLAIN).sort());
  });
});
