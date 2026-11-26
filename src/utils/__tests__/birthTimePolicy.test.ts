// ========== 排盘时间口径：钟表时间默认、真太阳时显式开启 ==========
//
// 背景（2026-11-26）：用户反馈「2006-09-12 15:00 时柱应为壬申，却排成辛未」。
// 根因不是四柱算法——lunar-typescript 对 15:00 的判定一直是申时——
// 而是页面「只要填了出生地就静默做真太阳时校正」：北京 116.4°E → −14 分钟 → 14:51 → 未时。
// 中国绝大多数城市在 120°E 以西，所以这个坑几乎人人踩，且页面没有任何提示。
//
// 本文件钉三件事：
//   ① 四柱本体：15:00 → 壬申（回归钉值）；
//   ② resolveBirthTime 默认不校正，填了出生地也不校正；
//   ③ 显式开启后才校正，且校正改了时辰必须在 note 里说明。

// utils 测试跑在 node 环境（无 localStorage）；偏好读写只在浏览器里有意义，放到 jsdom 下跑
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveBirthTime, zhiOfHour, isTrueSolarPref, setTrueSolarPref } from '../solarTime';
import { buildRawChart } from '../personChart';

const birth = { year: 2006, month: 9, day: 12, hour: 15, minute: 0 };
const BEIJING = ['11', '1101', '110101']; // 北京市东城区

describe('zhiOfHour：钟点 → 时支（与 lunar-typescript 同式）', () => {
  it('十二时辰边界', () => {
    // 23:00–00:59 子 / 01:00–02:59 丑 / … … / 15:00–16:59 申 / 17:00–18:59 酉
    const expectMap: Record<number, string> = {
      0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯', 6: '卯',
      7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午', 12: '午',
      13: '未', 14: '未', 15: '申', 16: '申', 17: '酉', 18: '酉',
      19: '戌', 20: '戌', 21: '亥', 22: '亥', 23: '子',
    };
    for (const [h, z] of Object.entries(expectMap)) expect(zhiOfHour(Number(h))).toBe(z);
  });
});

describe('buildRawChart：2006-09-12 15:00 时柱为壬申（用户反馈回归）', () => {
  it('四柱 = 丙戌 丁酉 甲辰 壬申', () => {
    const raw = buildRawChart(2006, 9, 12, 15, 0);
    expect(raw.pillars.map((p) => p.ganZhi)).toEqual(['丙戌', '丁酉', '甲辰', '壬申']);
    // 与库本体逐字一致：四柱出口没有自作主张
    expect(raw.eightChar.toString()).toBe('丙戌 丁酉 甲辰 壬申');
  });

  it('每个整点的小时柱都落在正确的时支上（0–23 点全覆盖）', () => {
    const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (let h = 0; h < 24; h++) {
      for (const mi of [0, 59]) {
        const p = buildRawChart(2006, 9, 12, h, mi).pillars[3];
        expect(p.diZhi).toBe(ZHI[Math.floor((h + 1) / 2) % 12]);
      }
    }
  });
});

describe('resolveBirthTime：默认按钟表时间，真太阳时必须显式开启', () => {
  it('开关关着：填了出生地也不校正，时辰不变，note 为空', () => {
    const r = resolveBirthTime({ ...birth, birthplace: BEIJING }, false);
    expect(r.hour).toBe(15);
    expect(r.minute).toBe(0);
    expect(r.dayOffset).toBe(0);
    expect(r.corrected).toBe(false);
    expect(r.zhiChanged).toBe(false);
    expect(r.note).toBe('');
    expect(r.clockZhi).toBe('申');
  });

  it('开关关着时 buildRawChart 对 15:00 排出壬申——不再出现辛未', () => {
    const r = resolveBirthTime({ ...birth, birthplace: BEIJING }, false);
    expect(buildRawChart(2006, 9, 12, r.hour, r.minute).pillars[3].ganZhi).toBe('壬申');
  });

  it('开关开着 + 北京：真太阳时 14:51 → 未时，zhiChanged=true，note 写明两个时辰', () => {
    const r = resolveBirthTime({ ...birth, birthplace: BEIJING }, true);
    expect(r.corrected).toBe(true);
    expect(r.hour).toBe(14);
    expect(r.clockZhi).toBe('申');
    expect(r.zhiChanged).toBe(true);
    expect(r.note).toContain('属申时');
    expect(r.note).toContain('属未时');
    // 且真的按未时排
    expect(buildRawChart(2006, 9, 12, r.hour, r.minute).pillars[3].ganZhi).toBe('辛未');
  });

  it('开关开着但没有出生地：不校正，missingPlace=true', () => {
    const r = resolveBirthTime(birth, true);
    expect(r.hour).toBe(15);
    expect(r.corrected).toBe(false);
    expect(r.missingPlace).toBe(true);
    expect(r.note).toBe('');
  });

  it('直接给经度（档案里的出生地）与给区划编码等价', () => {
    const viaCodes = resolveBirthTime({ ...birth, birthplace: BEIJING }, true);
    const viaLng = resolveBirthTime({ ...birth, lng: viaCodes.lng }, true);
    expect(viaLng.hour).toBe(viaCodes.hour);
    expect(viaLng.minute).toBe(viaCodes.minute);
  });

  it('开关开着且校正跨午夜：dayOffset 同步给出', () => {
    // 乌鲁木齐 00:10（87.6°E）→ 真太阳时约前一日 22:12
    const r = resolveBirthTime({ year: 2006, month: 9, day: 12, hour: 0, minute: 10, lng: 87.6 }, true);
    expect(r.dayOffset).toBe(-1);
    expect(r.note).toContain('跨回前一日');
    expect(r.hour).toBeLessThan(23);
    expect(r.hour).toBeGreaterThan(20);
  });
});

describe('真太阳时全局偏好（localStorage）', () => {
  it('默认关；写入后可读回；关掉后清除', () => {
    expect(isTrueSolarPref()).toBe(false);
    setTrueSolarPref(true);
    expect(isTrueSolarPref()).toBe(true);
    setTrueSolarPref(false);
    expect(isTrueSolarPref()).toBe(false);
  });
});
