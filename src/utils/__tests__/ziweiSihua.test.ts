// 四化逻辑校准测试：十干四化表、天干溯源、禄随忌走、实禄/虚禄、冲照定性、辅星四化保留
import { describe, it, expect } from 'vitest';
import {
  STEM_SIHUA_TABLE,
  inferBirthStem,
  generateSummarizedReport,
  generatePalaceReading,
  normalizeAstrolabeData,
  analyzeHoroscopeSihua,
  getAllPalacesReading,
} from '../ziweiAnalysis';
import { ziwei } from '@ziweijs/core';

const GONGS = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

function makeChart(starMap: Record<string, any[]>) {
  return GONGS.map((name) => ({ name, majorStars: starMap[name] || [], minorStars: [] })) as any;
}

describe('十干四化表与天干溯源', () => {
  it('十干四化表完整覆盖十天干，甲干为廉破武阳', () => {
    expect(Object.keys(STEM_SIHUA_TABLE)).toHaveLength(10);
    expect(STEM_SIHUA_TABLE['甲']).toEqual({ lu: '廉贞', quan: '破军', ke: '武曲', ji: '太阳' });
    expect(STEM_SIHUA_TABLE['癸']).toEqual({ lu: '破军', quan: '巨门', ke: '太阴', ji: '贪狼' });
  });

  it('由四化组合反推甲干', () => {
    const stem = inferBirthStem([
      { star: '廉贞', sihua: '禄' },
      { star: '破军', sihua: '权' },
      { star: '武曲', sihua: '科' },
      { star: '太阳', sihua: '忌' },
    ]);
    expect(stem).toBe('甲');
  });

  it('信息不足（仅1票）时不强行溯源', () => {
    expect(inferBirthStem([{ star: '太阴', sihua: '科' }])).toBeNull();
  });
});

describe('四化联动：禄随忌走与实禄/虚禄', () => {
  it('化禄在他宫（迁移）为虚禄，并指出禄随忌走的流向', () => {
    const chart = makeChart({
      '迁移': [{ name: '廉贞', type: 'major', sihua: '禄' }],
      '夫妻': [{ name: '太阳', type: 'major', sihua: '忌' }],
      '官禄': [{ name: '破军', type: 'major', sihua: '权' }],
      '财帛': [{ name: '武曲', type: 'major', sihua: '科' }],
    });
    const report = generateSummarizedReport(chart);
    const text = report.highlights.join('\n');
    expect(text).toContain('甲干四化');
    expect(text).toContain('虚禄');
    expect(text).toContain('禄随忌走');
    expect(text).toContain('权科夹辅');
  });

  it('化禄在我宫（财帛）为实禄', () => {
    const chart = makeChart({
      '财帛': [{ name: '廉贞', type: 'major', sihua: '禄' }],
      '夫妻': [{ name: '太阳', type: 'major', sihua: '忌' }],
      '官禄': [{ name: '破军', type: 'major', sihua: '权' }],
      '迁移': [{ name: '武曲', type: 'major', sihua: '科' }],
    });
    const report = generateSummarizedReport(chart);
    expect(report.highlights.join('\n')).toContain('实禄');
  });

  it('自化单独提示，不计入生年四化', () => {
    const chart = makeChart({
      '迁移': [{ name: '天同', type: 'major', sihua: null, sihuaSelf: '禄', sihuaSelfKind: 'CF' }],
    });
    const report = generateSummarizedReport(chart);
    expect(report.cautions.join('\n')).toContain('离心自化禄');
    expect(report.highlights.join('\n')).not.toContain('化禄在迁移');
  });
});

describe('对宫冲照定性', () => {
  it('对宫化忌为"冲"而非"加持"', () => {
    const r = generatePalaceReading(
      '命宫',
      [{ name: '紫微', type: 'major', sihua: null }],
      null,
      { name: '迁移', majorStars: ['太阳'], sihua: '忌', sihuaList: [{ star: '太阳', sihua: '忌' }] },
      null,
    );
    expect(r.reading).toContain('直冲');
    expect(r.reading).not.toContain('加持');
  });

  it('对宫化禄为"照会"', () => {
    const r = generatePalaceReading(
      '命宫',
      [{ name: '紫微', type: 'major', sihua: null }],
      null,
      { name: '迁移', majorStars: ['廉贞'], sihua: '禄', sihuaList: [{ star: '廉贞', sihua: '禄' }] },
      null,
    );
    expect(r.reading).toContain('照会');
  });
});

describe('辅星四化保留与体用分层', () => {
  it('normalizeAstrolabeData 保留辅星生年四化（如文昌化忌）', () => {
    const raw = {
      palaces: GONGS.map((name) => ({
        name,
        majorStars: [],
        minorStars: name === '父母' ? [{ name: '文昌', type: 'minor', YT: { name: '忌', key: 'ji' } }] : [],
      })),
    };
    const palaces = normalizeAstrolabeData(raw);
    const fuMu = palaces.find((p) => p.name === '父母')!;
    const wenchang = (fuMu.minorStars as any[])[0];
    expect(wenchang.sihua).toBe('忌');
  });

  it('生年化与自化分层共存，不互相吞没', () => {
    const r = generatePalaceReading(
      '迁移',
      [{ name: '廉贞', type: 'major', sihua: '禄', sihuaSelf: '忌', sihuaSelfKind: 'CF' }],
      null,
      null,
      null,
    );
    expect(r.reading).toContain('迁移宫坐廉贞化禄');
    expect(r.reading).toContain('离心自化忌');
  });
});

describe('大限/流年四化飞星', () => {
  // 参考盘：2000-08-16 寅时 男（庚辰年生，木三局 3 岁起运，阳男大限顺行）
  const palaces = (() => {
    const r = ziwei.bySolar({ name: '', gender: 'male', date: new Date(2000, 7, 16, 4, 0, 0), language: 'zh-CN' } as any);
    return r.palaces.map((p: any) => ({
      name: p.name,
      stem: p.stem,
      branch: p.branch,
      majorStars: (p.majorStars || []).map((s: any) => ({ name: s.name })),
      minorStars: (p.minorStars || []).map((s: any) => ({ name: s.name })),
      horoscopeRanges: p.horoscopeRanges as [number, number] | undefined,
    }));
  })();

  it('大限定位：木三局 3 岁起命宫大限；2026 虚岁 27 顺行至福德宫（甲干 [23,32]）', () => {
    const r3 = analyzeHoroscopeSihua(palaces as any, 2000, 2002); // 2002 虚岁 3
    expect(r3.virtualAge).toBe(3);
    expect(r3.decadal?.palaceName).toBe('命宫');
    const r = analyzeHoroscopeSihua(palaces as any, 2000, 2026); // 2026 虚岁 27
    expect(r.decadal?.palaceName).toBe('福德');
    expect(r.decadal?.stem).toBe('甲');
    expect(r.decadal?.ageRange).toEqual([23, 32]);
  });

  it('大限甲干四化飞星：廉贞禄入官禄、破军权入福德、武曲科入财帛、太阳忌入子女', () => {
    const r = analyzeHoroscopeSihua(palaces as any, 2000, 2026);
    const items = r.decadal!.items;
    expect(items.find(i => i.hua === '化禄')).toMatchObject({ star: '廉贞', palaceName: '官禄' });
    expect(items.find(i => i.hua === '化权')).toMatchObject({ star: '破军', palaceName: '福德' });
    expect(items.find(i => i.hua === '化科')).toMatchObject({ star: '武曲', palaceName: '财帛' });
    expect(items.find(i => i.hua === '化忌')).toMatchObject({ star: '太阳', palaceName: '子女' });
  });

  it('流年 2026 丙干：天同禄入疾厄、天机权入兄弟、文昌科入福德、廉贞忌入官禄', () => {
    const r = analyzeHoroscopeSihua(palaces as any, 2000, 2026);
    expect(r.yearly?.year).toBe(2026);
    expect(r.yearly?.stem).toBe('丙');
    const items = r.yearly!.items;
    expect(items.find(i => i.hua === '化禄')).toMatchObject({ star: '天同', palaceName: '疾厄' });
    expect(items.find(i => i.hua === '化权')).toMatchObject({ star: '天机', palaceName: '兄弟' });
    expect(items.find(i => i.hua === '化科')).toMatchObject({ star: '文昌', palaceName: '福德' });
    expect(items.find(i => i.hua === '化忌')).toMatchObject({ star: '廉贞', palaceName: '官禄' });
  });

  it('每条飞星都有落宫与白话解读，summary 点出禄/忌方向', () => {
    const r = analyzeHoroscopeSihua(palaces as any, 2000, 2026);
    for (const it of r.decadal!.items) {
      expect(it.palaceName).toBeTruthy();
      expect(it.desc).toContain('宫');
    }
    expect(r.decadal!.summary).toContain('禄入官禄');
    expect(r.decadal!.summary).toContain('忌入子女');
  });
});

describe('十二宫解读：冲照只论生年化（体），自化（用）不冲照他宫', () => {
  const mkPalace = (name: string, stars: any[]): any => ({
    name, majorStars: stars, minorStars: [],
  });

  it('对宫主星坐生年化忌 → 本宫解读出现"直冲本宫"', () => {
    // 迁移坐太阳化忌（生年），命宫解读应提示冲照
    const chart = [
      mkPalace('命宫', [{ name: '天机', type: 'major' }]),
      mkPalace('迁移', [{ name: '太阳', type: 'major', sihua: '忌', YT: { name: '忌', key: 'ji' } }]),
    ];
    const readings = getAllPalacesReading(chart);
    const ming = readings.find((r) => r.palaceName === '命宫')!;
    expect(ming.reading).toContain('直冲本宫');
  });

  it('对宫主星仅向心自化忌（无生年化）→ 本宫解读不出现"直冲本宫"', () => {
    const chart = [
      mkPalace('命宫', [{ name: '天机', type: 'major' }]),
      mkPalace('迁移', [{ name: '太阳', type: 'major', sihuaSelf: '忌', sihuaSelfKind: 'CP', ST: { CP: { name: '忌', key: 'ji' } } }]),
    ];
    const readings = getAllPalacesReading(chart);
    const ming = readings.find((r) => r.palaceName === '命宫')!;
    expect(ming.reading).not.toContain('直冲本宫');
  });

  it('双星同宫用专属文案（如紫微天府=帝星配财库）', () => {
    const chart = [mkPalace('命宫', [
      { name: '紫微', type: 'major' }, { name: '天府', type: 'major' },
    ])];
    const readings = getAllPalacesReading(chart);
    expect(readings[0].reading).toContain('帝星配财库');
  });

  it('参考盘端到端：@ziweijs/core 排盘 → 十二宫解读全覆盖且非空', () => {
    const r = ziwei.bySolar({ name: '', gender: 'male', date: new Date(2000, 7, 16, 4, 0, 0), language: 'zh-CN' } as any);
    const chart = r.palaces.map((p: any) => ({
      name: p.name,
      majorStars: (p.majorStars || []).map((s: any) => ({ name: s.name, type: 'major', sihua: s.sihua ?? s.YT?.name ?? null })),
      minorStars: (p.minorStars || []).map((s: any) => ({ name: s.name, type: 'minor', sihua: s.sihua ?? s.YT?.name ?? null })),
    }));
    const readings = getAllPalacesReading(chart as any);
    expect(readings).toHaveLength(12);
    for (const reading of readings) {
      expect(reading.reading.length).toBeGreaterThan(20);
      expect(reading.palaceName).toBeTruthy();
    }
  });
});
