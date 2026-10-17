// ========== 紫微斗数格局判定（中州派校准版） ==========
// 主星格 + 杂耀格；分层口径：结构成立 + 无破格为硬门槛，吉星会照 + 四化引动为"加冕"
//
// 校准要点：
// 1. 宫名归一——生产数据宫名无"宫"后缀（财帛/官禄/迁移），旧版 SIFANG 写死
//    "财帛宫/官禄宫/迁移宫"，导致三方四正只剩命宫参与判定，成格逻辑实际失效
// 2. 杀破狼格必须命宫（或身宫）坐杀破狼之一——旧版三方见2颗即成格，几乎人人成立
// 3. 夹宫按地支相邻判定（左右夹命），无地支时回退数组相邻
// 4. 火贪/铃贪：落宫 命/财/官/迁移/田宅/身宫，同宫为上格、三方相会为次格；
//    破格看**擎羊陀罗同度**（"只怕羊陀"），空劫只减色（"不怕空劫，空劫会贪狼反能习正"）
// 5. 辅星四化（文昌化忌等）参与化忌破格判定
// 6. 加冕分层（2026-09 校准）：旧版把"吉星会照+四化引动"当硬门槛，三方四正仅占
//    全盘1/3，三颗化吉星全落概率约4%，实际几乎无人成格；现结构成立即入格，
//    缺吉化只降层次（reasons 注明），不判破格
// 7. 日月并明收紧：太阳庙旺（寅卯辰巳午）+ 太阴庙旺（酉戌亥子）分居；丑未同宫必有一星失辉不判
// 8. 新增经典格：阳梁昌禄（日梁昌+禄存/化禄）、三奇嘉会（禄权科齐会）、
//    七杀朝斗（杀坐寅申）、紫府朝垣（紫府分朝，与紫府同宫互斥）
// 9. 新增羊陀夹忌破格：命宫坐生年化忌又被擎羊陀罗两宫相夹，为重破之局
// 10.（2026-10 一致性修正）
//    a. **两层口径讲明白**：破格三条只约束主星格，夹宫格与火贪/铃贪属另两层判据。
//       旧版破格文案写「格局受破」像在说全盘，与同时出现的夹命格/火贪格读起来自相矛盾；
//       现文案明确写「主星格不入格 / 主星格受破」，并在重破盘上给那两类格加"力度打折"后缀。
//       ⚠️ 曾试过让夹宫格/火贪也受 brokenGlobal 约束——实测昌曲夹结构成立的盘 124/124
//       全带破格，连坐等于直接删掉这两个功能（无格率 67.8%→76.3%），故改为分层+措辞。
//    b. 三方四正"主星名"改为只取 majorStars。旧版从全部星里减六煞/空劫，得到的其实是
//       含辅星的混合集合，名字叫 majorNames 却可匹配到辅星。
//    c. 羊陀夹忌统一用 starsOfGong（minorStarDetails 优先）；旧版直读 minorStars，
//       星源与其余分支不一致，链路一变就静默失效。
//    d. 入格统一走 addGe：页面按 geNames[i] ↔ reasons[i] 取文案，只 push 一个就会全体错位。
// 11. 新增君臣庆会格（紫微坐命 + 六吉≥2 会照）——紫微坐命在不成紫府同宫/朝垣时的兜底，
//    否则紫微坐命一个格都没有（实测结构命中率 5.5%）。
// 12.（2026-10 依出处修正，见 docs/ziwei-ge-audit.md §六）
//    a. **火贪/铃贪判据纠错**：旧版"空劫同宫即破格"与原文相反（"不怕空劫，反能习正"），
//       真正破格的是擎羊/陀罗同度（"只怕羊陀，遇之色灾成祸"）。实测 3024 盘：
//       同宫带空劫 0 盘、带羊陀 29 盘——旧判据等于从未生效，该排的没排、不该排的白挂。
//       同时补"三方四正相会"弱档与田宅/身宫落宫。
//    b. **加冕计入禄存**：出处"与禄存、科权禄、左右、魁钺加会，则为极美之格"把禄存与四化并列。
//    c. **君臣庆会加辅弼必需**："没有左辅、右弼会入的紫微星，只能算是孤君"。
// 13.（2026-10 破格分级）旧实现 `hasJi || 煞≥2 || 空劫≥2 || 羊陀夹忌` → 十个主星格全灭，
//    实测把 67.8% 的盘清成"无格局"、其中 41.7pp 结构上完全够格。依《全书》卷三
//    「三方四正皆吉星为上格，吉凶相半守照为中格，凶星恶杀为下格」改为四档：
//      上格（无破格项）／中格（化忌在财官、煞 1、空劫 1）／下格（化忌坐命、煞 2、空劫 2）＝仍入格
//      破格（化忌冲命、煞≥3、空劫与主星同宫、羊陀夹忌）＝不入格
//    ⚠️ 变量叫 brokenMain，判据是 `tier === 'broken'`；**不要**再用"有没有破格项"当门槛。
//    ⚠️ 中/下格说明写进该格 reasons，不进 breakReasons（那是"为什么没格"，语义不能混）。

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

/** 宫名展示标签：'命宫'自带宫字不重复，其余补宫字 */
function fmtGongLabel(name: string): string {
  return String(name || '').endsWith('宫') ? name : `${name}宫`;
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
  // ⚠️ 三方四正的「主星名」只取 majorStars。旧版从 sifangStars 里减掉六煞/空劫再取名，
  //    得到的其实是"除煞空外的全部星名（含昌曲辅弼魁钺禄存）"——名字叫 majorNames 却能
  //    匹配到辅星，维护时极易误用（例如将来写 majorNames.includes('文昌') 会莫名成立）。
  const sifangMajorNames = sifangGongs.flatMap((g) => (g.majorStars || []).map((s: any) => s.name));
  const minorNames = sifangStars.map((s) => s.name);
  const mingStarNames = (ming?.majorStars || []).map((s: any) => s.name);
  const shen = gongData.find((g: any) => g?.isShenGong);
  const shenStarNames = (shen?.majorStars || []).map((s: any) => s.name);

  // ---- 羊陀夹忌（中州派重破格）：命宫坐生年化忌，擎羊陀罗分居命宫两侧 ----
  let yangTuoJia = false;
  if (ming?.branch) {
    // 命宫坐生年化忌：主星+辅星都算（辛干文昌化忌、全书画化忌可落辅星，只查主星会漏判）
    const mingStarObjs = [...(ming.majorStars || []), ...(ming.minorStarDetails || [])];
    const mingHasJi = mingStarObjs.some((s: any) => (typeof s === 'string' ? null : s.sihua) === '忌');
    if (mingHasJi) {
      const bi = ZHI_ORDER.indexOf(ming.branch);
      const leftGong = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 11) % 12]);
      const rightGong = gongData.find((g) => g?.branch === ZHI_ORDER[(bi + 1) % 12]);
      const leftNames = starsOfGong(leftGong).map((s) => s.name);
      const rightNames = starsOfGong(rightGong).map((s) => s.name);
      // 必须分居两侧：左擎羊右陀罗 或 左陀罗右擎羊（同侧不算夹）
      const yangLeftTuoRight = leftNames.includes('擎羊') && rightNames.includes('陀罗');
      const tuoLeftYangRight = leftNames.includes('陀罗') && rightNames.includes('擎羊');
      if ((yangLeftTuoRight || tuoLeftYangRight) && leftGong !== rightGong) {
        yangTuoJia = true;
      }
    }
  }

  // ---- 破格与降档（三方四正） ----
  // 出处：《紫微斗数全书》卷三〈论格星数高下〉——「三方四正皆吉星为上格，吉凶相半守照为中格，
  // 凶星恶杀为下格」。古法是 **上／中／下三档**，不是"成／不成"两档。
  // ⚠️ 旧实现是一刀切否决：任意一颗生年化忌落三方四正，十个主星格全灭
  //    （实测 67.8% 的盘被清成"无格局"，其中 41.7pp 结构上完全够格）——等于把古法的"下格"整档丢弃，
  //    而且惩罚不对称：缺吉星只降层次，一颗化忌却直接不成格。
  // 现分四档，**只有 broken 真的删格**：
  //   excellent 上格（无破格项）／good 中格（成色减等）／low 下格（仍入格）／broken 破格（不入）
  // ⚠️ 中格/下格的说明写进**该格自己的 reasons**，不进 breakReasons——
  //    breakReasons 的语义是"为什么没有格"；格已成立却挂一条破格警告，正是 2026-10 修过的那次文案割裂。
  const shaCount = minorNames.filter((n) => SHA_STARS.includes(n)).length;
  const kongCount = minorNames.filter((n) => KONG_STARS.includes(n)).length;
  const jiKeys = sifangGongs
    .filter((g) => starsOfGong(g).some((s) => s.sihua === '忌'))
    .map((g) => gongKey(g));
  // 空劫入命：命宫坐主星又被地空/地劫同宫。⚠️ 只判命宫，**不是**"三方四正任一宫有主星又见空劫"——
  // 后者几乎每盘都成立（实测 36.2%），等于变相退回一刀切。三方四正见空劫按颗数降档（kongCount）。
  const kongInMing = (ming?.majorStars || []).length > 0
    && starsOfGong(ming).some((s) => KONG_STARS.includes(s.name));
  type GeTier = 'excellent' | 'good' | 'low' | 'broken';
  // 用"按严重度分桶收集"而不是 let tier 累加：闭包里改 let，TS 的控制流收窄会把它锁成 'excellent'。
  const brokenNotes: string[] = [];
  const lowNotes: string[] = [];
  const goodNotes: string[] = [];
  // 化忌分落宫：冲命最重，坐命次之，财官只减色（旧版三者同等对待）
  if (jiKeys.includes('迁移')) brokenNotes.push('生年化忌落迁移宫，冲照命宫');
  else if (jiKeys.includes('命宫')) lowNotes.push('生年化忌坐命宫');
  else if (jiKeys.some((k) => k === '财帛' || k === '官禄')) {
    goodNotes.push(`生年化忌落${jiKeys.includes('财帛') ? '财帛' : '官禄'}宫`);
  }
  // 煞星：≥3 才破；2 颗下格；1 颗中格
  if (shaCount >= 3) brokenNotes.push(`煞星（擎羊陀罗火铃）达 ${shaCount} 颗`);
  else if (shaCount === 2) lowNotes.push('煞星 2 颗会照');
  else if (shaCount === 1) goodNotes.push('煞星 1 颗会照');
  // 空劫：入命才破；三方四正分居 2 颗下格；1 颗中格
  if (kongInMing) brokenNotes.push('地空地劫与命宫主星同宫（空劫入命）');
  else if (kongCount >= 2) lowNotes.push(`空亡星（地空地劫）${kongCount} 颗分居三方`);
  else if (kongCount === 1) goodNotes.push('空亡星 1 颗会照');
  if (yangTuoJia) brokenNotes.push('羊陀夹忌：命宫化忌又被擎羊陀罗两宫相夹，为重破之局');

  const tier: GeTier = brokenNotes.length
    ? 'broken'
    : lowNotes.length ? 'low' : goodNotes.length ? 'good' : 'excellent';
  const shadeNotes = [...lowNotes, ...goodNotes];

  /** 主星格是否真的不入格。⚠️ 只认它，不要用"有没有破格项"当门槛 */
  const brokenMain = tier === 'broken';
  if (brokenMain) {
    breakReasons.push(
      `破格：${brokenNotes.join('；')} → 主星格不入格（夹宫格与火贪/铃贪按各自判据另论）`,
    );
  }

  /**
   * ⚠️ 页面按 `geNames[i]` ↔ `reasons[i]` 一一对应取文案（Ziwei.tsx 格局分析卡片）。
   * 任何地方只 push 其中一个，后面所有格的说明都会错位——所以入格必须走这个唯一入口。
   */
  const addGe = (name: string, reason: string) => {
    geNames.push(name);
    reasons.push(reason);
  };

  // ---- 吉星会照 + 四化引动（加冕条件，非硬门槛） ----
  const jiHui = minorNames.filter((n) => JI_STARS.includes(n));
  const hasSiHuaYin = sifangStars.some((s) => s.sihua === '禄' || s.sihua === '权' || s.sihua === '科');
  // 禄存计入「吉星会照」：出处「与禄存、科权禄、左右、魁钺加会，则为极美之格」——
  // 禄存与四化是并列的加冕项，旧版只认四化，三方有禄存而无四化时白丢了这一层。
  const hasLuCun = minorNames.includes('禄存');
  const crowned = jiHui.length > 0 && (hasSiHuaYin || hasLuCun);

  // ---- 主星格判定 ----
  // 分层口径：
  //   硬门槛 = 主星结构成立 + 不是 broken 档
  //   成色   = 加冕（吉星会照 + 禄权科/禄存）→ 格局纯正；缺则层次打折
  //            + 破格分档（中格/下格）→ 写明"古法列为中格/下格"
  //   （旧版把加冕当硬门槛，三方四正仅占全盘 1/3，三颗化吉星全落概率约 4%，实际几乎无人成格）
  const tierLabel = (): string => {
    if (tier === 'low') return `古法列为下格，成色减等（${shadeNotes.join('；')}）`;
    if (tier === 'good') return `古法列为中格，成色减等（${shadeNotes.join('；')}）`;
    return '';
  };
  const tryGe = (name: string, condition: boolean, extra?: string) => {
    if (!condition || brokenMain) return;
    const note = extra ? `；${extra}` : '';
    const shade = tier === 'excellent' ? '' : `；${tierLabel()}`;
    if (crowned) {
      const crownBasis = hasSiHuaYin ? '四化引动' : '禄存朝拱';
      const pure = tier === 'excellent' ? '，无破格，格局纯正' : '';
      addGe(name, `${name}：主星组合成立，吉星${jiHui.join('、')}会照，${crownBasis}${pure}${shade}${note}`);
    } else {
      const lack: string[] = [];
      if (!jiHui.length) lack.push('缺吉星会照');
      if (!hasSiHuaYin && !hasLuCun) lack.push('缺禄权科引动与禄存');
      const pure = tier === 'excellent' ? '且无破格，' : '，';
      addGe(name, `${name}：主星组合成立${pure}但${lack.join('、')}，格局层次打折，宜后天补足${shade}${note}`);
    }
  };

  // 机月同梁：四星会齐于三方四正
  tryGe('机月同梁格', ['天机', '太阴', '天同', '天梁'].every((n) => sifangMajorNames.includes(n)));

  // 杀破狼：命宫或身宫必须坐杀/破/狼之一，且三方四正见其中两颗以上
  // （旧版只看三方数量，几乎人人成格；中州派以命身坐杀破狼为正格）
  const splInSifang = SHA_PO_LANG.filter((n) => sifangMajorNames.includes(n)).length;
  const mingOrShenSitsSpl = [...mingStarNames, ...shenStarNames].some((n) => SHA_PO_LANG.includes(n));
  tryGe('杀破狼格', mingOrShenSitsSpl && splInSifang >= 2);

  if (ming) {
    tryGe('紫府同宫格', mingStarNames.includes('紫微') && mingStarNames.includes('天府'));
    tryGe('廉贞贪狼格', mingStarNames.includes('廉贞') && mingStarNames.includes('贪狼'));
    // 君臣庆会：紫微坐命 + 左辅/右弼须有其一 + 六吉（左右昌曲魁钺）≥2 会照。
    // 紫微为帝星，得辅弼昌曲魁钺为"臣"，君臣相得则格正；紫微无辅弼即"孤君"。
    // ⚠️ 出处（多家一致，也是本格之所以叫"君臣"的由来）：
    //    「没有左辅、右弼会入的紫微星，只能算是孤君」——辅弼是**必需项**。
    //    旧版只判「六吉≥2」，昌曲魁钺凑两颗即算，把"孤君"这个正题漏掉了
    //    （实测：紫微坐命 252 盘，旧口径结构成立 167，加辅弼必需后 109）。
    //    另有更严一说「三组六吉（辅弼／昌曲／魁钺）各至少一颗」——
    //    实测仅 20/252 结构成立、经破格后不足 10 盘，会把本格做成几乎没有的格，故未取。
    // 这条同时是紫微坐命的兜底：不成紫府同宫/紫府朝垣时，否则紫微坐命一个格都没有。
    const hasZuoYou = jiHui.includes('左辅') || jiHui.includes('右弼');
    tryGe('君臣庆会格', mingStarNames.includes('紫微') && hasZuoYou && jiHui.length >= 2);
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
    // ⚠️ 口径标注（2026-10 定稿）：这是**广义版**——"两星皆庙旺且互在三方四正"。
    //    经典日月并明多指固定落点（太阳巳/辰 + 太阴酉/戌，所谓丹墀桂墀；或天梁坐丑、日月夹命），
    //    但那类说法只见于格局汇编类命理书、非《全书》原句，依据强度不足；
    //    收紧到固定宫位会砍掉现有盘里的大半，而本格的观感价值恰在"日月同辉"意象。
    //    故保留广义判据，但**理由文案必须标明口径**，不让人误以为是经典落点版。
    tryGe(
      '日月并明格',
      !!riGong && !!yueGong && gongKey(riGong) !== gongKey(yueGong) && riWang && yueWang,
      '广义口径：两星皆庙旺且互在三方四正，非经典固定宫位说',
    );
  }

  // 府相朝垣：天府与天相分居命宫三方四正之内，且不同宫
  {
    const fuGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const xiangGong = sifangGongs.find((g) => (g.majorStars || []).some((s: any) => s.name === '天相'));
    tryGe('府相朝垣格', !!fuGong && !!xiangGong && gongKey(fuGong) !== gongKey(xiangGong));
  }

  // 阳梁昌禄：太阳、天梁、文昌会于三方四正，且见禄存或化禄——主考试功名、专业声誉
  tryGe('阳梁昌禄格',
    sifangMajorNames.includes('太阳') && sifangMajorNames.includes('天梁') && minorNames.includes('文昌')
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

  // ---- 突发吉格：火贪 / 铃贪 ----
  // 出处（《紫微斗数全书》赋文与断语，多家转载一致）：
  //   · 落宫：贪狼守 命宫／财帛／官禄／迁移／田宅／身宫；
  //   · 星位：同宫为上格，「贪狼守命宫，火星仅在三方相会，不见煞，亦合格，但格局稍次」；
  //   · 破格：「擎羊火星同度、陀罗火星同度，均不合格」「只怕羊陀，遇之色灾成祸」；
  //   · 减色：「不怕空劫，空劫会贪狼，反能习正」——空劫只减成色，**不断格**；
  //           贪狼化忌则「横发横破」（比较不喜欢忌星）。
  // ⚠️ 旧版把两条判据搞反了：① 空劫同宫即破格（原文恰恰说"不怕空劫"）；
  //    ② 只认同宫、且只取命宫三方四正（漏田宅/身宫与"三方相会"弱档）。
  //    实测（3024 盘）：同宫带空劫 0 盘、带擎羊或陀罗 29 盘——旧判据等于从没生效。
  // 分层口径：火贪/铃贪不属主星格，全局破格不排除它；但重破盘注明打折，避免文案割裂。
  const TAN_PALACE_KEYS = ['命宫', '财帛', '官禄', '迁移', '田宅'];
  /** 某宫的三方四正（本宫 + 三合两宫 + 对宫），按地支算；无地支返回空 */
  const sifangZhiOf = (branch?: string): string[] => {
    const bi = branch ? ZHI_ORDER.indexOf(branch) : -1;
    if (bi < 0) return [];
    return [bi, (bi + 4) % 12, (bi + 8) % 12, (bi + 6) % 12].map((i) => ZHI_ORDER[i]);
  };
  const tanPalaces = gongData.filter((g) => {
    const inRange = TAN_PALACE_KEYS.includes(gongKey(g)) || !!g?.isShenGong;
    return inRange && (g?.majorStars || []).some((s: any) => s.name === '贪狼');
  });
  const geDone = new Set<string>();
  for (const tan of tanPalaces) {
    const tanNames = starsOfGong(tan).map((s) => s.name);
    const tanZhi = sifangZhiOf(tan?.branch);
    // 贪狼的三方四正（含本宫）；无地支时退化为只看本宫
    const scope = tanZhi.length ? gongData.filter((g) => tanZhi.includes(g?.branch)) : [tan];
    for (const pair of [{ star: '火星', ge: '火贪格' }, { star: '铃星', ge: '铃贪格' }]) {
      if (geDone.has(pair.ge)) continue;
      const huo = scope.find((g) => starsOfGong(g).some((s) => s.name === pair.star));
      if (!huo) continue;
      const samePalace = huo === tan;
      // ⚠️ "三方相会"这一弱档**只在贪狼坐命宫时成立**：原文是「贪狼守命宫，火星仅在三方相会，
      //    不见煞，亦合格，但格局稍次」——弱档句子的主语是"守命宫"，不是"守六宫之一"。
      //    实测若把弱档套到全部六个落宫，火贪会从 83 盘涨到 306 盘（10.1%），
      //    让一个"突发横发"的格变成全站最高频格，显然与原文语气不符。
      if (!samePalace && gongKey(tan) !== '命宫') continue;
      const huoNames = starsOfGong(huo).map((s) => s.name);
      const tanSihua = (tan?.majorStars || []).find((s: any) => s.name === '贪狼')?.sihua;
      const where = samePalace
        ? `${fmtGongLabel(gongKey(tan))}贪狼与${pair.star}同度`
        : `${fmtGongLabel(gongKey(tan))}贪狼与${fmtGongLabel(gongKey(huo))}${pair.star}`;
      const discount = brokenMain ? '（主星格已受破，此格属突发层，力度打折）' : '';
      // 破格：擎羊／陀罗**与火铃同宫**——原文明确「擎羊火星同度、陀罗火星同度，均不合格」
      //      （「只怕羊陀，遇之色灾成祸」）。注意羊陀若只与贪狼同宫、不在火铃宫，
      //      那是「贪狼不喜与擎羊、陀罗同宫，易因色招灾」——属减色，不构成破格。
      const yangTuoWithHuo = ['擎羊', '陀罗'].filter((n) => huoNames.includes(n));
      if (yangTuoWithHuo.length) {
        const breakWhere = samePalace ? '同宫' : fmtGongLabel(gongKey(huo));
        breakReasons.push(
          `${pair.ge}：${where}，但${breakWhere}见${yangTuoWithHuo.join('、')}` +
          `——「只怕羊陀，遇之色灾成祸」，此格不立`
        );
        geDone.add(pair.ge);
        continue;
      }
      // 减色（不断格）
      const shade: string[] = [];
      const tanYangTuo = samePalace ? [] : ['擎羊', '陀罗'].filter((n) => tanNames.includes(n));
      if (tanYangTuo.length) shade.push(`贪狼与${tanYangTuo.join('、')}同宫，易因色招灾，须防是非`);
      if ([...huoNames, ...(samePalace ? [] : tanNames)].some((n) => KONG_STARS.includes(n))) {
        shade.push('逢地空地劫，横发之力被吸蚀，成色打折');
      }
      if (tanSihua === '忌') shade.push('贪狼化忌，主横发横破，宜见好就收');
      const shadeStr = shade.length ? `（${shade.join('；')}）` : '';
      const gradeDesc = samePalace
        ? (pair.star === '火星' ? '同宫为正格，火炼贪狼主突发横发，机遇来得快' : '同宫为正格，铃星催动贪狼，主意外之财与突变机遇')
        : '三方四正相会而未同宫，属次格，横发之力稍缓';
      addGe(pair.ge, `${pair.ge}：${where}，${gradeDesc}${shadeStr}${discount}`);
      geDone.add(pair.ge);
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
      const leftMinor = starsOfGong(left).map((s) => s.name);
      const rightMinor = starsOfGong(right).map((s) => s.name);
      const tryJiaGe = (name: string, a: string, b: string) => {
        // 必须分居两侧：左a右b 或 左b右a
        const ab = leftMinor.includes(a) && rightMinor.includes(b);
        const ba = leftMinor.includes(b) && rightMinor.includes(a);
        if (!(ab || ba)) return;
        // 口径说明：夹宫格不像主星格走"分层"（结构成立即入格、缺吉化只降层次）——
        // 夹宫之力本弱，须禄权科引动方足成格，无引动只记 breakReason 不入格（刻意从严）
        // ⚠️ 这里只认四化（不含禄存）：夹宫格的门槛是"引动"，禄存是静态星不是引动项；
        //    加冕那层才把禄存与四化并列（见上方 hasLuCun 注释）。
        if (!hasSiHuaYin) { breakReasons.push(`${name}：缺少四化引动`); return; }
        // 分层口径：夹宫格不属主星格，全局破格不排除它；重破盘注明打折，避免文案割裂
        const discount = brokenMain ? '（主星格已受破，此格属夹宫层，力度打折）' : '';
        addGe(name, `${name}：${a}${b}分居命宫两侧，且四化引动${discount}`);
      };
      tryJiaGe('昌曲夹命格', '文昌', '文曲');
      tryJiaGe('魁钺夹命格', '天魁', '天钺');
      tryJiaGe('左右夹命格', '左辅', '右弼');
    }
  }

  return { geNames, reasons, breakReasons };
}
