import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { shiYingRelationOf } from '../liuyaoReading';
import { palaceScoreOf, PALACE_JI_STARS, PALACE_XIONG_STARS } from '../ziweiPalaceScore';

/**
 * 页面层的判据纪律。
 *
 * 本仓的既有错误模式：判据先在 utils 写一份（有权重、进分数），
 * 后来页面为了显示方便又写一份（就地 if/else）。两份都不报错，
 * 只是偶尔对不上——用户看到「环境在帮你」，分数却在扣。
 * 这类问题只有扫源码能发现，所以放这里。
 */

const PAGES_DIR = fileURLToPath(new URL('../../pages', import.meta.url));

function tsxFiles(): { name: string; code: string }[] {
  return readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({ name: f, code: readFileSync(join(PAGES_DIR, f), 'utf8') }));
}

describe('页面不得自带判据', () => {
  it('页面不得就地定义五行生克表', () => {
    // 五行关系唯一出口 utils/wuXingRelations
    const bad: string[] = [];
    for (const f of tsxFiles()) {
      // 只抓「定义」（= { '木': '火' ... }），import 是允许的
      if (/WX_SHENG\s*:\s*Record/.test(f.code) || /WX_KE\s*:\s*Record/.test(f.code)) {
        bad.push(f.name);
      }
    }
    expect(bad, `这些页面自建了五行生克表，应改调 utils/wuXingRelations：\n${bad.join('\n')}`).toEqual([]);
  });

  it('页面不得自建星曜吉凶名单', () => {
    // 宫位吉凶唯一出口 utils/ziweiPalaceScore
    const bad: string[] = [];
    for (const f of tsxFiles()) {
      if (/XIONG_STARS\s*=/.test(f.code) || /JI_STARS\s*=\s*new Set/.test(f.code)) bad.push(f.name);
    }
    expect(bad, `这些页面自建了星曜吉凶名单：\n${bad.join('\n')}`).toEqual([]);
  });
});

/** 造一张最小可用的盘（只带 shiYingRelationOf 需要的字段） */
function fakeChart(shi: { wuXing: string; naJia: string; liuQin: string; position: number },
                    ying: { wuXing: string; naJia: string; liuQin: string; position: number }) {
  return {
    benGua: {
      yaoList: [
        { ...shi, shiYing: '世' },
        { ...ying, shiYing: '应' },
      ],
    },
  } as any;
}

describe('世应生克：唯一出口', () => {
  const mk = (wx: string, naJia: string) => ({ wuXing: wx, naJia, liuQin: '父母', position: 1 });

  it('五种关系与权重表和既有口径一致', () => {
    // 应生世：应木生世火
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('木', '壬寅')))?.weight).toBe(1);
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('木', '壬寅')))?.kind).toBe('应生世');
    // 应克世：应水克世火
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('水', '壬子')))?.weight).toBe(-2);
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('水', '壬子')))?.kind).toBe('应克世');
    // 世生应：世火生应土
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('土', '戊辰')))?.weight).toBe(-1);
    expect(shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('土', '戊辰')))?.kind).toBe('世生应');
    // 世克应：世火克应金（不计分，但要有措辞）
    const ke = shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('金', '庚申')));
    expect(ke?.kind).toBe('世克应');
    expect(ke?.weight).toBe(0);
    expect(ke?.plain).toBeTruthy();
    // 比和
    const bi = shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('火', '丙寅')));
    expect(bi?.kind).toBe('比和');
    expect(bi?.weight).toBe(0);
  });

  it('缺世或缺应时返回 null，不抛错', () => {
    expect(shiYingRelationOf({ benGua: { yaoList: [] } } as any)).toBeNull();
    expect(shiYingRelationOf(undefined as any)).toBeNull();
  });

  it('措辞里必须带纳甲与爻位（否则又是套话）', () => {
    const r = shiYingRelationOf(fakeChart(mk('火', '甲午'), mk('木', '壬寅')));
    expect(r?.detail).toContain('壬寅');
    expect(r?.detail).toContain('甲午');
    expect(r?.layout).toContain('第1爻');
  });
});

describe('紫微宫位吉凶', () => {
  it('吉星多则为吉、凶星多则为凶、空宫为中', () => {
    expect(palaceScoreOf({ majorStars: [{ name: '紫微' }, { name: '天府' }] }).level).toBe('吉');
    expect(palaceScoreOf({ majorStars: [{ name: '七杀' }, { name: '破军' }] }).level).toBe('凶');
    expect(palaceScoreOf({ majorStars: [] }).level).toBe('中');
  });

  it('化忌按 −2 计，忌与禄可相抵', () => {
    const base = palaceScoreOf({ majorStars: [{ name: '紫微' }] });
    const withJi = palaceScoreOf({
      majorStars: [{ name: '紫微' }],
      minorStarDetails: [{ name: '文曲', sihua: '忌' }],
    });
    expect(base.jiCount).toBe(1);
    expect(withJi.sihuaBad).toBe(1);
    // 紫微(吉+1) + 文曲(吉+1) − 忌2 = 0 → 中
    expect(withJi.level).toBe('中');
  });

  it('名单口径固定（改动会让大批宫位标签翻色）', () => {
    // 主星吉凶：紫微/天府为吉，七杀/破军为凶
    expect(PALACE_JI_STARS.has('紫微')).toBe(true);
    expect(PALACE_JI_STARS.has('天府')).toBe(true);
    expect(PALACE_XIONG_STARS.has('七杀')).toBe(true);
    // 天马按吉论是既有口径（见 ziweiPalaceScore 注释）
    expect(PALACE_JI_STARS.has('天马')).toBe(true);
    // 两表不得有交集
    const both = [...PALACE_JI_STARS].filter((s) => PALACE_XIONG_STARS.has(s));
    expect(both, `同一颗星不能既吉又凶：${both.join('、')}`).toEqual([]);
  });
});
