// ========== 神煞「有星必有解」守卫测试 ==========
// 目的：神煞引擎新增、改名、删除一个神煞时，只要忘了同步释义表 / 领域文案表，这里必须变红。
//
// 校验项：
// 1. 双向等值：calcShenSha 能产出的神煞名 与 SHENSHA_PLAIN 的键（去别名、去三奇别名）完全一致
//    —— 少一个 = 有星无解（页面显示空描述）；多一个 = 死键/错别字
// 2. 每个神煞的 desc 非空，type 只能是 吉/凶/平
// 3. 六张领域文案表（爱情/事业/健康/六亲/社交/性格）的键必须是合法神煞名
// 4. 每个能算出来的神煞，至少落进一张领域文案表
// 5. 八字功能代码里硬编码引用的神煞名，必须是合法神煞名
import { describe, it, expect } from 'vitest';
import { calcShenSha, SHENSHA_PLAIN } from '../shenSha';
import { DOMAIN_SHA_MAPS } from '../baziDomainDeep';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GZ60 = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);
const P = (gz: string) => ({ tianGan: gz[0], diZhi: gz[1], ganZhi: gz });

/** 仅在 SHENSHA_PLAIN 中保留、calcShenSha 不会产出的别名（兼容旧数据 / 简写查询） */
const ALIAS_ONLY = ['天德', '月德'];

/**
 * 全盘扫描：年柱 60 × 日柱 60 × 月支 12，时柱用 (7a+11b+m) 错位取址。
 * 因 gcd(7,60)=gcd(11,60)=1，时柱可遍历全部 60 甲子；月干 (a+m)%10 亦可遍历 10 干。
 * 这样可覆盖：所有干支落点、全部日格类（魁罡/金神/十灵日/六秀日/日德/进神/八专/十恶大败/阴差阳错/孤鸾煞）、
 * 三合局类、月令类（天德/月德/天医/天赦/四废）、三奇、元辰/勾绞（需性别）等全部判定分支。
 */
function scanEngine() {
  const names = new Set<string>();
  const types = new Set<string>();
  const emptyDesc: string[] = [];
  for (let a = 0; a < 60; a++) {
    for (let b = 0; b < 60; b++) {
      for (let m = 0; m < 12; m++) {
        const pillars = [
          P(GZ60[a]),
          P(GAN[(a + m) % 10] + ZHI[m]),
          P(GZ60[b]),
          P(GZ60[(a * 7 + b * 11 + m) % 60]),
        ];
        for (const item of calcShenSha(pillars, 'male')) {
          names.add(item.name);
          types.add(item.type);
          if (!item.desc) emptyDesc.push(`${item.pillar}${item.name}`);
        }
      }
    }
  }
  return { names, types, emptyDesc };
}

const scan = scanEngine();
const registryKeys = Object.keys(SHENSHA_PLAIN).filter((k) => !ALIAS_ONLY.includes(k));

describe('神煞守卫：引擎产出 ↔ 释义表', () => {
  it('双向等值：能算出的神煞名 与 释义表键（去别名）完全一致', () => {
    expect([...scan.names].sort()).toEqual([...registryKeys].sort());
  });

  it('每个神煞都有非空释义', () => {
    expect(scan.emptyDesc).toEqual([]);
    for (const k of registryKeys) {
      expect(SHENSHA_PLAIN[k], `${k} 释义为空`).toBeTruthy();
    }
  });

  it('type 只能是 吉 / 凶 / 平', () => {
    expect([...scan.types].sort()).toEqual(['凶', '吉', '平']);
  });

  it('扫描确实覆盖到关键神煞（防止扫描本身失效导致假通过）', () => {
    for (const name of ['将星', '华盖', '禄神', '空亡', '金神', '六厄', '披麻', '三奇贵人', '词馆', '元辰', '勾绞']) {
      expect(scan.names.has(name), `${name} 未被扫描到`).toBe(true);
    }
  });
});

describe('神煞守卫：引擎产出 ↔ 领域文案表', () => {
  const mapNames = Object.keys(DOMAIN_SHA_MAPS);

  it('领域文案表的键必须是合法神煞名', () => {
    const invalid: string[] = [];
    for (const [domain, map] of Object.entries(DOMAIN_SHA_MAPS)) {
      for (const key of Object.keys(map)) {
        if (!(key in SHENSHA_PLAIN)) invalid.push(`${domain}.${key}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('每个能算出的神煞至少落进一张领域文案表（防止"有星无解"）', () => {
    const placed = new Set<string>();
    for (const map of Object.values(DOMAIN_SHA_MAPS)) {
      for (const key of Object.keys(map)) placed.add(key);
    }
    const orphans = [...scan.names].filter((n) => !placed.has(n)).sort();
    expect(orphans).toEqual([]);
  });

  it('领域文案表的文案非空', () => {
    const empty: string[] = [];
    for (const [domain, map] of Object.entries(DOMAIN_SHA_MAPS)) {
      for (const [key, text] of Object.entries(map)) {
        if (!text) empty.push(`${domain}.${key}`);
      }
    }
    expect(empty).toEqual([]);
    expect(mapNames.length).toBeGreaterThanOrEqual(6);
  });
});

describe('神煞守卫：八字功能代码引用的神煞名', () => {
  // 以下为 baziAnalysis.ts / Bazi.tsx 中硬编码引用的神煞名（filter / find / includes）。
  // 引擎改名或写错字时，这些引用会静默失效（不报错、只是少一段解读），故在此兜住。
  const FEATURE_REFERENCED = [
    '天乙贵人', '文昌', '将星', '驿马', '桃花', '华盖', '禄神',
    '天德贵人', '月德贵人', '太极贵人', '福星贵人', '红鸾', '天喜',
    '金神', '空亡', '劫煞', '勾绞', '孤辰', '寡宿',
  ];

  it('全部存在于释义表中', () => {
    const missing = FEATURE_REFERENCED.filter((n) => !(n in SHENSHA_PLAIN));
    expect(missing).toEqual([]);
  });
});
