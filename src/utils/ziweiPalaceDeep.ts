// ========== 紫微「十二宫深度解读」（含无四化宫） ==========
//
// 解决的问题：原「四化故事」区块只对带生年四化/自化的宫生成内容，
// 一张盘通常只有 4~6 个宫有解读，其余宫（无四化）在深度解读层面是空白——
// 用户只能看到"化禄在哪、化忌在哪"，看不到"没被四化点到的那些宫到底怎样"。
//
// 本模块做两件事：
//   1. 有四化的宫 —— 直接复用 ziweiSihuaDeep 的分层解读（口径不重复实现）；
//   2. 无四化的宫 —— 按同一结构生成四段深度解读：
//        本宫底色（宫位领域 + 主星星性 + 宫位专属表现 + 亮度）
//        → 星曜组合的力道（双星/单星/空宫借对宫/辅星吉煞）
//        → 三方四正的加持与牵制（对宫 + 三合）
//        → 无化的含义与经营方向（中性底盘怎么用）
//
// 十二宫全覆盖，从"命宫"到"父母"逐一给出详细解释。

import { generateSihuaDeepReading, GONG_DOMAIN, STAR_NATURE, type SihuaDeepReading } from './ziweiSihuaDeep';
import { getStarPalaceTrait, getPairTrait, getStarTraitCore, getGongAdvice } from './ziweiAnalysis';
import { getStarBrightness } from './ziweiPalaceData';

/** 十二宫标准顺序（命宫起，逆时针） */
const GONG_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

/** 对宫（六冲） */
const OPPOSITE: Record<string, string> = {
  命宫: '迁移', 兄弟: '交友', 夫妻: '官禄', 子女: '田宅',
  财帛: '福德', 疾厄: '父母', 迁移: '命宫', 交友: '兄弟',
  官禄: '夫妻', 田宅: '子女', 福德: '财帛', 父母: '疾厄',
};

/** 三合宫（本宫之外每隔四位取一） */
const TRIANGLE: Record<string, string[]> = {
  命宫: ['官禄', '财帛'], 兄弟: ['田宅', '疾厄'], 夫妻: ['迁移', '福德'],
  子女: ['交友', '父母'], 财帛: ['命宫', '官禄'], 疾厄: ['兄弟', '田宅'],
  迁移: ['夫妻', '福德'], 交友: ['子女', '父母'], 官禄: ['财帛', '命宫'],
  田宅: ['疾厄', '兄弟'], 福德: ['迁移', '夫妻'], 父母: ['子女', '交友'],
};

const XIUNG_STARS = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
const JI_STARS = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马'];

/** 宫名归一（生产数据宫名无"宫"后缀，命宫除外） */
const norm = (n: string) => (n === '命宫' ? '命宫' : String(n || '').replace(/宫$/, ''));
const label = (n: string) => (String(n || '').endsWith('宫') ? n : `${n}宫`);

function findGong(gongData: any[], name: string): any | undefined {
  return gongData.find((g) => norm(g?.name) === norm(name));
}

function mainStarsOf(g: any): string[] {
  return (g?.majorStars || []).map((s: any) => (typeof s === 'string' ? s : s.name));
}

function minorStarsOf(g: any): string[] {
  const list = g?.minorStarDetails || g?.minorStars || [];
  return list.map((s: any) => (typeof s === 'string' ? s : s.name));
}

/** 亮度说明：庙旺=星性最能发挥；陷=有力使不出 */
function brightnessText(star: string, branch: string): string {
  const b = getStarBrightness(star, branch);
  if (!b) return '';
  if (b === '庙' || b === '旺') return `${star}在${branch}为${b}，星性发挥得开`;
  if (b === '得' || b === '利') return `${star}在${branch}为${b}，力量中上`;
  if (b === '平') return `${star}在${branch}为平，力量中规中矩`;
  return `${star}在${branch}为${b}，星性受制，有力使不出，需要后天补足`;
}

/**
 * 为单个宫位生成深度解读：有四化走 sihuaDeep，无四化走本模块的四段结构。
 */
export function generatePalaceDeepReading(gong: any, allGongs: any[]): SihuaDeepReading | null {
  // 有四化（生年或自化）→ 复用四化深度解读，保证口径唯一
  const withSihua = generateSihuaDeepReading(gong);
  if (withSihua) return withSihua;

  const name = norm(gong?.name);
  if (!GONG_ORDER.includes(name)) return null;

  const stars = mainStarsOf(gong);
  const minors = minorStarsOf(gong);
  const branch = gong?.branch || '';
  const sections: { heading: string; text: string }[] = [];

  // ---- 第 1 段：本宫底色（宫位领域 + 星性 + 宫位专属表现 + 亮度）----
  const domain = GONG_DOMAIN[name] || '';
  if (stars.length === 0) {
    const opp = findGong(allGongs, OPPOSITE[name]);
    const oppStars = mainStarsOf(opp);
    if (oppStars.length > 0) {
      sections.push({
        heading: '本宫底色（空宫借对宫论）',
        text: `${domain}本宫无主星（空宫）——按紫微通例借对宫${label(OPPOSITE[name])}的${oppStars.join('、')}论：${oppStars.map((s) => STAR_NATURE[s] || s).join('；')}。空宫不是空白，而是弹性大、可塑性高：这一宫的表现随环境与际遇而变，你怎么经营、遇到什么人，它就长成什么样。`,
      });
    } else {
      sections.push({
        heading: '本宫底色（空而无借）',
        text: `${domain}本宫与对宫均不见主星（空而无借）——此宫能量平和，没有先天定式，全看后天经营；好处是不带执念，坏处是没有天生的助力，需要你自己立规矩。`,
      });
    }
  } else {
    const core = getStarTraitCore(stars[0]);
    const traitHere = getStarPalaceTrait(stars[0], name);
    const nat = stars.map((s) => `${s}（${STAR_NATURE[s] || '—'}）`).join('、');
    const bright = branch ? stars.map((s) => brightnessText(s, branch)).filter(Boolean).join('；') : '';
    sections.push({
      heading: '本宫底色',
      text: `${domain}本宫坐${nat}。${core ? `这颗星的核心是「${core.positive}」，需要留意的是「${core.negative}」。` : ''}${traitHere ? `落在${label(name)}这个位置上，具体表现为：${traitHere}。` : ''}${bright ? `亮度上——${bright}。` : ''}`,
    });
  }

  // ---- 第 2 段：星曜组合的力道 ----
  const comboParts: string[] = [];
  if (stars.length === 0) {
    comboParts.push('本宫无主星坐守，力道不来自本宫自身，而来自对宫借入的星性与三方四正的汇入——所以这一宫的强弱"随人随事而变"，环境好它就旺，环境差它就弱，你把它放在什么位置上，它就成为什么。');
  } else if (stars.length === 2) {
    const pair = getPairTrait(stars[0], stars[1]);
    comboParts.push(pair
      ? `${stars.join('、')}同宫：${pair}。双星同宫的力量是"两股性格互相制衡"，用得好处处得宜，用不好就是自己跟自己打架。`
      : `${stars.join('、')}同宫，两股星性互相牵引——关键词是"取舍"：先想清楚这一宫你最想要什么，再决定让哪颗星主导。`);
  } else if (stars.length === 1) {
    const core = getStarTraitCore(stars[0]);
    if (core) comboParts.push(`单星坐守，星性纯粹、不夹杂——优点是方向清楚，${core.positive}；缺点是缺少互补，顺的时候一路顺，卡的时候也容易一路卡。`);
  } else if (stars.length > 2) {
    comboParts.push(`群星汇聚（${stars.join('、')}），能量强但拥挤——这一宫的机会多、选择也多，最忌贪多都想要，学会聚焦一件事才有结果。`);
  }
  const jiIn = minors.filter((m) => JI_STARS.includes(m));
  const xiongIn = minors.filter((m) => XIUNG_STARS.includes(m));
  if (jiIn.length) comboParts.push(`辅星见${jiIn.join('、')}——是现成的助力，遇事有人帮衬，别硬扛。`);
  if (xiongIn.length) comboParts.push(`辅星见${xiongIn.join('、')}——过程会有反复与消耗，慢一步、多确认一次比抢快更划算。`);
  if (comboParts.length) {
    sections.push({ heading: '星曜组合的力道', text: comboParts.join('') });
  }

  // ---- 第 3 段：三方四正的加持与牵制 ----
  const oppStars = mainStarsOf(findGong(allGongs, OPPOSITE[name]));
  const triNames = TRIANGLE[name] || [];
  const triDesc = triNames.map((t) => {
    const ts = mainStarsOf(findGong(allGongs, t));
    return `${label(t)}坐${ts.length ? ts.join('、') : '空宫'}`;
  });
  const sifangParts: string[] = [];
  if (oppStars.length) {
    sifangParts.push(`对宫${label(OPPOSITE[name])}坐${oppStars.join('、')}——对宫是这一宫最直接的"外部环境"，它的强弱就是你在这件事上的外部助力或阻力`);
  } else {
    sifangParts.push(`对宫${label(OPPOSITE[name])}无主星，本宫的自主性反而更强，成败更看自己`);
  }
  if (triDesc.length) {
    sifangParts.push(`三合看：${triDesc.join('，')}——这三宫的能量也会汇入本宫，构成这一领域的整体底盘`);
  }
  sifangParts.push(`看这一宫不能只看本宫：三方四正合参，才是它的完整面貌`);
  sections.push({ heading: '三方四正的加持与牵制', text: `${sifangParts.join('；')}。` });

  // ---- 第 4 段：无化的含义与经营方向 ----
  const advice = getGongAdvice(name);
  sections.push({
    heading: '未见四化的含义与经营方向',
    text: `本宫既无生年四化、也无自化——意思是"先天没有在这里下重注"：这既不是优势也不是短板，而是一块中性底盘，上限由你的经营决定，下限也不会太糟。${advice ? `经营方向：${advice}。` : ''}它通常会在限运（大限/流年）飞化引动时才显山露水——所以这一宫的功课不在"等运"，而在"提前把地基打平"。`,
  });

  return {
    gongName: name,
    starName: stars.join('、') || '空宫',
    sihua: null,
    sihuaSelf: null,
    sections,
  };
}

/** 生成全部十二宫的深度解读（有四化的宫讲四化故事，无四化的宫讲底盘与经营），按十二宫顺序 */
export function getAllPalaceDeepReadings(gongData: any[]): SihuaDeepReading[] {
  const out: SihuaDeepReading[] = [];
  for (const name of GONG_ORDER) {
    const g = findGong(gongData, name);
    if (!g) continue;
    const r = generatePalaceDeepReading(g, gongData);
    if (r) out.push(r);
  }
  return out;
}
