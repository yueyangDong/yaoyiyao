import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { kinStarsOf, normGender } from '../kinStars';
import { analyzeFamily, analyzeLove } from '../baziAnalysis';
import { generatePalaceReading } from '../ziweiAnalysis';
import { generateDomainDeepReadings, type DomainDeepInput } from '../baziDomainDeep';
import type { PillarData } from '../../pages/Bazi';

const mk = (
  pillar: string,
  tianGan: string,
  diZhi: string,
  shiShen: string,
  shiShenZhi = ''
): PillarData => ({
  pillar,
  ganZhi: tianGan + diZhi,
  tianGan,
  diZhi,
  cangGan: [],
  shiShen,
  shiShenZhi,
  nayin: '',
});

// 年柱正印：男命是母星，女命的母星是偏印（正印不是）
const pillarsYearZhengYin = [
  mk('年柱', '壬', '戌', '正印'),
  mk('月柱', '甲', '子', '比肩'),
  mk('日柱', '癸', '酉', '比肩'),
  mk('时柱', '甲', '寅', '伤官'),
];
// 年柱偏印：女命的母星
const pillarsYearPianYin = [
  mk('年柱', '辛', '酉', '偏印'),
  mk('月柱', '甲', '子', '比肩'),
  mk('日柱', '癸', '酉', '比肩'),
  mk('时柱', '甲', '寅', '伤官'),
];

// 甲木日主、日支子（水生木，无冲合刑害）→ 走「夫妻宫生助日主」分支
const pillarsJiaZi = [
  mk('年柱', '甲', '子', '比肩'),
  mk('月柱', '丙', '子', '食神'),
  mk('日柱', '甲', '子', '比肩'),
  mk('时柱', '庚', '午', '七杀'),
];

describe('六亲取星：性别归一与分档', () => {
  it('男命：父偏财 / 母正印 / 配偶正财', () => {
    expect(kinStarsOf('male')).toEqual({
      father: '偏财',
      mother: '正印',
      spouse: '正财',
      secondarySpouse: '偏财',
    });
  });

  it('女命：父正财 / 母偏印 / 配偶正官', () => {
    expect(kinStarsOf('female')).toEqual({
      father: '正财',
      mother: '偏印',
      spouse: '正官',
      secondarySpouse: '七杀',
    });
  });

  it('中文入参不得被判反（`g === "male"` 会把「男」判成女命）', () => {
    expect(normGender('男')).toBe('male');
    expect(normGender('女')).toBe('female');
    expect(kinStarsOf('男')).toEqual(kinStarsOf('male'));
    expect(kinStarsOf('女')).toEqual(kinStarsOf('female'));
  });

  it('未知性别返回 null，不替用户认定男命', () => {
    expect(kinStarsOf(undefined)).toBeNull();
    expect(kinStarsOf('')).toBeNull();
    expect(kinStarsOf('未知')).toBeNull();
  });
});

describe('家庭：父母星按性别取用（与 baziDomainDeep 同口径）', () => {
  it('女命年柱正印不读作母亲（母星是偏印）', () => {
    const r = analyzeFamily(pillarsYearZhengYin, [], '癸', 'female');
    expect(r.parentRelation).not.toContain('正印代表母亲');
  });

  it('男命年柱正印读作母亲', () => {
    const r = analyzeFamily(pillarsYearZhengYin, [], '癸', 'male');
    expect(r.parentRelation).toContain('正印代表母亲');
  });

  it('女命年柱偏印读作母亲', () => {
    const r = analyzeFamily(pillarsYearPianYin, [], '癸', 'female');
    expect(r.parentRelation).toContain('偏印代表母亲');
  });

  it('不传性别时不出父母星归属（不默认男命）', () => {
    const r = analyzeFamily(pillarsYearZhengYin, [], '癸');
    expect(r.parentRelation).not.toContain('代表母亲');
    expect(r.parentRelation).not.toContain('代表父亲');
  });
});

describe('爱情：性别判据落到措辞上', () => {
  it('夫妻宫生助日主：女命「旺夫」、男命「旺妻」，不出现双写词', () => {
    const f = analyzeLove(pillarsJiaZi, [], 'female', '甲', '子', []);
    const m = analyzeLove(pillarsJiaZi, [], 'male', '甲', '子', []);
    expect(f.marriageQuality).toContain('旺夫');
    expect(f.marriageQuality).not.toContain('旺妻');
    expect(m.marriageQuality).toContain('旺妻');
    expect(m.marriageQuality).not.toContain('旺夫');
  });

  it('中文性别入参与英文一致（「男」不得走女命分支）', () => {
    const cn = analyzeLove(pillarsJiaZi, [], '男', '甲', '子', []);
    const en = analyzeLove(pillarsJiaZi, [], 'male', '甲', '子', []);
    expect(cn.marriageQuality).toBe(en.marriageQuality);
  });
});

describe('紫微：星曜特质不得写死性别', () => {
  it('太阴坐疾厄，男女盘都不出现妇科/生理期', () => {
    const r = generatePalaceReading('疾厄', ['太阴'], null, null, null);
    expect(r.reading).toContain('内分泌');
    expect(r.reading).not.toContain('生理期');
    expect(r.reading).not.toContain('妇科');
  });
});

describe('深读层：夫妻宫正财/正官按性别只出一边', () => {
  const pillarsLove = [
    mk('年柱', '甲', '子', '比肩'),
    mk('月柱', '丙', '子', '食神'),
    mk('日柱', '甲', '子', '比肩', '正财'),
    mk('时柱', '庚', '午', '七杀'),
  ];
  const loveText = (gender: string) => {
    const input: DomainDeepInput = {
      pillars: pillarsLove,
      shenSha: [],
      gender,
      dayGan: '甲',
      strengthLevel: '中和',
      yongShen: ['水'],
      relations: [],
    };
    return generateDomainDeepReadings(input)
      .filter((d) => d.domainKey === 'love')
      .flatMap((d) => d.sections.map((s) => s.text))
      .join('\n');
  };

  it('女命：不出「妻星入妻宫（男命）」', () => {
    const t = loveText('female');
    expect(t).toContain('财星入夫妻宫（女命）');
    expect(t).not.toContain('妻星入妻宫');
  });

  it('男命：出「妻星入妻宫（男命）」', () => {
    const t = loveText('male');
    expect(t).toContain('妻星入妻宫（男命）');
    expect(t).not.toContain('（女命）');
  });

  it('未知性别：走中性句，不标注任何一方', () => {
    const t = loveText('');
    expect(t).toContain('财星入夫妻宫——');
    expect(t).not.toContain('（男命）');
    expect(t).not.toContain('（女命）');
  });
});

describe('性别语境黑名单（防回归）', () => {
  const BAD = [
    '旺夫/旺妻',
    '嫁/娶对人',
    '女性需注意生理期',
    '一个主外一个主内',
    '婚恋窗口',
  ];
  const walk = (dir: string, hits: string[]): string[] => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) {
        if (f !== '__tests__') walk(p, hits);
        continue;
      }
      if (!f.endsWith('.ts')) continue;
      const src = readFileSync(p, 'utf8');
      for (const bad of BAD) if (src.includes(bad)) hits.push(`${f} → ${bad}`);
    }
    return hits;
  };

  it('utils 下不得再出现双写/写死性别的句子', () => {
    expect(walk(join(process.cwd(), 'src', 'utils'), [])).toEqual([]);
  });
});
