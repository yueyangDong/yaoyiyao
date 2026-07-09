import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Card, Form, InputNumber, Button,
  Typography, Space, Tag, message, Radio, Row, Col,
  Progress, Alert, Divider, Cascader, Tooltip,
} from 'antd';
import { Solar, Lunar } from 'lunar-typescript';
import { useUser, getCityLng, getTrueSolarHour } from '../context/UserContext';
import { pcaCode } from 'cn-division';
import { analyzeLove, analyzeCareer, analyzeHealth, analyzeFamily, analyzeSocial, analyzeFortuneOverview } from '../utils/baziAnalysis';

const { Title, Text, Paragraph } = Typography;

// 五行配色
const WX_COLORS: Record<string, string> = { '木': '#4caf50', '火': '#f44336', '土': '#ff9800', '金': '#ffc107', '水': '#2196f3' };
const WX_BG: Record<string, string> = { '木': '#e8f5e9', '火': '#ffebee', '土': '#fff3e0', '金': '#fffde7', '水': '#e3f2fd' };
const WX_ICON: Record<string, string> = { '木': '🌳', '火': '🔥', '土': '⛰️', '金': '💎', '水': '💧' };

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

// 神煞白话解释
const SHENSHA_PLAIN: Record<string, string> = {
  '天乙贵人': '最尊贵的吉神。命带天乙贵人，一生有贵人相助，遇难成祥、逢凶化吉。走到哪里都有人帮你，天生好运气。',
  '文昌': '主学业、文采、考试运。学习能力强，适合读书深造、写作、文化事业。考试运比一般人好。',
  '学堂': '与文昌类似，代表学习能力和求知欲。天生爱学习，学新东西比别人快，有学术天赋。',
  '桃花': '主人缘、异性缘、艺术气质。桃花旺的人有魅力，容貌气质佳，但也需注意感情纠葛。',
  '红鸾': '正桃花星，主婚姻喜事、良好姻缘。单身者遇到红鸾是恋爱结婚的信号，已婚者需守心。',
  '天喜': '主喜事、怀孕、添丁。遇到天喜流年，家中常有好事发生，人心情愉悦。',
  '驿马': '主奔波、流动、出行。命带驿马，适合外出发展、动态职业（销售、物流），不适合长期宅家。',
  '羊刃': '一把双刃剑——代表极强的个性和行动力。用得好是领袖气质，用不好容易冲动惹事、伤身。',
  '将星': '主领导才能、统御能力。有当领导的潜质，能独当一面做决策，性格果断不犹豫。',
  '华盖': '主孤独、清高、玄学天赋。喜欢独处思考，对宗教、哲学、命理、艺术有天生的兴趣。',
  '禄神': '代表食禄、俸禄、财富。命中带禄，吃喝不愁，有稳定的收入来源，衣食无忧。',
  '天德': '上天庇佑之吉星，能化解一切凶险。是"保命星"，遇到重大困难时总有转机。',
  '月德': '与天德类似，女性得此星更吉。能逢凶化吉，家庭和睦，人际关系好。',
  '金舆': '富贵之车，代表财富和地位。命带金舆者往往能享受优质生活，出行有好的交通工具。',
  '天医': '代表医术、健康方面的缘分。适合从事医疗行业，或自身身体自愈能力强。',
  '魁罡': '主聪明果断，但也刚强固执。有很强的个性，不随波逐流。但需注意不要太自我中心。',
  '太极贵人': '主智慧、玄学、哲学天赋。对神秘事物有浓厚兴趣，适合研究传统文化和命理。',
  '福星贵人': '一生福气多，少灾少难。不一定大富大贵，但生活安稳，知足常乐。',
  '国印贵人': '主诚信、权威、公章之权。适合从政或在大型机构工作，有官方背景的贵人相助。',
  '天厨贵人': '主饮食、享受。命带天厨，爱吃会吃，也可能从事餐饮行业，生活有口福。',
  '词馆': '主文学、口才、学术成就。命带词馆，妙笔生花、口若悬河，适合文职和学术。',
  '劫煞': '主破财、意外、小人是非。命带劫煞需注意保管财物，不宜做高风险投资。',
  '灾煞': '主灾祸、疾病、横祸。命带灾煞者需格外注意安全，避免危险活动和冒险。',
  '孤辰': '主孤独。男命尤忌，容易性格孤僻、不合群，婚姻来得晚或夫妻聚少离多。',
  '寡宿': '主孤独。女命尤忌，容易独守空房或性格清冷，但利于修行和研究型工作。',
  '空亡': '空亡不是说没有，而是"有名无实"——像水中月、镜中花。凡事多等待时机才能落实。',
};

// ========== 神煞计算 ==========
interface ShenShaItem {
  name: string;
  pillar: string;
  desc: string;
  type: '吉' | '凶' | '平';
}

function calcShenSha(pillars: PillarData[]): ShenShaItem[] {
  const results: ShenShaItem[] = [];
  const PL = ['年柱', '月柱', '日柱', '时柱'];

  const tg = pillars.map((p) => p.tianGan);
  const dz = pillars.map((p) => p.diZhi);
  const gz = pillars.map((p) => p.ganZhi);

  for (let i = 0; i < 4; i++) {
    const pi = PL[i];

    // --- 天乙贵人（日干看地支）---
    const tianYiMap: Record<string, string[]> = {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['巳', '卯'], '癸': ['巳', '卯'],
      '辛': ['午', '寅'],
    };
    const riGan = tg[2]; // 日干
    if (tianYiMap[riGan]?.includes(dz[i])) {
      results.push({ name: '天乙贵人', pillar: pi, desc: SHENSHA_PLAIN['天乙贵人'], type: '吉' });
    }

    // --- 文昌（日干看地支）---
    const wenchangMap: Record<string, string> = {
      '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
      '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
    };
    if (wenchangMap[riGan] === dz[i]) {
      results.push({ name: '文昌', pillar: pi, desc: SHENSHA_PLAIN['文昌'], type: '吉' });
    }

    // --- 禄神（日干看地支）---
    const luMap: Record<string, string> = {
      '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
      '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
    };
    if (luMap[riGan] === dz[i]) {
      results.push({ name: '禄神', pillar: pi, desc: SHENSHA_PLAIN['禄神'], type: '吉' });
    }

    // --- 羊刃（日干看地支）---
    const yangRenMap: Record<string, string> = {
      '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
      '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
    };
    if (yangRenMap[riGan] === dz[i]) {
      results.push({ name: '羊刃', pillar: pi, desc: SHENSHA_PLAIN['羊刃'], type: '凶' });
    }

    // --- 桃花（年支/日支的三合局看桃花位）---
    const taoHuaMap: Record<string, string> = {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '亥': '子', '卯': '子', '未': '子',
      '巳': '午', '酉': '午', '丑': '午',
    };
    if (taoHuaMap[dz[0]] === dz[i] || taoHuaMap[dz[2]] === dz[i]) {
      if (!results.find((r) => r.name === '桃花' && r.pillar === pi)) {
        results.push({ name: '桃花', pillar: pi, desc: SHENSHA_PLAIN['桃花'], type: '平' });
      }
    }

    // --- 驿马（年支/日支的三合局看驿马位）---
    const yiMaMap: Record<string, string> = {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '巳', '卯': '巳', '未': '巳',
      '巳': '亥', '酉': '亥', '丑': '亥',
    };
    if (yiMaMap[dz[0]] === dz[i] || yiMaMap[dz[2]] === dz[i]) {
      results.push({ name: '驿马', pillar: pi, desc: SHENSHA_PLAIN['驿马'], type: '平' });
    }

    // --- 华盖（年支/日支的三合局看华盖位）---
    const huaGaiMap: Record<string, string> = {
      '申': '辰', '子': '辰', '辰': '辰',
      '寅': '戌', '午': '戌', '戌': '戌',
      '亥': '未', '卯': '未', '未': '未',
      '巳': '丑', '酉': '丑', '丑': '丑',
    };
    if (huaGaiMap[dz[0]] === dz[i] || huaGaiMap[dz[2]] === dz[i]) {
      results.push({ name: '华盖', pillar: pi, desc: SHENSHA_PLAIN['华盖'], type: '吉' });
    }

    // --- 将星（年支/日支的三合局看将星位）---
    const jiangXingMap: Record<string, string> = {
      '申': '子', '子': '子', '辰': '子',
      '寅': '午', '午': '午', '戌': '午',
      '亥': '卯', '卯': '卯', '未': '卯',
      '巳': '酉', '酉': '酉', '丑': '酉',
    };
    if (jiangXingMap[dz[0]] === dz[i] || jiangXingMap[dz[2]] === dz[i]) {
      results.push({ name: '将星', pillar: pi, desc: SHENSHA_PLAIN['将星'], type: '吉' });
    }

    // --- 魁罡（特定干支）---
    if (['庚辰', '庚戌', '壬辰', '壬戌'].includes(gz[i])) {
      results.push({ name: '魁罡', pillar: pi, desc: SHENSHA_PLAIN['魁罡'], type: '平' });
    }

    // --- 金舆（日干看地支）---
    const jinYuMap: Record<string, string> = {
      '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
      '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅',
    };
    if (jinYuMap[riGan] === dz[i]) {
      results.push({ name: '金舆', pillar: pi, desc: SHENSHA_PLAIN['金舆'], type: '吉' });
    }

    // --- 学堂（日干看地支）---
    const xueTangMap: Record<string, string> = {
      '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
      '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
    };
    if (xueTangMap[riGan] === dz[i]) {
      results.push({ name: '学堂', pillar: pi, desc: SHENSHA_PLAIN['学堂'], type: '吉' });
    }

    // --- 太极贵人（日干看地支）---
    const taiJiMap: Record<string, string[]> = {
      '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'],
      '戊': ['丑', '未', '辰', '戌'], '己': ['丑', '未', '辰', '戌'],
      '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'],
    };
    if (taiJiMap[riGan]?.includes(dz[i])) {
      results.push({ name: '太极贵人', pillar: pi, desc: SHENSHA_PLAIN['太极贵人'], type: '吉' });
    }

    // --- 福星贵人（日干看地支）---
    const fuXingMap: Record<string, string> = {
      '甲': '子', '乙': '丑', '丙': '寅', '丁': '卯', '戊': '辰',
      '己': '巳', '庚': '午', '辛': '未', '壬': '申', '癸': '酉',
    };
    if (fuXingMap[riGan] === dz[i]) {
      results.push({ name: '福星贵人', pillar: pi, desc: SHENSHA_PLAIN['福星贵人'], type: '吉' });
    }

    // --- 红鸾（年支看地支）---
    const hongLuanMap: Record<string, string> = {
      '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
      '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
    };
    if (hongLuanMap[dz[0]] === dz[i]) {
      results.push({ name: '红鸾', pillar: pi, desc: SHENSHA_PLAIN['红鸾'], type: '吉' });
    }

    // --- 天喜（年支看地支）---
    const tianXiMap: Record<string, string> = {
      '子': '酉', '丑': '申', '寅': '未', '卯': '午', '辰': '巳', '巳': '辰',
      '午': '卯', '未': '寅', '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
    };
    if (tianXiMap[dz[0]] === dz[i]) {
      results.push({ name: '天喜', pillar: pi, desc: SHENSHA_PLAIN['天喜'], type: '吉' });
    }

    // --- 天德贵人（月支看天干）---
    const tianDeMap: Record<string, string> = {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
      '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
    };
    const monthZhi = dz[1]; // 月支
    if (tianDeMap[monthZhi] === tg[i]) {
      results.push({ name: '天德贵人', pillar: pi, desc: SHENSHA_PLAIN['天德贵人'], type: '吉' });
    }

    // --- 月德贵人（月支看天干）---
    const yueDeMap: Record<string, string> = {
      '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚', '午': '丙', '未': '甲',
      '申': '壬', '酉': '庚', '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚',
    };
    if (yueDeMap[monthZhi] === tg[i]) {
      results.push({ name: '月德贵人', pillar: pi, desc: SHENSHA_PLAIN['月德贵人'], type: '吉' });
    }

    // --- 词馆（日干看地支）---
    const ciGuanMap: Record<string, string> = {
      '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
      '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
    };
    if (ciGuanMap[riGan] === dz[i]) {
      results.push({ name: '词馆', pillar: pi, desc: SHENSHA_PLAIN['词馆'], type: '吉' });
    }

    // --- 劫煞（年支/日支的三合局看劫煞位）---
    const jieShaMap: Record<string, string> = {
      '申': '巳', '子': '巳', '辰': '巳',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '寅', '卯': '寅', '未': '寅',
      '巳': '亥', '酉': '亥', '丑': '亥',
    };
    if (jieShaMap[dz[0]] === dz[i] || jieShaMap[dz[2]] === dz[i]) {
      results.push({ name: '劫煞', pillar: pi, desc: SHENSHA_PLAIN['劫煞'], type: '凶' });
    }

    // --- 灾煞（年支/日支的三合局看灾煞位）---
    const zaiShaMap: Record<string, string> = {
      '申': '午', '子': '午', '辰': '午',
      '寅': '子', '午': '子', '戌': '子',
      '亥': '酉', '卯': '酉', '未': '酉',
      '巳': '卯', '酉': '卯', '丑': '卯',
    };
    if (zaiShaMap[dz[0]] === dz[i] || zaiShaMap[dz[2]] === dz[i]) {
      results.push({ name: '灾煞', pillar: pi, desc: SHENSHA_PLAIN['灾煞'], type: '凶' });
    }

    // --- 孤辰（年支看地支）---
    const guChenMap: Record<string, string> = {
      '子': '寅', '丑': '寅', '寅': '巳', '卯': '巳',
      '辰': '巳', '巳': '申', '午': '申', '未': '申',
      '申': '亥', '酉': '亥', '戌': '亥', '亥': '寅',
    };
    if (guChenMap[dz[0]] === dz[i]) {
      results.push({ name: '孤辰', pillar: pi, desc: SHENSHA_PLAIN['孤辰'], type: '平' });
    }

    // --- 寡宿（年支看地支）---
    const guaXiuMap: Record<string, string> = {
      '子': '戌', '丑': '戌', '寅': '丑', '卯': '丑',
      '辰': '丑', '巳': '辰', '午': '辰', '未': '辰',
      '申': '未', '酉': '未', '戌': '未', '亥': '戌',
    };
    if (guaXiuMap[dz[0]] === dz[i]) {
      results.push({ name: '寡宿', pillar: pi, desc: SHENSHA_PLAIN['寡宿'], type: '平' });
    }

    // --- 空亡（日柱看其他柱地支）---
    const kongWangMap: Record<string, string[]> = {
      '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['子', '丑'], '丁卯': ['子', '丑'],
      '戊辰': ['寅', '卯'], '己巳': ['寅', '卯'], '庚午': ['辰', '巳'], '辛未': ['辰', '巳'],
      '壬申': ['午', '未'], '癸酉': ['午', '未'], '甲戌': ['申', '酉'], '乙亥': ['申', '酉'],
      '丙子': ['戌', '亥'], '丁丑': ['戌', '亥'], '戊寅': ['子', '丑'], '己卯': ['子', '丑'],
      '庚辰': ['寅', '卯'], '辛巳': ['寅', '卯'], '壬午': ['辰', '巳'], '癸未': ['辰', '巳'],
      '甲申': ['午', '未'], '乙酉': ['午', '未'], '丙戌': ['申', '酉'], '丁亥': ['申', '酉'],
      '戊子': ['戌', '亥'], '己丑': ['戌', '亥'], '庚寅': ['子', '丑'], '辛卯': ['子', '丑'],
      '壬辰': ['寅', '卯'], '癸巳': ['寅', '卯'], '甲午': ['辰', '巳'], '乙未': ['辰', '巳'],
      '丙申': ['午', '未'], '丁酉': ['午', '未'], '戊戌': ['申', '酉'], '己亥': ['申', '酉'],
      '庚子': ['戌', '亥'], '辛丑': ['戌', '亥'], '壬寅': ['子', '丑'], '癸卯': ['子', '丑'],
      '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'], '丙午': ['辰', '巳'], '丁未': ['辰', '巳'],
      '戊申': ['午', '未'], '己酉': ['午', '未'], '庚戌': ['申', '酉'], '辛亥': ['申', '酉'],
      '壬子': ['戌', '亥'], '癸丑': ['戌', '亥'], '甲寅': ['子', '丑'], '乙卯': ['子', '丑'],
      '丙辰': ['寅', '卯'], '丁巳': ['寅', '卯'], '戊午': ['辰', '巳'], '己未': ['辰', '巳'],
      '庚申': ['午', '未'], '辛酉': ['午', '未'], '壬戌': ['申', '酉'], '癸亥': ['申', '酉'],
    };
    const dayGZ = gz[2]; // 日柱干支
    if (kongWangMap[dayGZ]?.includes(dz[i])) {
      results.push({ name: '空亡', pillar: pi, desc: SHENSHA_PLAIN['空亡'], type: '平' });
    }

    // --- 天厨贵人（日干看地支）---
    const tianChuMap: Record<string, string> = {
      '甲': '巳', '乙': '午', '丙': '巳', '丁': '午', '戊': '申',
      '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
    };
    if (tianChuMap[riGan] === dz[i]) {
      results.push({ name: '天厨贵人', pillar: pi, desc: SHENSHA_PLAIN['天厨贵人'], type: '吉' });
    }

    // --- 国印贵人（日干看地支）---
    const guoYinMap: Record<string, string> = {
      '甲': '未', '乙': '申', '丙': '酉', '丁': '亥', '戊': '丑',
      '己': '寅', '庚': '卯', '辛': '巳', '壬': '未', '癸': '申',
    };
    if (guoYinMap[riGan] === dz[i]) {
      results.push({ name: '国印贵人', pillar: pi, desc: SHENSHA_PLAIN['国印贵人'], type: '吉' });
    }
  }

  return results;
}

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

// ========== 命格分析 ==========
interface MingGeResult {
  geName: string;
  geType: string;
  score: string;
  desc: string;
  details: string[];
}

function analyzeMingGe(pillars: PillarData[], dayGan: string, strengthLevel: string): MingGeResult {
  const monthPillar = pillars[1]; // 月柱
  const monthShiShen = monthPillar.shiShen;
  const dayWxMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  const dayWx = dayWxMap[dayGan] || '';

  // 建禄格判断：月支是日干的禄位
  const luMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
  };
  const yangRenMap: Record<string, string> = {
    '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
    '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
  };

  let geName = '';
  let geType = '';
  let score = '';
  let desc = '';
  const details: string[] = [];

  if (luMap[dayGan] === monthPillar.diZhi) {
    geName = '建禄格';
    geType = '禄格';
    score = '中上';
    desc = `日主${dayGan}的禄位在${luMap[dayGan]}，月令正值禄位，为建禄格。建禄者自旺，通常身强，独立自主，不依赖他人。月令建禄代表你有天生的根基和底气，做事有主见，但在人际关系上可能略显强势。`;
    details.push(`月支${monthPillar.diZhi} = 日主${dayGan}的禄位 → 建禄格`);
    details.push('建禄格的人通常能力强、有主见，适合独立创业或专业领域');
    details.push('注意：建禄格年柱/时柱若见财官，则格局更高，事业有成');
  } else if (yangRenMap[dayGan] === monthPillar.diZhi) {
    geName = '羊刃格';
    geType = '刃格';
    score = '中（需制化）';
    desc = `日主${dayGan}的羊刃在${yangRenMap[dayGan]}，月令正值刃位，为羊刃格。性格刚强果断，执行力极强，但容易冲动、做事极端。若命局中有正官或七杀来制衡羊刃，反而能成大器；若无制化则需注意伤身破财。`;
    details.push(`月支${monthPillar.diZhi} = 日主${dayGan}的羊刃位 → 羊刃格`);
    details.push('羊刃格需要官杀来制，或食伤来泄 → 有制则贵，无制则凶');
    details.push('适合军警、外科医生、竞技等需要决断力的职业');
  } else {
    // 月令取格：以月柱天干的十神定格
    const geMap: Record<string, string> = {
      '正官': '正官格', '七杀': '七杀格', '正财': '正财格', '偏财': '偏财格',
      '正印': '正印格', '偏印': '偏印格', '食神': '食神格', '伤官': '伤官格',
    };
    const typeMap: Record<string, string> = {
      '正官': '官格', '七杀': '杀格', '正财': '财格', '偏财': '财格',
      '正印': '印格', '偏印': '印格', '食神': '食格', '伤官': '伤格',
    };

    if (monthShiShen && geMap[monthShiShen]) {
      geName = geMap[monthShiShen];
      geType = typeMap[monthShiShen];

      const geComments: Record<string, { score: string; desc: string; tips: string[] }> = {
        '正官格': {
          score: '上等',
          desc: `月令正官，为「正气官星格」。正官代表规则、纪律、官位。正官格的人正直守法，适合公务员、管理岗位或在大型机构工作。官星喜财生、喜印护，若四柱见财印相辅则格局更高。`,
          tips: ['正官格喜财来生官（财生官 = 事业有经济支撑）', '喜印来护官（印制伤官 = 保护官星不被破坏）', '最怕伤官见官（叛逆破坏规则，容易得罪领导）'],
        },
        '七杀格': {
          score: '中上（需制化）',
          desc: `月令七杀，为「偏官格」。七杀是压力也是动力，像猛虎——用得好能成就大业，制不住反而伤身。七杀格的人有魄力、敢拼敢闯，适合竞争性强的行业。关键在于命局中有没有食神来制杀，有制则贵。`,
          tips: ['食神制杀 = 最理想的组合（智慧化解压力）', '杀印相生 = 杀生印、印生身，化压力为权力', '无制化的七杀格容易压力山大、健康受损'],
        },
        '正财格': {
          score: '上等',
          desc: `月令正财，为「正气财星格」。正财是稳定的收入、正当的财富。正财格的人务实、勤俭、重视物质安全感，适合经商、金融、财务管理。正财喜食伤来生（技术/创意生财），也喜官来护财。`,
          tips: ['食伤生财 = 用才华和技术赚钱是最佳路径', '正财格不喜比劫多（比劫争财 = 朋友借钱不还）', '财格配官 = 富贵双全（财生官、官护财）'],
        },
        '偏财格': {
          score: '上等',
          desc: `月令偏财，为「偏财格」。偏财是投资收入、意外之财、生意之财。偏财格的人慷慨大方、善于投资理财，是天生的生意人。偏财跟正财不同——偏财来得快去得也快，需要命局有库来存财。`,
          tips: ['偏财喜食伤生（技术驱动投资回报）', '偏财格大方慷慨，但需注意不要过于冒险', '偏财格配正官 = 在规范框架内赚钱，稳中求胜'],
        },
        '正印格': {
          score: '上等',
          desc: `月令正印，为「正气印绶格」。正印代表学问、长辈、贵人、文凭。正印格的人温和善良、好学上进、有贵人相助。印格的人通常学历不错，适合教育、文化、学术研究等职业。`,
          tips: ['印格喜官来生印（官印相生 = 事业和学问相辅相成）', '印格怕财来破印（贪财坏印 = 为钱放弃学习）', '正印格的人心地善良，但也容易心软被人利用'],
        },
        '偏印格': {
          score: '中等',
          desc: `月令偏印（枭神），为「偏印格」。偏印代表特殊技能、偏门学问、另类思维。偏印格的人聪明、有独特天赋，比如编程、设计、玄学、心理学等冷门领域。偏印格的缺点是容易孤僻、不合群。`,
          tips: ['偏印喜偏财来制（偏财制偏印 = 用现实利益平衡孤僻）', '偏印格的人"不走寻常路"，适合小众领域深耕', '偏印多的人容易想太多、钻牛角尖'],
        },
        '食神格': {
          score: '上等',
          desc: `月令食神，为「食神格」。食神代表才华、口才、创造力和享受生活的能力。食神格的人天生乐观、有艺术天赋，是"自带快乐基因"的人。食神格适合艺术、创作、餐饮、娱乐等行业。`,
          tips: ['食神生财 = 才华变现的最优路径', '食神格最喜财星（食神生财 = 快乐地赚钱）', '食神格不太怕压力（心态好），但也容易过于安逸'],
        },
        '伤官格': {
          score: '中（需配印）',
          desc: `月令伤官，为「伤官格」。伤官代表聪明、叛逆和打破常规的创造力。伤官格的人极其聪明，但也极其"不听话"，讨厌被管束。伤官格适合自由职业、创意行业的顶尖人才。但伤官见官（正官）会惹麻烦，需要有正印来制衡。`,
          tips: ['伤官配印 = 最好的组合（聪明有边界，才华有根基）', '伤官见官 → 容易得罪领导、体制、法律', '伤官格的人适合创业、自由职业，不适合传统上班'],
        },
      };

      const c = geComments[geName];
      if (c) {
        score = c.score;
        desc = c.desc;
        details.push(...c.tips);
      } else {
        score = '—';
        desc = `月令${monthShiShen}，为${geName}。`;
      }
      details.unshift(`月柱天干「${monthPillar.tianGan}」为日主「${dayGan}」的${monthShiShen} → ${geName}`);
    } else {
      geName = '杂格';
      geType = '杂格';
      score = '—';
      desc = '月令格局不明显，或属于特殊外格，需要结合整体八字综合判断。';
    }
  }

  return { geName, geType, score, desc, details };
}

// 十神组合解读
function getShiShenComboAnalysis(pillars: any[], dayGan: string): string[] {
  const combos: string[] = [];
  const allShiShen = pillars.map((p) => p.shiShen).filter(Boolean);

  if (allShiShen.includes('伤官') && allShiShen.includes('正官')) {
    combos.push('【伤官见官】你的命局中伤官和正官同时出现，这代表你骨子里不服管束，讨厌规章制度，工作中容易和领导对着干。但也正因为这种叛逆，你有打破常规的创造力。建议把"叛逆"用在对的地方——创新而非对抗。');
  }
  if (allShiShen.includes('食神') && allShiShen.includes('七杀')) {
    combos.push('【食神制杀】食神压制七杀是一个很好的组合！七杀代表压力和小人，而食神代表智慧和手段。你有能力用聪明才智化解压力和对手，好比"以智取胜"。这是能成大事的格局。');
  }
  if (allShiShen.includes('正财') && allShiShen.includes('偏印')) {
    combos.push('【财破印】正财克偏印，代表你可能为了赚钱而放弃学业或进修。注意：金钱和知识不是对立的，两者兼得才是长久之计。');
  }
  if (allShiShen.includes('正印') && allShiShen.includes('伤官')) {
    combos.push('【印制伤官】正印克制伤官，让你的聪明才智有了边界和分寸。你不会因为太"跳脱"而闯祸，能在规则内发挥创意，这是很好的平衡。');
  }
  const caiCount = allShiShen.filter((s) => s === '正财' || s === '偏财').length;
  const shaCount = allShiShen.filter((s) => s === '七杀').length;
  if (caiCount >= 2 && shaCount >= 1) {
    combos.push('【财生杀】命中财多又带七杀，钱财多了反而带来压力。要注意理财方式，避免为钱所困，也不要因为贪财而得罪人。');
  }
  if (allShiShen.includes('正官') && allShiShen.includes('正印')) {
    combos.push('【官印相生】正官生正印，这是很好的组合！官代表事业地位，印代表贵人助力，说明你在事业上不仅有作为，还有贵人扶持，是比较理想的格局。');
  }
  return combos;
}

// 五行旺衰统计
function calcWuxingStats(pillars: any[]): Record<string, { count: number; level: string; desc: string }> {
  const wxCount: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  const tgWx: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  const dzWx: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
  };

  for (const p of pillars) {
    const tg = p.tianGan;
    const dz = p.diZhi;
    if (tgWx[tg]) wxCount[tgWx[tg]]++;
    if (dzWx[dz]) wxCount[dzWx[dz]]++;
    if (p.cangGan) {
      for (const cg of p.cangGan) {
        const gan = cg.charAt(0);
        if (tgWx[gan]) wxCount[tgWx[gan]]++;
      }
    }
  }

  const maxCount = Math.max(...Object.values(wxCount), 1);
  const result: Record<string, { count: number; level: string; desc: string }> = {};
  for (const [wx, count] of Object.entries(wxCount)) {
    let level = '适中';
    let desc = '';
    if (count === 0) { level = '缺'; desc = `命局中缺${wx}，不代表没有${wx}的能量，而是在大运流年中遇到${wx}时会特别明显。`; }
    else if (count >= maxCount * 0.7) { level = '旺'; desc = `${wx}比较旺，注意不要过犹不及，追求平衡。`; }
    else if (count <= 1 && maxCount >= 3) { level = '弱'; desc = `${wx}偏弱，需要对应的五行来补充和扶持。`; }
    result[wx] = { count, level, desc };
  }
  return result;
}

// 日主强弱判断
function analyzeDayMasterStrength(dayGan: string, monthZhi: string, pillars: any[]): {
  score: number; level: string; details: string[];
} {
  const tgWx: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };
  const dayWx = tgWx[dayGan];
  const wxOrder = ['木', '火', '土', '金', '水'];
  const wxSeason: Record<string, string[]> = {
    '春': ['寅', '卯'], '夏': ['巳', '午'], '秋': ['申', '酉'], '冬': ['亥', '子'],
  };

  let score = 2; // 基础分
  const details: string[] = [];

  // 得令：月支与日主五行相同
  const dzWx: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
  };
  const monthWx = dzWx[monthZhi];
  if (monthWx === dayWx) {
    score += 2;
    details.push(`✅ 得令：日主${dayGan}(${dayWx})生于${monthZhi}月，月令与日主同五行，得月令之气，力量最强。`);
  } else if (wxOrder[(wxOrder.indexOf(monthWx) + 1) % 5] === dayWx) {
    score += 1;
    details.push(`🟡 得令(次)：日主${dayGan}(${dayWx})生于${monthZhi}月(${monthWx})，月令生日主，虽不得正令但有生助。`);
  } else {
    details.push(`❌ 失令：日主${dayGan}(${dayWx})生于${monthZhi}月(${monthWx})，不得月令之助。`);
  }

  // 得地：地支中与日主同五行的数量
  let diCount = 0;
  for (const p of pillars) {
    if (dzWx[p.diZhi] === dayWx) diCount++;
    if (p.cangGan) {
      for (const cg of p.cangGan) {
        if (tgWx[cg.charAt(0)] === dayWx) diCount += 0.5;
      }
    }
  }
  if (diCount >= 2) { score += 2; details.push(`✅ 得地：地支中${dayWx}旺，根深蒂固（地支同五行≥2）。`); }
  else if (diCount >= 1) { score += 1; details.push(`🟡 得地：地支中有${dayWx}根，但不深厚。`); }
  else { details.push(`❌ 失地：地支中无${dayWx}根，根基不稳。`); }

  // 得生：是否有印星（生我者）
  const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const shengWx = wxSheng[dayWx];
  let shengCount = 0;
  for (const p of pillars) {
    if (tgWx[p.tianGan] === shengWx) shengCount++;
    if (dzWx[p.diZhi] === shengWx) shengCount += 0.5;
  }
  if (shengCount >= 2) { score += 2; details.push(`✅ 得生：印星(${shengWx})充足，有贵人长辈扶持。`); }
  else if (shengCount >= 1) { score += 1; details.push(`🟡 得生：有少许印星相助。`); }
  else { details.push(`❌ 失生：缺乏印星(${shengWx})生助，缺少贵人扶持。`); }

  // 得助：比肩劫财
  let biCount = 0;
  for (const p of pillars) {
    if (tgWx[p.tianGan] === dayWx) biCount++;
    if (dzWx[p.diZhi] === dayWx) biCount += 0.5;
  }
  if (biCount >= 2) { score += 1; details.push(`✅ 得助：有比劫帮身，朋友同事能帮到你。`); }
  else if (biCount >= 1) { score += 0.5; details.push(`🟡 得助：少许比劫帮扶。`); }

  let level = '中和';
  if (score >= 6) level = '身强';
  else if (score <= 3) level = '身弱';

  return { score, level, details };
}

// 推荐用神
function recommendYongShen(dayWx: string, strengthLevel: string, wxStats: Record<string, { count: number; level: string }>): {
  yongShen: string[]; xiShen: string[]; desc: string;
} {
  const wxKe: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
  const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const wxBeiKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

  let yongShen: string[] = [];
  let xiShen: string[] = [];
  let desc = '';

  if (strengthLevel === '身强') {
    // 身强宜克泄耗
    yongShen = [wxKe[dayWx], wxBeiKe[dayWx]]; // 我克的（财）和克我的（官）
    xiShen = [dayWx]; // 再遇到比劫反而不利（但这里xiShen存喜神）
    desc = `你的日主偏强，就像一个人力气太大需要释放。你需要"克泄耗"来平衡——`;
    if (wxKe[dayWx]) desc += `喜${wxKe[dayWx]}（财星，你克的，赚钱花钱让你消耗精力），`;
    if (wxBeiKe[dayWx]) desc += `喜${wxBeiKe[dayWx]}（官杀，克你的，有压力才有动力）。`;
    const wxDayKe = Object.entries(wxKe).find(([, v]) => v === dayWx)?.[0];
    if (wxDayKe) desc += `不太需要${wxDayKe}（印星，生你的，再多就更强了）和${dayWx}（比劫，帮你的，人多了更闹）。`;
  } else if (strengthLevel === '身弱') {
    yongShen = [wxSheng[dayWx], dayWx]; // 生我的（印）和同我的（比劫）
    xiShen = [wxKe[dayWx]];
    desc = `你的日主偏弱，就像小树苗需要阳光雨露。你需要"生助"来加强——`;
    if (wxSheng[dayWx]) desc += `最喜${wxSheng[dayWx]}（印星，生你的，给你力量和贵人），`;
    desc += `喜${dayWx}（比劫，帮你的，朋友多了路好走）。`;
    desc += `需要注意的是${wxKe[dayWx]}（财星，你克的，花钱会让你更虚）和${wxBeiKe[dayWx]}（官杀，克你的，压力会让你吃不消）。`;
  } else {
    yongShen = [wxSheng[dayWx], wxKe[dayWx]];
    desc = `你的日主中和，比较平衡。正常补${wxSheng[dayWx]}（印星）和${wxKe[dayWx]}（财星）都可以，看具体运势调整。`;
  }

  // 去重
  yongShen = [...new Set(yongShen.filter(Boolean))];
  xiShen = [...new Set(xiShen.filter(Boolean))];

  return { yongShen, xiShen, desc };
}

// 刑冲合害分析 —— 结构化结果
interface RelationItem {
  type: string;    // '合' | '冲' | '刑' | '害' | '破'
  subtype: string; // 分类标签
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
          type: '合', subtype: '天干五合', color: '#52c41a',
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
          type: '合', subtype: '地支六合', color: '#52c41a',
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
    const matched = dzList.filter((dz) => ju.names.includes(dz));
    if (matched.length >= 2) {
      const pillars_ = matched.map((dz) => pn(dzList.indexOf(dz))).join('、');
      const isFull = matched.length === 3 && ju.names.every((n) => dzList.includes(n));
      results.push({
        type: '合', subtype: `地支三合${isFull ? '全' : '半'}局`, color: '#52c41a',
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
        type: '合', subtype: `地支三会${isFull ? '全' : '半'}局`, color: '#52c41a',
        desc: `${pillars_}形成${ju.dir}局${isFull ? '（全会）' : '（半会）'}。三会局是地支最强的合局，相当于三柱"抱团"形成超级区域性力量，比三合局力量更大。`,
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
          type: '冲', subtype: '地支六冲', color: '#f44336',
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}冲（${wxA}${wxB}${isSameWx ? '土土相冲' : '相冲'}）。${isSameWx ? '同类相冲为"比冲"，主内心矛盾和反复。' : '异类相冲代表两个领域之间的冲突和对立。'}冲代表变动和不安，${pn(i)}和${pn(j)}所代表的领域容易动荡、换环境或出现分离。`,
        });
      }
    }
  }

  // ==========================================
  //  6. 地支相刑（橙色）
  // ==========================================
  // 无礼之刑：子卯
  if (dzList.includes('子') && dzList.includes('卯')) {
    results.push({
      type: '刑', subtype: '无礼之刑', color: '#fa8c16',
      desc: `子卯相刑（无礼之刑）：子水+卯木，看似相生实则相刑。容易因言行不当、礼节不周而得罪人，注意口舌是非和人际摩擦。`,
    });
  }
  // 恃势之刑：寅巳申
  const shiShiXing = ['寅', '巳', '申'].filter((n) => dzList.includes(n));
  if (shiShiXing.length >= 2) {
    results.push({
      type: '刑', subtype: '恃势之刑', color: '#fa8c16',
      desc: `${shiShiXing.join('、')} → 恃势之刑。仗势欺人反被欺，容易卷入权力斗争和利益冲突。${shiShiXing.length === 3 ? '三刑俱全，需特别注意。' : '半刑已显端倪，在相关年份补齐会爆发。'}`,
    });
  }
  // 无恩之刑：丑戌未
  const wuEnXing = ['丑', '戌', '未'].filter((n) => dzList.includes(n));
  if (wuEnXing.length >= 2) {
    results.push({
      type: '刑', subtype: '无恩之刑', color: '#fa8c16',
      desc: `${wuEnXing.join('、')} → 无恩之刑。恩将仇报或被恩将仇报，合伙做事要格外小心，容易因利益分配反目成仇。${wuEnXing.length === 3 ? '三刑俱全，合伙需慎之又慎。' : ''}`,
    });
  }
  // 自刑：辰、午、酉、亥（单独出现也算自刑）
  const ziXingList = ['辰', '午', '酉', '亥'];
  const ziXingFound = dzList.filter((dz) => ziXingList.includes(dz));
  if (ziXingFound.length >= 2) {
    const dups = ziXingFound.filter((dz, i) => ziXingFound.indexOf(dz) !== i);
    if (dups.length > 0) {
      results.push({
        type: '刑', subtype: '自刑', color: '#fa8c16',
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
          type: '害', subtype: '地支六害', color: '#1890ff',
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
          type: '破', subtype: '地支六破', color: '#722ed1',
          desc: `${pn(i)}地支「${dzList[i]}」与${pn(j)}地支「${dzList[j]}」→ ${dzList[i]}${dzList[j]}破。"破"就是互相拆台捣乱，两柱之间明合暗破，表面关系还行、背地里互相伤害。合作中要小心面和心不和的局面。`,
        });
      }
    }
  }

  return results;
}

// 大运白话解读
function getDayunInterpretation(dayunGanZhi: string[], dayGan: string, startAge: number): string[] {
  return dayunGanZhi.map((gz, i) => {
    const age = startAge + i * 10;
    const gan = gz.charAt(0);
    const zhi = gz.charAt(1);
    const tgWx: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };
    const dayWx = tgWx[dayGan] || '';
    const dayunWx = tgWx[gan] || '';
    const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    let desc = '';
    if (dayWx === dayunWx) {
      desc = '这步大运与日主同五行，是比劫运，适合交朋友、拓人脉、增强自信。';
    } else if (wxSheng[dayWx] === dayunWx) {
      desc = '这步大运是印运，利学业、考证、得贵人相助，是比较顺遂的阶段。';
    } else if (wxSheng[dayunWx] === dayWx) {
      desc = '这步大运是食伤运，利创意发挥、技术提升，但也容易想得多做得少。';
    } else if (wxKe[dayWx] === dayunWx) {
      desc = '这步大运是官杀运，有压力和挑战，但也是事业上升的动力，适合承担责任。';
    } else if (wxKe[dayunWx] === dayWx) {
      desc = '这步大运是财运，利赚钱理财，但要注意财多身弱反而为钱所累。';
    }
    return `${age}-${age + 9}岁 大运「${gz}」：${desc}`;
  });
}

export interface PillarData {
  pillar: string;
  ganZhi: string;
  tianGan: string;
  diZhi: string;
  cangGan: string[];
  shiShen: string;
  shiShenZhi: string;  // 地支十神 = 自坐X
  nayin: string;
}

export default function Bazi() {
  const { profile, currentUser, addHistory } = useUser();
  const [form] = Form.useForm();
  const [baziData, setBaziData] = useState<{
    pillars: PillarData[];
    dayun: {
      startAge: number;
      direction: string;
      steps: Array<{
        ganZhi: string;
        startAge: number;
        endAge: number;
        startYear: number;
        endYear: number;
      }>;
    };
    lunarInfo: string;
    dayGan: string;
    dayWx: string;
    shenSha: ShenShaItem[];
    mingGe: MingGeResult;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    birthGender: string;
    xunKong: string[];
    diShi: string[];
    ziZuo: { text: string; sub: string; judgment: string }[];
  } | null>(null);
  const [inputMode, setInputMode] = useState<'solar' | 'lunar'>('solar');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [liunianResult, setLiunianResult] = useState<string>('');
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [liuYueYear, setLiuYueYear] = useState<number | null>(null);
  const [liuYueMonths, setLiuYueMonths] = useState<Array<{ monthName: string; ganZhi: string; wx: string; desc: string }> | null>(null);
  const [liuRiYear, setLiuRiYear] = useState<number | null>(null);
  const [liuRiMonth, setLiuRiMonth] = useState<number | null>(null);
  const [liuRiDays, setLiuRiDays] = useState<Array<{ day: number; ganZhi: string; wx: string; desc: string }> | null>(null);
  const currentYear = new Date().getFullYear();
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

  const handleCalc = () => {
    const values = form.getFieldsValue();
    const { year, month, day, hour, minute, gender, birthplace } = values;

    if (!year || !month || !day || hour === undefined) {
      message.warning('请填写完整的出生时间');
      return;
    }
    if (!gender) {
      message.warning('请选择性别（阳年男/阴年女顺排大运，反之逆排）');
      return;
    }

    try {
      // 真太阳时校正
      let calcHour = hour;
      let calcMinute = minute || 0;
      let lng = 120;
      if (birthplace && birthplace.length >= 2) {
        lng = getCityLng(birthplace[0], birthplace[1]);
      }
      if (lng !== 120) {
        const trueSolar = getTrueSolarHour(hour, minute || 0, lng);
        calcHour = trueSolar.hour;
        calcMinute = trueSolar.minute;
      }

      let lunar: Lunar;
      if (inputMode === 'solar') {
        const solar = Solar.fromYmdHms(year, month, day, calcHour, calcMinute, 0);
        lunar = solar.getLunar();
      } else {
        lunar = Lunar.fromYmdHms(year, month, day, calcHour, calcMinute, 0);
      }

      const eightChar = lunar.getEightChar();

      // getYun参数：1=男 0=女，内部自动根据阳年/阴年判断顺逆排
      const yunParam = gender === 'male' ? 1 : 0;
      const birthYearForAge = year;

      const pillars: PillarData[] = [
        {
          pillar: '年柱', ganZhi: eightChar.getYear(), tianGan: eightChar.getYearGan(), diZhi: eightChar.getYearZhi(),
          cangGan: eightChar.getYearHideGan(), shiShen: eightChar.getYearShiShenGan(), shiShenZhi: (eightChar.getYearShiShenZhi() || []).join('/'), nayin: eightChar.getYearNaYin(),
        },
        {
          pillar: '月柱', ganZhi: eightChar.getMonth(), tianGan: eightChar.getMonthGan(), diZhi: eightChar.getMonthZhi(),
          cangGan: eightChar.getMonthHideGan(), shiShen: eightChar.getMonthShiShenGan(), shiShenZhi: (eightChar.getMonthShiShenZhi() || []).join('/'), nayin: eightChar.getMonthNaYin(),
        },
        {
          pillar: '日柱', ganZhi: eightChar.getDay(), tianGan: eightChar.getDayGan(), diZhi: eightChar.getDayZhi(),
          cangGan: eightChar.getDayHideGan(), shiShen: eightChar.getDayShiShenGan(), shiShenZhi: (eightChar.getDayShiShenZhi() || []).join('/'), nayin: eightChar.getDayNaYin(),
        },
        {
          pillar: '时柱', ganZhi: eightChar.getTime(), tianGan: eightChar.getTimeGan(), diZhi: eightChar.getTimeZhi(),
          cangGan: eightChar.getTimeHideGan(), shiShen: eightChar.getTimeShiShenGan(), shiShenZhi: (eightChar.getTimeShiShenZhi() || []).join('/'), nayin: eightChar.getTimeNaYin(),
        },
      ];

      const yun = eightChar.getYun(yunParam);
      yunRef.current = yun;
      const dayunRaw = yun.getDaYun();
      const startAge = yun.getStartYear(); // getStartYear() 实际返回起运年龄
      const isForward = yun.isForward();
      const directionText = isForward ? '顺排' : '逆排';

      const dayunSteps = Array.isArray(dayunRaw)
        ? dayunRaw.map((d: any) => ({
            ganZhi: d.getGanZhi?.() || String(d),
            startAge: d.getStartAge?.() ?? 0,
            endAge: d.getEndAge?.() ?? 0,
            startYear: d.getStartYear?.() ?? 0,
            endYear: d.getEndYear?.() ?? 0,
          }))
        : [];

      // 神煞（自主计算，不依赖 lunar-typescript 的 getShenSha）
      const shenSha = calcShenSha(pillars);

      const solarDate = lunar.getSolar();
      const lunarInfo = `农历${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}日 ${lunar.getTimeZhi()}时`;

      const tgWx: Record<string, string> = {
        '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
        '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
      };
      const dayGan = eightChar.getDayGan();
      const dayWx = tgWx[dayGan] || '';

      const mingGe = analyzeMingGe(pillars, dayGan, '中和');

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
        dayun: { startAge, direction: directionText, steps: dayunSteps },
        lunarInfo: `${lunarInfo}（大运${directionText}）`,
        dayGan,
        dayWx,
        shenSha,
        mingGe,
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        birthHour: calcHour,
        birthMinute: calcMinute,
        birthGender: gender,
        xunKong,
        diShi,
        ziZuo,
      });

      message.success('排盘完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'bazi',
        queryParams: { year, month, day, hour, minute, gender },
        resultSummary: `八字排盘：${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`,
      });
    } catch (e: any) {
      message.error('计算失败，请检查输入的日期是否有效：' + (e.message || ''));
    }
  };

  const handleLiunian = () => {
    if (!selectedYear || !baziData) return;
    const dayGan = baziData.dayGan;
    const dayWx = baziData.dayWx;
    const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const tgWx: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };
    const tgIdx = (selectedYear - 4) % 10;
    const yearGan = tiangan[tgIdx >= 0 ? tgIdx : tgIdx + 10];
    const yearWx = tgWx[yearGan];

    let desc = '';
    if (dayWx === yearWx) {
      desc = `流年「${yearGan}」与日主「${dayGan}」同属${dayWx}，这一年是同五行比和之年，运势平稳，适合维持现状、巩固已有成果。`;
    } else {
      const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
      const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
      if (wxSheng[dayWx] === yearWx) {
        desc = `流年「${yearGan}(${yearWx})」生你的日主「${dayGan}(${dayWx})」——这是印绶之年！利学业、考证、有贵人相助，长辈缘好，适合进修深造。`;
      } else if (wxSheng[yearWx] === dayWx) {
        desc = `你的日主「${dayGan}(${dayWx})」生流年「${yearGan}(${yearWx})」——这是食伤之年！利创意发挥、技术提升，但要注意别想太多做太少。`;
      } else if (wxKe[dayWx] === yearWx) {
        desc = `你的日主「${dayGan}(${dayWx})」克流年「${yearGan}(${yearWx})」——这是财运之年！适合求财赚钱，但要付出努力，天上不会掉馅饼。`;
      } else if (wxKe[yearWx] === dayWx) {
        desc = `流年「${yearGan}(${yearWx})」克你的日主「${dayGan}(${dayWx})」——这是官杀之年！有压力有挑战，但也是锻炼自己的机会，适合承担更多责任。`;
      }
    }

    setLiunianResult(`${selectedYear}年（农历${yearGan}年）：${desc}`);
  };

  // 流月推算
  const handleLiuYue = (year: number) => {
    setLiuYueYear(year);
    if (!baziData || !yunRef.current) return;

    const yun = yunRef.current;
    const dayunSteps = yun.getDaYun();
    const dayGan = baziData.dayGan;
    const dayWx = baziData.dayWx;
    const tgWx: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
      '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    };
    const wxSheng: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const wxKe: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    // 找到该年所在的 dayun step
    let liuNianArr: any[] = [];
    for (const step of dayunSteps) {
      const startY = (step as any).getStartYear?.() ?? 0;
      const endY = (step as any).getEndYear?.() ?? 0;
      if (year >= startY && year <= endY) {
        const lnArr = (step as any).getLiuNian?.() || [];
        liuNianArr = lnArr;
        break;
      }
    }

    // 从 liunian 中找到对应的年份数据
    let tarNian: any = null;
    for (const ln of liuNianArr) {
      if ((ln as any).getYear?.() === year) {
        tarNian = ln;
        break;
      }
    }

    if (!tarNian) {
      const months = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
      const monthNames = ['正月(寅)', '二月(卯)', '三月(辰)', '四月(巳)', '五月(午)', '六月(未)', '七月(申)', '八月(酉)', '九月(戌)', '十月(亥)', '十一月(子)', '十二月(丑)'];
      const yearGanIdx = (year - 4) % 10;
      const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const yearGan = tiangan[yearGanIdx >= 0 ? yearGanIdx : yearGanIdx + 10];
      const monthStarts: Record<string, string> = {
        '甲': '丙', '乙': '戊', '丙': '庚', '丁': '壬', '戊': '甲',
        '己': '丙', '庚': '戊', '辛': '庚', '壬': '壬', '癸': '甲',
      };
      const startGan = monthStarts[yearGan] || '甲';
      const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const startIdx = ganOrder.indexOf(startGan);

      const result = months.map((zhi, i) => {
        const gan = ganOrder[(startIdx + i) % 10];
        const gz = gan + zhi;
        const wx = tgWx[gan] || '';
        let desc = '';
        if (dayWx === wx) desc = '比和之月，运势平稳';
        else if (wxSheng[dayWx] === wx) desc = '印星之月，利学业贵人';
        else if (wxSheng[wx] === dayWx) desc = '食伤之月，利创意发挥';
        else if (wxKe[dayWx] === wx) desc = '官杀之月，有压力挑战';
        else if (wxKe[wx] === dayWx) desc = '财运之月，利求财';
        return { monthName: monthNames[i], ganZhi: gz, wx, desc };
      });
      setLiuYueMonths(result);
      return;
    }

    const liuYueArr = (tarNian as any).getLiuYue?.() || [];
    const result = liuYueArr.map((ly: any) => {
      const gz = ly.getGanZhi?.() || '';
      const gan = gz.charAt(0);
      const wx = tgWx[gan] || '';
      const monthInCn = ly.getMonthInChinese?.() || '';
      let desc = '';
      if (dayWx === wx) desc = '比和之月，运势平稳';
      else if (wxSheng[dayWx] === wx) desc = '印星之月，利学业贵人';
      else if (wxSheng[wx] === dayWx) desc = '食伤之月，利创意发挥';
      else if (wxKe[dayWx] === wx) desc = '官杀之月，有压力挑战';
      else if (wxKe[wx] === dayWx) desc = '财运之月，利求财';
      return { monthName: monthInCn, ganZhi: gz, wx, desc };
    });
    setLiuYueMonths(result);
  };

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
        result.push({ day: d, ganZhi: gz, wx, desc: mark || desc });
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
    return recommendYongShen(baziData.dayWx, strengthAnalysis.level, wxStats || {});
  }, [baziData, strengthAnalysis, wxStats]);

  const relationAnalysis = useMemo(() => {
    if (!baziData) return [];
    return analyzeRelations(baziData.pillars);
  }, [baziData]);

  const shiShenCombos = useMemo(() => {
    if (!baziData) return [];
    return getShiShenComboAnalysis(baziData.pillars, baziData.dayGan);
  }, [baziData]);

  const dayunInterpretations = useMemo(() => {
    if (!baziData) return [];
    const ganZhiList = baziData.dayun.steps.map((s) => s.ganZhi);
    return getDayunInterpretation(ganZhiList, baziData.dayGan, baziData.dayun.startAge);
  }, [baziData]);


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

  const fortuneOverview = useMemo(() => {
    if (!baziData || !strengthAnalysis || !yongShenRec || !wxStats) return null;
    return analyzeFortuneOverview(baziData.pillars, baziData.dayGan, strengthAnalysis.level, yongShenRec.yongShen, baziData.shenSha, baziData.dayun, baziData.birthYear, wxStats as Record<string, { count: number; level: string }>);
  }, [baziData, strengthAnalysis, yongShenRec, wxStats]);

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: '#8b4513' }}>八字排盘</Title>

      {/* 档案提示 */}
      {currentUser ? (
        <Alert
          message={
            <span>
              📋 当前使用档案：<strong>{currentUser.name}</strong>
              （{currentUser.gender}·{currentUser.birthCalendar === 'solar' ? '公历' : '农历'}·{currentUser.birthYear}.{currentUser.birthMonth}.{currentUser.birthDay}）
            </span>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="link" onClick={() => window.location.href = '/profile'}>
              切换档案
            </Button>
          }
        />
      ) : (
        <Alert
          message="💡 创建个人档案后，可一键自动填入，无需每次手动输入。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={() => window.location.href = '/profile'}>
              立即创建
            </Button>
          }
        />
      )}

      <Card style={{ marginBottom: 16 }}>
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
            <Radio.Group value={inputMode} onChange={(e) => setInputMode(e.target.value)}>
              <Radio.Button value="solar">公历输入</Radio.Button>
              <Radio.Button value="lunar">农历输入</Radio.Button>
            </Radio.Group>
          </Form.Item>
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
                <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item name="month" label="月" rules={[{ required: true }]}>
                <InputNumber min={1} max={12} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item name="day" label="日" rules={[{ required: true }]}>
                <InputNumber min={1} max={31} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item name="hour" label="时" rules={[{ required: true }]}>
                <InputNumber min={0} max={23} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Item name="minute" label="分">
                <InputNumber min={0} max={59} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="birthplace" label="出生地（真太阳时校正）">
                <Cascader options={pcaCode} fieldNames={{ label: 'n', value: 'c', children: 'ch' }} placeholder="请选择省市区（可选）" changeOnSelect style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            默认东经120°（北京时间）。选择出生地后将自动做真太阳时校正（每差1°校正4分钟）。
          </Text>

          <Button type="primary" onClick={handleCalc} size="large">排盘</Button>
        </Form>
      </Card>

      {baziData && (
        <>
          {/* 基本信息 */}
          <Card style={{ marginBottom: 16 }} size="small">
            <Text type="secondary">{baziData.lunarInfo}</Text>
          </Card>

          {/* 日主信息行 */}
          <Card
            style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 50%, #ffe082 100%)',
              border: '2px solid #ffc107',
            }}
          >
            <Row align="middle" gutter={[16, 8]}>
              <Col xs={24} md={8}>
                <Space size="middle">
                  <Text strong style={{ fontSize: 18 }}>
                    日主：<span style={{ color: WX_COLORS[baziData.dayWx], fontSize: 22 }}>{baziData.dayGan}（{baziData.dayWx}）{WX_ICON[baziData.dayWx]}</span>
                  </Text>
                  {strengthAnalysis && (
                    <Tag color={strengthAnalysis.level === '身强' ? 'red' : strengthAnalysis.level === '身弱' ? 'blue' : 'green'} style={{ fontSize: 14 }}>
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
            {/* 功能栏 */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12,
              paddingBottom: 8, borderBottom: '1px solid #f0f0f0',
              overflowX: 'auto',
            }}>
              {(() => {
                const ROWS = [
                  { key: 'shishen', label: '十神', desc: '十神是根据日主（出生日的天干）推算出的十种关系模式。日主是核心，比肩/劫财=同辈，食神/伤官=才华，正财/偏财=财富，正官/七杀=权威/压力，正印/偏印=长辈/贵人。' },
                  { key: 'tiangan', label: '天干', desc: '天干是八字的上半部分，代表外在显露的特质。甲乙(木)、丙丁(火)、戊己(土)、庚辛(金)、壬癸(水)，各有阴阳属性。' },
                  { key: 'dizhi', label: '地支', desc: '地支是八字的下半部分，代表内在隐藏的特质。十二地支对应不同月份和五行：寅卯(春木)、巳午(夏火)、申酉(秋金)、亥子(冬水)、辰戌丑未(四季土)。' },
                  { key: 'canggan', label: '藏干', desc: '藏干是地支里藏着的天干，代表隐藏的性格、潜在的能力或不为人知的一面。每个地支藏1-3个天干，是命理中"暗藏玄机"的部分。' },
                  { key: 'zhishen', label: '支神', desc: '支神是地支对应的十神，从地支层面看人际关系。同一个地支藏干在不同柱位代表不同十神，反映隐藏的社会关系和潜在影响力。' },
                  { key: 'nayin', label: '纳音', desc: '纳音是六十甲子配五音十二律，每个干支组合都有独特的纳音五行。纳音代表命格的"底色"和人生韵调，如"杨柳木"温柔,"覆灯火"明亮,"涧下水"灵动。' },
                  { key: 'kongwang', label: '空亡', desc: '空亡代表这个柱对应的人和事容易落空、不实在。年柱空亡→祖上缘薄或早年搬家；月柱空亡→与父母或事业有隔阂；日柱空亡→婚姻易有遗憾；时柱空亡→子女缘薄或晚年孤独。' },
                  { key: 'dishi', label: '地势', desc: '十二长生是天干落在地支时的"生命力阶段"：帝旺=力量巅峰 ⬆️ | 临官=稳步上升 ↗️ | 长生=潜力初生 🌱 | 胎=酝酿中 ⏳ | 死=力量最低 ⬇️ | 墓=被压制 📦。日主在帝旺/临官=身强，在死/绝=需要印比来帮。' },
                  { key: 'zizuo', label: '自坐', desc: '自坐是天干坐在什么地支上，决定这个天干有没有"根"。同五行=根基扎实 ✅，天干生地支=付出型人格，地支生天干=暗中助力，天干克地支=掌控力强，地支克天干=表面风光内心压力大。' },
                  { key: 'shensha', label: '神煞', desc: '神煞是命理学中的特殊标记，来自天干地支的特定组合。天乙贵人⭐=逢凶化吉，桃花💮=异性缘，驿马🐴=奔波，羊刃⚔️=双刃剑，华盖☂️=孤独有才。吉神带来好运，凶煞提示需注意之处。' },
                ];
                return ROWS.map(row => {
                  const isActive = activeRow === row.key;
                  return (
                    <Button
                      key={row.key}
                      size="small"
                      type={isActive ? 'primary' : 'default'}
                      style={{
                        fontSize: 12, padding: '2px 10px',
                        background: isActive ? '#e0c27b' : undefined,
                        borderColor: isActive ? '#c49b3f' : undefined,
                        color: isActive ? '#5c3d00' : undefined,
                      }}
                      onClick={() => setActiveRow(isActive ? null : row.key)}
                    >
                      {row.label}
                    </Button>
                  );
                });
              })()}
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

            {/* 竖向表格 */}
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <table style={{
                width: '100%', minWidth: 480, borderCollapse: 'collapse',
                border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden',
                fontSize: 13,
              }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 8px', background: '#fafafa', borderBottom: '2px solid #d9d9d9', textAlign: 'center', minWidth: 60, fontWeight: 'normal', color: '#888', fontSize: 12 }}>
                      项目
                    </th>
                    {baziData.pillars.map((p, idx) => (
                      <th key={`hdr-${idx}`} style={{
                        padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: 15,
                        background: idx === 2 ? '#fff7e6' : '#fafafa',
                        borderBottom: '2px solid #d9d9d9',
                        color: idx === 2 ? '#ad6800' : '#555',
                        minWidth: 90,
                      }}>
                        {p.pillar}{idx === 2 ? ' ★日主' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const dayIdx = 2;
                    const hlBg = (idx: number) => idx === dayIdx ? '#fff7e6' : '#fff';
                    const hlBorder = (idx: number) => idx < 3 ? '1px solid #e8e8e8' : 'none';

                    // ---- 行1: 十神 ----
                    const row1 = (
                      <tr key="shishen" style={{ background: activeRow === 'shishen' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'shishen' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>十神</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'shishen' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="purple" style={{ fontSize: 13, margin: 0 }}>
                              {idx === dayIdx ? '日主★' : (p.shiShen || '-')}
                            </Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行2: 天干 ----
                    const row2 = (
                      <tr key="tiangan" style={{ background: activeRow === 'tiangan' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'tiangan' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>天干</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'tiangan' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Text strong style={{ fontSize: 20, color: '#8b4513' }}>{p.tianGan}</Text>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行3: 地支 ----
                    const row3 = (
                      <tr key="dizhi" style={{ background: activeRow === 'dizhi' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'dizhi' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>地支</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'dizhi' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Text strong style={{ fontSize: 20, color: '#8b4513' }}>{p.diZhi}</Text>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行4: 藏干 ----
                    const row4 = (
                      <tr key="canggan" style={{ background: activeRow === 'canggan' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'canggan' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>藏干</td>
                        {baziData.pillars.map((p, idx) => {
                          const ssArr = (p.shiShenZhi || '').split('/').filter(Boolean);
                          return (
                            <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'canggan' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx), verticalAlign: 'top' }}>
                              {p.cangGan && p.cangGan.length > 0 ? (
                                p.cangGan.map((cg, ci) => (
                                  <div key={ci} style={{ margin: '2px 0', fontSize: 13 }}>
                                    <Text style={{ color: '#555' }}>{cg}</Text>
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
                      <tr key="zhishen" style={{ background: activeRow === 'zhishen' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'zhishen' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>支神</td>
                        {baziData.pillars.map((p, idx) => {
                          const ssArr = (p.shiShenZhi || '').split('/').filter(Boolean);
                          return (
                            <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'zhishen' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
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
                      <tr key="nayin" style={{ background: activeRow === 'nayin' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'nayin' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>纳音</td>
                        {baziData.pillars.map((p, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'nayin' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="gold" style={{ fontSize: 12, margin: 0 }}>{p.nayin}</Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行7: 空亡 ----
                    const row7 = (
                      <tr key="kongwang" style={{ background: activeRow === 'kongwang' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'kongwang' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>空亡</td>
                        {baziData.xunKong.map((xk, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'kongwang' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <Tag color="default" style={{ fontSize: 12, margin: 0 }}>{xk || '—'}</Tag>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行8: 地势 ----
                    const csColor: Record<string, string> = {
                      '长生': '#52c41a', '沐浴': '#1890ff', '冠带': '#722ed1', '临官': '#fa8c16', '帝旺': '#f44336',
                      '衰': '#999', '病': '#999', '死': '#999', '墓': '#999', '绝': '#999', '胎': '#52c41a', '养': '#52c41a',
                    };
                    const row8 = (
                      <tr key="dishi" style={{ background: activeRow === 'dishi' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'dishi' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>地势</td>
                        {baziData.diShi.map((ds, idx) => (
                          <td key={idx} style={{ padding: '8px 4px', textAlign: 'center', background: activeRow === 'dishi' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            {ds ? (
                              <Tag color={csColor[ds] || 'default'} style={{ fontSize: 12, margin: 0 }}>{ds}</Tag>
                            ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行9: 自坐 ----
                    const row9 = (
                      <tr key="zizuo" style={{ background: activeRow === 'zizuo' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'zizuo' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>自坐</td>
                        {baziData.ziZuo.map((zz, idx) => (
                          <td key={idx} style={{ padding: '6px 4px', textAlign: 'center', background: activeRow === 'zizuo' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx) }}>
                            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#8b4513' }}>{zz.text}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{zz.sub}</div>
                            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{zz.judgment}</div>
                          </td>
                        ))}
                      </tr>
                    );

                    // ---- 行10: 神煞 ----
                    const emoji: Record<string, string> = {
                      '天乙贵人': '⭐', '太极贵人': '☯️', '文昌': '📚', '学堂': '🎓', '词馆': '🗣️',
                      '将星': '👑', '华盖': '☂️', '驿马': '🐴', '桃花': '💮', '红鸾': '💒', '天喜': '🎉',
                      '羊刃': '⚔️', '劫煞': '💀', '灾煞': '⚠️', '孤辰': '🏝️', '寡宿': '🏚️',
                      '天德贵人': '🛡️', '月德贵人': '🌙', '空亡': '⭕', '金舆': '🚗',
                      '禄神': '💰', '魁罡': '🔱', '福星贵人': '🌟', '天厨贵人': '🍽️', '国印贵人': '📜',
                    };
                    const row10 = (
                      <tr key="shensha" style={{ background: activeRow === 'shensha' ? '#fffbe6' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', background: activeRow === 'shensha' ? '#fff3cd' : '#fafafa', borderBottom: '1px solid #e8e8e8', fontWeight: 'bold', fontSize: 12, color: '#666' }}>神煞</td>
                        {baziData.pillars.map((p, idx) => {
                          const pillarSS = shenShaByPillar[p.pillar] || [];
                          return (
                            <td key={idx} style={{ padding: '4px 2px', background: activeRow === 'shensha' ? '#fffbe6' : hlBg(idx), borderBottom: hlBorder(idx), verticalAlign: 'top' }}>
                              {pillarSS.length === 0 ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                              ) : (
                                pillarSS.map((ss: ShenShaItem, si: number) => (
                                  <div key={si} style={{ margin: '1px 0' }}>
                                    <Tooltip title={ss.desc}>
                                      <Tag
                                        color={ss.type === '吉' ? 'green' : ss.type === '凶' ? 'red' : 'blue'}
                                        style={{ fontSize: 10, margin: 0, cursor: 'pointer' }}
                                      >
                                        {emoji[ss.name] || '🔹'} {ss.name}
                                      </Tag>
                                    </Tooltip>
                                  </div>
                                ))
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );

                    return [row1, row2, row3, row4, row5, row6, row7, row8, row9, row10];
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 日主强弱 + 用神 */}
          {strengthAnalysis && (
            <Card title="日主强弱分析" style={{ marginBottom: 16, borderColor: WX_COLORS[baziData.dayWx] }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Paragraph>
                    <Text strong>日主「{baziData.dayGan}」({baziData.dayWx}) 强弱判断：</Text>
                    <Tag color={strengthAnalysis.level === '身强' ? 'red' : strengthAnalysis.level === '身弱' ? 'blue' : 'green'} style={{ marginLeft: 8, fontSize: 16 }}>
                      {strengthAnalysis.level}
                    </Tag>
                    <Text type="secondary">（得分：{strengthAnalysis.score} / 8）</Text>
                  </Paragraph>
                  {strengthAnalysis.details.map((d, i) => (
                    <Paragraph key={i} style={{ fontSize: 13, marginBottom: 4 }}>{d}</Paragraph>
                  ))}
                </Col>
                <Col xs={24} md={12}>
                  {yongShenRec && (
                    <div style={{ background: '#fdf8f0', padding: 12, borderRadius: 8 }}>
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
                      <Paragraph style={{ fontSize: 12, color: '#888' }}>
                        生活小建议：{yongShenRec.yongShen.map((wx) => {
                          const tips: Record<string, string> = {
                            '木': '多穿绿色衣服，养植物，往东方发展',
                            '火': '多穿红色衣服，用明火做饭，往南方发展',
                            '土': '多穿黄色衣服，接触大自然，稳定在一个地方',
                            '金': '多穿白色衣服，佩戴金属饰品，往西方发展',
                            '水': '多穿蓝色/黑色衣服，多喝水，养鱼，往北方发展',
                          };
                          return tips[wx] || '';
                        }).join('；')}
                      </Paragraph>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          )}

          {/* 五行旺衰统计 */}
          {wxStats && (
            <Card title="五行旺衰统计" style={{ marginBottom: 16 }}>
              <Row gutter={[12, 12]}>
                {Object.entries(wxStats).map(([wx, info]) => (
                  <Col xs={12} sm={4.8} key={wx}>
                    <Card size="small" style={{ background: WX_BG[wx], textAlign: 'center' }}>
                      <Text strong style={{ fontSize: 16, color: WX_COLORS[wx] }}>
                        {WX_ICON[wx]} {wx}
                      </Text>
                      <Progress
                        percent={Math.min(info.count * 15, 100)}
                        size="small"
                        strokeColor={WX_COLORS[wx]}
                        format={() => `${info.count}次`}
                      />
                      <Tag color={info.level === '旺' ? 'red' : info.level === '弱' ? 'blue' : info.level === '缺' ? 'default' : 'green'}>
                        {info.level}
                      </Tag>
                      <Text style={{ fontSize: 11, display: 'block', color: '#666' }}>{info.desc}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* 命格 */}
          <Card title="命格分析" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#fdf8f0' }}>
                  <Title level={2} style={{ color: '#8b4513', marginBottom: 0 }}>{baziData.mingGe.geName}</Title>
                  <Tag color="volcano" style={{ marginTop: 8, fontSize: 14 }}>{baziData.mingGe.geType}</Tag>
                  <Tag color="gold">{baziData.mingGe.score}</Tag>
                </Card>
              </Col>
              <Col xs={24} md={16}>
                <Paragraph style={{ fontSize: 14 }}>{baziData.mingGe.desc}</Paragraph>
                <ul style={{ paddingLeft: 20, fontSize: 13, color: '#555' }}>
                  {baziData.mingGe.details.map((d, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{d}</li>
                  ))}
                </ul>
              </Col>
            </Row>
          </Card>

          {/* 神煞 */}
          <Card title="神煞一览" style={{ marginBottom: 16 }}>
            {baziData.shenSha.length === 0 ? (
              <Alert message="此八字四柱中未发现常见神煞，但不代表不好——平凡也是一种福气。" type="info" showIcon />
            ) : (
              <>
                <Row gutter={[8, 8]}>
                  {baziData.shenSha.map((sha, i) => (
                    <Col xs={24} sm={12} md={8} key={i}>
                      <Card
                        size="small"
                        style={{
                          borderLeft: `4px solid ${sha.type === '吉' ? '#52c41a' : sha.type === '凶' ? '#f44336' : '#1890ff'}`,
                          background: sha.type === '吉' ? '#f6ffed' : sha.type === '凶' ? '#fff2f0' : '#fafafa',
                        }}
                      >
                        <Space>
                          <Tag color={sha.type === '吉' ? 'green' : sha.type === '凶' ? 'red' : 'blue'}>
                            {sha.type}
                          </Tag>
                          <Text strong>{sha.name}</Text>
                          <Tag>{sha.pillar}</Tag>
                        </Space>
                        <Paragraph style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>{sha.desc}</Paragraph>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Card>

          {/* 刑冲合害 */}
          <Card title="刑冲合害关系分析" style={{ marginBottom: 16 }}>
            <Alert
              message="刑冲合害反映了四柱之间的互动关系，是理解命局动态的关键。"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
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
                    <Tag color={r.color === '#52c41a' ? 'green' : r.color === '#f44336' ? 'red' : r.color === '#fa8c16' ? 'orange' : r.color === '#1890ff' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                      {r.subtype}
                    </Tag>
                  </Space>
                  <Paragraph style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>{r.desc}</Paragraph>
                </Card>
              ))
            )}
          </Card>

          {/* 十神组合解读 */}
          {shiShenCombos.length > 0 && (
            <Card title="十神组合解读" style={{ marginBottom: 16 }}>
              {shiShenCombos.map((c, i) => (
                <Paragraph key={i} style={{ fontSize: 13, marginBottom: 8 }}>{c}</Paragraph>
              ))}
            </Card>
          )}

          {/* 大运 */}
          <Card title="大运（一生运势走势）" style={{ marginBottom: 16 }}>
            <Alert message={`起运年龄：${baziData.dayun.startAge}岁 | 排法：${baziData.dayun.direction} | 阳年男/阴年女顺排，阴年男/阳年女逆排`} type="info" showIcon style={{ marginBottom: 12 }} />
            <Row gutter={[8, 8]}>
              {baziData.dayun.steps.map((step, i) => {
                const isCurrent = baziData.dayun.startAge + i * 10 <= currentYear - baziData.birthYear
                  && baziData.dayun.startAge + (i + 1) * 10 >= currentYear - baziData.birthYear;
                return (
                  <Col xs={12} sm={8} md={6} key={i}>
                    <Card size="small" style={{ borderColor: isCurrent ? '#e74c3c' : undefined, background: isCurrent ? '#fff2f0' : undefined }}>
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 16, color: isCurrent ? '#e74c3c' : '#8b4513' }}>{step.ganZhi}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{step.startAge}~{step.endAge}岁</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{step.startYear}~{step.endYear}年</Text>
                        {isCurrent && <Tag color="red">当前大运</Tag>}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <Divider>大运白话解读</Divider>
            {dayunInterpretations.map((d, i) => (
              <Paragraph key={i} style={{ fontSize: 13, marginBottom: 6 }}>{d}</Paragraph>
            ))}
          </Card>

          {/* 流年 */}
          <Card title="流年分析" style={{ marginBottom: 16 }}>
            <Space>
              <InputNumber
                min={1900} max={2100} placeholder={String(currentYear)}
                value={selectedYear} onChange={(v) => setSelectedYear(v || null)}
                style={{ width: 120 }}
              />
              <Button onClick={handleLiunian}>查询流年</Button>
            </Space>
            {liunianResult && (
              <div style={{ marginTop: 12, padding: 12, background: '#f6f6f6', borderRadius: 8 }}>
                <Text>{liunianResult}</Text>
              </div>
            )}
          </Card>

          {/* 流月 */}
          <Card title="流月推算" style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 12 }}>
              <Text strong>选择年份：</Text>
              <InputNumber
                min={1900} max={2100} placeholder={String(currentYear)}
                value={liuYueYear} onChange={(v) => { if (v) handleLiuYue(v); else { setLiuYueYear(null); setLiuYueMonths(null); } }}
                style={{ width: 120 }}
              />
              <Button onClick={() => liuYueYear && handleLiuYue(liuYueYear)}>查看流月</Button>
            </Space>
            {liuYueMonths && (
              <Row gutter={[6, 6]}>
                {liuYueMonths.map((m, i) => {
                  const isGood = m.desc.includes('印星') || m.desc.includes('财运') || m.desc.includes('贵人');
                  const isBad = m.desc.includes('官杀') || m.desc.includes('压力');
                  const bgColor = isGood ? '#f6ffed' : isBad ? '#fff2f0' : '#fafafa';
                  const tagColor = isGood ? 'green' : isBad ? 'red' : 'blue';
                  return (
                    <Col xs={8} sm={6} md={4} key={i}>
                      <Card size="small" style={{ textAlign: 'center', background: bgColor }}>
                        <Text style={{ fontSize: 14 }}>{m.monthName}</Text>
                        <br />
                        <Tag color={WX_COLORS[m.wx]} style={{ fontSize: 13 }}>{m.ganZhi}</Tag>
                        <br />
                        <Text style={{ fontSize: 11, color: isGood ? '#52c41a' : isBad ? '#f44336' : '#888' }}>{m.desc}</Text>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>

          {/* 流日 */}
          <Card title="流日推算" style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 12 }}>
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
                <Row gutter={[4, 4]}>
                  {liuRiDays.map((d) => {
                    const isGood = d.desc === '印生' || d.desc === '财运';
                    const isBad = d.desc === '官杀';
                    const isWeekend = d.desc.includes('周末');
                    return (
                      <Col span={3} key={d.day} style={{ minWidth: 80 }}>
                        <Card size="small" style={{
                          textAlign: 'center',
                          padding: 2,
                          background: isGood ? '#f6ffed' : isBad ? '#fff2f0' : isWeekend ? '#f0f0f0' : '#fff',
                          borderColor: isWeekend ? '#ccc' : undefined,
                        }}>
                          <Text style={{ fontSize: 10, color: '#aaa' }}>{d.day}日</Text>
                          <br />
                          <Text strong style={{ fontSize: 12, color: WX_COLORS[d.wx] }}>{d.ganZhi}</Text>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )}
          </Card>

          {/* ========== 六大领域分析 ========== */}
          <Divider orientation="left" style={{ marginTop: 24 }}>
            <Title level={4} style={{ margin: 0, color: '#8b4513' }}>🔮 六大人生领域分析</Title>
          </Divider>

          {/* 爱情婚姻 */}
          {loveAnalysis && (
            <Card
              title={<><span style={{ fontSize: 18 }}>💕</span> 爱情婚姻</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #e91e63', borderRadius: 8 }}
              styles={{ body: { background: 'linear-gradient(135deg, #fce4ec 0%, #fff 100%)' } }}
            >
              <Paragraph><Text strong>配偶特征：</Text>{loveAnalysis.spouseFeature}</Paragraph>
              <Paragraph><Text strong>婚姻质量：</Text>{loveAnalysis.marriageQuality}</Paragraph>
              <Paragraph><Text strong>桃花运势：</Text>{loveAnalysis.peachBlossom}</Paragraph>
              <Paragraph><Text strong style={{ color: '#e91e63' }}>建议：</Text>{loveAnalysis.advice}</Paragraph>
            </Card>
          )}

          {/* 事业财运 */}
          {careerAnalysis && (
            <Card
              title={<><span style={{ fontSize: 18 }}>💼</span> 事业财运</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #2196f3', borderRadius: 8 }}
              styles={{ body: { background: 'linear-gradient(135deg, #e3f2fd 0%, #fff 100%)' } }}
            >
              <Paragraph><Text strong>事业方向：</Text>{careerAnalysis.direction}</Paragraph>
              <Paragraph><Text strong>赚钱方式：</Text>{careerAnalysis.moneyMethod}</Paragraph>
              <Paragraph><Text strong>财运走势：</Text>{careerAnalysis.fortuneTrend}</Paragraph>
              <Paragraph><Text strong>贵人运：</Text>{careerAnalysis.nobleHelp}</Paragraph>
              <Paragraph><Text strong style={{ color: '#2196f3' }}>建议：</Text>{careerAnalysis.advice}</Paragraph>
            </Card>
          )}

          {/* 身体健康 */}
          {healthAnalysis && (
            <Card
              title={<><span style={{ fontSize: 18 }}>🏥</span> 身体健康</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #4caf50', borderRadius: 8 }}
              styles={{ body: { background: 'linear-gradient(135deg, #e8f5e9 0%, #fff 100%)' } }}
            >
              <Paragraph><Text strong>体质概况：</Text>{healthAnalysis.bodyOverview}</Paragraph>
              <Paragraph><Text strong>需要留意的方面：</Text></Paragraph>
              <ul style={{ paddingLeft: 20 }}>
                {healthAnalysis.concerns.map((c, i) => <li key={i} style={{ marginBottom: 6, fontSize: 14 }}>{c}</li>)}
              </ul>
              <Paragraph><Text strong style={{ color: '#4caf50' }}>养生建议：</Text>{healthAnalysis.wellnessAdvice}</Paragraph>
            </Card>
          )}

          {/* 家庭亲情 */}
          {familyAnalysis && (
            <Card
              title={<><span style={{ fontSize: 18 }}>👨‍👩‍👧</span> 家庭亲情</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #ff9800', borderRadius: 8 }}
              styles={{ body: { background: 'linear-gradient(135deg, #fff3e0 0%, #fff 100%)' } }}
            >
              <Paragraph><Text strong>与父母关系：</Text>{familyAnalysis.parentRelation}</Paragraph>
              <Paragraph><Text strong>兄弟姐妹：</Text>{familyAnalysis.siblings}</Paragraph>
              <Paragraph><Text strong>家庭氛围：</Text>{familyAnalysis.familyAtmosphere}</Paragraph>
              <Paragraph><Text strong style={{ color: '#ff9800' }}>建议：</Text>{familyAnalysis.advice}</Paragraph>
            </Card>
          )}

          {/* 社交朋友 */}
          {socialAnalysis && (
            <Card
              title={<><span style={{ fontSize: 18 }}>🤝</span> 社交朋友</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #9c27b0', borderRadius: 8 }}
              styles={{ body: { background: 'linear-gradient(135deg, #f3e5f5 0%, #fff 100%)' } }}
            >
              <Paragraph><Text strong>社交特质：</Text>{socialAnalysis.socialTrait}</Paragraph>
              <Paragraph><Text strong>朋友质量：</Text>{socialAnalysis.friendQuality}</Paragraph>
              <Paragraph><Text strong>贵人类型：</Text>{socialAnalysis.nobleType}</Paragraph>
              <Paragraph><Text strong style={{ color: '#9c27b0' }}>合伙建议：</Text>{socialAnalysis.partnerAdvice}</Paragraph>
            </Card>
          )}

          {/* 综合运势总览 */}
          {fortuneOverview && (
            <Card
              title={<><span style={{ fontSize: 18 }}>🔮</span> 运势总览</>}
              style={{ marginBottom: 16, borderLeft: '5px solid #e0c27b', borderRadius: 8, borderTop: '2px solid #e0c27b' }}
              styles={{ body: { background: 'linear-gradient(135deg, #fffde7 0%, #fdf8f0 50%, #fff 100%)' } }}
            >
              <Paragraph>
                <Text strong>人生关键词：</Text>
                {fortuneOverview.keywords.map((kw, i) => (
                  <Tag key={i} color="gold" style={{ margin: '0 4px', fontSize: 13 }}>{kw}</Tag>
                ))}
              </Paragraph>
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
          )}
        </>
      )}
    </div>
  );
}
