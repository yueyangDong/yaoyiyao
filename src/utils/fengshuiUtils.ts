// 八宅风水规则
// 坐向对应的卦位和东西四宅分类

export type Direction = '北' | '南' | '东' | '西' | '东北' | '西北' | '东南' | '西南' | '中';

export interface HouseInfo {
  name: string;
  gua: string;
  type: '东四宅' | '西四宅';
  guaNum: number;
}

// 坐向 -> 宅卦
export const HOUSE_DIRECTIONS: Record<string, HouseInfo> = {
  '坐北朝南': { name: '坐北朝南', gua: '坎', type: '东四宅', guaNum: 1 },
  '坐南朝北': { name: '坐南朝北', gua: '离', type: '东四宅', guaNum: 9 },
  '坐东朝西': { name: '坐东朝西', gua: '震', type: '东四宅', guaNum: 3 },
  '坐东南朝西北': { name: '坐东南朝西北', gua: '巽', type: '东四宅', guaNum: 4 },
  '坐西北朝东南': { name: '坐西北朝东南', gua: '乾', type: '西四宅', guaNum: 6 },
  '坐西南朝东北': { name: '坐西南朝东北', gua: '坤', type: '西四宅', guaNum: 2 },
  '坐东北朝西南': { name: '坐东北朝西南', gua: '艮', type: '西四宅', guaNum: 8 },
  '坐西朝东': { name: '坐西朝东', gua: '兑', type: '西四宅', guaNum: 7 },
};

// 八宅九星：生气、天医、延年、绝命、五鬼、六煞、祸害、伏位
export const STAR_NAMES: Record<string, { name: string; ji: '吉' | '凶'; desc: string }> = {
  '生气': { name: '生气', ji: '吉', desc: '第一吉星，主财运、事业、人丁兴旺，宜设大门、卧室' },
  '天医': { name: '天医', ji: '吉', desc: '第二吉星，主健康、贵人、治病，宜设卧室、厨房' },
  '延年': { name: '延年', ji: '吉', desc: '第三吉星，主长寿、婚姻、人际关系，宜设卧室' },
  '伏位': { name: '伏位', ji: '吉', desc: '第四吉星，主平稳、安定，宜设书房、卧室' },
  '绝命': { name: '绝命', ji: '凶', desc: '第一凶星，主破财、疾病、意外，宜设厕所、杂物间' },
  '五鬼': { name: '五鬼', ji: '凶', desc: '第二凶星，主口舌是非、火灾、官司，宜设厕所' },
  '六煞': { name: '六煞', ji: '凶', desc: '第三凶星，主桃花劫、人际关系恶化，宜设厕所、储物' },
  '祸害': { name: '祸害', ji: '凶', desc: '第四凶星，主小人是非、慢性病，宜设厕所' },
};

// 坎宅(1) 九星分布：各方位对应的九星
// 以宅卦为伏位，按大游年歌诀推算各方位的九星
const GUA_STAR_MAP: Record<number, Record<string, string>> = {
  // 坎宅(坐北朝南): 坎为伏位
  1: { '北': '伏位', '南': '延年', '东': '天医', '西': '祸害', '东北': '五鬼', '西北': '六煞', '东南': '生气', '西南': '绝命' },
  // 离宅(坐南朝北): 离为伏位
  9: { '北': '延年', '南': '伏位', '东': '生气', '西': '五鬼', '东北': '祸害', '西北': '绝命', '东南': '天医', '西南': '六煞' },
  // 震宅(坐东朝西): 震为伏位
  3: { '北': '天医', '南': '生气', '东': '伏位', '西': '绝命', '东北': '六煞', '西北': '五鬼', '东南': '延年', '西南': '祸害' },
  // 巽宅(坐东南朝西北): 巽为伏位
  4: { '北': '生气', '南': '天医', '东': '延年', '西': '六煞', '东北': '绝命', '西北': '祸害', '东南': '伏位', '西南': '五鬼' },
  // 乾宅(坐西北朝东南): 乾为伏位
  6: { '北': '六煞', '南': '绝命', '东': '五鬼', '西': '生气', '东北': '天医', '西北': '伏位', '东南': '祸害', '西南': '延年' },
  // 坤宅(坐西南朝东北): 坤为伏位
  2: { '北': '绝命', '南': '六煞', '东': '祸害', '西': '天医', '东北': '生气', '西北': '延年', '东南': '五鬼', '西南': '伏位' },
  // 艮宅(坐东北朝西南): 艮为伏位
  8: { '北': '五鬼', '南': '祸害', '东': '六煞', '西': '延年', '东北': '伏位', '西北': '天医', '东南': '绝命', '西南': '生气' },
  // 兑宅(坐西朝东): 兑为伏位
  7: { '北': '祸害', '南': '五鬼', '东': '绝命', '西': '伏位', '东北': '延年', '西北': '生气', '东南': '六煞', '西南': '天医' },
};

export interface FengshuiResult {
  house: HouseInfo;
  starMap: Record<string, string>;
  analysis: string;
}

export function calcFengshui(
  sitting: string,
  door: Direction,
  bedroom: Direction,
  kitchen: Direction
): FengshuiResult | null {
  const house = HOUSE_DIRECTIONS[sitting];
  if (!house) return null;

  const starMap = GUA_STAR_MAP[house.guaNum];
  if (!starMap) return null;

  const doorStar = starMap[door];
  const bedStar = starMap[bedroom];
  const kitchenStar = starMap[kitchen];

  const goodStars = ['生气', '天医', '延年', '伏位'];
  let score = 0;
  if (goodStars.includes(doorStar)) score++;
  if (goodStars.includes(bedStar)) score++;
  if (goodStars.includes(kitchenStar)) score++;

  let analysis = `此宅为${house.type}（${house.gua}宅）。\n`;
  if (score >= 2) {
    analysis += '整体布局较为理想，主要功能区域多位于吉位，有利于家宅平安、事业顺利。';
  } else if (score === 1) {
    analysis += '布局一般，建议调整部分功能区域至吉位，以提升家运。';
  } else {
    analysis += '当前布局不太理想，多个功能区位于凶位，建议重新规划布局或使用风水化解之法。';
  }

  analysis += `\n大门位于${door}方（${doorStar}），卧室位于${bedroom}方（${bedStar}），厨房位于${kitchen}方（${kitchenStar}）。`;

  return { house, starMap, analysis };
}

// 九宫格方位布局：上南下北，左东右西（传统地图方位）
export const GONGE_POSITIONS: { direction: Direction; label: string; row: number; col: number }[] = [
  { direction: '东南', label: '东南', row: 0, col: 0 },
  { direction: '南', label: '南', row: 0, col: 1 },
  { direction: '西南', label: '西南', row: 0, col: 2 },
  { direction: '东', label: '东', row: 1, col: 0 },
  { direction: '中', label: '中宫', row: 1, col: 1 },
  { direction: '西', label: '西', row: 1, col: 2 },
  { direction: '东北', label: '东北', row: 2, col: 0 },
  { direction: '北', label: '北', row: 2, col: 1 },
  { direction: '西北', label: '西北', row: 2, col: 2 },
];
