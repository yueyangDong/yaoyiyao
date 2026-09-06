// ========== 紫微斗数格局判定（中州派校准版） ==========
// 主星格 + 杂耀格；分层口径：结构成立 + 无破格为硬门槛，吉星会照 + 四化引动为"加冕"
//
// 校准要点：
// 1. 宫名归一——生产数据宫名无"宫"后缀（财帛/官禄/迁移），旧版 SIFANG 写死
//    "财帛宫/官禄宫/迁移宫"，导致三方四正只剩命宫参与判定，成格逻辑实际失效
// 2. 杀破狼格必须命宫（或身宫）坐杀破狼之一——旧版三方见2颗即成格，几乎人人成立
// 3. 夹宫按地支相邻判定（左右夹命），无地支时回退数组相邻
// 4. 火贪/铃贪逢地空地劫同宫则破格（横发之气被空劫所破）
// 5. 辅星四化（文昌化忌等）参与化忌破格判定
// 6. 加冕分层（2026-09 校准）：旧版把"吉星会照+四化引动"当硬门槛，三方四正仅占
//    全盘1/3，三颗化吉星全落概率约4%，实际几乎无人成格；现结构成立即入格，
//    缺吉化只降层次（reasons 注明），不判破格
// 7. 日月并明收紧：太阳庙旺（寅卯辰巳午）+ 太阴庙旺（酉戌亥子）分居；丑未同宫必有一星失辉不判
// 8. 新增经典格：阳梁昌禄（日梁昌+禄存/化禄）、三奇嘉会（禄权科齐会）、
//    七杀朝斗（杀坐寅申）、紫府朝垣（紫府分朝，与紫府同宫互斥）
// 9. 新增羊陀夹忌破格：命宫坐生年化忌又被擎羊陀罗两宫相夹，为重破之局

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

  // ---- 羊陀夹忌（中州派重破格）：命宫坐生年化忌，擎羊陀罗分居命宫两侧 ----
  let yangTuoJia = false;
  if (ming?.branch) {
    const mingHasJi = (ming.majorStars || []).some((s: any) => s.sihua === '忌');
    if (mingHasJi) {
      const bi = ZHI_ORDER.indexOf(ming.branch);
      const leftGong = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 11) % 12]);
      const rightGong = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 1) % 12]);
      const leftNames = (leftGong?.minorStars || []).map((s: any) => (typeof s === 'string' ? s : s.name));
      const rightNames = (rightGong?.minorStars || []).map((s: any) => (typeof s === 'string' ? s : s.name));
      const yangLeft = leftNames.includes('擎羊') || rightNames.includes('擎羊');
      const tuoRight = rightNames.includes('陀罗') || leftNames.includes('陀罗');
      if (yangLeft && tuoRight && leftGong !== rightGong) {
        yangTuoJia = true;
        breakReasons.push('羊陀夹忌——命宫化忌又被擎羊陀罗两宫相夹，为重破之局，诸格遇此均打折论');
      }
    }
  }

  // 全局破格：成立时主星格一律不入格（火贪空劫破格为特定机制，不影响主星格）
  const brokenGlobal = hasJi || shaCount >= 2 || kongCount >= 2 || yangTuoJia;

  // ---- 吉星会照 + 四化引动（加冕条件，非硬门槛） ----
  const jiHui = minorNames.filter((n) => JI_STARS.includes(n));
  const hasLuQuanKe = sifangStars.some((s) => s.sihua === '禄' || s.sihua === '权' || s.sihua === '科');
  const crowned = jiHui.length > 0 && hasLuQuanKe;

  // ---- 主星格判定 ----
  // 中州派校准（分层口径）：
  //   硬门槛 = 主星结构成立 + 无破格（化忌/煞重/空劫/羊陀夹忌）
  //   加冕   = 吉星会照 + 禄权科引动 → 格局纯正；缺则成格但层次打折，注明原因
  //   （旧版把加冕当硬门槛，三方四正仅占全盘 1/3，三颗化吉星全落概率约 4%，实际几乎无人成格）
  const tryGe = (name: string, condition: boolean) => {
    if (!condition || brokenGlobal) return;
    geNames.push(name);
    if (crowned) {
      reasons.push(`${name}：主星组合成立，吉星${jiHui.join('、')}会照，四化引动，无破格，格局纯正`);
    } else {
      const lack: string[] = [];
      if (!jiHui.length) lack.push('缺吉星会照');
      if (!hasLuQuanKe) lack.push('缺禄权科引动');
      reasons.push(`${name}：主星组合成立且无破格，但${lack.join('、')}，格局层次打折，宜后天补足`);
    }
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

  // 日月并明：太阳太阴分居三方四正且各处庙旺之地（中州派收紧口径）。
  // 太阳庙旺：寅卯辰巳午；太阴庙旺：酉戌亥子。
  // 丑未日月同宫必有一星失辉，不判并明（旧版只查两星会照，过宽）。
  {
    const riGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '太阳'));
    const yueGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '太阴'));
    const RI_WANG = ['寅', '卯', '辰', '巳', '午'];
    const YUE_WANG = ['酉', '戌', '亥', '子'];
    const riWang = !!riGong?.branch && RI_WANG.includes(riGong.branch);
    const yueWang = !!yueGong?.branch && YUE_WANG.includes(yueGong.branch);
    tryGe('日月并明格', !!riGong && !!yueGong && gongKey(riGong) !== gongKey(yueGong) && riWang && yueWang);
  }

  // 府相朝垣：天府与天相分居命宫三方四正之内，且不同宫
  {
    const fuGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const xiangGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天相'));
    tryGe('府相朝垣格', !!fuGong && !!xiangGong && gongKey(fuGong) !== gongKey(xiangGong));
  }

  // 阳梁昌禄：太阳、天梁、文昌会于三方四正，且见禄存或化禄——主考试功名、专业声誉
  tryGe('阳梁昌禄格',
    majorNames.includes('太阳') && majorNames.includes('天梁') && minorNames.includes('文昌')
    && (minorNames.includes('禄存') || sifangStars.some((s) => s.sihua === '禄')));

  // 三奇嘉会：化禄、化权、化科三奇齐会三方四正——禄权科拱，众吉之格
  tryGe('三奇嘉会格',
    sifangStars.some((s) => s.sihua === '禄')
    && sifangStars.some((s) => s.sihua === '权')
    && sifangStars.some((s) => s.sihua === '科'));

  // 七杀朝斗：七杀坐命于寅或申，对宫紫微天府来朝——将星得位
  {
    const isChaoDou = mingStarNames.includes('七杀') && (ming?.branch === '寅' || ming?.branch === '申');
    tryGe('七杀朝斗格', isChaoDou);
  }

  // 紫府朝垣：紫微与天府分居三方四正会照命宫（命宫非紫府同宫，与紫府同宫格互斥）
  {
    const ziGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '紫微'));
    const fuGong2 = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const ziFuSame = mingStarNames.includes('紫微') && mingStarNames.includes('天府');
    tryGe('紫府朝垣格',
      !ziFuSame && !!ziGong && !!fuGong2 && gongKey(ziGong) !== gongKey(fuGong2));
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
        if (!hasLuQuanKe) { breakReasons.push(`${name}：缺少四化引动`); return; }
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
