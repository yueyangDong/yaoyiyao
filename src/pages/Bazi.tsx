import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import {
  Card, Form, InputNumber, Button,
  Typography, Space, Tag, message, Radio, Row, Col,
  Progress, Alert, Divider, Cascader, Tooltip, Popover, Select, Checkbox, Tabs,
} from 'antd';
import { Solar } from 'lunar-typescript';
import { useUser, getCityLng, correctSolarTime } from '../context/UserContext';
import { pcaCode } from 'cn-division';
import { analyzeLove, analyzeCareer, analyzeHealth, analyzeFamily, analyzeSocial, analyzeFortuneOverview, analyzeDayMasterStrength, recommendYongShen } from '../utils/baziAnalysis';
import { generateDomainDeepReadings, type DomainDeepReading } from '../utils/baziDomainDeep';
import { buildDayunReadings, findCurrentDayunStep, toNominalAge, type DayunReading } from '../utils/dayunReading';
import PayWall from '../components/PayWall';
import { chartTargetKey } from '../lib/payment';
import { analyzePersonality } from '../utils/baziPersonality';
import CollapsibleCard from '../components/CollapsibleCard';
import DivinationOverlay from '../components/DivinationOverlay';
import PlainConclusionCard from '../components/PlainConclusionCard';
import { generateBaziPlainConclusion } from '../utils/plainConclusion';
import { renderWithTerms } from '../utils/renderWithTerms';
import { isValidSolarDate, isValidLunarDate, getLunarLeapMonth, isSolarFuture, isLunarFuture } from '../utils/dateValidation';
import { analyzeMingGeDetailed, analyzeTouGan, type MingGeDetailed } from '../utils/mingGe';
import { calcShenSha } from '../utils/shenSha';
import type { ShenShaItem } from '../utils/shenSha';
import { calcShenShaPower, type ShaPowerItem } from '../utils/shenShaPower';
import { explainShenShaMap, type ShaExplainItem } from '../utils/shenShaExplain';
import { calcWuxingStats, analyzeWuxingFlow, annotateDayunFlow } from '../utils/wuxingFlow';
import { buildLiuYueList } from '../utils/liuyueReading';
import { buildLiuNianList, calcLiuNianItem, type LiuNianItem } from '../utils/liunianReading';
// 四柱构造的唯一入口（与合盘 / 命盘对比页共用）——页面不得再自行 Solar/Lunar → getEightChar
import { buildRawChart, normalizeWanZi } from '../utils/personChart';

const { Title, Text, Paragraph } = Typography;

// 五行配色 (使用设计系统 CSS 变量)
const WX_COLORS: Record<string, string> = { '木': 'var(--wx-wood)', '火': 'var(--wx-fire)', '土': 'var(--wx-earth)', '金': 'var(--wx-metal)', '水': 'var(--wx-water)' };

// 天干 → 五行（模块级，供干支五行着色）
const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

// 地支 → 五行（本气）
const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
const WX_BG: Record<string, string> = { '木': 'rgba(107,154,122,0.08)', '火': 'rgba(194,59,43,0.08)', '土': 'rgba(184,123,74,0.08)', '金': 'rgba(201,169,110,0.08)', '水': 'rgba(42,51,64,0.08)' };
const WX_ICON: Record<string, string> = { '木': '', '火': '', '土': '', '金': '', '水': '' };

// 十神白话解释
const SHISHEN_PLAIN: Record<string, string> = {
  '比肩': '你的兄弟姐妹、朋友同事、竞争者，与你平起平坐的人',
  '劫财': '你的铁哥们/闺蜜、合伙人，会帮你但也可能分你的钱',
  '食神': '你的才华、口才、创造力，代表你轻松愉快的一面',
  '伤官': '你的聪明才智、叛逆精神，不按常理出牌的一面',
  '正财': '你的正经收入、工资、老婆（对男命），稳稳当当的钱',
  '偏财': '你的外快、投资收入、意外之财、父亲，不稳定的钱',
  '正官': '你的上司、规则制度、丈夫（对女命），管着你的人和事',
  '七杀': '你的压力、竞争对手、挑战、魄力，让你紧张但也能成就你',
  '正印': '你的母亲、长辈、学历文凭、贵人，默默守护你的人',
  '偏印': '你的特殊技能、偏门学问、继母、干妈，不走寻常路的知识',
};

// ========== 十二长生计算 ==========
const DZ_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const CHANG_SHENG_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

const YANG_START: Record<string, string> = {
  '甲': '亥', '丙': '寅', '戊': '寅', '庚': '巳', '壬': '申',
};
const YIN_START: Record<string, string> = {
  '乙': '午', '丁': '酉', '己': '酉', '辛': '子', '癸': '卯',
};

function getChangSheng12(dayGan: string, pillars: PillarData[]): Record<string, string> {
  const isYang = ['甲', '丙', '戊', '庚', '壬'].includes(dayGan);
  const startZhi = isYang ? YANG_START[dayGan] : YIN_START[dayGan];
  if (!startZhi) return {};

  const startIdx = DZ_ORDER.indexOf(startZhi);
  const result: Record<string, string> = {};
  for (const p of pillars) {
    const zhiIdx = DZ_ORDER.indexOf(p.diZhi);
    if (zhiIdx === -1) { result[p.pillar] = ''; continue; }
    let offset = zhiIdx - startIdx;
    if (isYang) {
      if (offset < 0) offset += 12;
    } else {
      offset = -offset;
      if (offset < 0) offset += 12;
    }
    result[p.pillar] = CHANG_SHENG_NAMES[offset % 12];
  }
  return result;
}

// 命格分析：统一使用 utils/mingGe.ts 的 analyzeMingGeDetailed（含判定依据链/要素对应/成败关键）。
// 校准说明：本文件曾另有一份本地简化实现（只判建禄/羊刃/正官等基础格，且不看专旺/化气/从格），
// 与 mingGe.ts 规则漂移、结果不一致——已删除，页面只消费真源。
// 十神组合解读
function getShiShenComboAnalysis(pillars: any[], dayGan: string): string[] {
  const combos: string[] = [];
  const allShiShen = pillars.map((p) => p.shiShen).filter(Boolean);

  if (allShiShen.includes('伤官') && allShiShen.includes('正官')) {
    combos.push('【伤官见官】你骨子里不服管束，讨厌规章制度，工作中容易和领导对着干——因为命局中伤官和正官同时出现。但也正因为这种叛逆，你有打破常规的创造力。建议把"叛逆"用在对的地方——创新而非对抗。');
  }
  if (allShiShen.includes('食神') && allShiShen.includes('七杀')) {
    combos.push('【食神制杀】食神压制七杀是一个很好的组合！七杀代表压力和小人，而食神代表智慧和手段。你有能力用聪明才智化解压力和对手，好比"以智取胜"。这是能成大事的格局。');
  }
  if (allShiShen.includes('正财') && allShiShen.includes('偏印')) {
    combos.push('【财破印】你可能为了赚钱而放弃学业或进修——因为正财克偏印。注意：金钱和知识不是对立的，两者兼得才是长久之计。');
  }
  if (allShiShen.includes('正印') && allShiShen.includes('伤官')) {
    combos.push('【印制伤官】你的聪明才智有了边界和分寸，不会因为太"跳脱"而闯祸，能在规则内发挥创意，这是很好的平衡——因为正印克制伤官。');
  }
  const caiCount = allShiShen.filter((s) => s === '正财' || s === '偏财').length;
  const shaCount = allShiShen.filter((s) => s === '七杀').length;
  if (caiCount >= 2 && shaCount >= 1) {
    combos.push('【财生杀】钱财多了反而带来压力——因为命中财多又带七杀。要注意理财方式，避免为钱所困，也不要因为贪财而得罪人。');
  }
  if (allShiShen.includes('正官') && allShiShen.includes('正印')) {
    combos.push('【官印相生】正官生正印，这是很好的组合！官代表事业地位，印代表贵人助力，说明你在事业上不仅有作为，还有贵人扶持，是比较理想的格局。');
  }
  return combos;
}

// 五行旺衰统计：已迁移至 utils/wuxingFlow.ts 的 calcWuxingStats（口径不变，含藏干全量）。
// 五行流通分析（生克链路/通关/归聚）同文件 analyzeWuxingFlow——页面不再各留一份实现。

// 日主强弱判断：统一使用 baziAnalysis.ts 的五档实现（身极强/身强/中和/身弱/身极弱）。
// 校准说明：此前本文件另有一份本地简化版（基础分2、只加不减，永远输出三档），
// 与 baziAnalysis 版本规则漂移，且导致 mingGe 专旺格/从格在生产中无法触发——已删除。

// 推荐用神：统一使用 baziAnalysis.ts 的 recommendYongShen（合盘 buildPerson 同口径，禁止另写判法）。

// 刑冲合害分析 —— 结构化结果
interface RelationItem {
  type: string;    // '合' | '冲' | '刑' | '害' | '破'
  subtype: string;
  /** 涉及的柱位索引（0年/1月/2日/3时）——供结构化判断，勿再用 desc 字符串匹配 */
  pillars: number[]; // 分类标签
  color: string;
  desc: string;
}

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'];

function analyzeRelations(pillars: any[]): RelationItem[] {
  const results: RelationItem[] = [];
  const tgList = pillars.map((p) => p.tianGan);
  const dzList = pillars.map((p) => p.diZhi);

  const pn = (i: number) => PILLAR_LABELS[i];

  // ==========================================
  //  1. 天干五合（绿色）
  // ==========================================
  const tgHeMap: Record<string, { he: string; hua: string }> = {
    '甲': { he: '己', hua: '土' }, '己': { he: '甲', hua: '土' },
    '乙': { he: '庚', hua: '金' }, '庚': { he: '乙', hua: '金' },
    '丙': { he: '辛', hua: '水' }, '辛': { he: '丙', hua: '水' },
    '丁': { he: '壬', hua: '木' }, '壬': { he: '丁', hua: '木' },
    '戊': { he: '癸', hua: '火' }, '癸': { he: '戊', hua: '火' },
  };
  for (let i = 0; i < tgList.length; i++) {
    for (let j = i + 1; j < tgList.length; j++) {
      if (tgHeMap[tgList[i]]?.he === tgList[j]) {
        const hua = tgHeMap[tgList[i]].hua;
        results.push({
          type: '合', subtype: '天干五合', color: 'var(--wx-wood)', pillars: [i, j],
          desc: `${pn(i)}天干「${tgList[i]}」与${pn(j)}天干「${tgList[j]}」→ ${tgList[i]}${tgList[j]}合化${hua}。${pn(i)}和${pn(j)}之间有"化学反应"，两个层面的人事物会深度关联、相互影响。`,
        });
      }
    }
  }

  // ==========================================
  //  2. 地支六合（绿色）
  // ==========================================
  const dzLiuHe: Record<string, string> = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
  const dzLiuHeHua: Record<string, string> = {
    '子丑': '土', '丑子': '土', '寅亥': '木', '亥寅': '木', '卯戌': '火', '戌卯': '火',
    '辰酉': '金', '酉辰': '金', '巳申': '水', '申巳': '水', '午未': '土', '未午': '土',
  };
  for (let i = 0; i < dzList.length; i++) {
    for (let j = i + 1; j < dzList.length; j++) {
      if (dzLiuHe[dzList[i]] === dzList[j]) {
        const key = dzList[i] + dzList[j];
        const hua = dzLiuHeHua[key] || '';
        results.push({
          type: '合', subtype: '地支六合', color: 'var(--wx-wood)', pillars: [i, j],
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}合化${hua}。两柱关系紧密和谐，互帮互助，事情容易达成共识。`,
        });
      }
    }
  }

  // ==========================================
  //  3. 地支三合局（绿色）—— 半合也算
  // ==========================================
  const sanHeJu = [
    { names: ['申', '子', '辰'], hua: '水', desc: '申子辰三合水局' },
    { names: ['亥', '卯', '未'], hua: '木', desc: '亥卯未三合木局' },
    { names: ['寅', '午', '戌'], hua: '火', desc: '寅午戌三合火局' },
    { names: ['巳', '酉', '丑'], hua: '金', desc: '巳酉丑三合金局' },
  ];
  for (const ju of sanHeJu) {
    // 去重：同一地支重复出现（如两个"子"）不构成半合——半合需两个不同的三合局成员
    const uniqMatched = [...new Set(dzList.filter((dz) => ju.names.includes(dz)))];
    if (uniqMatched.length >= 2) {
      const pillars_ = uniqMatched.map((dz) => pn(dzList.indexOf(dz))).join('、');
      const isFull = uniqMatched.length === 3 && ju.names.every((n) => dzList.includes(n));
      results.push({
        type: '合', subtype: `地支三合${isFull ? '全' : '半'}局`, color: 'var(--wx-wood)', pillars: uniqMatched.map((dz) => dzList.indexOf(dz)),
        desc: `${pillars_}形成${ju.desc}${isFull ? '（全合）' : '（半合）'}。${isFull ? '三合局力量强大，相当于三柱抱团形成合力，该五行能量极强。' : '半合局也有一定力量，但不如全合完整，等待大运流年补齐第三个地支时会完全激活。'}`,
      });
    }
  }

  // ==========================================
  //  4. 地支三会局（绿色）
  // ==========================================
  const sanHuiJu = [
    { names: ['寅', '卯', '辰'], dir: '东方木' },
    { names: ['巳', '午', '未'], dir: '南方火' },
    { names: ['申', '酉', '戌'], dir: '西方金' },
    { names: ['亥', '子', '丑'], dir: '北方水' },
  ];
  for (const ju of sanHuiJu) {
    const matched = ju.names.filter((n) => dzList.includes(n));
    if (matched.length >= 2) {
      const pillars_ = matched.map((dz) => pn(dzList.indexOf(dz))).join('、');
      const isFull = matched.length === 3;
      results.push({
        type: '合', subtype: `地支三会${isFull ? '全' : '半'}局`, color: 'var(--wx-wood)', pillars: matched.map((dz) => dzList.indexOf(dz)),
        desc: `${pillars_}形成${ju.dir}局${isFull ? '（全会）' : '（半会）'}。${isFull ? '三会局是地支最强的合局，相当于三柱抱团形成超级区域性力量，比三合局力量更大。' : '半会已有抱团之势，力量介于半合与全合之间，待大运流年补齐第三支即成全会。'}`,
      });
    }
  }

  // ==========================================
  //  5. 地支六冲（红色）
  // ==========================================
  const liuChong: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
  const chongWx: Record<string, string> = { '子': '水', '午': '火', '丑': '土', '未': '土', '寅': '木', '申': '金', '卯': '木', '酉': '金', '辰': '土', '戌': '土', '巳': '火', '亥': '水' };
  for (let i = 0; i < dzList.length; i++) {
    for (let j = i + 1; j < dzList.length; j++) {
      if (liuChong[dzList[i]] === dzList[j]) {
        const wxA = chongWx[dzList[i]];
        const wxB = chongWx[dzList[j]];
        const isSameWx = wxA === wxB;
        results.push({
          type: '冲', subtype: '地支六冲', color: 'var(--wx-fire)', pillars: [i, j],
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}冲（${wxA}${wxB}${isSameWx ? '比冲' : '相冲'}）。${isSameWx ? '同类相冲为比冲，主内心矛盾和反复。' : '异类相冲代表两个领域之间的冲突和对立。'}冲代表变动和不安，${pn(i)}和${pn(j)}所代表的领域容易动荡、换环境或出现分离。`,
        });
      }
    }
  }

  // ==========================================
  //  6. 地支相刑（橙色）
  // ==========================================
  // 无礼之刑：子卯
  const ziMaoIdx = dzList.map((dz, idx) => (dz === '子' || dz === '卯') ? idx : -1).filter((idx) => idx >= 0);
  if (ziMaoIdx.length >= 2) {
    results.push({
      type: '刑', subtype: '无礼之刑', color: 'var(--color-warn)', pillars: ziMaoIdx,
      desc: `子卯相刑（无礼之刑）：子水+卯木，看似相生实则相刑。容易因言行不当、礼节不周而得罪人，注意口舌是非和人际摩擦。`,
    });
  }
  // 恃势之刑：寅巳申
  const shiShiXing = ['寅', '巳', '申'].filter((n) => dzList.includes(n));
  if (shiShiXing.length >= 2) {
    results.push({
      type: '刑', subtype: '恃势之刑', color: 'var(--color-warn)', pillars: shiShiXing.map((dz) => dzList.indexOf(dz)),
      desc: `${shiShiXing.join('、')} → 恃势之刑。仗势欺人反被欺，容易卷入权力斗争和利益冲突。${shiShiXing.length === 3 ? '三刑俱全，需特别注意。' : '半刑已显端倪，在相关年份补齐会爆发。'}`,
    });
  }
  // 无恩之刑：丑戌未
  const wuEnXing = ['丑', '戌', '未'].filter((n) => dzList.includes(n));
  if (wuEnXing.length >= 2) {
    results.push({
      type: '刑', subtype: '无恩之刑', color: 'var(--color-warn)', pillars: wuEnXing.map((dz) => dzList.indexOf(dz)),
      desc: `${wuEnXing.join('、')} → 无恩之刑。恩将仇报或被恩将仇报，合伙做事要格外小心，容易因利益分配反目成仇。${wuEnXing.length === 3 ? '三刑俱全，合伙需慎之又慎。' : ''}`,
    });
  }
  // 自刑：辰、午、酉、亥（单独出现也算自刑）
  const ziXingList = ['辰', '午', '酉', '亥'];
  const ziXingFound = dzList.filter((dz) => ziXingList.includes(dz));
  const ziXingIdx = dzList.map((dz, idx) => (ziXingList.includes(dz) ? idx : -1)).filter((idx) => idx >= 0);
  if (ziXingFound.length >= 2) {
    const dups = ziXingFound.filter((dz, i) => ziXingFound.indexOf(dz) !== i);
    if (dups.length > 0) {
      results.push({
        type: '刑', subtype: '自刑', color: 'var(--color-warn)', pillars: ziXingIdx,
        desc: `命局中有重复出现的地支（${[...new Set(dups)].join('、')}）→ 自刑。自己跟自己过不去，容易钻牛角尖、自我纠结、过度内耗。事情没你想的那么糟，学着放下。`,
      });
    }
  }

  // ==========================================
  //  7. 地支六害（蓝色）
  // ==========================================
  const liuHai: Record<string, string> = {
    '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅',
    '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉',
  };
  for (let i = 0; i < dzList.length; i++) {
    for (let j = i + 1; j < dzList.length; j++) {
      if (liuHai[dzList[i]] === dzList[j]) {
        results.push({
          type: '害', subtype: '地支六害', color: 'var(--wx-water)', pillars: [i, j],
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}害（穿害）。害比冲更隐蔽，是暗箭伤人、背后使绊子。表面看着没事，暗地里有人拆台。需要多留心眼，不要轻信他人。`,
        });
      }
    }
  }

  // ==========================================
  //  8. 地支六破（紫色）
  // ==========================================
  const liuPo: Record<string, string> = {
    '子': '酉', '酉': '子', '寅': '亥', '亥': '寅', '辰': '丑', '丑': '辰',
    '午': '卯', '卯': '午', '申': '巳', '巳': '申', '戌': '未', '未': '戌',
  };
  for (let i = 0; i < dzList.length; i++) {
    for (let j = i + 1; j < dzList.length; j++) {
      if (liuPo[dzList[i]] === dzList[j]) {
        results.push({
          type: '破', subtype: '地支六破', color: 'var(--wx-metal)', pillars: [i, j],
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}破。"破"就是互相拆台捣乱，两柱之间明合暗破，表面关系还行、背地里互相伤害。合作中要小心面和心不和的局面。`,
        });
      }
    }
  }

  return results;
}

// 大运白话解读已抽到 src/utils/dayunReading.ts：
// 按「人生阶段 × 十神关系」二维取内容重心——每步大运按其年龄区间归属人生阶段，
// 60 岁以后（退休生活期/颐养天年期）不再铺陈事业与求财，转向健康、家庭、生活节奏与心性。

// 流年（单年/十年）计算已抽到 src/utils/liunianReading.ts：
// 页面「流年（十年）」卡片与结论卡共用同一份口径（见该文件头部说明）。

export interface PillarData {
  pillar: string;
  ganZhi: string;
  tianGan: string;
  diZhi: string;
  cangGan: string[];
  shiShen: string;
  shiShenZhi: string;  // 地支十神 = 自坐X
  nayin: string;
  /**
   * 时柱为推定值（用户不知出生时辰，按午时 12:00 排盘）。
   * 注意：pillar 字段的值必须保持 '时柱' 不变——baziAnalysis 的 PILLAR_INDEX、
   * shenShaByPillar 等大量以 pillar 名做等值比较，改值会静默失效。
   */
  unknown?: boolean;
}

// 领域深度解读区块（干支 + 十神 + 神煞分层白话）
function DomainDeepBlock({ d, accent }: { d?: DomainDeepReading; accent?: string }) {
  if (!d) return null;
  return (
    <div style={{
      marginBottom: 12, padding: '10px 12px',
      background: 'rgba(107,154,122,0.05)', borderRadius: 6,
      border: `1px solid ${accent || 'rgba(107,154,122,0.2)'}`,
    }}>
      <Text strong style={{ fontSize: 13.5, color: 'var(--wx-wood)', display: 'block', marginBottom: 8 }}>
        深度解读 · 干支与神煞
      </Text>
      {d.sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: i < d.sections.length - 1 ? 10 : 0 }}>
          <Text strong style={{ fontSize: 12.5, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
            {i + 1}. {sec.heading}
          </Text>
          <Text style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8, display: 'block' }}>
            {sec.text}
          </Text>
        </div>
      ))}
    </div>
  );
}

export default function Bazi() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { profile, currentUser, addHistory } = useUser();
  const [form] = Form.useForm();
  const [baziData, setBaziData] = useState<{
    pillars: PillarData[];
    dayun: {
      startAge: number;
      startDate: string;
      direction: string;
      steps: Array<{
        ganZhi: string;
        startAge: number;
        endAge: number;
        startYear: number;
        endYear: number;
        isPreStart?: boolean;
      }>;
    };
    lunarInfo: string;
    dayGan: string;
    dayWx: string;
    shenSha: ShenShaItem[];
    mingGe: MingGeDetailed;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    /** 时柱是否为推定值（不知时辰，按午时排盘）——用于结果区提示与标注 */
    hourUnknown?: boolean;
    birthGender: string;
    xunKong: string[];
    diShi: string[];
    ziZuo: { text: string; sub: string; judgment: string }[];
  } | null>(null);
  const [inputMode, setInputMode] = useState<'solar' | 'lunar'>('solar');
  const [leapMonth, setLeapMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [liunianYears, setLiunianYears] = useState<LiuNianItem[] | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  // 四柱表进阶字段开关（支神/纳音/空亡/地势/自坐偏专业，默认收起，点击对应 pill 会自动开启）
  const [showAdvancedRows, setShowAdvancedRows] = useState(false);
  // 命格判定细节（依据链/要素表/成败关键）默认折叠，想核验再展开
  const [geDetailOpen, setGeDetailOpen] = useState(false);
  // 神煞一览默认只亮力量前 6 颗，其余收起
  const [showAllSha, setShowAllSha] = useState(false);
  const [liuYueMonths, setLiuYueMonths] = useState<Array<{ monthName: string; ganZhi: string; wx: string; desc: string }> | null>(null);
  const [liuRiYear, setLiuRiYear] = useState<number | null>(null);
  const [liuRiMonth, setLiuRiMonth] = useState<number | null>(null);
  const [liuRiDays, setLiuRiDays] = useState<Array<{ day: number; ganZhi: string; wx: string; desc: string; weekend?: boolean }> | null>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  /**
   * 计算周岁（实岁）：用真实生日判定当前是否已过生日
   * 八字排盘的"起运年龄"是虚岁；为准确判断当前大运，应使用实岁
   */
  const calcCurrentAge = (birthYear: number, birthMonth: number, birthDay: number): number => {
    let age = now.getFullYear() - birthYear;
    const passedBirthday =
      now.getMonth() + 1 > birthMonth ||
      (now.getMonth() + 1 === birthMonth && now.getDate() >= birthDay);
    if (!passedBirthday) age -= 1;
    return age;
  };
  // 实际周岁（精确，基于已选/已推算的生辰）
  const currentExactAge = useMemo(() => {
    if (!baziData) return 0;
    return calcCurrentAge(baziData.birthYear, baziData.birthMonth, baziData.birthDay);
  }, [baziData]);
  const yunRef = useRef<any>(null);

  // 自动填入当前用户档案
  useEffect(() => {
    if (currentUser && !baziData) {
      const cal = currentUser.birthCalendar || 'solar';
      if (cal === 'lunar') {
        setInputMode('lunar');
      }
      form.setFieldsValue({
        gender: currentUser.gender === '男' ? 'male' : 'female',
        year: currentUser.birthYear,
        month: currentUser.birthMonth,
        day: currentUser.birthDay,
        hour: currentUser.birthHour,
        minute: currentUser.birthMinute,
        birthplace: currentUser.birthplace.province
          ? [currentUser.birthplace.province, currentUser.birthplace.city, currentUser.birthplace.district].filter(Boolean)
          : undefined,
      });
    }
  }, [currentUser]);

  const handleCalc = async () => {
    const values = form.getFieldsValue();
    const { year, month, day, hour, minute, gender, birthplace, ziShiSect } = values;
    // 不知时辰：仍按午时推定排盘（不排时柱会让大量分析直接缺失，对用户毫无价值），
    // 但时柱与所有依赖时柱的结论都会标注为"推定"。放行条件与提示分开，避免"勾了却说没填时辰"。
    const hourUnknown = values.hourUnknown === true;
    // 推定基准：午时 12:00（居中、且不涉晚子时换日争议）
    const effHour = hourUnknown ? 12 : hour;
    const effMinute = hourUnknown ? 0 : (minute || 0);

    if (!year || !month || !day || (!hourUnknown && hour === undefined)) {
      message.warning(hourUnknown ? '请填写完整的出生日期' : '请填写完整的出生时间');
      return;
    }
    if (!gender) {
      message.warning('请选择性别（阳年男/阴年女顺排大运，反之逆排）');
      return;
    }

    const dateOk = inputMode === 'lunar'
      ? isValidLunarDate(year, month, day, leapMonth === month)
      : isValidSolarDate(year, month, day);
    if (!dateOk) {
      message.warning(inputMode === 'lunar' ? '农历日期无效，请检查月份与闰月' : '日期无效，请检查');
      return;
    }

    // 排盘时间不能晚于当前时刻（不允许超前时间）
    const isFuture = inputMode === 'lunar'
      ? isLunarFuture(year, month, day, leapMonth === month, effHour, effMinute)
      : isSolarFuture(year, month, day, effHour, effMinute);
    if (isFuture) {
      message.warning('排盘时间不能晚于当前时间，请检查');
      return;
    }

    setLoading(true);
    try {
      // 推演动画（模拟推演过程，营造仪式感）
      await new Promise(r => setTimeout(r, 2500));
      // 真太阳时校正（有出生地即校正：经度差 + 均时差；农历输入由 helper 先转公历再算 EoT）
      // 不知时辰时跳过校正——基准值本身是推定的，再校正只是制造虚假精度（午时远离午夜，不影响日柱）
      let calcHour = effHour;
      let calcMinute = effMinute;
      let lng = 120;
      let tsDayOffset = 0; // 真太阳时校正跨午夜时的日历日偏移（必须同步平移出生日期，否则日柱错一天）
      if (!hourUnknown && birthplace && birthplace.length >= 2) {
        lng = getCityLng(birthplace[0], birthplace[1], birthplace[2]);
        const trueSolar = correctSolarTime({
          year, month, day, hour, minute: minute || 0, lng,
          calendar: inputMode === 'lunar' ? 'lunar' : 'solar',
          isLeap: leapMonth === month,
        });
        calcHour = trueSolar.hour;
        calcMinute = trueSolar.minute;
        tsDayOffset = trueSolar.dayOffset || 0;
      }

      // 四柱构造统一走 personChart.buildRawChart（全站唯一入口，与合盘 / 命盘对比页同一份实现）。
      // 此前这里内联了 Solar/Lunar 两条分支 + eightChar + PillarData 拼装，是「改口径要两处同步」的根源；
      // 现已收回 utils —— 页面只保留大运/起运、命格、空亡、地势、自坐等页面专属派生。
      const { lunar, eightChar, pillars, dayGan, dayWx } = buildRawChart(
        year, month, day, calcHour, calcMinute,
        tsDayOffset,
        inputMode === 'lunar' ? 'lunar' : 'solar',
        leapMonth === month,
        normalizeWanZi(ziShiSect),
      );
      // 不知时辰（按午时推定）是八字页独有概念，故在共用构造之外补时柱标记
      pillars[3].unknown = hourUnknown;

      // getYun参数：1=男 0=女，内部自动根据阳年/阴年判断顺逆排
      const yunParam = gender === 'male' ? 1 : 0;

      const yun = eightChar.getYun(yunParam);
      yunRef.current = yun;
      // 大运：精确计算起运日期/年龄、识别起运前小运
      const dayunRaw = yun.getDaYun(11);
      const startAge = yun.getStartYear(); // 起运年数（周岁口径；大运卡片 startAge 为虚岁 = 本值 + 1）
      const startDate = yun.getStartSolar()?.toYmd?.() || ''; // 起运公历日期 YYYY-MM-DD
      const isForward = yun.isForward();
      const directionText = isForward ? '顺排' : '逆排';

      // 区分"起运前小运"和真正的大运：getDaYun 第一段是起运前的小运，ganZhi 经常为 '—'
      const dayunSteps = Array.isArray(dayunRaw)
        ? dayunRaw.map((d: any, idx: number) => {
            const rawGanZhi = (d.getGanZhi?.() as string) || '';
            const startA = d.getStartAge?.() ?? 0;
            const endA = d.getEndAge?.() ?? 0;
            const startY = d.getStartYear?.() ?? 0;
            const endY = d.getEndYear?.() ?? 0;
            // 标记是否是起运前的小运（idx === 0 且 ganZhi 为空/—）
            const isPreStart = idx === 0 && (!rawGanZhi || rawGanZhi === '—');
            return {
              ganZhi: rawGanZhi || '—',
              startAge: startA,
              endAge: endA,
              startYear: startY,
              endYear: endY,
              isPreStart,
            };
          })
        : [];

      // 神煞（自主计算，不依赖 lunar-typescript 的 getShenSha；元辰/勾绞需性别）
      const shenSha = calcShenSha(pillars, gender === 'female' ? 'female' : 'male');

      const solarDate = lunar.getSolar();
      const lunarInfo = `农历${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}日 ${lunar.getTimeZhi()}时`;

      // dayGan / dayWx 已在 buildRawChart 返回中给出（页面不再自行用天干五行表推导）

      // 命格详细判定（真实强弱 + 五行统计 + 用神忌神透干）
      const strengthLevelGe = analyzeDayMasterStrength(dayGan, pillars[1].diZhi, pillars).level;
      const wxStatsCalc = calcWuxingStats(pillars);
      const yongRec = recommendYongShen(dayWx, strengthLevelGe, wxStatsCalc, dayGan, pillars[1].diZhi);
      // 用神一并传入：格局的"成败关键"与要素对应表都要用到（旧版不传，格局与用神互不知情）
      const mingGe = analyzeMingGeDetailed(pillars, dayGan, strengthLevelGe, wxStatsCalc, yongRec.yongShen);
      mingGe.details = [...mingGe.details, ...analyzeTouGan(pillars, yongRec.yongShen, yongRec.xiShen)];

      // 空亡
      const xunKong = [
        eightChar.getYearXunKong(),
        eightChar.getMonthXunKong(),
        eightChar.getDayXunKong(),
        eightChar.getTimeXunKong(),
      ];

      // 地势
      const diShi = [
        eightChar.getYearDiShi(),
        eightChar.getMonthDiShi(),
        eightChar.getDayDiShi(),
        eightChar.getTimeDiShi(),
      ];

      // 自坐计算
      const tgWxMap: Record<string, string> = {
        '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
        '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
      };
      const dzWxMap: Record<string, string> = {
        '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
        '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
      };
      const ziZuo = pillars.map(p => {
        const tw = tgWxMap[p.tianGan] || '?';
        const dw = dzWxMap[p.diZhi] || '?';
        const text = `${p.tianGan}坐${p.diZhi}`;
        const sub = `(${tw}坐${dw})`;
        let judgment = '';
        if (tw === dw) judgment = '自坐本气根，根基扎实';
        else if (
          (tw === '木' && dw === '火') || (tw === '火' && dw === '土') ||
          (tw === '土' && dw === '金') || (tw === '金' && dw === '水') ||
          (tw === '水' && dw === '木')
        ) judgment = '天干泄气给地支，付出型人格';
        else if (
          (dw === '木' && tw === '火') || (dw === '火' && tw === '土') ||
          (dw === '土' && tw === '金') || (dw === '金' && tw === '水') ||
          (dw === '水' && tw === '木')
        ) judgment = '地支生天干，有暗中助力';
        else if (
          (tw === '木' && dw === '土') || (tw === '火' && dw === '金') ||
          (tw === '土' && dw === '水') || (tw === '金' && dw === '木') ||
          (tw === '水' && dw === '火')
        ) judgment = '天干克制地支，有掌控力但辛苦';
        else judgment = '地支反克天干，表面风光内心压力大';
        return { text, sub, judgment };
      });

      setBaziData({
        pillars,
        dayun: { startAge, startDate, direction: directionText, steps: dayunSteps },
        lunarInfo: `${lunarInfo}（大运${directionText}）`,
        dayGan,
        dayWx,
        shenSha,
        mingGe,
        // 存排盘实际使用的公历日期：农历输入时 month/day 是农历值，真太阳时跨午夜还会平移一天。
        // 直接存表单原值会让 calcCurrentAge 拿农历月日与公历今天比较 → 周岁算错、当前大运高亮错位。
        birthYear: solarDate.getYear(),
        birthMonth: solarDate.getMonth(),
        birthDay: solarDate.getDay(),
        birthHour: calcHour,
        birthMinute: calcMinute,
        hourUnknown,
        birthGender: gender,
        xunKong,
        diShi,
        ziZuo,
      });

      message.success('排盘完成');
      // 十年流年（今年起）+ 未来一年流月（自动展示，叠加当前大运与月令的生克——见 utils/liuyueReading.ts）
      setLiunianYears(buildLiuNianList(currentYear, dayGan, dayWx));
      const ageNow = calcCurrentAge(solarDate.getYear(), solarDate.getMonth(), solarDate.getDay());
      const curDayunStep = dayunSteps.find((s) => !s.isPreStart && ageNow >= s.startAge && ageNow < s.endAge);
      setLiuYueMonths(buildLiuYueList({ dayWx, dayunGanZhi: curDayunStep?.ganZhi }));
      addHistory({
        userId: currentUser?.id || '',
        module: 'bazi',
        // 补全回放所需参数：否则农历输入/闰月/真太阳时出生地都无法还原，历史“重新查询”形同虚设
        queryParams: { year, month, day, hour, minute, gender, inputMode, leapMonth, birthplace: birthplace || null, ziShiSect, hourUnknown },
        resultSummary: `八字排盘：${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`,
      });
    } catch (e: any) {
      message.error('计算失败，请检查输入的日期是否有效：' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // 历史记录“重新查询”：回填参数并自动重排（B5）。state 消费后立即清掉，避免返回/刷新重复触发。
  const [pendingReplay, setPendingReplay] = useState<boolean>(false);
  useEffect(() => {
    const hp = (location.state as any)?.historyParams;
    if (!hp || baziData) return;
    setInputMode(hp.inputMode === 'lunar' ? 'lunar' : 'solar');
    if (typeof hp.leapMonth === 'number') setLeapMonth(hp.leapMonth);
    form.setFieldsValue({
      gender: hp.gender,
      year: hp.year,
      month: hp.month,
      day: hp.day,
      hour: hp.hour,
      minute: hp.minute ?? 0,
      hourUnknown: hp.hourUnknown === true,
      birthplace: hp.birthplace || undefined,
      ziShiSect: hp.ziShiSect ?? 2,
    });
    navigate('.', { replace: true, state: null });
    setPendingReplay(true);
  }, [location.state]);

  useEffect(() => {
    if (!pendingReplay) return;
    setPendingReplay(false);
    handleCalc();
  }, [pendingReplay]);

  // 流月推算：已抽至 utils/liuyueReading.ts（月令 vs 日主五类模板 + 月令 vs 当前大运生克后缀），
  // handleCalc 里直接调用 buildLiuYueList——页面不再保留模板池，方便 node 环境测试。

  // 流日推算
  const handleLiuRi = (year: number, month: number) => {
    setLiuRiYear(year);
    setLiuRiMonth(month);
    if (!baziData) return;

    const dayGan = baziData.dayGan;
    const dayWx = baziData.dayWx;
    const tgWx: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };
    const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    const daysInMonth = new Date(year, month, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      try {
        const s = Solar.fromYmdHms(year, month, d, 12, 0, 0);
        const l = s.getLunar();
        const ec = l.getEightChar();
        const gz = ec.getDay();
        const gan = gz.charAt(0);
        const wx = tgWx[gan] || '';
        let desc = '';
        if (dayWx === wx) desc = '比和';
        else if (wxSheng[dayWx] === wx) desc = '印生';
        else if (wxSheng[wx] === dayWx) desc = '食伤';
        else if (wxKe[dayWx] === wx) desc = '官杀';
        else if (wxKe[wx] === dayWx) desc = '财运';
        // Mark weekends
        const dow = new Date(year, month - 1, d).getDay();
        const mark = dow === 0 || dow === 6 ? '周末' : '';
        // 周末用独立字段标记，不再覆盖 desc（否则周末日的十神/吉凶信息被吞掉）
        result.push({ day: d, ganZhi: gz, wx, desc, weekend: mark === '周末' });
      } catch {
        result.push({ day: d, ganZhi: '--', wx: '', desc: '' });
      }
    }
    setLiuRiDays(result);
  };

  // --- 以下为计算派生数据 ---
  const strengthAnalysis = useMemo(() => {
    if (!baziData) return null;
    return analyzeDayMasterStrength(baziData.dayGan, baziData.pillars[1].diZhi, baziData.pillars);
  }, [baziData]);

  const wxStats = useMemo(() => {
    if (!baziData) return null;
    return calcWuxingStats(baziData.pillars);
  }, [baziData]);

  const yongShenRec = useMemo(() => {
    if (!baziData || !strengthAnalysis) return null;
    return recommendYongShen(baziData.dayWx, strengthAnalysis.level, wxStats || {}, baziData.dayGan, baziData.pillars[1].diZhi);
  }, [baziData, strengthAnalysis, wxStats]);

  const relationAnalysis = useMemo(() => {
    if (!baziData) return [];
    return analyzeRelations(baziData.pillars);
  }, [baziData]);

  // 五行流通（生克链路 + 通关 + 归聚）：与五行旺衰统计同源计数，用神传入做同向提示
  const wuxingFlow = useMemo(() => {
    if (!baziData || !wxStats) return null;
    return analyzeWuxingFlow(baziData.pillars, baziData.dayWx, yongShenRec?.yongShen);
  }, [baziData, wxStats, yongShenRec]);

  // 大运应期：流通断点映射到各步大运（补齐断链/通关得力/壅塞加剧注记 + 汇总）
  const dayunFlow = useMemo(() => {
    if (!wuxingFlow || !baziData) return null;
    return annotateDayunFlow(baziData.dayun.steps, wuxingFlow);
  }, [wuxingFlow, baziData]);

  const shiShenCombos = useMemo(() => {
    if (!baziData) return [];
    return getShiShenComboAnalysis(baziData.pillars, baziData.dayGan);
  }, [baziData]);

  // 起运虚岁（与大运卡片 steps.startAge 同源）；dayun.startAge 是起运年数（周岁口径），两者相差约 1
  const firstDaYunStartAge = useMemo(() => {
    const firstReal = baziData?.dayun.steps.find((s) => !s.isPreStart);
    return firstReal?.startAge ?? baziData?.dayun.startAge ?? 0;
  }, [baziData]);

  // 大运定位所用虚岁：steps 的 startAge/endAge 是虚岁区间，currentExactAge 是周岁，
  // 直接混用会在端点落空（见 utils/dayunReading.toNominalAge 的说明）
  const nominalAge = useMemo(
    () => (baziData ? toNominalAge(currentYear, baziData.birthYear) : 0),
    [baziData, currentYear],
  );

  // 当前所走大运：结论卡 / 大运卡片高亮 / 大运解读列表三处共用，避免各自判定后互相矛盾
  const currentDayunStep = useMemo(
    () => (baziData ? findCurrentDayunStep(baziData.dayun.steps, nominalAge) : null),
    [baziData, nominalAge],
  );

  // 大运白话解读：按「人生阶段 × 十神关系」二维取内容重心（见 utils/dayunReading.ts）
  // 年龄一律用 getDaYun 的虚岁，与大运卡片口径一致；currentExactAge 用于标注「当前大运 / 已走过」
  const dayunReadings = useMemo(() => {
    if (!baziData) return { stageLead: '', currentStage: null, readings: [] as DayunReading[] };
    // 跳过起运前无干支的小运（显示 — 的步骤）
    const steps = baziData.dayun.steps.filter((s) => s.ganZhi && s.ganZhi !== '—');
    return buildDayunReadings(steps, baziData.dayGan, currentExactAge, nominalAge);
  }, [baziData, currentExactAge, nominalAge]);

  // 一句话结论（xiShen 实为忌神，不并入结论文案，避免与专业分析自相矛盾）
  // ⚠️ 入参必须含四柱 / 当前大运 / 今年流年：旧版只传「起运后第一步大运」，
  // 文案却写「下一步大运」→ 给中年人报十几岁走的运（2026-10-07 修）。
  const plainConclusion = useMemo(() => {
    if (!baziData || !strengthAnalysis || !yongShenRec) return null;
    const wxs = Object.entries(wxStats || {}).sort((a, b) => b[1].count - a[1].count);
    const wxStrongest = wxs[0]?.[0] || '';
    const wxWeakest = wxs[wxs.length - 1]?.[0] || '';
    // 用神与喜神可能重叠，但 xiShen（身强时比劫、身弱时财星）实为忌神，不并入结论文案
    const yongShen = yongShenRec.yongShen;
    const xiShen: string[] = [];
    // 当前大运：直接复用组件级的统一定位（结论卡 / 卡片高亮 / 大运解读同源）
    return generateBaziPlainConclusion({
      pillars: baziData.pillars.map((p) => p.ganZhi),
      dayGan: baziData.dayGan,
      dayWx: baziData.dayWx,
      dayZhi: baziData.pillars[2].diZhi,
      dayShiShenZhi: baziData.pillars[2].shiShenZhi,
      hourUnknown: baziData.hourUnknown,
      level: strengthAnalysis.level,
      yongShen,
      xiShen,
      wxStrongest,
      wxWeakest,
      currentDaYun: currentDayunStep
        ? { ganZhi: currentDayunStep.ganZhi, startAge: currentDayunStep.startAge, endAge: currentDayunStep.endAge }
        : null,
      liuNian: calcLiuNianItem(currentYear, baziData.dayGan, baziData.dayWx),
    });
  }, [baziData, strengthAnalysis, yongShenRec, wxStats, currentDayunStep, currentYear]);


  // 按柱分组的神煞
  const shenShaByPillar = useMemo(() => {
    const empty: Record<string, ShenShaItem[]> = { '年柱': [], '月柱': [], '日柱': [], '时柱': [] };
    if (!baziData) return empty;
    const map: Record<string, ShenShaItem[]> = { '年柱': [], '月柱': [], '日柱': [], '时柱': [] };
    for (const ss of baziData.shenSha) {
      map[ss.pillar]?.push(ss);
    }
    return map;
  }, [baziData]);

  // 神煞力量（按 name|pillar 索引）：列表里给每个神煞标「强/中/弱」。
  // 旧版只显示"命中/未命中"，看不出这颗煞到底发不发力——见 utils/shenShaPower.ts。
  const shenShaPowerMap = useMemo(() => {
    if (!baziData) return {} as Record<string, ShaPowerItem>;
    const items = calcShenShaPower({
      pillars: baziData.pillars,
      shenSha: baziData.shenSha,
      strengthLevel: strengthAnalysis?.level,
      yongShen: yongShenRec?.yongShen,
    });
    const map: Record<string, ShaPowerItem> = {};
    for (const it of items) map[`${it.name}|${it.pillar}`] = it;
    return map;
  }, [baziData, strengthAnalysis, yongShenRec]);

  // 神煞「本局解释」（按 name|pillar 索引）：把力量因子翻成盘面绑定的人话——
  // 同样是天乙贵人，落月柱还是时柱、得地还是落空、在不在用神上，说法完全不同。
  // 见 utils/shenShaExplain.ts（旧版按名字取静态释义，同名同柱输出一字不差）。
  const shenShaExplainMap = useMemo(() => {
    if (!baziData) return {} as Record<string, ShaExplainItem>;
    return explainShenShaMap({
      pillars: baziData.pillars,
      shenSha: baziData.shenSha,
      strengthLevel: strengthAnalysis?.level,
      yongShen: yongShenRec?.yongShen,
    });
  }, [baziData, strengthAnalysis, yongShenRec]);

  // 十二长生
  const changShengMap = useMemo(() => {
    if (!baziData) return {} as Record<string, string>;
    return getChangSheng12(baziData.dayGan, baziData.pillars);
  }, [baziData]);


  // 六大领域分析
  const loveAnalysis = useMemo(() => {
    if (!baziData) return null;
    return analyzeLove(baziData.pillars, baziData.shenSha, baziData.birthGender, baziData.dayGan, baziData.pillars[2].diZhi, relationAnalysis);
  }, [baziData, relationAnalysis]);

  const careerAnalysis = useMemo(() => {
    if (!baziData || !strengthAnalysis || !yongShenRec) return null;
    return analyzeCareer(baziData.pillars, baziData.shenSha, strengthAnalysis.level, yongShenRec.yongShen, baziData.dayGan);
  }, [baziData, strengthAnalysis, yongShenRec]);

  const healthAnalysis = useMemo(() => {
    if (!baziData || !strengthAnalysis || !wxStats) return null;
    return analyzeHealth(baziData.pillars, wxStats as Record<string, { count: number; level: string }>, baziData.dayGan, strengthAnalysis.level, relationAnalysis);
  }, [baziData, strengthAnalysis, wxStats, relationAnalysis]);

  const familyAnalysis = useMemo(() => {
    if (!baziData) return null;
    return analyzeFamily(baziData.pillars, relationAnalysis, baziData.dayGan);
  }, [baziData, relationAnalysis]);

  const socialAnalysis = useMemo(() => {
    if (!baziData) return null;
    return analyzeSocial(baziData.pillars, baziData.shenSha, baziData.dayGan);
  }, [baziData]);

  const personality = useMemo(() => {
    if (!baziData || !strengthAnalysis) return null;
    return analyzePersonality(baziData.dayGan, baziData.pillars[1].diZhi, strengthAnalysis.level);
  }, [baziData, strengthAnalysis]);

  const fortuneOverview = useMemo(() => {
    if (!baziData || !strengthAnalysis || !yongShenRec || !wxStats) return null;
    return analyzeFortuneOverview(baziData.pillars, baziData.dayGan, strengthAnalysis.level, yongShenRec.yongShen, baziData.shenSha, baziData.dayun, baziData.birthYear, wxStats as Record<string, { count: number; level: string }>);
  }, [baziData, strengthAnalysis, yongShenRec, wxStats]);

  // 六大领域深度解读（干支 + 十神 + 神煞 + 各领域分析合并为单一解读）
  const domainDeep = useMemo(() => {
    if (!baziData || !yongShenRec) return [];
    return generateDomainDeepReadings({
      pillars: baziData.pillars,
      shenSha: baziData.shenSha,
      gender: baziData.birthGender,
      dayGan: baziData.dayGan,
      strengthLevel: strengthAnalysis?.level,
      yongShen: yongShenRec.yongShen,
      relations: relationAnalysis,
      // 五行短板与页面其它板块同源，避免同一命盘两处结论打架
      wxStats: wxStats || undefined,
      // 合并六大领域分析结果——页面只保留深度解读一套，不再重复第二遍
      analyses: {
        love: loveAnalysis || undefined,
        career: careerAnalysis || undefined,
        health: healthAnalysis || undefined,
        family: familyAnalysis || undefined,
        social: socialAnalysis || undefined,
        personality: personality || undefined,
      },
    });
  }, [baziData, yongShenRec, strengthAnalysis, relationAnalysis, wxStats,
      loveAnalysis, careerAnalysis, healthAnalysis, familyAnalysis, socialAnalysis, personality]);
  const domainDeepMap = useMemo(() => {
    const m: Record<string, DomainDeepReading> = {};
    for (const d of domainDeep) m[d.domainKey] = d;
    return m;
  }, [domainDeep]);

  return (
    <div style={{ padding: '16px 0' }}>
      <DivinationOverlay show={loading} text="八字推演 · 天人合一" />
      <Title level={3} style={{ textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>八字排盘</Title>

      {/* 档案提示 */}
      {currentUser ? (
        <Alert
          message={
            <span>
              当前使用档案：<strong>{currentUser.name}</strong>
              （{currentUser.gender}·{currentUser.birthCalendar === 'solar' ? '公历' : '农历'}·{currentUser.birthYear}.{currentUser.birthMonth}.{currentUser.birthDay}）
            </span>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="link" onClick={() => navigate('/profile')}>
              切换档案
            </Button>
          }
        />
      ) : (
        <Alert
          message="创建个人档案后，可一键自动填入，无需每次手动输入。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/profile')}>
              立即创建
            </Button>
          }
        />
      )}

      <Card id="bazi-form-card" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            gender: profile.gender,
            birthYear: profile.birthYear,
            birthMonth: profile.birthMonth,
            birthDay: profile.birthDay,
            birthHour: profile.birthHour,
            birthMinute: profile.birthMinute,
          }}
        >
          <Form.Item label="输入方式">
            <Radio.Group value={inputMode} onChange={(e) => { setInputMode(e.target.value); setLeapMonth(null); }}>
              <Radio.Button value="solar">公历输入</Radio.Button>
              <Radio.Button value="lunar">农历输入</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {inputMode === 'lunar' && (
            <Form.Item label="闰月" style={{ marginBottom: 12 }}>
              <Select
                allowClear
                placeholder="如有闰月请选择"
                style={{ width: 160 }}
                value={leapMonth ?? undefined}
                onChange={(v) => setLeapMonth(v ?? null)}
                options={getLunarLeapMonth(form.getFieldValue('year'))
                  ? [{ value: getLunarLeapMonth(form.getFieldValue('year')), label: `闰${getLunarLeapMonth(form.getFieldValue('year'))}月` }]
                  : []}
              />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Form.Item name="gender" label="性别（决定大运顺逆）" rules={[{ required: true, message: '性别影响大运排法' }]}>
                <Radio.Group>
                  <Radio.Button value="male">男</Radio.Button>
                  <Radio.Button value="female">女</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="year" label="年" rules={[{ required: true }]}>
                <InputNumber min={1900} max={currentYear} placeholder="1990" style={{ width: '100%' }} onChange={() => setLeapMonth(null)} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item name="month" label="月" rules={[{ required: true }]}>
                <InputNumber min={1} max={12} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item
                name="day"
                label="日"
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const y = getFieldValue('year');
                      const m = getFieldValue('month');
                      const ok = inputMode === 'lunar'
                        ? isValidLunarDate(y, m, value, leapMonth === m)
                        : isValidSolarDate(y, m, value);
                      return ok ? Promise.resolve() : Promise.reject(new Error(inputMode === 'lunar' ? '农历日期无效（注意闰月）' : '该月没有这一天'));
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={31} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.hourUnknown !== cur.hourUnknown}>
              {({ getFieldValue }) => {
                const hu = !!getFieldValue('hourUnknown');
                return (
                  <>
                    <Col xs={6} sm={3}>
                      <Form.Item name="hour" label="时" rules={hu ? [] : [{ required: true }]}>
                        <InputNumber min={0} max={23} placeholder={hu ? '推定' : '0'} disabled={hu} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={6} sm={3}>
                      <Form.Item name="minute" label="分">
                        <InputNumber min={0} max={59} placeholder="0" disabled={hu} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                );
              }}
            </Form.Item>
          </Row>

          <Form.Item name="hourUnknown" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox>
              不知道出生时辰
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                （按午时 12:00 推定排盘；年/月/日三柱、日主与格局依然准确，时柱及与时辰相关的结论会标注为"推定"）
              </Text>
            </Checkbox>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="birthplace" label="出生地（真太阳时校正）">
                <Cascader options={pcaCode} fieldNames={{ label: 'n', value: 'c', children: 'ch' }} placeholder="请选择省市区（可选）" changeOnSelect style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="ziShiSect" label="晚子时流派（23:00–24:00 出生才相关）" initialValue={2}>
                <Radio.Group>
                  <Radio value={2}>日柱算当天</Radio>
                  <Radio value={1}>日柱算次日</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            默认东经120°（北京时间）。选择出生地后将自动做真太阳时校正（每差1°校正4分钟）。
            晚子时（23:00–24:00）两派对日柱归属不同：「算当天」为通行流派，「算次日」为早子夜子分日派；两派时柱结论一致，仅日柱可能差一天。
          </Text>

          <Button type="primary" onClick={handleCalc} size="large">排盘</Button>
        </Form>
      </Card>

      {baziData && (
        <>
          {/* 一句话结论卡 */}
          {plainConclusion && (
            <PlainConclusionCard icon="🔮" title="一句话看懂你的八字">
              {renderWithTerms(plainConclusion)}
            </PlainConclusionCard>
          )}

            <Button
              type="text"
              size="small"
              icon={<span style={{ marginRight: 4 }}>✏️</span>}
              onClick={() => {
                document.getElementById('bazi-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{ marginBottom: 8 }}
            >
              修改信息
            </Button>

          {/* 日主信息行（含农历基本盘） */}
          <Card
            style={{
              marginBottom: 16,
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-light)',
            }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>{baziData.lunarInfo}</Text>
            <Row align="middle" gutter={[16, 8]}>
              <Col xs={24} md={8}>
                <Space size="middle">
                  <Text strong style={{ fontSize: 18 }}>
                    日主：<span style={{ color: WX_COLORS[baziData.dayWx], fontSize: 22 }}>{baziData.dayGan}（{baziData.dayWx}）{WX_ICON[baziData.dayWx]}</span>
                  </Text>
                  {strengthAnalysis && (
                    <Tag style={{
                      fontSize: 14,
                      background: strengthAnalysis.level === '身强' ? 'rgba(194,59,43,0.08)' : strengthAnalysis.level === '身弱' ? 'rgba(42,51,64,0.08)' : 'rgba(107,154,122,0.08)',
                      color: strengthAnalysis.level === '身强' ? 'var(--wx-fire)' : strengthAnalysis.level === '身弱' ? 'var(--wx-water)' : 'var(--wx-wood)',
                      border: 'none',
                    }}>
                      {strengthAnalysis.level}
                    </Tag>
                  )}
                </Space>
              </Col>
              {yongShenRec && (
                <Col xs={24} md={16}>
                  <Space size="small" wrap>
                    <Text strong>喜用：</Text>
                    {yongShenRec.yongShen.map((wx: string) => (
                      <Tag key={wx} color={WX_COLORS[wx]}>{WX_ICON[wx]} {wx}</Tag>
                    ))}
                    <Divider type="vertical" />
                    <Text type="secondary">
                      忌神：{(() => {
                        const all = ['木', '火', '土', '金', '水'];
                        const ji = all.filter(w => !yongShenRec.yongShen.includes(w) && w !== baziData.dayWx);
                        return ji.join('、');
                      })()}
                    </Text>
                  </Space>
                </Col>
              )}
            </Row>
          </Card>

          {/* 竖列四柱布局 + 功能栏 */}
          <Card title="四柱八字" style={{ marginBottom: 16 }}>
            {/* 不知时辰的推定提示：明确告知哪些结论可信、哪些仅供参考，而非含糊带过 */}
            {baziData.hourUnknown && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="时柱为推定值（未提供出生时辰，已按午时 12:00 排盘）"
                description={
                  <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                    <div><Text strong>结论可靠：</Text>年柱、月柱、日柱、日主强弱、格局判定、五行旺衰主体、大运顺逆与走向——主要由年月日决定。</div>
                    <div><Text strong>仅供参考：</Text>时柱的干支与十神、空亡，以及落位在时柱的神煞；与"晚年运、子女缘、归处"相关的推论。</div>
                    <div style={{ marginTop: 4 }}>另有一种概率极低的情形：若你恰好生于节气交接当天，月柱也可能因时辰不同而变化。</div>
                    <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>想要完整结论，可向家人确认大致时辰（哪怕只记得"上午/下午/傍晚"）后重新排盘。</div>
                  </div>
                }
              />
            )}
            {/* 功能栏 - 手机端横向滚动 pill */}
            <div className={isMobile ? 'scroll-x' : ''}
              style={{
                display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: isMobile ? 6 : 4,
                marginBottom: 12, paddingBottom: 8,
                borderBottom: '1px solid var(--border-light)',
                overflowX: 'auto',
              }}>
              {(() => {
                const ADV_KEYS = ['zhishen', 'nayin', 'kongwang', 'dishi', 'zizuo'];
                const ROWS = [
                  { key: 'shishen', label: '十神' },
                  { key: 'tiangan', label: '天干' },
                  { key: 'dizhi', label: '地支' },
                  { key: 'canggan', label: '藏干' },
                  { key: 'shensha', label: '神煞' },
                  { key: 'zhishen', label: '支神' },
                  { key: 'nayin', label: '纳音' },
                  { key: 'kongwang', label: '空亡' },
                  { key: 'dishi', label: '地势' },
                  { key: 'zizuo', label: '自坐' },
                ];
                const onPill = (key: string) => {
                  // 点进阶字段的说明 pill：顺手把进阶行打开，避免「说明亮了、行却不在表里」的错位
                  if (ADV_KEYS.includes(key)) setShowAdvancedRows(true);
                  setActiveRow((v) => (v === key ? null : key));
                };
                return ROWS.map(row => {
                  const isActive = activeRow === row.key;
                  return isMobile ? (
                    <button
                      key={row.key}
                      className={`pill-btn${isActive ? ' active' : ''}`}
                      onClick={() => onPill(row.key)}
                    >
                      {row.label}
                    </button>
                  ) : (
                    <Button
                      key={row.key}
                      size="small"
                      type={isActive ? 'primary' : 'default'}
                      style={{ fontSize: 12, padding: '2px 10px' }}
                      onClick={() => onPill(row.key)}
                    >
                      {row.label}
                    </Button>
                  );
                });
              })()}
            </div>

            {/* 进阶视图开关：支神/纳音/空亡/地势/自坐偏专业，默认收起（首屏信息密度降四成） */}
            <div style={{ marginBottom: 8 }}>
              <Checkbox
                checked={showAdvancedRows}
                onChange={(e) => setShowAdvancedRows(e.target.checked)}
                style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}
              >
                进阶视图（支神 · 纳音 · 空亡 · 地势 · 自坐）
              </Checkbox>
            </div>

            {/* 说明面板 */}
            {activeRow && (
              <Alert
                type="info"
                showIcon
                closable
                onClose={() => setActiveRow(null)}
                message={(() => {
                  const ROWS: Record<string, string> = {
                    shishen: '十神是根据日主（出生日的天干）推算出的十种关系模式。日主是核心，比肩/劫财=同辈，食神/伤官=才华，正财/偏财=财富，正官/七杀=权威/压力，正印/偏印=长辈/贵人。',
                    tiangan: '天干是八字的上半部分，代表外在显露的特质。甲乙(木)、丙丁(火)、戊己(土)、庚辛(金)、壬癸(水)，各有阴阳属性。',
                    dizhi: '地支是八字的下半部分，代表内在隐藏的特质。十二地支对应不同月份和五行：寅卯(春木)、巳午(夏火)、申酉(秋金)、亥子(冬水)、辰戌丑未(四季土)。',
                    canggan: '藏干是地支里藏着的天干，代表隐藏的性格、潜在的能力或不为人知的一面。每个地支藏1-3个天干，是命理中"暗藏玄机"的部分。',
                    zhishen: '支神是地支对应的十神，从地支层面看人际关系。同一个地支藏干在不同柱位代表不同十神，反映隐藏的社会关系和潜在影响力。',
                    nayin: '纳音是六十甲子配五音十二律，每个干支组合都有独特的声音和五行属性。纳音代表命格的"底色"和人生韵调，比五行更细腻地描述一个人的气质。如"杨柳木"=温柔有韧性，"覆灯火"=明亮但需小心呵护。',
                    kongwang: '空亡代表这个柱对应的人和事容易落空、不实在，像水中月镜中花。年柱空亡=祖上缘薄；月柱空亡=与父母或事业有隔阂；日柱空亡=婚姻易有遗憾；时柱空亡=子女缘薄或晚年孤独。但空亡也不全是坏事——空了坏事反而是好事。',
                    dishi: '十二长生是天干落在地支时的"生命力阶段"。帝旺=力量巅峰⬆️ | 临官=稳步上升↗️ | 长生=潜力初生🌱 | 胎=酝酿中⏳ | 死=力量最低⬇️ | 墓=被压制📦。日主在帝旺/临官=身强体质好，在死/绝=需要印比来帮。',
                    zizuo: '自坐是天干坐在什么地支上，决定这个天干有没有"根"。同五行=根基扎实✅ | 天干生地支=泄气付出 | 地支生天干=暗中助力 | 天干克地支=掌控力强 | 地支克天干=压力大。壬坐午(水坐火)=水火相战根基不稳；丙坐子(火坐水)=压力大但能成事。',
                    shensha: '神煞是命理学中的特殊标记，来自天干地支的特定组合。天乙贵人⭐=最尊贵的吉神|桃花💮=异性缘和魅力|驿马🐴=奔波流动|羊刃⚔️=双刃剑|将星👑=领导力|华盖☂️=孤独但才华横溢。吉神带来好运和机遇，凶煞提示需注意之处。',
                  };
                  return ROWS[activeRow] || '';
                })()}
                style={{ marginBottom: 12 }}
              />
            )}

            {/* 四柱竖表（桌面+手机通用，手机端紧凑样式见 index.css @media） */}
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <table className="bazi-table" style={{
                width: '100%', minWidth: 480, borderCollapse: 'collapse',
                border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden',
                fontSize: 13,
              }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--border-light)', textAlign: 'center', minWidth: 60, fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: 12 }}>
                      项目
                    </th>
                    {baziData.pillars.map((p, idx) => (
                      <th key={`hdr-${idx}`} style={{
                        padding: '10px 6px', textAlign: 'center', fontWeight: 600, fontSize: 15,
                        background: idx === 2 ? 'rgba(196,164,90,0.04)' : 'rgba(0,0,0,0.02)',
                        borderBottom: '2px solid var(--border-light)',
                        color: 'var(--text-primary)',
                        minWidth: 90,
                      }}>
                        {p.pillar}{idx === 2 ? ' ★日主' : ''}{p.unknown ? '（推定）' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const dayIdx = 2;
                    const hlBg = (idx: number) => idx === dayIdx ? 'rgba(196,164,90,0.04)' : '#fff';
                    const hlBorder = (idx: number) => idx < 3 ? '1px solid var(--border-light)' : 'none';

                    // ---- 行1: 十神 ----
                    const row1 = (
                      <tr key="shishen" style={{ background: activeRow === 'shishen' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'shishen' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>十神</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'shishen' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="purple" style={{ fontSize: 13, margin: 0 }}>
                              {idx === dayIdx ? '日主★' : (p.shiShen || '-')}
                            </Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行2: 天干 ----
                    const row2 = (
                      <tr key="tiangan" style={{ background: activeRow === 'tiangan' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'tiangan' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>天干</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'tiangan' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Text strong className="cell-ganzhi" style={{ fontSize: 20, color: WX_COLORS[TG_WX[p.tianGan] || ''] || 'var(--text-primary)' }}>{p.tianGan}</Text>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行3: 地支 ----
                    const row3 = (
                      <tr key="dizhi" style={{ background: activeRow === 'dizhi' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'dizhi' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>地支</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'dizhi' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Text strong className="cell-ganzhi" style={{ fontSize: 20, color: WX_COLORS[DZ_WX[p.diZhi] || ''] || 'var(--text-primary)' }}>{p.diZhi}</Text>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行4: 藏干 ----
                    const row4 = (
                      <tr key="canggan" style={{ background: activeRow === 'canggan' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'canggan' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>藏干</td>
                        {baziData.pillars.map((p, idx) => {
                          const ssArr = (p.shiShenZhi || '').split('/').filter(Boolean);
                          return (
                            <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'canggan' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx), verticalAlign: 'top' }}>
                              {p.cangGan && p.cangGan.length > 0 ? (
                                p.cangGan.map((cg, ci) => (
                                  <div key={ci} style={{ margin: '2px 0', fontSize: 13 }}>
                                    <Text style={{ color: WX_COLORS[TG_WX[cg] || ''] || 'var(--text-body)', fontWeight: 600 }}>{cg}</Text>
                                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>({ssArr[ci] || '?'})</Text>
                                  </div>
                                ))
                              ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                            </td>
                          );
                        })}
                      </tr>
                    );

                    // ---- 行5: 支神 ----
                    const row5 = (
                      <tr key="zhishen" style={{ background: activeRow === 'zhishen' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'zhishen' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>支神</td>
                        {baziData.pillars.map((p, idx) => {
                          const ssArr = (p.shiShenZhi || '').split('/').filter(Boolean);
                          return (
                            <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'zhishen' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                              {ssArr.length > 0 ? ssArr.map((s, si) => (
                                <div key={si} style={{ margin: '2px 0' }}>
                                  <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>{s}</Tag>
                                </div>
                              )) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                            </td>
                          );
                        })}
                      </tr>
                    );

                    // ---- 行6: 纳音 ----
                    const row6 = (
                      <tr key="nayin" style={{ background: activeRow === 'nayin' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'nayin' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>纳音</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'nayin' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="gold" style={{ fontSize: 12, margin: 0 }}>{p.nayin}</Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行7: 空亡 ----
                    const row7 = (
                      <tr key="kongwang" style={{ background: activeRow === 'kongwang' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'kongwang' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>空亡</td>
                        {baziData.xunKong.map((xk, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'kongwang' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="default" style={{ fontSize: 12, margin: 0 }}>{xk || '—'}</Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行8: 地势 ----
                    const csColor: Record<string, string> = {
                      '长生': 'var(--wx-wood)', '沐浴': 'var(--wx-water)', '冠带': 'var(--wx-metal)', '临官': 'var(--color-warn)', '帝旺': 'var(--wx-fire)',
                      '衰': 'var(--text-secondary)', '病': 'var(--text-secondary)', '死': 'var(--text-secondary)', '墓': 'var(--text-secondary)', '绝': 'var(--text-secondary)', '胎': 'var(--wx-wood)', '养': 'var(--wx-wood)',
                    };
                    const row8 = (
                      <tr key="dishi" style={{ background: activeRow === 'dishi' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'dishi' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>地势</td>
                        {baziData.diShi.map((ds, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'dishi' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            {ds ? (
                              <Tag color={csColor[ds] || 'default'} style={{ fontSize: 12, margin: 0 }}>{ds}</Tag>
                            ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行9: 自坐 ----
                    const row9 = (
                      <tr key="zizuo" style={{ background: activeRow === 'zizuo' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'zizuo' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>自坐</td>
                        {baziData.ziZuo.map((zz, idx) => (
                          <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'zizuo' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)' }}>{zz.text}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zz.sub}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>{zz.judgment}</div>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行10: 神煞 ----
                    const emoji: Record<string, string> = {};
                    const row10 = (
                      <tr key="shensha" style={{ background: activeRow === 'shensha' ? 'rgba(196,164,90,0.04)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'shensha' ? 'rgba(196,164,90,0.08)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: 12, color: 'var(--text-secondary)' }}>神煞</td>
                        {baziData.pillars.map((p, idx) => {
                          const pillarSS = shenShaByPillar[p.pillar] || [];
                          return (
                            <td key={idx} style={{ padding: '4px 2px', background: activeRow === 'shensha' ? 'rgba(196,164,90,0.04)' : hlBg(idx), borderBottom: hlBorder(idx), verticalAlign: 'top' }}>
                              {pillarSS.length === 0 ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                              ) : (
                                pillarSS.map((ss: ShenShaItem, si: number) => {
                                  const pw = shenShaPowerMap[`${ss.name}|${ss.pillar}`];
                                  const ex = shenShaExplainMap[`${ss.name}|${ss.pillar}`];
                                  return (
                                  <div key={si} style={{ margin: '1px 0' }}>
                                    <Popover
                                      trigger="click"
                                      content={
                                        <div style={{ maxWidth: 340 }}>
                                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                                            {ss.name} · {ss.pillar}
                                            {ex && <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>（力量{ex.level}）</span>}
                                          </div>
                                          {ex && (
                                            <div style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.75, color: 'var(--text-body)' }}>
                                              <strong style={{ color: 'var(--text-secondary)' }}>本局解释：</strong>{ex.text}
                                            </div>
                                          )}
                                          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                                            <strong>通用释义：</strong>{ss.desc || '暂无详细解释'}
                                          </div>
                                          {pw && (
                                            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)', opacity: 0.85 }}>
                                              因子：宫位×{pw.factors.palace.toFixed(2)} · 得地{pw.factors.changSheng || '—'}×{pw.factors.deDi.toFixed(2)}
                                              {pw.factors.relationType ? ` · 被${pw.factors.relationType}×${pw.factors.relation.toFixed(2)}` : ''}
                                              {pw.factors.kong < 1 ? ` · 空亡×${pw.factors.kong.toFixed(2)}` : ''}
                                              {' · 喜忌×'}{pw.factors.xiJi.toFixed(2)} ＝ {pw.power.toFixed(2)}
                                            </div>
                                          )}
                                        </div>
                                      }
                                    >
                                      <Tag
                                        style={{
                                          fontSize: 10, margin: 0, cursor: 'pointer',
                                          background: ss.type === '吉' ? 'rgba(107,154,122,0.08)' : ss.type === '凶' ? 'rgba(194,59,43,0.08)' : 'rgba(42,51,64,0.08)',
                                          color: ss.type === '吉' ? 'var(--wx-wood)' : ss.type === '凶' ? 'var(--wx-fire)' : 'var(--wx-water)',
                                          border: 'none',
                                        }}
                                      >
                                        {ss.name}{pw?.level === '强' ? '·强' : ''}
                                      </Tag>
                                    </Popover>
                                  </div>
                                  );
                                })
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );

                    // 分级渲染：默认只留 干支/十神/藏干/神煞；支神/纳音/空亡/地势/自坐 属进阶视图
                    return showAdvancedRows
                      ? [row1, row2, row3, row4, row5, row6, row7, row8, row9, row10]
                      : [row1, row2, row3, row4, row10];
                  })()}
                </tbody>
              </table>
            </div>

          {/* 刑冲合害（四柱关系：子午相冲、相害、地支相合等） */}
          <CollapsibleCard title="刑冲合害关系分析" summary="四柱之间的互动关系，理解命局动态" style={{ marginTop: 12 }}>
            <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            {relationAnalysis.length === 0 ? (
              <Alert message="✅ 此八字四柱之间无特殊刑冲合害关系" type="success" showIcon />
            ) : (
              relationAnalysis.map((r, i) => (
                <Card
                  key={i}
                  size="small"
                  style={{ marginBottom: 8, borderLeft: `4px solid ${r.color}` }}
                >
                  <Space>
                    <Tag color={r.color}>{r.type}</Tag>
                    <Tag color={r.color === 'var(--wx-wood)' ? 'green' : r.color === 'var(--wx-fire)' ? 'red' : r.color === 'var(--color-warn)' ? 'orange' : r.color === 'var(--wx-water)' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                      {r.subtype}
                    </Tag>
                  </Space>
                  <Paragraph style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>{r.desc}</Paragraph>
                </Card>
              ))
            )}
          </Card>
            </CollapsibleCard>
          </Card>

          {/* 神煞：按实际发力降序，每颗一段「本局解释」（通用释义见四柱表内 Popover，不在此重复） */}
          <Card title="神煞一览" style={{ marginBottom: 16 }}>
            {baziData.shenSha.length === 0 ? (
              <Alert message="此八字四柱中未发现常见神煞，但不代表不好——平凡也是一种福气。" type="info" showIcon />
            ) : (() => {
                // 力量降序：前 6 颗直接亮，其余收进「查看其余 N 颗」——避免 15+ 张小卡刷屏
                const TOP_N = 6;
                const sorted = [...baziData.shenSha]
                  .sort((a, b) => (shenShaPowerMap[`${b.name}|${b.pillar}`]?.power ?? -1) - (shenShaPowerMap[`${a.name}|${a.pillar}`]?.power ?? -1));
                const shown = showAllSha ? sorted : sorted.slice(0, TOP_N);
                const rest = sorted.length - shown.length;
                return (
                  <>
              <Row gutter={[8, 8]}>
                {shown.map((sha, i) => (
                  <Col xs={24} sm={12} md={8} key={`${sha.name}-${sha.pillar}-${i}`}>
                    <Card
                      size="small"
                      style={{
                        borderLeft: `4px solid ${sha.type === '吉' ? 'var(--wx-wood)' : sha.type === '凶' ? 'var(--wx-fire)' : 'var(--wx-water)'}`,
                        background: sha.type === '吉' ? 'rgba(107,154,122,0.06)' : sha.type === '凶' ? 'rgba(194,59,43,0.06)' : 'rgba(0,0,0,0.02)',
                        height: '100%',
                      }}
                    >
                      <Space>
                        <Tag style={{
                          background: sha.type === '吉' ? 'rgba(107,154,122,0.08)' : sha.type === '凶' ? 'rgba(194,59,43,0.08)' : 'rgba(42,51,64,0.08)',
                          color: sha.type === '吉' ? 'var(--wx-wood)' : sha.type === '凶' ? 'var(--wx-fire)' : 'var(--wx-water)',
                          border: 'none',
                        }}>
                          {sha.type}
                        </Tag>
                        <Text strong>{sha.name}</Text>
                        <Tag>{sha.pillar}</Tag>
                        {(() => {
                          const pw = shenShaPowerMap[`${sha.name}|${sha.pillar}`];
                          if (!pw) return null;
                          return (
                            <Tag
                              title={`实际发力 ${pw.power.toFixed(2)}`}
                              style={{
                                fontSize: 11,
                                border: 'none',
                                background: pw.level === '强' ? 'rgba(212,107,8,0.10)' : pw.level === '中' ? 'rgba(42,51,64,0.08)' : 'rgba(0,0,0,0.04)',
                                color: pw.level === '强' ? '#d46b08' : pw.level === '中' ? 'var(--text-body)' : '#8c8c8c',
                              }}
                            >
                              力量{pw.level}
                            </Tag>
                          );
                        })()}
                      </Space>
                      <Paragraph style={{ fontSize: 12, marginTop: 6, marginBottom: 0, color: 'var(--text-body)', lineHeight: 1.75 }}>
                        {(() => {
                          const ex = shenShaExplainMap[`${sha.name}|${sha.pillar}`];
                          return ex ? ex.text : sha.desc;
                        })()}
                      </Paragraph>
                    </Card>
                  </Col>
                ))}
              </Row>
                    {rest > 0 && !showAllSha && (
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button size="small" onClick={() => setShowAllSha(true)}>查看其余 {rest} 颗神煞</Button>
                      </div>
                    )}
                    {showAllSha && sorted.length > TOP_N && (
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button size="small" type="text" onClick={() => setShowAllSha(false)}>▲ 收起</Button>
                      </div>
                    )}
                  </>
                );
              })()}
          </Card>

          {/* 日主强弱 + 用神 */}
          {strengthAnalysis && (
            <CollapsibleCard
              title="日主强弱分析"
              icon={<span style={{ color: WX_COLORS[baziData.dayWx], fontSize: 16 }}>{WX_ICON[baziData.dayWx]}</span>}
              summary={`日主${baziData.dayGan}(${baziData.dayWx})：${strengthAnalysis.level}（得分${strengthAnalysis.score}/11）`}
            >
              <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Paragraph>
                    <Text strong>日主「{baziData.dayGan}」({baziData.dayWx}) 强弱判断：</Text>
                    <Tag color={strengthAnalysis.level === '身强' ? 'red' : strengthAnalysis.level === '身弱' ? 'blue' : 'green'} style={{ marginLeft: 8, fontSize: 16 }}>
                      {strengthAnalysis.level}
                    </Tag>
                    <Text type="secondary">（得分：{strengthAnalysis.score} / 11）</Text>
                  </Paragraph>
                  {Object.values(strengthAnalysis.details).map((d, i) => (
                    <Paragraph key={i} style={{ fontSize: 13, marginBottom: 4 }}>{d}</Paragraph>
                  ))}
                </Col>
                <Col xs={24} md={12}>
                  {yongShenRec && (
                    <div style={{ background: 'rgba(196,164,90,0.04)', padding: 12, borderRadius: 8 }}>
                      <Title level={5}>用神推荐</Title>
                      <Paragraph>
                        <Text strong>喜用五行：</Text>
                        {yongShenRec.yongShen.map((wx) => (
                          <Tag key={wx} color={WX_COLORS[wx]} style={{ fontSize: 14, margin: '0 4px' }}>
                            {WX_ICON[wx]} {wx}
                          </Tag>
                        ))}
                      </Paragraph>
                      <Paragraph style={{ fontSize: 13 }}>{yongShenRec.desc}</Paragraph>
                      {/* 「生活小建议」（多穿X色衣服往X方发展）已删：与喜用区重复且偏玄 */}
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
            </CollapsibleCard>
          )}

          {/* 五行旺衰统计 */}
          {wxStats && (
            <CollapsibleCard title="五行旺衰统计" summary={`${baziData.dayGan}(${baziData.dayWx})五行分布`}>
              <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              <Row gutter={[12, 12]}>
                {Object.entries(wxStats).map(([wx, info]) => (
                  <Col xs={12} sm={4.8} key={wx}>
                    <Card size="small" style={{ background: WX_BG[wx], textAlign: 'center' }}>
                      <Text strong style={{ fontSize: 16, color: WX_COLORS[wx] }}>
                        {WX_ICON[wx]} {wx}
                      </Text>
                      <Progress
                        percent={Math.round((info.count / Math.max(...Object.values(wxStats).map((s) => s.count), 1)) * 100)}
                        size="small"
                        strokeColor={WX_COLORS[wx]}
                        format={() => `${info.count}次`}
                      />
                      <Tag color={info.level === '旺' ? 'red' : info.level === '弱' ? 'blue' : info.level === '缺' ? 'default' : 'green'}>
                        {info.level}
                      </Tag>
                      <Text style={{ fontSize: 11, display: 'block', color: 'var(--text-secondary)' }}>{info.desc}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
            </CollapsibleCard>
          )}

          {/* 五行流通分析：生克链路 + 相战通关 + 归聚点 + 疏通建议 */}
          {wuxingFlow && (
            <CollapsibleCard
              title="五行流通分析"
              summary={`${wuxingFlow.rating} · ${wuxingFlow.links.filter((l) => l.state === '畅通').length}/5 条生路畅通`}
            >
              <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              <Alert
                type={
                  wuxingFlow.rating === '周流不息' || wuxingFlow.rating === '流通顺畅' ? 'success'
                    : wuxingFlow.rating === '基本流通' ? 'info'
                      : wuxingFlow.rating === '局部受阻' ? 'warning' : 'error'
                }
                showIcon
                message={wuxingFlow.summary}
                style={{ marginBottom: 12 }}
              />
              {/* 相生环：木→火→土→金→水→（木），链路状态着色 */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, marginBottom: 12, justifyContent: 'center' }}>
                {wuxingFlow.links.map((l, i) => (
                  <Fragment key={l.from}>
                    {i === 0 && (
                      <Tag style={{ background: WX_BG[l.from], color: WX_COLORS[l.from], border: 'none', margin: 0, fontSize: 13 }}>{l.from}</Tag>
                    )}
                    <Tooltip title={l.note}>
                      <span style={{
                        fontSize: 14, cursor: 'help', padding: '0 2px',
                        color: l.state === '畅通' ? 'var(--wx-wood)' : l.state === '偏弱' ? 'var(--color-warn)' : l.state === '壅塞' ? 'var(--wx-fire)' : 'var(--text-disabled)',
                        textDecoration: l.state === '断链' ? 'line-through' : 'none',
                      }}>
                        {l.state === '断链' ? '⇏' : '→'}
                      </span>
                    </Tooltip>
                    <Tag style={{ background: WX_BG[l.to], color: WX_COLORS[l.to], border: 'none', margin: 0, fontSize: 13 }}>{l.to}</Tag>
                  </Fragment>
                ))}
              </div>
              {/* 相战通关 */}
              {wuxingFlow.bridges.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>生克关系：</Text>
                  {wuxingFlow.bridges.map((b, i) => (
                    <div key={i} style={{
                      marginTop: 6, padding: '8px 12px', borderRadius: 6, fontSize: 13, lineHeight: 1.8,
                      background: b.state === '通关' ? 'rgba(107,154,122,0.05)' : 'rgba(212,107,8,0.05)',
                      borderLeft: `3px solid ${b.state === '通关' ? 'var(--wx-wood)' : 'var(--color-warn)'}`,
                    }}>
                      <Tag style={{ background: b.state === '通关' ? 'rgba(107,154,122,0.1)' : 'rgba(212,107,8,0.1)', color: b.state === '通关' ? 'var(--wx-wood)' : '#d46b08', border: 'none', marginBottom: 4 }}>
                        {b.a}克{b.b} · {b.state}
                      </Tag>
                      <Text style={{ fontSize: 12.5, color: 'var(--text-body)' }}>{b.note}</Text>
                    </div>
                  ))}
                </div>
              )}
              {/* 归聚点 */}
              {wuxingFlow.converge && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={<span style={{ fontSize: 13, lineHeight: 1.8 }}>{wuxingFlow.converge.note}</span>}
                />
              )}
              {/* 疏通建议 */}
              <div>
                <Text strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>疏通建议：</Text>
                <ul style={{ paddingLeft: 20, margin: '6px 0 0', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.9 }}>
                  {wuxingFlow.tips.map((t, i) => <li key={i} style={{ marginBottom: 2 }}>{t}</li>)}
                </ul>
              </div>
              {/* 大运应期：断点何时补上——静态描述变预测 */}
              {dayunFlow && dayunFlow.firstFix.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(196,164,90,0.05)', borderLeft: '3px solid rgba(196,164,90,0.5)' }}>
                  <Text strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>大运应期（断点何时补上）：</Text>
                  <ul style={{ paddingLeft: 20, margin: '6px 0 0', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.9 }}>
                    {dayunFlow.firstFix.map((f, i) => <li key={i} style={{ marginBottom: 2 }}>{f}</li>)}
                  </ul>
                </div>
              )}
            </Card>
            </CollapsibleCard>
          )}

          {/* 命格 */}
          <CollapsibleCard title="命格分析" summary={`${baziData.mingGe.geName} · ${baziData.mingGe.geType} · ${baziData.mingGe.score}`}>
            <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(196,164,90,0.04)' }}>
                  <Title level={2} style={{ color: 'var(--text-primary)', marginBottom: 0 }}>{baziData.mingGe.geName}</Title>
                  <Tag color="volcano" style={{ marginTop: 8, fontSize: 14 }}>{baziData.mingGe.geType}</Tag>
                  <Tag color="gold">{baziData.mingGe.score}</Tag>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Paragraph style={{ fontSize: 14 }}>{baziData.mingGe.desc}</Paragraph>
                <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-body)' }}>
                  {baziData.mingGe.details.map((d, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{d}</li>
                  ))}
                </ul>
              </Col>
            </Row>

            {/* 核验依据（判定链/要素表/成败关键）：有价值但很长，默认折叠，想核验的人自己展开 */}
            {(baziData.mingGe.basis?.length > 0 || baziData.mingGe.keyFactors?.length > 0 || baziData.mingGe.successKey) && (
              <div style={{ marginTop: 12, borderTop: '1px dashed var(--border-light)', paddingTop: 8 }}>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setGeDetailOpen((v) => !v)}
                  style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '2px 0' }}
                >
                  {geDetailOpen ? '▲ 收起核验依据' : '▼ 展开核验依据：判定链 · 要素表 · 成败关键'}
                </Button>
                {geDetailOpen && (
                  <>
                    {/* 判定依据：从月令/透干/日主状态一步步推到格名，让结论可追溯 */}
                    {baziData.mingGe.basis?.length > 0 && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(196,164,90,0.05)', borderLeft: '3px solid rgba(196,164,90,0.5)' }}>
                        <Text strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>判断依据（逐步推导）：</Text>
                        <ol style={{ paddingLeft: 20, margin: '6px 0 0', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.9 }}>
                          {baziData.mingGe.basis.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* 要素对应：月令/透干/日主强弱/用神 各自对格局起什么作用 */}
                    {baziData.mingGe.keyFactors?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Text strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>要素对应关系：</Text>
                        <div style={{ overflowX: 'auto', marginTop: 6 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>要素</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>本盘取值</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600 }}>对格局的作用</th>
                              </tr>
                            </thead>
                            <tbody>
                              {baziData.mingGe.keyFactors.map((k, i) => (
                                <tr key={i}>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-body)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k.factor}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-body)', fontFamily: 'var(--font-mono, monospace)' }}>{k.value}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-body)', lineHeight: 1.7 }}>{k.meaning}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 成败关键：这个格靠什么成、怕什么破 */}
                    {baziData.mingGe.successKey && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 12 }}
                        message={<span style={{ fontSize: 13, lineHeight: 1.8 }}><strong>格局成败关键：</strong>{baziData.mingGe.successKey}</span>}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
            </CollapsibleCard>

          {/* 十神组合解读 */}
          {shiShenCombos.length > 0 && (
            <CollapsibleCard title="十神组合解读" summary="十神搭配解读你的性格模式">
              <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              {shiShenCombos.map((c, i) => (
                <Paragraph key={i} style={{ fontSize: 13, marginBottom: 8 }}>{c}</Paragraph>
              ))}
            </Card>
            </CollapsibleCard>
          )}

          {/* 大运 */}
          <CollapsibleCard title="大运" summary={`${(() => {
            const beforeStart = currentExactAge < baziData.dayun.startAge;
            if (beforeStart) {
              return `起运前 · 还有${baziData.dayun.startAge - currentExactAge}年开始第一步大运`;
            }
            const last = baziData.dayun.steps[baziData.dayun.steps.length - 1];
            return `起运${firstDaYunStartAge}岁 · 十年一运 · 至${last?.endAge ?? 100}岁`;
          })()}`} defaultOpen>
            <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
            <Alert
              message={`起运年龄：${firstDaYunStartAge}岁（${baziData.dayun.startDate || '日期待推算'}） | 起运方向：${baziData.dayun.direction} | 阳年男/阴年女顺排，阴年男/阳年女逆排 | 十年一大运` +
                (currentExactAge < baziData.dayun.startAge ? ` | 当前 ${currentExactAge} 岁（未起运）` : ' | 当前 ' + currentExactAge + ' 岁')}
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Row gutter={[8, 8]}>
              {baziData.dayun.steps.map((step, i) => {
                // 起运前的小运：标灰，不视为"当前大运"
                if (step.isPreStart) {
                  return (
                    <Col xs={12} sm={8} md={6} key={`pre-${i}`}>
                      <Card size="small" style={{ borderStyle: 'dashed', borderColor: 'var(--border-light)', background: 'rgba(0,0,0,0.02)' }}>
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 14 }}>起运前·小运</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>0~{step.endAge}岁</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{step.startYear}年以前</Text>
                          <Tag style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'none', marginTop: 4 }}>未起运</Tag>
                        </Space>
                      </Card>
                    </Col>
                  );
                }
                // 起运后的真正大运：用精确年龄判断当前所在
                // 起运那年的实际周岁可能小于 起运年龄（虚岁），所以"在当前步"的判定用 <= endAge && > startAge
                const isCurrent = !!currentDayunStep && currentDayunStep.ganZhi === step.ganZhi && currentDayunStep.endAge === step.endAge;
                return (
                  <Col xs={12} sm={8} md={6} key={i}>
                    <Card size="small" style={{ borderColor: isCurrent ? 'var(--wx-fire)' : undefined, background: isCurrent ? 'rgba(194,59,43,0.06)' : undefined }}>
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 16, color: isCurrent ? 'var(--wx-fire)' : (WX_COLORS[TG_WX[step.ganZhi.charAt(0)] || ''] || 'var(--text-primary)') }}>{step.ganZhi}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{step.startAge}~{step.endAge}岁</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{step.startYear}~{step.endYear}年</Text>
                        {isCurrent && <Tag style={{ background: 'rgba(194,59,43,0.08)', color: 'var(--wx-fire)', border: 'none' }}>当前大运</Tag>}
                        {/* 流通应期标注：此运补齐断链 / 通关得力 / 壅塞加剧（见 utils/wuxingFlow.ts annotateDayunFlow） */}
                        {(dayunFlow?.stepNotes[i] || []).map((n, ni) => (
                          <Tooltip key={ni} title={n}>
                            <Tag style={{
                              fontSize: 10, margin: 0, border: 'none', cursor: 'default',
                              background: n.includes('壅塞') ? 'rgba(212,107,8,0.08)' : 'rgba(107,154,122,0.10)',
                              color: n.includes('壅塞') ? '#d46b08' : 'var(--wx-wood)',
                            }}>
                                {n.includes('壅塞') ? '⚠ 壅塞加剧' : n.includes('通关') ? '⚡ 通关得力' : '⚡ 补齐断链'}
                              </Tag>
                          </Tooltip>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <Divider>大运白话解读</Divider>
            {dayunReadings.stageLead && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 12 }}
                message={dayunReadings.stageLead}
              />
            )}
            {dayunReadings.readings.map((d, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  paddingLeft: 10,
                  borderLeft: `2px solid ${d.isCurrent ? 'var(--wx-fire)' : 'var(--border-light)'}`,
                }}
              >
                <Space size={6} wrap style={{ marginBottom: 2 }}>
                  <Text strong style={{ fontSize: 13 }}>{d.startAge}~{d.endAge}岁</Text>
                  <Tag
                    style={{
                      background: WX_BG[TG_WX[d.ganZhi.charAt(0)] || ''] || undefined,
                      color: WX_COLORS[TG_WX[d.ganZhi.charAt(0)] || ''] || undefined,
                      border: 'none',
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    {d.ganZhi}
                  </Tag>
                  <Tooltip title={`${d.relationLabel} · 本阶段解读重心：${d.stageFocus}`}>
                    <Tag style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'none', fontSize: 12, margin: 0 }}>
                      {d.stageLabel}
                    </Tag>
                  </Tooltip>
                  {d.isCurrent && (
                    <Tag style={{ background: 'rgba(194,59,43,0.08)', color: 'var(--wx-fire)', border: 'none', fontSize: 12, margin: 0 }}>当前大运</Tag>
                  )}
                  {!d.isCurrent && d.isPast && (
                    <Tag style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', border: 'none', fontSize: 12, margin: 0 }}>已走过</Tag>
                  )}
                </Space>
                <Paragraph style={{ fontSize: 13, marginBottom: 0, lineHeight: 1.75 }}>{d.text}</Paragraph>
              </div>
            ))}
          </Card>
            </CollapsibleCard>

          {/* 运势节奏：流年/流月/流日三合一（原三张结构雷同的卡，合并为单卡页签切换） */}
          <CollapsibleCard title="运势节奏" summary="流年 · 流月 · 流日，页签切换">
            <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}>
              <Tabs
                defaultActiveKey="liunian"
                size="small"
                items={[
                  {
                    key: 'liunian',
                    label: '流年（十年）',
                    children: liunianYears ? (
                      <Row gutter={[8, 8]}>
                        {liunianYears.map((y) => {
                          const isYearCurrent = y.year === currentYear;
                          return (
                            <Col xs={12} sm={8} md={6} key={y.year}>
                              <Card size="small" style={{
                                height: '100%',
                                borderColor: isYearCurrent ? 'var(--wx-fire)' : 'var(--border-light)',
                                background: isYearCurrent ? 'rgba(194,59,43,0.05)' : undefined,
                              }}>
                                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                  <Space>
                                    <Text strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{y.year}年</Text>
                                    <Tag style={{ background: WX_BG[y.wx], color: WX_COLORS[y.wx], border: 'none', fontSize: 12, margin: 0 }}>{y.ganZhi}</Tag>
                                    {isYearCurrent && <Tag style={{ background: 'rgba(194,59,43,0.08)', color: 'var(--wx-fire)', border: 'none', fontSize: 11, margin: 0 }}>本年</Tag>}
                                  </Space>
                                  <Text style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{y.desc}</Text>
                                </Space>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13 }}>排盘后自动展示今年起连续十年的流年运势。</Text>
                    ),
                  },
                  {
                    key: 'liuyue',
                    label: '流月（一年）',
                    children: liuYueMonths ? (
                      <Row gutter={[6, 6]}>
                        {liuYueMonths.map((m, i) => {
                          const isGood = m.desc.includes('印星') || m.desc.includes('财运') || m.desc.includes('贵人');
                          const isBad = m.desc.includes('官杀') || m.desc.includes('压力');
                          const bgColor = isGood ? 'rgba(107,154,122,0.06)' : isBad ? 'rgba(194,59,43,0.06)' : 'rgba(0,0,0,0.02)';
                          return (
                            <Col xs={8} sm={6} md={4} key={i}>
                              <Card size="small" style={{ textAlign: 'center', background: bgColor }}>
                                <Text style={{ fontSize: 14 }}>{m.monthName}</Text>
                                <br />
                                <Tag style={{ background: WX_BG[m.wx], color: WX_COLORS[m.wx], border: 'none', fontSize: 13, margin: 0 }}>{m.ganZhi}</Tag>
                                <br />
                                <Text style={{ fontSize: 11, color: isGood ? 'var(--wx-wood)' : isBad ? 'var(--wx-fire)' : 'var(--text-secondary)' }}>{m.desc}</Text>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13 }}>排盘后自动展示当前月起未来一年的逐月运势。</Text>
                    ),
                  },
                  {
                    key: 'liuri',
                    label: '流日（逐日）',
                    children: (
                      <>
                        <Space style={{ marginBottom: 12 }} wrap>
                          <Text strong>年：</Text>
                          <InputNumber min={1900} max={2100} placeholder={String(currentYear)}
                            value={liuRiYear} onChange={(v) => setLiuRiYear(v || null)} style={{ width: 100 }} />
                          <Text strong>月：</Text>
                          <InputNumber min={1} max={12} placeholder={String(new Date().getMonth() + 1)}
                            value={liuRiMonth} onChange={(v) => setLiuRiMonth(v || null)} style={{ width: 70 }} />
                          <Button onClick={() => liuRiYear && liuRiMonth && handleLiuRi(liuRiYear, liuRiMonth)}>查看流日</Button>
                        </Space>
                        {liuRiDays && (
                          <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            <Row gutter={isMobile ? ([0, 4] as [number, number]) : [4, 4]} style={isMobile ? { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 } : undefined}>
                              {liuRiDays.map((d) => {
                                const isGood = d.desc === '印生' || d.desc === '财运';
                                const isBad = d.desc === '官杀';
                                const isWeekend = !!d.weekend;
                                return (
                                  <Col span={3} key={d.day} style={isMobile ? { minWidth: 0, maxWidth: 'none' } : { minWidth: 80 }}>
                                    <Card size="small" style={{
                                      textAlign: 'center',
                                      padding: 2,
                                      background: isGood ? 'rgba(107,154,122,0.06)' : isBad ? 'rgba(194,59,43,0.06)' : isWeekend ? 'rgba(0,0,0,0.04)' : '#fff',
                                      borderColor: isWeekend ? '#ccc' : undefined,
                                    }}>
                                      <Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{d.day}日</Text>
                                      <br />
                                      <Text strong style={{ fontSize: 12, color: WX_COLORS[d.wx] }}>{d.ganZhi}</Text>
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          </div>
                        )}
                      </>
                    ),
                  },
                ]}
              />
          </Card>
            </CollapsibleCard>

          {/* ========== 六大领域分析（付费详批） ========== */}
          <PayWall
            product="report_bazi"
            targetKey={chartTargetKey('bazi', baziData.pillars, baziData.birthGender)}
            benefits={[
              '性格画像：核心性格、内心世界、盲区提醒，说中你自己都没意识到的那一面',
              '六大领域详解：爱情婚姻、事业财运、健康、家庭、社交逐项展开',
              '运势总览：人生各阶段走势、一生课题、幸运元素',
              '权益绑定当前命盘，永久有效，随时回看',
            ]}
          >
          <Divider orientation="left" style={{ marginTop: 24 }}>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>六大人生领域分析</Title>
          </Divider>

          {/* 性格画像 */}
          {personality && (
            <CollapsibleCard
              title={`🪞 性格画像 · ${personality.title}`}
              summary={personality.core}
            >
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0, borderLeft: '3px solid var(--wx-water)' }}
              styles={{ body: { background: 'rgba(44,90,142,0.02)' } }}
            >
              <DomainDeepBlock d={domainDeepMap.personality} accent="rgba(44,90,142,0.28)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 爱情婚姻 */}
          {loveAnalysis && (
            <CollapsibleCard
              title="💕 爱情婚姻"
              summary={loveAnalysis.spouseFeature}
            >
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0, borderLeft: '3px solid var(--wx-fire)' }}
              styles={{ body: { background: 'rgba(194,59,43,0.02)' } }}
            >
              <DomainDeepBlock d={domainDeepMap.love} accent="rgba(194,59,43,0.2)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 事业财运 */}
          {careerAnalysis && (
            <CollapsibleCard title="💼 事业财运" summary={careerAnalysis.direction}>
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0, borderLeft: '3px solid var(--wx-water)' }}
              styles={{ body: { background: 'rgba(42,51,64,0.02)' } }}
            >
              <DomainDeepBlock d={domainDeepMap.career} accent="rgba(42,51,64,0.25)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 身体健康 */}
          {healthAnalysis && (
            <CollapsibleCard title="💚 身体健康" summary={healthAnalysis.bodyOverview}>
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}
            >
              <DomainDeepBlock d={domainDeepMap.health} accent="rgba(107,154,122,0.35)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 家庭亲情 */}
          {familyAnalysis && (
            <CollapsibleCard title="🏠 家庭亲情" summary={familyAnalysis.parentRelation}>
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}
            >
              <DomainDeepBlock d={domainDeepMap.family} accent="rgba(184,123,74,0.3)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 社交朋友 */}
          {socialAnalysis && (
            <CollapsibleCard title="🤝 社交朋友" summary={socialAnalysis.socialTrait}>
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}
            >
              <DomainDeepBlock d={domainDeepMap.social} accent="rgba(166,166,166,0.3)" />
            </Card>
            </CollapsibleCard>
          )}

          {/* 综合运势总览 */}
          {fortuneOverview && (
            <CollapsibleCard title="🌟 运势总览" summary={fortuneOverview.keywords?.join('、') || '人生综合运势'}>
            <Card
              style={{ border: 'none', boxShadow: 'none', background: 'transparent', margin: 0, padding: 0 }}
            >
              <Paragraph>
                <Text strong>人生关键词：</Text>
                {fortuneOverview.keywords.map((kw, i) => (
                  <Tag key={i} color="gold" style={{ margin: '0 4px', fontSize: 13 }}>{kw}</Tag>
                ))}
              </Paragraph>
              {/* 本命盘指纹 */}
              {fortuneOverview.signature && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={<span style={{ fontFamily: 'var(--font-display)' }}>📜 本命印鉴</span>}
                  description={<span style={{ fontSize: 13, lineHeight: 1.8 }}>{fortuneOverview.signature}</span>}
                />
              )}
              <Divider orientation="left" plain style={{ fontSize: 13 }}>人生各阶段</Divider>
              {fortuneOverview.lifeStages.map((ls, i) => (
                <Paragraph key={i} style={{ marginBottom: 8 }}>
                  <Text strong>{ls.stage}：</Text>{ls.desc}
                </Paragraph>
              ))}
              <Divider orientation="left" plain style={{ fontSize: 13 }}>一生课题</Divider>
              <Paragraph>{fortuneOverview.lifeLesson}</Paragraph>
              <Divider orientation="left" plain style={{ fontSize: 13 }}>幸运元素</Divider>
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}><Text strong>幸运颜色：</Text><Tag>{fortuneOverview.luckyColor}</Tag></Col>
                <Col xs={12} sm={6}><Text strong>幸运数字：</Text><Tag>{fortuneOverview.luckyNumber}</Tag></Col>
                <Col xs={12} sm={6}><Text strong>有利方位：</Text><Tag>{fortuneOverview.luckyDirection}</Tag></Col>
                <Col xs={12} sm={6}>
                  <Text strong>贵人属相：</Text>
                  {fortuneOverview.luckyZodiac.map(z => <Tag key={z} color="blue" style={{ margin: '1px' }}>{z}</Tag>)}
                </Col>
              </Row>
              <Paragraph style={{ marginTop: 8 }}>
                <Text strong>有利行业：</Text>
                {fortuneOverview.luckyIndustries.map((ind, i) => (
                  <Tag key={i} color="green" style={{ margin: '2px' }}>{ind}</Tag>
                ))}
              </Paragraph>
            </Card>
            </CollapsibleCard>
          )}
          </PayWall>
        </>
      )}
    </div>
  );
}
