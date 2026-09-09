// ========== 紫微四化校准：全书画四化表 + 生年四化重算 + 自化 + 飞宫四化 ==========
// 依据：《紫微斗数全书》四化表（用户指定以全书画为准）。
// 注意：@ziweijs/core 的辛干化科取武曲，与全书画（文曲化科）不一致——此处统一按全书画重算覆盖。
// 四化三层来源：生年四化（先天定数，力最强）> 飞宫四化（宫位对待，后天动象）> 自化（本宫泄出，力最弱、不持久）。

export interface SihuaFlow {
  from: string;   // 起飞宫名（如 '命宫'）
  to: string;     // 落宫宫名
  type: '禄' | '权' | '科' | '忌';
  star: string;   // 化星名
  isSelf: boolean; // 是否自化（落在本宫）
}

export interface GongSihuaSummary {
  gongName: string;
  gongStem: string;
  flyOut: { type: '禄' | '权' | '科' | '忌'; star: string; to: string }[];
  flyIn: { type: '禄' | '权' | '科' | '忌'; star: string; from: string }[];
  selfs: { type: '禄' | '权' | '科' | '忌'; star: string }[];
}

// 全书画四化表：[化禄, 化权, 化科, 化忌]
export const SIHUA_TABLE: Record<string, [string, string, string, string]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'], // 全书画：辛巨日曲昌（core 误取武曲化科，此处校准）
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};

export const SIHUA_TYPES: ('禄' | '权' | '科' | '忌')[] = ['禄', '权', '科', '忌'];

/** 某天干的四化星：['禄星','权星','科星','忌星'] */
export function getSihuaStars(stem: string): [string, string, string, string] {
  return SIHUA_TABLE[stem] || ['', '', '', ''];
}

/**
 * 按全书画表重算全部四化（校准 core 的 YT/ST）：
 * 1. 清空各星 sihua/sihuaSelf
 * 2. 生年四化：年干查表 → 四化星落宫标记 star.sihua
 * 3. 自化：每宫宫干查表 → 化星落本宫 → star.sihuaSelf
 * 4. 飞宫四化：宫干查表 → 化星落他宫 → 记录流向
 * 返回 { flows, summaries }：flows 含自化（isSelf=true）；
 * summaries 每宫的飞出/飞入/自化汇总。
 */
export function recalcSihua(
  gongData: any[],
  yearGan: string
): { flows: SihuaFlow[]; summaries: GongSihuaSummary[] } {
  const flows: SihuaFlow[] = [];

  // 星曜 → 落宫索引（一颗星只落一宫）
  const starGongIdx: Record<string, number> = {};
  gongData.forEach((g, gi) => {
    for (const s of [...(g.majorStars || []), ...(g.minorStarDetails || [])]) {
      starGongIdx[s.name] = gi;
      s.sihua = null;         // 清空 core 的生年四化（待重算）
      s.sihuaSelf = null;     // 清空 core 的自化（待重算）
      s.sihuaSelfKind = null;
    }
  });

  // 1. 生年四化（先天定数）
  const [luS, quanS, keS, jiS] = getSihuaStars(yearGan);
  const birthSihua: [string, '禄' | '权' | '科' | '忌'][] = [
    [luS, '禄'], [quanS, '权'], [keS, '科'], [jiS, '忌'],
  ];
  for (const [starName, type] of birthSihua) {
    if (!starName) continue;
    const gi = starGongIdx[starName];
    if (gi === undefined) continue;
    for (const s of [...(gongData[gi].majorStars || []), ...(gongData[gi].minorStarDetails || [])]) {
      if (s.name === starName) s.sihua = type;
    }
  }

  // 2+3. 飞宫四化与自化（每宫宫干查表）
  const summaries: GongSihuaSummary[] = gongData.map((g) => ({
    gongName: g.name,
    gongStem: g.stem,
    flyOut: [],
    flyIn: [],
    selfs: [],
  }));

  gongData.forEach((g, gi) => {
    const [lu, quan, ke, ji] = getSihuaStars(g.stem);
    const four: [string, '禄' | '权' | '科' | '忌'][] = [
      [lu, '禄'], [quan, '权'], [ke, '科'], [ji, '忌'],
    ];
    for (const [starName, type] of four) {
      if (!starName) continue;
      const ti = starGongIdx[starName];
      if (ti === undefined) continue;
      if (ti === gi) {
        // 自化：本宫天干使本宫星四化——能量自我消散（即"离心自化"，标记CF保持ziweiAnalysis兼容）
        for (const s of [...(g.majorStars || []), ...(g.minorStarDetails || [])]) {
          if (s.name === starName) { s.sihuaSelf = type; s.sihuaSelfKind = 'CF'; }
        }
        summaries[gi].selfs.push({ type, star: starName });
        flows.push({ from: g.name, to: g.name, type, star: starName, isSelf: true });
      } else {
        summaries[gi].flyOut.push({ type, star: starName, to: gongData[ti].name });
        summaries[ti].flyIn.push({ type, star: starName, from: g.name });
        flows.push({ from: g.name, to: gongData[ti].name, type, star: starName, isSelf: false });
      }
    }
  });

  return { flows, summaries };
}

// ---------- 飞宫对待文案 ----------
// 十二宫主语（谁）
export const GONG_ROLE: Record<string, string> = {
  '命宫': '你自己',
  '兄弟': '兄弟朋友',
  '夫妻': '配偶',
  '子女': '子女',
  '财帛': '钱财',
  '疾厄': '身体状况',
  '迁移': '外部环境',
  '交友': '朋友众生',
  '官禄': '事业',
  '田宅': '家庭与不动产',
  '福德': '精神享受',
  '父母': '长辈与文书',
};

// 四化对待感受
const TYPE_FEEL: Record<string, string> = {
  '禄': '给这里送来滋养与机会——事情容易顺、有人帮',
  '权': '强势介入并主导这里——压力大但也能撑起场面',
  '科': '温和照拂、留有体面——有贵人善缘，但助力偏软',
  '忌': '在这里执着、施压、纠缠——让你操心不轻松，这是"债"也是"在乎"',
};

/** 宫名格式化：自带"宫"字（命宫）不重复，其余（兄弟/夫妻…）补"宫"字 */
function fmtGong(name: string): string {
  return name.endsWith('宫') ? name : `${name}宫`;
}

/** 生成某宫被飞入的对待文案（重点忌入、次禄入，权科合并简述） */
export function describeFlyIn(gongName: string, flows: SihuaFlow[]): string {
  const ins = flows.filter((f) => f.to === gongName && !f.isSelf);
  if (ins.length === 0) return '';
  const parts: string[] = [];
  const ji = ins.filter((f) => f.type === '忌');
  const lu = ins.filter((f) => f.type === '禄');
  const others = ins.filter((f) => f.type === '权' || f.type === '科');
  for (const f of ji) {
    parts.push(`${fmtGong(f.from)}（${GONG_ROLE[f.from]}）化忌入本宫（${f.star}）——${GONG_ROLE[f.from]}对这里${TYPE_FEEL[f.type]}。`);
  }
  for (const f of lu) {
    parts.push(`${fmtGong(f.from)}（${GONG_ROLE[f.from]}）化禄入本宫（${f.star}）——${TYPE_FEEL[f.type]}。`);
  }
  for (const f of others.slice(0, 2)) {
    parts.push(`${fmtGong(f.from)}（${GONG_ROLE[f.from]}）化${f.type}入本宫（${f.star}）——${TYPE_FEEL[f.type]}。`);
  }
  return parts.join('');
}

/** 生成某宫飞出的忌的对待文案（本宫对外的执着） */
export function describeFlyOutJi(gongName: string, flows: SihuaFlow[]): string {
  const outs = flows.filter((f) => f.from === gongName && f.type === '忌' && !f.isSelf);
  if (outs.length === 0) return '';
  return outs.map((f) => `本宫化忌入${fmtGong(f.to)}（${f.star}）——你对${GONG_ROLE[f.to]}有执念、放不下，付出与操心多集中在这里。`).join('');
}
