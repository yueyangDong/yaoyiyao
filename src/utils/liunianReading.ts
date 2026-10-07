// ========== 流年（单年 + 十年列表）计算 ==========
//
// 为什么抽到这里：原先这段是 pages/Bazi.tsx 的模块级私有函数（仅页面内使用）。
// 现在「一句话看懂你的八字」结论卡也要引用今年流年，而结论文案属于 utils 层
// （项目纪律：解读文案不进页面组件）。故提取为共用模块，Bazi.tsx 改为 import。
//
// ⚠️ 逻辑与原实现逐字一致（干支/五行/与日主生克简述），未做任何口径变更。
// 若后续要改流年判据，改这里一处即可，页面与结论卡同时生效。

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

export interface LiuNianItem {
  year: number;
  ganZhi: string;
  wx: string;
  desc: string;
}

/**
 * 单年流年：干支 + 天干五行 + 与日主的生克简述。
 * `dayGan` 目前未参与判定（生克只看日主五行），保留参数是为了与列表构造签名一致。
 */
export function calcLiuNianItem(year: number, dayGan: string, dayWx: string): LiuNianItem {
  const tgIdx = (((year - 4) % 10) + 10) % 10;
  const dzIdx = (((year - 4) % 12) + 12) % 12;
  const yearGan = TIAN_GAN[tgIdx];
  const yearZhi = DI_ZHI[dzIdx];
  const yearWx = TG_WX[yearGan];

  let desc = '';
  if (dayWx === yearWx) {
    desc = `与日主同属${dayWx}，比和之年，运势平稳，适合巩固成果。`;
  } else {
    const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
    if (wxSheng[dayWx] === yearWx) {
      desc = `流年「${yearGan}(${yearWx})」生日主——印绶之年！利学业考证、贵人相助，适合进修深造。`;
    } else if (wxSheng[yearWx] === dayWx) {
      desc = `日主生流年「${yearGan}(${yearWx})」——食伤之年！利创意发挥、技术提升，勿想多做少。`;
    } else if (wxKe[dayWx] === yearWx) {
      desc = `日主克流年「${yearGan}(${yearWx})」——财运之年！利求财，需付出努力。`;
    } else if (wxKe[yearWx] === dayWx) {
      desc = `流年「${yearGan}(${yearWx})」克日主——官杀之年！有压力有挑战，也是上升机会。`;
    }
  }
  return { year, ganZhi: yearGan + yearZhi, wx: yearWx, desc };
}

/** 从 startYear 起连续 10 年 */
export function buildLiuNianList(startYear: number, dayGan: string, dayWx: string): LiuNianItem[] {
  return Array.from({ length: 10 }, (_, i) => calcLiuNianItem(startYear + i, dayGan, dayWx));
}
