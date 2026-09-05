// ========== 紫微斗数格局判定（中州派校准版） ==========
// 主星格 + 杂耀格；严格成格：组合成立 + 吉星会照 + 四化引动 + 无破格
//
// 校准要点：
// 1. 宫名归一——生产数据宫名无"宫"后缀（财帛/官禄/迁移），旧版 SIFANG 写死
//    "财帛宫/官禄宫/迁移宫"，导致三方四正只剩命宫参与判定，成格逻辑实际失效
// 2. 杀破狼格必须命宫（或身宫）坐杀破狼之一——旧版三方见2颗即成格，几乎人人成立
// 3. 夹宫按地支相邻判定（左右夹命），无地支时回退数组相邻
// 4. 火贪/铃贪逢地空地劫同宫则破格（横发之气被空劫所破）
// 5. 辅星四化（文昌化忌等）参与化忌破格判定

export interface ZiweiGeResult {
  geNames: string[];
  reasons: string[];
  breakReasons: string[];
}

const JI_STARS = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺'];
const SHA_STARS = ['擎羊', '陀罗', '火星', '铃星'];
const KONG_STARS = ['地空', '地劫'];
const SHA_PO_LANG = ['七杀', '破军', '贪狼'];
const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 三方四正：命宫 + 财帛 + 官禄 + 迁移（归一化后的无后缀宫名） */
const SIFANG = ['命宫', '财帛', '官禄', '迁移'];

/** 宫名归一：去掉"宫"后缀（命宫保留二字） */
function normGongName(name: string): string {
  if (name === '命宫') return '命宫';
  return String(name || '').replace(/宫$/, '');
}

function gongKey(g: any): string {
  return normGongName(g?.name);
}

function findGong(gongData: any[], keyName: string): any | undefined {
  return gongData.find((g) => gongKey(g) === keyName);
}

/** 提取某宫全部星（主星带四化；辅星兼容字符串/对象，优先带四化的 minorStarDetails） */
function starsOfGong(g: any): { name: string; sihua?: string | null }[] {
  const out: { name: string; sihua?: string | null }[] = [];
  for (const s of g?.majorStars || []) out.push({ name: s.name, sihua: s.sihua ?? null });
  const minors = g?.minorStarDetails || g?.minorStars || [];
  for (const s of minors) {
    if (typeof s === 'string') out.push({ name: s, sihua: null });
    else out.push({ name: s.name, sihua: s.sihua ?? null });
  }
  return out;
}

export function analyzeZiweiGe(gongData: any[]): ZiweiGeResult {
  const geNames: string[] = [];
  const reasons: string[] = [];
  const breakReasons: string[] = [];

  const ming = findGong(gongData, '命宫');
  const sifangGongs = SIFANG.map((n) => findGong(gongData, n)).filter(Boolean);
  const sifangStars = sifangGongs.flatMap((g) => starsOfGong(g));
  const majorNames = sifangStars
    .filter((s) => !SHA_STARS.includes(s.name) && !KONG_STARS.includes(s.name))
    .map((s) => s.name);
  const minorNames = sifangStars.map((s) => s.name);
  const mingStarNames = (ming?.majorStars || []).map((s: any) => s.name);
  const shen = gongData.find((g: any) => g?.isShenGong);
  const shenStarNames = (shen?.majorStars || []).map((s: any) => s.name);

  // ---- 破格检查（三方四正） ----
  const hasJi = sifangStars.some((s) => s.sihua === '忌');
  const shaCount = minorNames.filter((n) => SHA_STARS.includes(n)).length;
  const kongCount = minorNames.filter((n) => KONG_STARS.includes(n)).length;
  if (hasJi) breakReasons.push('命宫三方四正出现生年化忌，格局易被破坏');
  if (shaCount >= 2) breakReasons.push(`煞星（擎羊陀罗火星铃星）达 ${shaCount} 颗，格局受破`);
  if (kongCount >= 2) breakReasons.push(`空亡星（地空地劫）达 ${kongCount} 颗，格局受破`);

  // ---- 吉星会照 + 四化引动 ----
  const jiHui = minorNames.filter((n) => JI_STARS.includes(n));
  const sihuaYin = sifangStars.some((s) => s.sihua === '禄' || s.sihua === '权' || s.sihua === '科');

  // ---- 主星格判定 ----
  const tryGe = (name: string, condition: boolean, needJi = true) => {
    if (!condition) return;
    if (!jiHui.length && needJi) { breakReasons.push(`${name}：缺少吉星会照（昌曲左右魁钺）`); return; }
    if (!sihuaYin) { breakReasons.push(`${name}：缺少四化引动（禄/权/科）`); return; }
    geNames.push(name);
    reasons.push(`${name}：主星组合成立，吉星${jiHui.join('、')}会照，四化引动，无破格`);
  };

  // 机月同梁：四星会齐于三方四正
  tryGe('机月同梁格', ['天机', '太阴', '天同', '天梁'].every((n) => majorNames.includes(n)));

  // 杀破狼：命宫或身宫必须坐杀/破/狼之一，且三方四正见其中两颗以上
  // （旧版只看三方数量，几乎人人成格；中州派以命身坐杀破狼为正格）
  const splInSifang = SHA_PO_LANG.filter((n) => majorNames.includes(n)).length;
  const mingOrShenSitsSpl = [...mingStarNames, ...shenStarNames].some((n) => SHA_PO_LANG.includes(n));
  tryGe('杀破狼格', mingOrShenSitsSpl && splInSifang >= 2);

  if (ming) {
    tryGe('紫府同宫格', mingStarNames.includes('紫微') && mingStarNames.includes('天府'));
    tryGe('廉贞贪狼格', mingStarNames.includes('廉贞') && mingStarNames.includes('贪狼'));
  }

  // 日月并明：太阳太阴在三方四正会照（不必同宫；丑未同宫者亦归此论）
  tryGe('日月并明格', majorNames.includes('太阳') && majorNames.includes('太阴'));

  // 府相朝垣：天府与天相分居命宫三方四正之内，且不同宫
  {
    const fuGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const xiangGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天相'));
    tryGe('府相朝垣格', !!fuGong && !!xiangGong && gongKey(fuGong) !== gongKey(xiangGong));
  }

  // ---- 突发吉格：火贪 / 铃贪（三方四正同宫贪狼与火星或铃星同度；逢空劫则破格） ----
  for (const g of sifangGongs) {
    const names = starsOfGong(g).map((s) => s.name);
    const hasKong = names.some((n) => KONG_STARS.includes(n));
    if (names.includes('贪狼') && names.includes('火星')) {
      if (hasKong) {
        breakReasons.push(`火贪格：${gongKey(g)}宫贪狼火星同度但逢地空/地劫，横发之气被空劫所破`);
      } else {
        geNames.push('火贪格');
        reasons.push(`火贪格：${gongKey(g)}宫贪狼与火星同度，火炼贪狼主突发横发，机遇来得快`);
      }
    }
    if (names.includes('贪狼') && names.includes('铃星')) {
      if (hasKong) {
        breakReasons.push(`铃贪格：${gongKey(g)}宫贪狼铃星同度但逢地空/地劫，横发之气被空劫所破`);
      } else {
        geNames.push('铃贪格');
        reasons.push(`铃贪格：${gongKey(g)}宫贪狼与铃星同度，主意外之财与突变机遇`);
      }
    }
  }

  // ---- 杂耀格（命宫左右夹宫：按地支相邻判定，无地支时回退数组相邻） ----
  if (ming) {
    let left: any;
    let right: any;
    if (ming.branch) {
      const bi = ZHI_ORDER.indexOf(ming.branch);
      if (bi >= 0) {
        left = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 11) % 12]);
        right = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 1) % 12]);
      }
    }
    if (!left || !right) {
      const mingIdx = gongData.findIndex((g) => gongKey(g) === '命宫');
      if (mingIdx >= 0 && gongData.length > 2) {
        left = left || gongData[(mingIdx - 1 + gongData.length) % gongData.length];
        right = right || gongData[(mingIdx + 1) % gongData.length];
      }
    }
    if (left && right) {
      const allMinor = [...starsOfGong(left), ...starsOfGong(right)].map((s) => s.name);
      const tryJiaGe = (name: string, a: string, b: string) => {
        if (!(allMinor.includes(a) && allMinor.includes(b))) return;
        if (!sihuaYin) { breakReasons.push(`${name}：缺少四化引动`); return; }
        geNames.push(name);
        reasons.push(`${name}：${a}${b}分居命宫两侧，且四化引动`);
      };
      tryJiaGe('昌曲夹命格', '文昌', '文曲');
      tryJiaGe('魁钺夹命格', '天魁', '天钺');
      tryJiaGe('左右夹命格', '左辅', '右弼');
    }
  }

  return { geNames, reasons, breakReasons };
}
