// ========== 紫微斗数宫位数据补全（亮度/十二神/命主身主/流年小限） ==========
// 数据来源：星曜亮度采用 iztro 权威亮度表（按地支从寅起顺布）；
// 长生十二神、博士十二神、岁前十二神、将前十二神按通行安星诀排布。

// 地支顺序（索引基准）
export const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 亮度表原始数组按 [寅,卯,辰,巳,午,未,申,酉,戌,亥,子,丑] 顺布
const YIN_START_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

const BRIGHT_CN: Record<string, string> = {
  miao: '庙', wang: '旺', de: '得', li: '利', ping: '平', bu: '不', xian: '陷',
};

// 十四主星 + 六辅星亮度（iztro STARS_INFO）
const RAW_BRIGHTNESS: Record<string, string[]> = {
  '紫微': ['wang', 'wang', 'de', 'wang', 'miao', 'miao', 'wang', 'wang', 'de', 'wang', 'ping', 'miao'],
  '天机': ['de', 'wang', 'li', 'ping', 'miao', 'xian', 'de', 'wang', 'li', 'ping', 'miao', 'xian'],
  '太阳': ['wang', 'miao', 'wang', 'wang', 'wang', 'de', 'de', 'ping', 'bu', 'xian', 'xian', 'bu'],
  '武曲': ['de', 'li', 'miao', 'ping', 'wang', 'miao', 'de', 'li', 'miao', 'ping', 'wang', 'miao'],
  '天同': ['li', 'ping', 'ping', 'miao', 'xian', 'bu', 'wang', 'ping', 'ping', 'miao', 'wang', 'bu'],
  '廉贞': ['miao', 'ping', 'li', 'xian', 'ping', 'li', 'miao', 'ping', 'li', 'xian', 'ping', 'li'],
  '天府': ['miao', 'de', 'miao', 'de', 'wang', 'miao', 'de', 'wang', 'miao', 'de', 'miao', 'miao'],
  '太阴': ['wang', 'xian', 'xian', 'xian', 'bu', 'bu', 'li', 'wang', 'wang', 'miao', 'miao', 'miao'],
  '贪狼': ['ping', 'li', 'miao', 'xian', 'wang', 'miao', 'ping', 'li', 'miao', 'xian', 'wang', 'miao'],
  '巨门': ['miao', 'miao', 'xian', 'wang', 'wang', 'bu', 'miao', 'miao', 'xian', 'wang', 'wang', 'bu'],
  '天相': ['miao', 'xian', 'de', 'de', 'miao', 'de', 'miao', 'xian', 'de', 'de', 'miao', 'miao'],
  '天梁': ['miao', 'miao', 'miao', 'xian', 'miao', 'wang', 'xian', 'de', 'miao', 'xian', 'miao', 'wang'],
  '七杀': ['miao', 'wang', 'miao', 'ping', 'wang', 'miao', 'miao', 'wang', 'miao', 'ping', 'wang', 'miao'],
  '破军': ['de', 'xian', 'wang', 'ping', 'miao', 'wang', 'de', 'xian', 'wang', 'ping', 'miao', 'wang'],
  '文昌': ['xian', 'li', 'de', 'miao', 'xian', 'li', 'de', 'miao', 'xian', 'li', 'de', 'miao'],
  '文曲': ['ping', 'wang', 'de', 'miao', 'xian', 'wang', 'de', 'miao', 'xian', 'wang', 'de', 'miao'],
  '火星': ['miao', 'li', 'xian', 'de', 'miao', 'li', 'xian', 'de', 'miao', 'li', 'xian', 'de'],
  '铃星': ['miao', 'li', 'xian', 'de', 'miao', 'li', 'xian', 'de', 'miao', 'li', 'xian', 'de'],
  '擎羊': ['', 'xian', 'miao', '', 'xian', 'miao', '', 'xian', 'miao', '', 'xian', 'miao'],
  '陀罗': ['xian', '', 'miao', 'xian', '', 'miao', 'xian', '', 'miao', 'xian', '', 'miao'],
};

// 展开为 按十二地支索引的查找表：BRIGHT_TABLE[星名][地支] = 庙/旺/得/利/平/不/陷/''
export const BRIGHT_TABLE: Record<string, Record<string, string>> = {};
for (const [star, arr] of Object.entries(RAW_BRIGHTNESS)) {
  const m: Record<string, string> = {};
  arr.forEach((code, i) => {
    m[YIN_START_ORDER[i]] = BRIGHT_CN[code] || '';
  });
  BRIGHT_TABLE[star] = m;
}

/** 查星曜亮度（无亮度数据的星返回 ''） */
export function getStarBrightness(starName: string, branch: string): string {
  return BRIGHT_TABLE[starName]?.[branch] || '';
}

// ---------- 长生十二神 ----------
// 五行局长生起宫：水二局→申、木三局→亥、金四局→巳、土五局→申（水土同宫）、火六局→寅；一律顺行
const CHANGSHENG_STEPS = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const ELEMENT_CHANGSHENG_START: Record<string, string> = {
  '水': '申', '木': '亥', '金': '巳', '土': '申', '火': '寅',
};

/** 长生十二神：返回 Record<地支, 神煞名> */
export function getChangsheng12(fiveElementName: string): Record<string, string> {
  const element = (fiveElementName || '').charAt(0);
  const startIdx = ZHI_ORDER.indexOf(ELEMENT_CHANGSHENG_START[element] || '申');
  const map: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    map[ZHI_ORDER[(startIdx + i) % 12]] = CHANGSHENG_STEPS[i];
  }
  return map;
}

// ---------- 博士十二神 ----------
// 禄存起博士，阳男阴女顺行、阴男阳女逆行：博士、力士、青龙、小耗、将军、奏书、飞廉、喜神、病符、大耗、伏兵、官府
const BOSHI_STEPS = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
const LUCUN_BRANCH: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午',
  '庚': '申', '辛': '酉', '壬': '子', '癸': '亥',
};

/** 博士十二神：返回 Record<地支, 神煞名> */
export function getBoshi12(yearGan: string, gender: 'male' | 'female'): Record<string, string> {
  const startIdx = ZHI_ORDER.indexOf(LUCUN_BRANCH[yearGan] || '寅');
  const yangGan = '甲丙戊庚壬'.includes(yearGan);
  const forward = (gender === 'male') === yangGan; // 阳男阴女顺
  const map: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const idx = ((startIdx + (forward ? i : -i)) % 12 + 12) % 12;
    map[ZHI_ORDER[idx]] = BOSHI_STEPS[i];
  }
  return map;
}

// ---------- 岁前十二神 ----------
// 生年支起岁建顺行：岁建、晦气、丧门、贯索、官符、小耗、大耗、龙德、白虎、天德、吊客、病符
const SUIQIAN_STEPS = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];

export function getSuiqian12(yearZhi: string): Record<string, string> {
  const startIdx = ZHI_ORDER.indexOf(yearZhi);
  const map: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    map[ZHI_ORDER[(startIdx + i) % 12]] = SUIQIAN_STEPS[i];
  }
  return map;
}

// ---------- 将前十二神 ----------
// 三合局将星起宫顺行：寅午戌→午、申子辰→子、巳酉丑→酉、亥卯未→卯
// 将星、攀鞍、岁驿、息神、华盖、劫煞、灾煞、天煞、指背、咸池、月煞、亡神
const JIANGQIAN_STEPS = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神'];

export function getJiangqian12(yearZhi: string): Record<string, string> {
  const group: Record<string, string> = { '寅': '午', '午': '午', '戌': '午', '申': '子', '子': '子', '辰': '子', '巳': '酉', '酉': '酉', '丑': '酉', '亥': '卯', '卯': '卯', '未': '卯' };
  const startIdx = ZHI_ORDER.indexOf(group[yearZhi] || '午');
  const map: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    map[ZHI_ORDER[(startIdx + i) % 12]] = JIANGQIAN_STEPS[i];
  }
  return map;
}

// ---------- 甲级辅星安星（禄存/擎羊/陀罗/天马/天魁/天钺/地空/地劫/火星/铃星/红鸾/天喜/天刑/天姚） ----------
// @ziweijs/core 只安十四主星与昌曲辅弼，以下按《紫微斗数全书》通行安星诀补齐。

/** 天马：年支三合局，寅午戌马在申、申子辰马在寅、巳酉丑马在亥、亥卯未马在巳 */
const SANHE_TIANMA: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申', '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳',
};
/** 火星起宫（起子时顺数至生时）：申子辰起寅、寅午戌起丑、巳酉丑起卯、亥卯未起酉 */
const HUOXING_START: Record<string, string> = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '丑', '午': '丑', '戌': '丑',
  '巳': '卯', '酉': '卯', '丑': '卯',
  '亥': '酉', '卯': '酉', '未': '酉',
};
/** 铃星起宫（起子时顺数至生时）：寅午戌起卯，余皆起戌 */
const LINGXING_START: Record<string, string> = { '寅': '卯', '午': '卯', '戌': '卯' };
/** 天魁/天钺（年干）：甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、壬癸兔蛇藏、六辛逢马虎 */
const KUI_YUE: Record<string, [string, string]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
  '辛': ['午', '寅'],
};

/**
 * 甲级辅星：返回 Record<地支, 星曜名[]>
 * 已对文墨天机参考盘逐星核对（2004 甲申年六月巳时：禄存天马天刑在寅、擎羊天魁铃星红鸾等）。
 */
export function getAuxiliaryStars(yearGan: string, yearZhi: string, hourZhi: string, monthNum: number): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const add = (branch: string, star: string) => {
    if (!branch) return;
    (result[branch] ||= []).push(star);
  };
  const idx = (b: string) => ZHI_ORDER.indexOf(b);

  // 禄存（年干）+ 擎羊（禄前一位）+ 陀罗（禄后一位）
  const lucun = LUCUN_BRANCH[yearGan] || '寅';
  add(lucun, '禄存');
  add(ZHI_ORDER[(idx(lucun) + 1) % 12], '擎羊');
  add(ZHI_ORDER[(idx(lucun) + 11) % 12], '陀罗');

  // 天马（年支三合局）
  add(SANHE_TIANMA[yearZhi] || '寅', '天马');

  // 天魁 / 天钺（年干）
  const [kui, yue] = KUI_YUE[yearGan] || ['丑', '未'];
  add(kui, '天魁');
  add(yue, '天钺');

  // 地劫（亥起子时顺数至生时）/ 地空（亥起子时逆数至生时）
  const hourOff = Math.max(idx(hourZhi), 0);
  add(ZHI_ORDER[(11 + hourOff) % 12], '地劫');
  add(ZHI_ORDER[(11 - hourOff + 24) % 12], '地空');

  // 火星 / 铃星（起子时顺数至生时）
  add(ZHI_ORDER[(idx(HUOXING_START[yearZhi] || '寅') + hourOff) % 12], '火星');
  add(ZHI_ORDER[(idx(LINGXING_START[yearZhi] || '戌') + hourOff) % 12], '铃星');

  // 红鸾（卯起子年逆数至生年支）/ 天喜（红鸾对宫）
  const hongluan = ZHI_ORDER[(3 - idx(yearZhi) + 24) % 12];
  add(hongluan, '红鸾');
  add(ZHI_ORDER[(idx(hongluan) + 6) % 12], '天喜');

  // 天刑（酉起正月顺数至生月）/ 天姚（丑起正月顺数至生月）；闰月按本月
  const monthOff = ((Math.abs(monthNum) - 1) % 12 + 12) % 12;
  add(ZHI_ORDER[(9 + monthOff) % 12], '天刑');
  add(ZHI_ORDER[(1 + monthOff) % 12], '天姚');

  return result;
}

// ---------- 命宫 / 身宫 ----------
/**
 * 安命宫/身宫诀（《紫微斗数全书》）：
 * 寅宫起正月顺数至生月得"生月宫"；
 * 从生月宫起子时逆数至生时 = 命宫；顺数至生时 = 身宫。
 * 子时生人命身同宫，午时生人命身对冲；命身两宫关于生月宫对称。
 * 注意：农历月必须与排盘（core）同基准——晚子时（23点）core 会换日，调用方需先 next(1)。
 */
export function getMingShenGongBranch(lunarMonthAbs: number, hourZhi: string): { monthPalaceBranch: string; mingGongBranch: string; shenGongBranch: string } {
  const hourIdx = Math.max(ZHI_ORDER.indexOf(hourZhi), 0);
  const monthPalaceIdx = (2 + lunarMonthAbs - 1) % 12;
  return {
    monthPalaceBranch: ZHI_ORDER[monthPalaceIdx],
    mingGongBranch: ZHI_ORDER[(monthPalaceIdx - hourIdx + 24) % 12],
    shenGongBranch: ZHI_ORDER[(monthPalaceIdx + hourIdx) % 12],
  };
}

// ---------- 命主 / 身主 ----------
const MING_ZHU: Record<string, string> = {
  '子': '贪狼', '丑': '巨门', '寅': '禄存', '卯': '文曲', '辰': '廉贞', '巳': '武曲',
  '午': '破军', '未': '武曲', '申': '廉贞', '酉': '文曲', '戌': '禄存', '亥': '巨门',
};
const SHEN_ZHU: Record<string, string> = {
  '子': '火星', '丑': '天相', '寅': '天梁', '卯': '天同', '辰': '文昌', '巳': '天机',
  '午': '火星', '未': '天相', '申': '天梁', '酉': '天同', '戌': '文昌', '亥': '天机',
};

export function getMingZhu(mingGongBranch: string): string {
  return MING_ZHU[mingGongBranch] || '—';
}
export function getShenZhu(yearZhi: string): string {
  return SHEN_ZHU[yearZhi] || '—';
}

// ---------- 流年 / 小限虚岁 ----------
/** 流年虚岁：流年地支落该宫的虚岁序列（前5个，公差12）。虚岁1岁流年命宫=生年支宫 */
export function getLiuNianAges(birthZhi: string, palaceBranch: string): number[] {
  const b = ZHI_ORDER.indexOf(birthZhi);
  const p = ZHI_ORDER.indexOf(palaceBranch);
  let v = ((p - b + 1) % 12 + 12) % 12;
  if (v === 0) v = 12;
  return [v, v + 12, v + 24, v + 36, v + 48];
}

/** 小限虚岁：寅午戌起辰、申子辰起戌、巳酉丑起未、亥卯未起寅；阳男阴女顺行、阴男阳女逆行 */
export function getXiaoXianAges(birthZhi: string, palaceBranch: string, yearGan: string, gender: 'male' | 'female'): number[] {
  const startMap: Record<string, string> = { '寅': '辰', '午': '辰', '戌': '辰', '申': '戌', '子': '戌', '辰': '戌', '巳': '未', '酉': '未', '丑': '未', '亥': '寅', '卯': '寅', '未': '寅' };
  const startIdx = ZHI_ORDER.indexOf(startMap[birthZhi] || '辰');
  const p = ZHI_ORDER.indexOf(palaceBranch);
  const yangGan = '甲丙戊庚壬'.includes(yearGan);
  const forward = (gender === 'male') === yangGan; // 阳男阴女顺
  const diff = ((p - startIdx) % 12 + 12) % 12;
  const offset = forward ? diff : ((12 - diff) % 12);
  let v = (offset % 12) + 1;
  if (v > 12) v -= 12;
  return [v, v + 12, v + 24, v + 36, v + 48];
}

// ---------- 总装 ----------
export interface EnrichOptions {
  fiveElementName: string;
  yearGan: string;
  yearZhi: string;
  gender: 'male' | 'female';
  /** 生时地支（'子'~'亥'），用于地空地劫/火星铃星安星 */
  hourZhi: string;
  /** 农历月数（闰月传正值按本月算），用于天刑天姚安星 */
  monthNum: number;
}

/**
 * 补全宫位数据：亮度、长生/博士/岁前/将前十二神、甲级辅星、流年小限虚岁、命主身主。
 * 直接在原数组对象上补充字段（含主星/辅星 brightness）。
 */
export function enrichGongData(gongData: any[], opts: EnrichOptions): { mingZhu: string; shenZhu: string } {
  const changsheng = getChangsheng12(opts.fiveElementName);
  const boshi = getBoshi12(opts.yearGan, opts.gender);
  const suiqian = getSuiqian12(opts.yearZhi);
  const jiangqian = getJiangqian12(opts.yearZhi);
  const auxStars = getAuxiliaryStars(opts.yearGan, opts.yearZhi, opts.hourZhi, opts.monthNum);

  for (const g of gongData) {
    const branch = g.branch;
    for (const s of [...(g.majorStars || []), ...(g.minorStarDetails || [])]) {
      s.brightness = getStarBrightness(s.name, branch);
    }
    // 甲级辅星（禄存羊陀马魁钺空劫火铃鸾喜刑姚）追加到辅星列表
    for (const starName of auxStars[branch] || []) {
      (g.minorStars ||= []).push(starName);
      // type 必须为 'minor'：ziweiAnalysis 按 type==='minor' 区分主辅星
      (g.minorStarDetails ||= []).push({ name: starName, type: 'minor', sihua: null, sihuaSelf: null, sihuaSelfKind: null, brightness: getStarBrightness(starName, branch) });
    }
    g.changsheng = changsheng[branch] || '';
    g.boshi = boshi[branch] || '';
    g.suiqian = suiqian[branch] || '';
    g.jiangqian = jiangqian[branch] || '';
    g.liunianAges = getLiuNianAges(opts.yearZhi, branch);
    g.xiaoxianAges = getXiaoXianAges(opts.yearZhi, branch, opts.yearGan, opts.gender);
  }

  const mingGong = gongData.find((g) => g.name === '命宫');
  return {
    mingZhu: mingGong ? getMingZhu(mingGong.branch) : '—',
    shenZhu: getShenZhu(opts.yearZhi),
  };
}
