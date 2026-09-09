// 四化校准测试：全书画四化表（辛干文曲化科）、生年四化重算清旧值、自化（CF标记）、飞宫四化流向、对待文案
import { describe, it, expect } from 'vitest';
import {
  SIHUA_TABLE,
  getSihuaStars,
  recalcSihua,
  describeFlyIn,
  describeFlyOutJi,
} from '../ziweiSihuaFlying';

const GONGS = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

function mkGong(
  name: string,
  stem: string,
  majors: string[] = [],
  minors: string[] = [],
  presetSihua: Record<string, string | null> = {}
) {
  return {
    name, stem, branch: '子',
    majorStars: majors.map((n) => ({
      name: n, type: 'major',
      sihua: presetSihua[n] ?? null, sihuaSelf: presetSihua[n + '自'] ?? null, sihuaSelfKind: null,
    })),
    minorStars: minors,
    minorStarDetails: minors.map((n) => ({
      name: n, type: 'minor',
      sihua: presetSihua[n] ?? null, sihuaSelf: presetSihua[n + '自'] ?? null, sihuaSelfKind: null,
    })),
  };
}

/** 复刻用户示例：甲年生人，命宫天干丙；廉贞在夫妻、破军在官禄、武曲在财帛、太阳在父母、天同在财帛、天机在官禄、文昌在命宫 */
function mkUserExampleChart() {
  return [
    mkGong('命宫', '丙', ['文昌']),
    mkGong('兄弟', '丁'),
    mkGong('夫妻', '戊', ['廉贞']),
    mkGong('子女', '己'),
    mkGong('财帛', '庚', ['武曲', '天同']),
    mkGong('疾厄', '辛'),
    mkGong('迁移', '壬'),
    mkGong('交友', '癸'),
    mkGong('官禄', '甲', ['破军', '天机']),
    mkGong('田宅', '乙'),
    mkGong('福德', '丙'),
    mkGong('父母', '丁', ['太阳']),
  ];
}

describe('全书画四化表', () => {
  it('十干四化完整且与用户指定表一致', () => {
    expect(Object.keys(SIHUA_TABLE)).toHaveLength(10);
    expect(SIHUA_TABLE['甲']).toEqual(['廉贞', '破军', '武曲', '太阳']);
    expect(SIHUA_TABLE['乙']).toEqual(['天机', '天梁', '紫微', '太阴']);
    expect(SIHUA_TABLE['丙']).toEqual(['天同', '天机', '文昌', '廉贞']);
    expect(SIHUA_TABLE['丁']).toEqual(['太阴', '天同', '天机', '巨门']);
    expect(SIHUA_TABLE['戊']).toEqual(['贪狼', '太阴', '右弼', '天机']);
    expect(SIHUA_TABLE['己']).toEqual(['武曲', '贪狼', '天梁', '文曲']);
    expect(SIHUA_TABLE['庚']).toEqual(['太阳', '武曲', '太阴', '天同']);
    expect(SIHUA_TABLE['辛']).toEqual(['巨门', '太阳', '文曲', '文昌']); // 校准点：core 误取武曲化科
    expect(SIHUA_TABLE['壬']).toEqual(['天梁', '紫微', '左辅', '武曲']);
    expect(SIHUA_TABLE['癸']).toEqual(['破军', '巨门', '太阴', '贪狼']);
  });

  it('getSihuaStars 返回 [禄,权,科,忌]', () => {
    expect(getSihuaStars('甲')).toEqual(['廉贞', '破军', '武曲', '太阳']);
    expect(getSihuaStars('未知干')).toEqual(['', '', '', '']);
  });
});

describe('生年四化重算（清空 core 旧值后按全书画标记）', () => {
  it('甲年：廉贞禄/破军权/武曲科/太阳忌 落宫正确', () => {
    const gongData = mkUserExampleChart();
    recalcSihua(gongData, '甲');
    const find = (gong: string, star: string) =>
      gongData.find((g) => g.name === gong)!.majorStars.find((s: any) => s.name === star)!;
    expect(find('夫妻', '廉贞').sihua).toBe('禄');
    expect(find('官禄', '破军').sihua).toBe('权');
    expect(find('财帛', '武曲').sihua).toBe('科');
    expect(find('父母', '太阳').sihua).toBe('忌');
  });

  it('辛年：文曲化科（非武曲），并清空 core 预置的错误旧值', () => {
    // 其余宫干用丁（太阴/天同/天机/巨门），避免甲壬等宫干四化波及武曲、文曲、文昌
    const gongData = [
      mkGong('命宫', '丁', ['武曲'], [], { '武曲': '科' }), // core 误标武曲化科，应被清掉
      mkGong('夫妻', '辛', ['文曲', '文昌']),
      ...GONGS.slice(2).map((n) => mkGong(n, '丁')),
    ];
    recalcSihua(gongData, '辛');
    const wuQu = gongData[0].majorStars.find((s: any) => s.name === '武曲')!;
    const wenQu = gongData[1].majorStars.find((s: any) => s.name === '文曲')!;
    const wenChang = gongData[1].majorStars.find((s: any) => s.name === '文昌')!;
    expect(wuQu.sihua).toBeNull();          // 旧值清空，辛年武曲不化
    expect(wenQu.sihua).toBe('科');         // 全书画：文曲化科
    expect(wenChang.sihua).toBe('忌');      // 全书画：文昌化忌
  });
});

describe('自化：本宫干使本宫星化出', () => {
  it('命宫丙干使宫内文昌自化科，标记CF保持兼容', () => {
    const gongData = mkUserExampleChart();
    const { flows, summaries } = recalcSihua(gongData, '甲');
    const mingSum = summaries.find((s) => s.gongName === '命宫')!;
    expect(mingSum.selfs).toContainEqual({ type: '科', star: '文昌' });
    const wenChang = gongData[0].majorStars.find((s: any) => s.name === '文昌')!;
    expect(wenChang.sihuaSelf).toBe('科');
    expect(wenChang.sihuaSelfKind).toBe('CF');
    expect(flows).toContainEqual({ from: '命宫', to: '命宫', type: '科', star: '文昌', isSelf: true });
  });

  it('财帛庚干使宫内太阳自化禄', () => {
    const gongData = [
      mkGong('财帛', '庚', ['太阳']),
      ...GONGS.filter((n) => n !== '财帛').map((n) => mkGong(n, '甲')),
    ];
    const { summaries } = recalcSihua(gongData, '甲');
    expect(summaries.find((s) => s.gongName === '财帛')!.selfs).toContainEqual({ type: '禄', star: '太阳' });
  });
});

describe('飞宫四化：流向与对待', () => {
  it('命宫丙干：天同禄入财帛、廉贞忌入夫妻（用户示例场景）', () => {
    const gongData = mkUserExampleChart();
    const { flows, summaries } = recalcSihua(gongData, '甲');
    // 流向记录
    expect(flows).toContainEqual({ from: '命宫', to: '财帛', type: '禄', star: '天同', isSelf: false });
    expect(flows).toContainEqual({ from: '命宫', to: '夫妻', type: '忌', star: '廉贞', isSelf: false });
    // 飞出/飞入对称登记
    const mingSum = summaries.find((s) => s.gongName === '命宫')!;
    expect(mingSum.flyOut).toContainEqual({ type: '禄', star: '天同', to: '财帛' });
    const caiBoSum = summaries.find((s) => s.gongName === '财帛')!;
    expect(caiBoSum.flyIn).toContainEqual({ type: '禄', star: '天同', from: '命宫' });
    const fuQiSum = summaries.find((s) => s.gongName === '夫妻')!;
    expect(fuQiSum.flyIn).toContainEqual({ type: '忌', star: '廉贞', from: '命宫' });
  });

  it('describeFlyIn 生成对待文案（含来源宫与主语）', () => {
    const gongData = mkUserExampleChart();
    const { flows } = recalcSihua(gongData, '甲');
    const text = describeFlyIn('夫妻', flows);
    expect(text).toContain('命宫（你自己）化忌入本宫（廉贞）'); // "命宫"自带宫字，不再输出"命宫宫"
    expect(text).not.toContain('命宫宫');
    const caiBoText = describeFlyIn('财帛', flows);
    expect(caiBoText).toContain('命宫（你自己）化禄入本宫（天同）');
  });

  it('describeFlyIn 非"宫"字尾宫名正常补宫字', () => {
    const flows = [
      { from: '兄弟', to: '夫妻', type: '忌' as const, star: '巨门', isSelf: false },
      { from: '命宫', to: '夫妻', type: '禄' as const, star: '天同', isSelf: false },
    ];
    const text = describeFlyIn('夫妻', flows);
    expect(text).toContain('兄弟宫（兄弟朋友）化忌入本宫（巨门）');
    expect(text).toContain('命宫（你自己）化禄入本宫（天同）');
  });

  it('describeFlyOutJi 生成对外执着文案', () => {
    const gongData = mkUserExampleChart();
    const { flows } = recalcSihua(gongData, '甲');
    const text = describeFlyOutJi('命宫', flows);
    expect(text).toContain('本宫化忌入夫妻宫（廉贞）');
    expect(text).toContain('你对配偶有执念');
  });

  it('describeFlyOutJi 飞入"命宫"不输出"命宫宫"，且句号结尾', () => {
    const flows = [
      { from: '兄弟', to: '命宫', type: '忌' as const, star: '巨门', isSelf: false },
    ];
    const text = describeFlyOutJi('兄弟', flows);
    expect(text).toContain('本宫化忌入命宫（巨门）');
    expect(text).not.toContain('命宫宫');
    expect(text.endsWith('。')).toBe(true);
  });

  it('无飞入时文案为空', () => {
    expect(describeFlyIn('夫妻', [])).toBe('');
    expect(describeFlyOutJi('命宫', [])).toBe('');
  });
});
