import { describe, it, expect } from 'vitest';
import { generateDomainDeepReadings } from '../baziDomainDeep';
import type { PillarData } from '../../pages/Bazi';

// 命例 mock：甲日主，年柱戊辰、月柱丁丑、日柱甲子（日支正印）、时柱甲戌
const pillars: PillarData[] = [
  { pillar: '年柱', ganZhi: '戊辰', tianGan: '戊', diZhi: '辰', cangGan: ['戊', '乙', '癸'], shiShen: '偏财', shiShenZhi: '偏财/劫财/正印', nayin: '大林木' },
  { pillar: '月柱', ganZhi: '丁丑', tianGan: '丁', diZhi: '丑', cangGan: ['己', '癸', '辛'], shiShen: '伤官', shiShenZhi: '正财/正印/正官', nayin: '涧下水' },
  { pillar: '日柱', ganZhi: '甲子', tianGan: '甲', diZhi: '子', cangGan: ['癸'], shiShen: '日主', shiShenZhi: '正印', nayin: '海中金' },
  { pillar: '时柱', ganZhi: '甲戌', tianGan: '甲', diZhi: '戌', cangGan: ['戊', '辛', '丁'], shiShen: '比肩', shiShenZhi: '偏财/正官/伤官', nayin: '山头火' },
];

const baseInput = {
  pillars,
  shenSha: [
    { name: '桃花', pillar: '日柱' },
    { name: '天乙贵人', pillar: '月柱' },
    { name: '羊刃', pillar: '月柱' },
    { name: '驿马', pillar: '年柱' },
  ],
  gender: 'male',
  dayGan: '甲',
  strengthLevel: '偏弱',
  yongShen: ['水', '木'],
  relations: [],
};

describe('generateDomainDeepReadings 五领域深度解读', () => {
  const readings = generateDomainDeepReadings(baseInput);
  const byKey: Record<string, any> = {};
  for (const r of readings) byKey[r.domainKey] = r;

  it('五个领域全部生成，各含4段分层结构', () => {
    expect(readings).toHaveLength(5);
    for (const key of ['love', 'career', 'health', 'family', 'social']) {
      expect(byKey[key]).toBeDefined();
      expect(byKey[key].sections.length).toBe(4);
    }
  });

  it('爱情：夫妻宫底牌引日柱干支与坐支十神；神煞点睛含桃花', () => {
    const love = byKey.love;
    expect(love.sections[0].heading).toContain('夫妻宫的底牌');
    expect(love.sections[0].text).toContain('甲子');
    expect(love.sections[0].text).toContain('正印');
    expect(love.sections[1].text).toContain('【桃花·日柱】');
    expect(love.sections[3].text).toContain('水、木'); // 喜用神
  });

  it('事业：月令十神发动机（丑藏己土正财）+ 天乙贵人佐证', () => {
    const career = byKey.career;
    expect(career.sections[0].heading).toContain('月令十神');
    expect(career.sections[0].text).toContain('正财');
    expect(career.sections[1].text).toContain('【天乙贵人·月柱】');
    // 财富形状：年干偏财透出
    expect(career.sections[2].text).toContain('偏财在年柱戊辰');
  });

  it('健康：体质底色+命带羊刃出警示；五行短板与喜用神开方', () => {
    const health = byKey.health;
    expect(health.sections[0].text).toContain('日主甲（木）');
    expect(health.sections[1].text).toContain('【羊刃·月柱】');
    expect(health.sections[2].heading).toContain('五行短板');
    expect(health.sections[3].text).toContain('水、木');
  });

  it('家庭：男命父星=偏财（年柱戊辰命中）；喜用神相处建议', () => {
    const family = byKey.family;
    expect(family.sections[0].text).toContain('父星（偏财）在年柱戊辰');
    expect(family.sections[3].text).toContain('水、木');
  });

  it('社交：驿马神煞与择友建议', () => {
    const social = byKey.social;
    expect(social.sections[1].text).toContain('【驿马·年柱】');
    expect(social.sections[3].text).toContain('灵活会变通'); // 水→贵人气质
  });

  it('无血光神煞时健康段走平顺文案；日支逢冲时感情暗线提示', () => {
    const r = generateDomainDeepReadings({
      ...baseInput,
      shenSha: [],
      relations: [{ type: '冲', desc: '日柱地支子与月柱地支丑相破；日支子逢冲（示例）' }],
    });
    const health = r.find((x) => x.domainKey === 'health')!;
    expect(health.sections[1].text).toContain('体质底子平顺');
    const love = r.find((x) => x.domainKey === 'love')!;
    expect(love.sections[2].text).toContain('日支逢冲');
  });
});
