// 测试夹具：生成真实命盘（lunar-typescript 排盘），供神煞力量/相似度回归测试使用。
// ⚠️ 判定类问题必须穷举真实引擎产出，不能只测单日样本（项目历史踩过坑：单日样本恰好
//    命宫有主星，漏掉 16% 的空宫盘）。这里的采样口径与 2026-10-04 审计一致：
//    1935–2005 年、随机月/日/时、固定种子，可复现。
import { Solar } from 'lunar-typescript';
import type { PillarData } from '../../../pages/Bazi';
import { calcShenSha } from '../../shenSha';
import { analyzeDayMasterStrength, recommendYongShen } from '../../baziAnalysis';

const TG_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export interface ChartFixture {
  pillars: PillarData[];
  shenSha: { name: string; pillar: string; type: '吉' | '凶' | '平' }[];
  strengthLevel: string;
  yongShen: string[];
  gender: 'male' | 'female';
}

/** 固定种子的线性同余伪随机（不引第三方依赖，保证 CI 可复现） */
export function makeRng(seed: number): () => number {
  let s = seed % 2147483648;
  if (s <= 0) s += 2147483647;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function buildChart(year: number, month: number, day: number, hour: number, gender: 'male' | 'female'): ChartFixture {
  const ec = Solar.fromYmdHms(year, month, day, hour, 30, 0).getLunar().getEightChar();
  const mk = (
    pillar: string, gz: string, gan: string, zhi: string,
    cangGan: string[], shiShen: string, shiShenZhi: string[], nayin: string,
  ): PillarData => ({
    pillar, ganZhi: gz, tianGan: gan, diZhi: zhi,
    cangGan, shiShen, shiShenZhi: shiShenZhi.join('/'), nayin,
  });

  const pillars: PillarData[] = [
    mk('年柱', ec.getYear(), ec.getYearGan(), ec.getYearZhi(), ec.getYearHideGan(), ec.getYearShiShenGan(), ec.getYearShiShenZhi(), ec.getYearNaYin()),
    mk('月柱', ec.getMonth(), ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthHideGan(), ec.getMonthShiShenGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin()),
    mk('日柱', ec.getDay(), ec.getDayGan(), ec.getDayZhi(), ec.getDayHideGan(), ec.getDayShiShenGan(), ec.getDayShiShenZhi(), ec.getDayNaYin()),
    mk('时柱', ec.getTime(), ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeHideGan(), ec.getTimeShiShenGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin()),
  ];

  const dayGan = ec.getDayGan();
  const dayWx = TG_WX[dayGan] || '';
  const strengthLevel = analyzeDayMasterStrength(dayGan, pillars[1].diZhi, pillars).level;
  const yongShen = recommendYongShen(dayWx, strengthLevel, undefined, dayGan, pillars[1].diZhi).yongShen;

  return {
    pillars,
    shenSha: calcShenSha(pillars, gender).map((s) => ({ name: s.name, pillar: s.pillar, type: s.type })),
    strengthLevel,
    yongShen,
    gender,
  };
}

/** 确定性采样 n 张真实命盘 */
export function sampleCharts(n: number, seed = 20261004): ChartFixture[] {
  const rnd = makeRng(seed);
  const out: ChartFixture[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1935 + Math.floor(rnd() * 71);
    const m = 1 + Math.floor(rnd() * 12);
    const d = 1 + Math.floor(rnd() * 28);
    const h = Math.floor(rnd() * 24);
    const gender: 'male' | 'female' = rnd() < 0.5 ? 'male' : 'female';
    out.push(buildChart(y, m, d, h, gender));
  }
  return out;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
