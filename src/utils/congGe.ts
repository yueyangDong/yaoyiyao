// ========== 八字「从格」判定 · 唯一出口 ==========
//
// 为什么要有这个文件：从格是「喜忌整个反转」的分支——判错一格，用神、忌神、合盘、
// 岁运吉凶全部跟着反。而此前这套判据在项目里存在两份互不相同的实现：
//   ① `mingGe.specialGe` —— 只看「日支本气是否与日主同五行」，根在时支/藏干一律漏掉；
//   ② `baziAnalysis.recommendYongShen` —— 只看「身极弱 + 月支本气为财/官杀/食伤」，
//      **连根都不查**。
// 于是同一张盘会自相矛盾：旺衰函数说「时柱（卯）有根但浅」，格局函数说「四柱无根、判真从」。
// 实测盘 2017-10-24 卯时（丁酉 庚戌 甲申 丁卯）即此：时支卯是甲木羊刃**本气根**、
// 日支申又藏壬水偏印，却被判成「从财格·真从」。现收成本文件，两边共用。
//
// 判定口径（《子平真诠》《滴天髓》通行）：
//   前提：日主身极弱（旺衰五档）——不极弱不谈从。
//   旺神：月支若与四柱另两支凑齐**三会方**，以会局五行论旺神（戌在申酉戌中，土气尽泄于金，
//        此时从的是金、不是土）；否则以月支本气五行论。
//   从谁：旺神为我克 → 从财；克我 → 从官杀；我生 → 从儿；是印/比 → 不成从（另论从旺）。
//   纯度：① 有本气比劫根 → **不成从**（硬门槛；被冲只作说明，不放宽——见下方注释）；
//        ② 无本气根，但天干透比劫/印、或藏干有比劫余气/印苗 → **假从**；
//        ③ 全无 → **真从**。
//
// ⚠️ 判「根」一律用引擎已排好的十神（`shiShenZhi` / `shiShen`），不另抄五行表：
//    「地支本气十神是比肩/劫财」等价于「该支本气与日主同五行」，且天然兼容阴干阳干。
// ⚠️ 「有本气根即不从」是硬门槛——正是旧实现漏掉的那一条。

import type { PillarData } from '../pages/Bazi';
import { SAN_HUI_FANG, isChong } from './diZhiRelations';
import { GAN_WX, WX_KE, WX_KE_ME, WX_SHENG } from './wuXingRelations';

/** 从格旺神类别 */
export type CongKind = '从财' | '从官杀' | '从儿';
/** 从格纯度 */
export type CongPurity = '真从' | '假从' | '不成从';
/** 根气来源类别 */
export type CongRootKind = '本气比劫' | '余气比劫' | '印';

export interface CongRootDetail {
  /** 展示用，如「时支卯（本气劫财）」「日支申藏壬（偏印）」 */
  label: string;
  kind: CongRootKind;
}

export interface CongResult {
  /** 从格旺神类别；不成从为 null */
  kind: CongKind | null;
  purity: CongPurity;
  /** 盘点到的根苗（本气比劫 / 余气比劫 / 印） */
  roots: CongRootDetail[];
  /** 天干透出的比劫（不含日干） */
  biJieTou: string[];
  /** 天干透出的印绶（不含日干） */
  yinTou: string[];
  /** 旺神取法：月令本气 / 三会方 */
  wangSource: '本气' | '会局';
  /** 旺神五行 */
  wangWx: string;
  /** 旺神对人而言的十神大类（财/官杀/食伤/印/比劫） */
  wangCategory: string;
  /** 推理链（可直接进 basis 展示） */
  basis: string[];
  /** 一句话结论（假从/不成从的原因；真从为空串） */
  reason: string;
}

const BI_JIE = ['比肩', '劫财'];
const YIN = ['正印', '偏印'];
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'];

/**
 * 地支本气表——**仅作兜底**：真实排盘的四柱一律带 `cangGan`（引擎已排定藏干），
 * 本表只在夹具/合成 PillarData 缺 `cangGan` 时用来定位月令本气，避免判出空旺神。
 * 不用于判根（判根一律以 `cangGan` + `shiShenZhi` 为准）。
 */
const DZ_BEN_QI: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
  '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬',
};

/** 地支十神串 → 数组（`shiShenZhi` 形如「七杀/偏印/偏财」，下标 0 为本气） */
function zhiShiShen(p: PillarData): string[] {
  return (p.shiShenZhi || '').split('/').map((s) => s.trim()).filter(Boolean);
}

/**
 * 旺神五行 → 十神大类（相对日主 dayWx）
 * 返回 '财' | '官杀' | '食伤' | '印' | '比劫' | ''
 */
function categoryOf(wx: string, dayWx: string): string {
  if (!wx || !dayWx) return '';
  if (wx === dayWx) return '比劫';
  if (WX_SHENG[dayWx] === wx) return '食伤';
  if (WX_KE[dayWx] === wx) return '财';
  if (WX_KE_ME[dayWx] === wx) return '官杀';
  return '印';
}

const KIND_BY_CATEGORY: Record<string, CongKind> = {
  '财': '从财',
  '官杀': '从官杀',
  '食伤': '从儿',
};

/** 四柱地支中是否凑齐某个三会方的三支（月支须在该方，月令才是提纲） */
function fullSanHui(pillars: PillarData[]): { branches: string[]; wx: string; name: string } | null {
  const zhis = pillars.map((p) => p.diZhi).filter(Boolean);
  const monthZhi = pillars[1]?.diZhi || '';
  for (const g of SAN_HUI_FANG) {
    if (!g.branches.includes(monthZhi)) continue;
    if (g.branches.every((b) => zhis.includes(b))) return g;
  }
  return null;
}

/**
 * 从格判定唯一出口。
 * @param pillars 四柱（顺序固定：年/月/日/时）
 * @param dayWx 日主五行
 * @param strengthLevel 旺衰五档（'身极弱' 才进入判定）
 */
export function analyzeCongGe(
  pillars: PillarData[],
  dayWx: string,
  strengthLevel: string,
): CongResult {
  const empty: CongResult = {
    kind: null, purity: '不成从', roots: [], biJieTou: [], yinTou: [],
    wangSource: '本气', wangWx: '', wangCategory: '', basis: [], reason: '',
  };
  if (!pillars || pillars.length < 4 || !dayWx) return empty;
  if (strengthLevel !== '身极弱') {
    return { ...empty, reason: `日主旺衰为「${strengthLevel}」，未至极弱，不谈从格` };
  }

  // ---------- 1. 旺神：会局优先于月令本气 ----------
  const hui = fullSanHui(pillars);
  const monthBenQi = pillars[1].cangGan?.[0] || DZ_BEN_QI[pillars[1].diZhi] || '';
  const benQiWx = GAN_WX[monthBenQi] || '';
  const wangWx = hui ? hui.wx : benQiWx;
  const wangSource: '本气' | '会局' = hui ? '会局' : '本气';
  const wangCategory = categoryOf(wangWx, dayWx);
  const kind = KIND_BY_CATEGORY[wangCategory] || null;

  const basis: string[] = [
    `日主${dayWx}强弱为「身极弱」——从格的前提`,
    hui
      ? `月支${pillars[1].diZhi}与${hui.branches.filter((b) => b !== pillars[1].diZhi).join('、')}凑齐${hui.name}，以会局五行${hui.wx}论旺神（月令本气${monthBenQi}属${benQiWx}，气已泄于${hui.wx}）`
      : `月令${pillars[1].diZhi}本气${monthBenQi}属${wangWx}，以月支本气论旺神`,
  ];

  if (!kind) {
    basis.push(`旺神${wangWx}在十神上属「${wangCategory}」，不是财/官杀/食伤 → 从格不成立`);
    return {
      kind: null, purity: '不成从', roots: [], biJieTou: [], yinTou: [],
      wangSource, wangWx, wangCategory, basis,
      reason: `旺神${wangWx}属「${wangCategory}」，不在从财/从官杀/从儿之列`,
    };
  }
  basis.push(`旺神${wangWx}对日主${dayWx}为「${wangCategory}」→ 取${kind}`);

  // ---------- 2. 扫全四柱盘点根苗 ----------
  const roots: CongRootDetail[] = [];
  const benQiRootZhis: string[] = [];
  const biJieTou: string[] = [];
  const yinTou: string[] = [];

  pillars.forEach((p, i) => {
    const label = PILLAR_LABELS[i] || `第${i + 1}柱`;
    // 天干（日干本身除外）：比劫 / 印 透出
    if (i !== 2) {
      if (BI_JIE.includes(p.shiShen)) biJieTou.push(`${label}天干${p.tianGan}`);
      if (YIN.includes(p.shiShen)) yinTou.push(`${label}天干${p.tianGan}`);
    }
    // 地支藏干：下标 0 为本气
    const ss = zhiShiShen(p);
    const cg = p.cangGan || [];
    ss.forEach((s, j) => {
      const gan = cg[j] || '';
      if (BI_JIE.includes(s)) {
        if (j === 0) {
          roots.push({ label: `${label}${p.diZhi}（本气${s}）`, kind: '本气比劫' });
          benQiRootZhis.push(p.diZhi);
        } else {
          roots.push({ label: `${label}${p.diZhi}藏${gan}（${s}）`, kind: '余气比劫' });
        }
      } else if (YIN.includes(s)) {
        roots.push({ label: `${label}${p.diZhi}藏${gan}（${s}）`, kind: '印' });
      }
    });
  });

  const hasBenQiRoot = roots.some((r) => r.kind === '本气比劫');
  const hasWeakRoot = roots.some((r) => r.kind === '余气比劫');
  const hasYin = roots.some((r) => r.kind === '印');

  // 本气根是否被四柱中其它地支冲（**只作说明，不作判定依据**）
  const zhis = pillars.map((p) => p.diZhi);
  const chongedRoots: string[] = [];
  for (const rz of benQiRootZhis) {
    const by = zhis.filter((z) => z !== rz && isChong(rz, z));
    if (by.length > 0) chongedRoots.push(`${rz}被${by.join('、')}冲`);
  }

  // ---------- 3. 纯度 ----------
  // ⚠️「有本气根即不从」是**硬门槛**，不因该根被冲而放宽：
  //    本气根（禄/刃/本气比劫）是实体之根，被冲只是受损、不是消失；「冲则假从」会把
  //    用神从「印比帮身」整个翻成「顺从旺神」——方向相反，代价远大于误判为假从。
  //    故此处只把「是否逢冲」写进理由链供展示，判定仍归正格（判据宁先严后宽）。
  let purity: CongPurity;
  let reason = '';

  if (hasBenQiRoot) {
    purity = '不成从';
    const rootLabels = roots.filter((r) => r.kind === '本气比劫').map((r) => r.label).join('、');
    reason = `日主在${rootLabels}有本气比劫根（实体之根），有根即不从`
      + (chongedRoots.length ? `；其中${chongedRoots.join('；')}，根虽受损仍未消失` : '');
    basis.push(`${reason} → 从格不成立，回正格论（用印比扶身，不取顺从旺神）`);
    return {
      kind, purity, roots, biJieTou, yinTou,
      wangSource, wangWx, wangCategory, basis, reason,
    };
  }

  if (biJieTou.length || yinTou.length) {
    purity = '假从';
    const qiang = [...biJieTou, ...yinTou];
    reason = `四柱无本气比劫根，但${qiang.join('、')}透干帮身 → 从得不纯，为假从`;
    basis.push(reason);
  } else if (hasWeakRoot || hasYin) {
    purity = '假从';
    reason = `四柱无本气比劫根，但藏干有${roots.filter((r) => r.kind !== '本气比劫').map((r) => r.label).join('、')} → 从得不纯，为假从`;
    basis.push(reason);
  } else {
    purity = '真从';
    basis.push('四柱全无本气/余气比劫根、无印苗、天干亦不透比劫印绶 → 从得纯粹，为真从');
  }

  return {
    kind, purity, roots, biJieTou, yinTou,
    wangSource, wangWx, wangCategory, basis, reason,
  };
}

/** 格名：假从官杀格 / 从财格 / 从儿格 */
export function congGeName(kind: CongKind, purity: CongPurity): string {
  return purity === '假从' ? `假${kind}格` : `${kind}格`;
}
