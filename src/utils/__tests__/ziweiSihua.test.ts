// 四化逻辑校准测试：十干四化表、天干溯源、禄随忌走、实禄/虚禄、冲照定性、辅星四化保留
import { describe, it, expect } from 'vitest';
import {
  STEM_SIHUA_TABLE,
  inferBirthStem,
  generateSummarizedReport,
  generatePalaceReading,
  normalizeAstrolabeData,
} from '../ziweiAnalysis';

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
