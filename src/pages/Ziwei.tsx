import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Card, Form, InputNumber, Button, Typography, Row, Col,
  Tag, Space, message, Radio, Alert, Divider, Select, Checkbox,
} from 'antd';
import { useUser } from '../context/UserContext';
import { ziwei } from '@ziweijs/core';
import { Solar, Lunar } from 'lunar-typescript';
import {
  Star, Sun, Moon, Calendar, BookOpen, Sparkles,
  AlertTriangle, Lightbulb, ClipboardList, BarChart3, Home,
} from 'lucide-react';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

// 十二宫白话解释模板
const GONG_PLAIN_TEXT: Record<string, string> = {
  '命宫': '命宫是你的"人生底色"，代表你的性格和命格基调。命宫坐什么星，你就带什么特质。',
  '兄弟': '兄弟宫看你和兄弟姐妹、平辈朋友的关系，也反映合作运和社交圈质量。',
  '夫妻': '夫妻宫决定你的配偶类型和婚姻质量，也看你的合作运。',
  '子女': '子女宫不只是孩子缘分，还代表你的下属、学生、享乐方式和偏财运。',
  '财帛': '财帛宫看赚钱能力和花钱方式——你靠什么赚钱、钱花在哪里。',
  '疾厄': '疾厄宫看身体健康。疾厄宫好不代表不生病，而是生病后恢复快、体质好。',
  '迁移': '迁移宫看外出运、社会形象。迁移宫好的人适合外地发展或经常出差。',
  '交友': '交友宫（仆役宫）看朋友质量和合作伙伴。交友宫有煞星的话合伙要小心。',
  '官禄': '官禄宫是你的事业方向——适合做什么、能做到多高。',
  '田宅': '田宅宫看房产运和家庭环境，也代表你的"根基"稳不稳。',
  '福德': '福德宫是你精神世界的质量。福德宫好的人"会享福"，是打心底里能快乐的人。',
  '父母': '父母宫看与父母的关系，也代表上司和长辈缘，以及你的学历天花板。',
};

// 星曜个性描述
const STAR_PERSONALITY: Record<string, string> = {
  '紫微': '天生有领导气质，自带威严，有主见不随波逐流',
  '天机': '聪明灵活，反应快，善于分析和谋划',
  '太阳': '热情开朗，光明磊落，乐于助人有担当',
  '武曲': '刚强果断，执行力强，适合金融技术等专业',
  '天同': '温和善良，知足常乐，人缘好但有时缺乏上进心',
  '廉贞': '心思细腻，有艺术细胞，但也容易多愁善感',
  '天府': '稳重踏实，有管理才能，是天生的管理者',
  '太阴': '温柔细腻，有文学艺术天赋，性格内向',
  '贪狼': '多才多艺，社交能力强，追求新鲜感',
  '巨门': '善于深度思考，口才好但容易思虑过度',
  '天相': '处事周全，善于协调，是团队中的润滑剂',
  '天梁': '成熟稳重，有长者风范，喜欢帮助别人',
  '七杀': '敢闯敢拼，有开拓精神，适合创业和竞争',
  '破军': '我行我素，不拘一格，有创造力和破坏力双重特质',
};

const MINOR_STAR_DESC: Record<string, string> = {
  '文昌': '读书聪明，文笔好',
  '文曲': '有才艺，口才好',
  '天魁': '有贵人运，得男性贵人相助',
  '天钺': '有贵人运，得女性贵人相助',
  '左辅': '有帮手，团队运好',
  '右弼': '有得力助手',
  '禄存': '有财库，能存住钱',
  '擎羊': '性格刚烈，行动力强但容易冲动',
  '陀罗': '做事慢但稳重，有时拖延',
  '火星': '脾气急，爆发力强',
  '铃星': '内心急躁，但不外露',
  '地空': '想法天马行空，不太实际',
  '地劫': '波折多，需经历风雨才能见彩虹',
  '天马': '奔波劳碌，适合动态工作',
};

// 四化对宫位的影响白话
const SIHUA_EFFECT: Record<string, string> = {
  '禄': '化禄在此宫，这个领域容易有收获和好事发生，是你的福气所在。',
  '权': '化权在此宫，这个领域你有掌控力，适合主动争取。',
  '科': '化科在此宫，这个领域你容易出彩、出名、得人缘。',
  '忌': '化忌在此宫，这个领域需要你格外用心经营，是人生的"功课"。',
};

const SIHUA_COLORS: Record<string, string> = {
  '禄': 'var(--wx-wood)', '权': 'var(--wx-water)', '科': 'var(--wx-earth)', '忌': 'var(--wx-fire)',
};

// 星曜吉凶分类
const JI_STARS = new Set(['紫微','天府','天相','天梁','天同','太阴','太阳','文昌','文曲','天魁','天钺','左辅','右弼','禄存','天马']);
const XIONG_STARS = new Set(['七杀','破军','廉贞','贪狼','巨门','擎羊','陀罗','火星','铃星','地空','地劫']);
const GONG_JI_HINT: Record<string, string> = {
  '命宫': '命自我立，福自己求。吉星是天赋，煞星是功课，都是你独一无二的生命底色',
  '兄弟': '四海之内皆兄弟。星曜聚散，映照你与世界链接的方式',
  '夫妻': '百年修得同船渡。夫妻宫里的每一颗星，都是你爱与被爱的能力',
  '子女': '儿孙自有儿孙福。此宫不止看子息，更看你给予世界的创造力',
  '财帛': '君子爱财，取之有道。财帛宫是你能量的流动，不只是数字的游戏',
  '疾厄': '身安则道隆。疾厄宫不是诅咒，是提醒你爱惜这副行走世间的皮囊',
  '迁移': '读万卷书，行万里路。迁移宫是你看向远方时，世界回望你的眼神',
  '交友': '近朱者赤，近墨者黑。你遇到的人，都是你当下频率吸引来的镜子',
  '官禄': '在其位，谋其政。官禄宫不是职位高低，而是你为世界贡献价值的方式',
  '田宅': '此心安处是吾乡。田宅宫是你的根——根深才能叶茂，心安即是归处',
  '福德': '知足者富，自胜者强。福德宫是你内心的花园，种什么因，得什么果',
  '父母': '身体发肤，受之父母。此宫承载着你来时的路，也映照着你去往的方向',
};

// 哲理名言
const PHILOSOPHY_QUOTES = [
  '「知人者智，自知者明」—— 老子',
  '「命由己造，相由心生」—— 《了凡四训》',
  '「天行健，君子以自强不息」—— 《易经》',
  '「祸兮福之所倚，福兮祸之所伏」—— 老子',
  '「积善之家，必有余庆」—— 《易经》',
];

function getRandomQuote(): string {
  return PHILOSOPHY_QUOTES[Math.floor(Math.random() * PHILOSOPHY_QUOTES.length)];
}

function getPalaceScore(gong: any): { level: '吉' | '中' | '凶'; jiCount: number; xiongCount: number; sihuaGood: number; sihuaBad: number } {
  let jiCount = 0, xiongCount = 0, sihuaGood = 0, sihuaBad = 0;
  const stars = [...(gong.majorStars || []), ...(gong.minorStars || []).map((s: string) => ({ name: s, sihua: null }))];
  for (const s of stars) {
    if (JI_STARS.has(s.name)) jiCount++;
    if (XIONG_STARS.has(s.name)) xiongCount++;
    if (s.sihua === '禄' || s.sihua === '权' || s.sihua === '科') sihuaGood++;
    if (s.sihua === '忌') sihuaBad++;
  }
  const score = (jiCount + sihuaGood * 2) - (xiongCount + sihuaBad * 2);
  if (score >= 2) return { level: '吉', jiCount, xiongCount, sihuaGood, sihuaBad };
  if (score <= -1) return { level: '凶', jiCount, xiongCount, sihuaGood, sihuaBad };
  return { level: '中', jiCount, xiongCount, sihuaGood, sihuaBad };
}

const PALACE_LEVEL_STYLE: Record<string, { border: string; bg: string; tag: string }> = {
  '吉': { border: '2px solid rgba(91,140,90,0.3)', bg: 'rgba(91,140,90,0.03)', tag: '#5B8C5A' },
  '中': { border: '1px solid var(--border-light)', bg: 'var(--bg-card-solid)', tag: 'var(--text-secondary)' },
  '凶': { border: '2px solid rgba(199,91,91,0.25)', bg: 'rgba(199,91,91,0.03)', tag: '#C75B5B' },
};

// SVG星图组件 — 圆形十二宫命盘
function StarChart({ gongData, mingGongName, shenGongName, solarDate, lunisolarDate, fiveElementName, gender }: {
  gongData: any[]; mingGongName: string; shenGongName: string;
  solarDate: string; lunisolarDate: string; fiveElementName: string; gender: string;
}) {
  const cx = 260, cy = 260, outerR = 240, innerR = 100;
  const midR = (outerR + innerR) / 2;

  // 按名称索引宫位
  const gongMap: Record<string, any> = {};
  for (const g of gongData) gongMap[g.name] = g;

  // 顺时针排列十二宫，从顶部(午位)开始
  const GONG_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

  const orderedGongs = GONG_ORDER.map(name => gongMap[name]).filter(Boolean);

  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const getSectorPath = (i: number) => {
    const startDeg = -90 + i * 30;
    const endDeg = startDeg + 30;
    const sr = degToRad(startDeg), er = degToRad(endDeg);
    const x1o = cx + outerR * Math.cos(sr), y1o = cy + outerR * Math.sin(sr);
    const x2o = cx + outerR * Math.cos(er), y2o = cy + outerR * Math.sin(er);
    const x1i = cx + innerR * Math.cos(sr), y1i = cy + innerR * Math.sin(sr);
    const x2i = cx + innerR * Math.cos(er), y2i = cy + innerR * Math.sin(er);
    const largeArc = 0;
    return `M${x1o},${y1o} A${outerR},${outerR} 0 ${largeArc},1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 ${largeArc},0 ${x1i},${y1i} Z`;
  };

  const getTextPos = (i: number, r: number) => {
    const midDeg = -90 + i * 30 + 15;
    const rad = degToRad(midDeg);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  // 获取四化颜色
  const sihuaColors: Record<string, string> = { '禄': 'var(--wx-wood)', '权': 'var(--wx-water)', '科': 'var(--wx-earth)', '忌': 'var(--wx-fire)' };

  const starColor = (star: any) => {
    if (star.sihua) return sihuaColors[star.sihua] || 'var(--text-secondary)';
    return 'var(--text-primary)';
  };

  return (
    <svg viewBox="0 0 520 520" width="100%" style={{ maxWidth: 520, display: 'block', margin: '0 auto' }}>
      {/* 外圈装饰 */}
      <circle cx={cx} cy={cy} r={outerR + 6} fill="none" stroke="var(--border-light)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--border-light)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--border-light)" strokeWidth={1} />

      {/* 十二宫扇形 */}
      {orderedGongs.map((gong, i) => {
        const isMing = gong?.name === '命宫';
        const isShen = gong?.isShenGong;
        const majorStars = gong?.majorStars || [];
        const minorStars = gong?.minorStars || [];
        const labelPos = getTextPos(i, outerR - 28);
        const starPos = getTextPos(i, midR + 10);
        const stemPos = getTextPos(i, outerR - 50);

        return (
          <g key={i}>
            {/* 扇形背景 */}
            <path
              d={getSectorPath(i)}
              fill={isMing ? 'rgba(0,0,0,0.04)' : isShen ? 'rgba(196,164,90,0.04)' : 'rgba(0,0,0,0.01)'}
              stroke="var(--border-light)"
              strokeWidth={0.5}
            />

            {/* 分隔线 */}
            {i < 12 && (
              <line
                x1={cx + innerR * Math.cos(degToRad(-90 + i * 30))}
                y1={cy + innerR * Math.sin(degToRad(-90 + i * 30))}
                x2={cx + outerR * Math.cos(degToRad(-90 + i * 30))}
                y2={cy + outerR * Math.sin(degToRad(-90 + i * 30))}
                stroke="var(--border-light)"
                strokeWidth={0.5}
              />
            )}

            {/* 干支 */}
            <text x={stemPos.x} y={stemPos.y} textAnchor="middle" fontSize={10}
              fill="var(--text-secondary)" fontFamily="var(--font-display)">
              {gong?.stem}{gong?.branch}
            </text>

            {/* 宫名 */}
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle"
              fontSize={isMing ? 15 : 13}
              fontWeight={isMing ? 700 : 500}
              fill={isMing ? 'var(--text-primary)' : 'var(--text-primary)'}
              fontFamily="var(--font-display)">
              {gong?.name}宫
              {isShen ? '·身' : ''}
            </text>

            {/* 主星 */}
            {majorStars.slice(0, 3).map((s: any, si: number) => (
              <text key={`ms-${si}`} x={starPos.x} y={starPos.y + si * 15} textAnchor="middle"
                fontSize={11} fontWeight={600} fill={starColor(s)} fontFamily="var(--font-display)">
                {s.name}{s.sihua ? `化${s.sihua}` : ''}
              </text>
            ))}

            {/* 辅星(简略) */}
            {minorStars.length > 0 && majorStars.length < 2 && (
              <text x={starPos.x} y={starPos.y + (majorStars.length || 0) * 15 + 2} textAnchor="middle"
                fontSize={9} fill="var(--text-secondary)">
                {minorStars.slice(0, 3).join(' ')}
              </text>
            )}
          </g>
        );
      })}

      {/* 中心信息 */}
      <text x={cx} y={cy - 36} textAnchor="middle" fontSize={13} fontWeight={600}
        fill="var(--text-primary)" fontFamily="var(--font-display)">紫微斗数</text>
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={11}
        fill="var(--text-body)">命宫：{mingGongName}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={11}
        fill="var(--text-body)">身宫：{shenGongName}</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize={11}
        fill="var(--text-body)">五行局：{fiveElementName}</text>
      <text x={cx} y={cy + 46} textAnchor="middle" fontSize={10}
        fill="var(--text-secondary)">{solarDate}</text>

      {/* 内圈装饰 */}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="none" stroke="var(--border-light)" strokeWidth={0.5} strokeDasharray="4,4" />
    </svg>
  );
}

export default function Ziwei() {
  const { profile, currentUser, addHistory } = useUser();
const navigate = useNavigate();
  const [form] = Form.useForm();
  const [ziweiData, setZiweiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');
  const [isLeapMonth, setIsLeapMonth] = useState(false);

  // 自动填入档案
  useEffect(() => {
    if (currentUser && !ziweiData) {
      const cal = currentUser.birthCalendar || 'solar';
      if (cal === 'lunar') {
        setCalendarType('lunar');
      }
      form.setFieldsValue({
        gender: currentUser.gender === '男' ? 'male' : 'female',
        year: currentUser.birthYear,
        month: currentUser.birthMonth,
        day: currentUser.birthDay,
        hour: currentUser.birthHour,
        minute: currentUser.birthMinute,
      });
    }
  }, [currentUser]);

  const generateYearOptions = () => {
    const options = [];
    for (let y = 2026; y >= 1900; y--) options.push({ value: y, label: String(y) });
    return options;
  };

  const handleCalc = () => {
    const values = form.getFieldsValue();
    const { year, month, day, hour, minute, gender } = values;

    if (!year || !month || !day || hour === undefined) {
      message.warning('请填写完整的出生信息');
      return;
    }

    setLoading(true);
    try {
      const calcHour = hour;
      const calcMinute = minute || 0;

      const birthDate = new Date(year, month - 1, day, calcHour, calcMinute, 0);

      // 用 lunar-typescript 获取公历/农历对照
      let sol: Solar;
      let lu: Lunar;
      let solarDateStr: string;
      let lunisolarDateStr: string;

      if (calendarType === 'solar') {
        sol = Solar.fromYmdHms(year, month, day, calcHour, calcMinute, 0);
        lu = sol.getLunar();
        solarDateStr = `${year}年${month}月${day}日 ${String(calcHour).padStart(2, '0')}:${String(calcMinute).padStart(2, '0')}`;
        lunisolarDateStr = `农历${lu.getYearInChinese()}年 ${lu.getMonthInChinese()}月 ${lu.getDayInChinese()}日 ${lu.getTimeZhi()}时`;
      } else {
        // 农历输入
        const m = isLeapMonth ? -(month) : month;
        lu = Lunar.fromYmdHms(year, m, day, calcHour, calcMinute, 0);
        sol = lu.getSolar();
        solarDateStr = `${sol.getYear()}年${sol.getMonth()}月${sol.getDay()}日 ${String(calcHour).padStart(2, '0')}:${String(calcMinute).padStart(2, '0')}`;
        lunisolarDateStr = `农历${lu.getYearInChinese()}年 ${lu.getMonthInChinese()}月 ${lu.getDayInChinese()}日 ${lu.getTimeZhi()}时`;
      }

      // 使用 @ziweijs/core 排盘
      const result = ziwei.bySolar({
        name: '',
        gender: gender || 'male',
        date: birthDate,
        language: 'zh-CN',
        longitude: 120,
      } as any);

      const gongData = result.palaces.map((p: any) => ({
        name: p.name,
        stem: p.stem,
        branch: p.branch,
        isLaiYin: p.isLaiYin,
        isShenGong: p.isShenGong,
        majorStars: (p.majorStars || []).map((s: any) => ({
          name: s.name,
          type: s.type,
          sihua: s.ST?.CF?.name || null,
        })),
        minorStars: (p.minorStars || []).map((s: any) => s.name),
      }));

      // 找命宫和身宫
      const mingGong = gongData.find((g: any) => g.name === '命宫');
      const shenGong = gongData.find((g: any) => (g as any).isShenGong);

      // 生成命盘总结
      const highlights: string[] = [];
      const warnings: string[] = [];

      for (const gong of gongData) {
        const majorStars = gong.majorStars || [];
        const minorStars = gong.minorStars || [];
        const allStars = [...majorStars.map((s: any) => s.name), ...minorStars];

        // 命宫亮点
        if (gong.name === '命宫' && majorStars.length > 0) {
          const mainStar = majorStars[0];
          if (STAR_PERSONALITY[mainStar.name]) {
            highlights.push(`${mainStar.name}坐命 —— ${STAR_PERSONALITY[mainStar.name]}`);
          }
        }
        // 财帛宫
        if (gong.name === '财帛' && allStars.some((s: string) => ['武曲', '天府', '禄存'].includes(s))) {
          highlights.push('财帛宫有财星坐守，理财能力强，能存住钱');
        }
        // 官禄宫
        if (gong.name === '官禄' && allStars.some((s: string) => ['紫微', '天府', '天相'].includes(s))) {
          highlights.push('官禄宫有贵星，事业上适合管理岗位或进入体制');
        }
        // 夫妻宫
        if (gong.name === '夫妻' && allStars.some((s: string) => ['天相', '天同', '太阴'].includes(s))) {
          highlights.push('夫妻宫有吉星，婚姻稳定，配偶条件不错');
        }
        // 疾厄宫警示
        if (gong.name === '疾厄' && allStars.some((s: string) => ['七杀', '破军', '廉贞', '擎羊', '火星'].includes(s))) {
          warnings.push('疾厄宫有煞星，注意意外伤害和定期体检');
        }
        // 交友宫警示
        if (gong.name === '交友' && allStars.some((s: string) => ['擎羊', '陀罗', '火星', '铃星'].includes(s))) {
          warnings.push('交友宫有煞星，合伙要小心，容易遇人不淑');
        }
      }

      // 福德宫
      const fuDeGong = gongData.find((g: any) => g.name === '福德');
      if (fuDeGong) {
        const fStars = [...(fuDeGong.majorStars || []).map((s: any) => s.name), ...(fuDeGong.minorStars || [])];
        if (fStars.some((s: string) => ['天同', '天梁', '太阴'].includes(s))) {
          highlights.push('福德宫有吉星，心态好会享福，是打心底里能快乐的人');
        }
      }

      // 命宫四化
      if (mingGong) {
        const mStars = mingGong.majorStars || [];
        for (const s of mStars) {
          if (s.sihua === '禄') highlights.push('命宫化禄——天生好运气，福气满满');
          if (s.sihua === '权') highlights.push('命宫化权——有领导才能，做事有魄力');
          if (s.sihua === '科') highlights.push('命宫化科——有才艺和名声，受人喜欢');
          if (s.sihua === '忌') warnings.push('命宫化忌——需要更加努力才能获得认可，但也会让你更坚韧');
        }
      }

      if (warnings.length === 0) warnings.push('各宫整体格局较好，无特别需要警惕之处');

      setZiweiData({
        gongData,
        solarDate: solarDateStr,
        lunisolarDate: lunisolarDateStr,
        fiveElementName: result.fiveElementName,
        ziweiBranch: result.ziweiBranch,
        gender: gender || 'male',
        mingGongName: mingGong ? `${mingGong.stem}${mingGong.branch}` : '—',
        shenGongName: shenGong ? `${(shenGong as any).stem}${(shenGong as any).branch}` : '—',
        highlights: highlights.length > 0 ? highlights : ['命盘格局清朗，各方面较为均衡'],
        warnings,
      });

      message.success('紫微斗数排盘完成');
      addHistory({
        userId: currentUser?.id || '',
        module: 'ziwei',
        queryParams: { year, month, day, hour, minute, gender },
        resultSummary: `紫微斗数：命宫${mingGong?.majorStars?.map((s: any) => s.name).join('、') || '—'} 身宫${shenGong?.majorStars?.map((s: any) => s.name).join('、') || '—'}`,
      });
    } catch (e: any) {
      console.error(e);
      message.error('计算失败：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const getStarColor = (star: any): string => {
    if (star.sihua) return SIHUA_COLORS[star.sihua] || 'var(--text-secondary)';
    if (JI_STARS.has(star.name)) return 'green';
    if (XIONG_STARS.has(star.name)) return 'red';
    return 'default';
  };

  // 生成某宫的白话解读
  const getGongExplanation = (gong: any) => {
    const base = GONG_PLAIN_TEXT[gong.name] || `${gong.name}宫是命盘中的重要组成部分。`;
    const majorStars = gong.majorStars || [];
    const minorStars = gong.minorStars || [];
    const score = getPalaceScore(gong);

    // 开头：直白结论
    const verdicts: Record<string, string[]> = {
      '吉': [
        `整体来看，你的${gong.name}宫格局较好，是这个命盘的亮点之一。`,
        `你的${gong.name}宫吉星汇聚，在这一方面有天然优势。`,
        `${gong.name}宫星曜清朗，在这个领域你比大多数人顺利。`,
      ],
      '凶': [
        `你的${gong.name}宫煞星较重，这个领域是人生中需要多花心思经营的地方。`,
        `${gong.name}宫挑战较多，但记住——煞星也是成就一个人的磨刀石。`,
        `${gong.name}宫波折较多，早经历、早成长，晚景反而更稳健。`,
      ],
      '中': [
        `你的${gong.name}宫吉凶参半，有好有坏，整体还算平稳。`,
        `${gong.name}宫中规中矩，不算突出也不算差，知足常乐。`,
      ],
    };
    const verdictList = verdicts[score.level] || verdicts['中'];
    const verdict = verdictList[Math.floor(Math.random() * verdictList.length)];

    const parts: string[] = ['<strong>' + verdict + '</strong> ' + base];

    if (majorStars.length > 0) {
      const starNames = majorStars.map((s: any) => {
        let name = s.name;
        if (s.sihua) name += `化${s.sihua}`;
        return name;
      }).join('、');
      parts.push(`${starNames}坐${gong.name}宫，`);

      const mainStar = majorStars[0];
      if (STAR_PERSONALITY[mainStar.name]) {
        parts.push(STAR_PERSONALITY[mainStar.name] + '。');
      }
    }

    if (minorStars.length > 0) {
      const descs = minorStars.filter((s: string) => MINOR_STAR_DESC[s]).map((s: string) => MINOR_STAR_DESC[s]);
      if (descs.length > 0) {
        parts.push(`加上${descs.join('、')}，更添助力。`);
      }
    }

    if (majorStars.length === 0 && minorStars.length === 0) {
      parts.push('此宫为空宫，需借对宫星曜来参考，不代表不好——空宫的弹性更大。');
    }

    // 检查四化
    for (const s of majorStars) {
      if (s.sihua && SIHUA_EFFECT[s.sihua]) {
        parts.push(SIHUA_EFFECT[s.sihua]);
      }
    }

    // 添加哲理性结语
    if (GONG_JI_HINT[gong.name]) {
      parts.push(` ${GONG_JI_HINT[gong.name]}。`);
    }

    return parts.join('');
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--text-2xl)' }}>紫微斗数</Title>

      {currentUser ? (
        <Alert
          message={<span><ClipboardList size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />当前使用档案：<strong>{currentUser.name}</strong>（{currentUser.gender}·{currentUser.birthCalendar === 'solar' ? '公历' : '农历'}·{currentUser.birthYear}.{currentUser.birthMonth}.{currentUser.birthDay}）</span>}
          type="success" showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" type="link" onClick={() => navigate('/profile')}>切换档案</Button>}
        />
      ) : (
        <Alert
          message={<span><Lightbulb size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />创建个人档案后，可一键自动填入，无需每次手动输入。</span>}
          type="info" showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" type="primary" onClick={() => navigate('/profile')}>立即创建</Button>}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical"
          initialValues={{
            gender: profile.gender, year: profile.birthYear,
            month: profile.birthMonth, day: profile.birthDay,
            hour: profile.birthHour, minute: profile.birthMinute,
          }}>
          {/* 公历/农历切换 */}
          <Form.Item label="时间类型" style={{ marginBottom: 12 }}>
            <Radio.Group value={calendarType} onChange={(e) => { setCalendarType(e.target.value); form.resetFields(['month', 'day']); }}>
              <Radio.Button value="solar"><Sun size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />公历</Radio.Button>
              <Radio.Button value="lunar"><Moon size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />农历</Radio.Button>
            </Radio.Group>
            {calendarType === 'lunar' && (
              <Checkbox
                checked={isLeapMonth}
                onChange={(e) => setIsLeapMonth(e.target.checked)}
                style={{ marginLeft: 16 }}
              >
                闰月
              </Checkbox>
            )}
          </Form.Item>

          <Row gutter={16}>
            <Col xs={12} sm={4}>
              <Form.Item name="gender" label="性别">
                <Radio.Group>
                  <Radio.Button value="male">男</Radio.Button>
                  <Radio.Button value="female">女</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Item name="year" label="年" rules={[{ required: true }]}>
                <Select
                  placeholder="选择年份"
                  showSearch
                  options={generateYearOptions()}
                  filterOption={(input, option) => (option?.label as string)?.includes(input)}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={3}>
              <Form.Item name="month" label="月" rules={[{ required: true }]}>
                <Select placeholder="选择月份"
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: calendarType === 'lunar'
                      ? `${i + 1}月${isLeapMonth && i === (form.getFieldValue('month') || 1) - 1 ? '(闰)' : ''}`
                      : `${i + 1}月`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={3}>
              <Form.Item name="day" label="日" rules={[{ required: true }]}>
                <Select placeholder="选择日期"
                  options={Array.from({ length: calendarType === 'solar' ? 31 : 30 }, (_, i) => ({
                    value: i + 1, label: `${i + 1}日`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Item name="hour" label="时" rules={[{ required: true }]}>
                <Select placeholder="选择时辰"
                  options={[
                    { value: 0, label: '0时(子时)' }, { value: 1, label: '1时(丑时)' },
                    { value: 2, label: '2时(丑时)' }, { value: 3, label: '3时(寅时)' },
                    { value: 4, label: '4时(寅时)' }, { value: 5, label: '5时(卯时)' },
                    { value: 6, label: '6时(卯时)' }, { value: 7, label: '7时(辰时)' },
                    { value: 8, label: '8时(辰时)' }, { value: 9, label: '9时(巳时)' },
                    { value: 10, label: '10时(巳时)' }, { value: 11, label: '11时(午时)' },
                    { value: 12, label: '12时(午时)' }, { value: 13, label: '13时(未时)' },
                    { value: 14, label: '14时(未时)' }, { value: 15, label: '15时(申时)' },
                    { value: 16, label: '16时(申时)' }, { value: 17, label: '17时(酉时)' },
                    { value: 18, label: '18时(酉时)' }, { value: 19, label: '19时(戌时)' },
                    { value: 20, label: '20时(戌时)' }, { value: 21, label: '21时(亥时)' },
                    { value: 22, label: '22时(亥时)' }, { value: 23, label: '23时(子时)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Item name="minute" label="分">
                <InputNumber min={0} max={59} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" onClick={handleCalc} loading={loading} size="large">紫微排盘</Button>
        </Form>
      </Card>

      {ziweiData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* 结果头部：公历+农历对照 */}
          <Card style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                <Calendar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />出生时间
              </Title>
              <Space direction="vertical" size={4}>
                <Text strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>公历：{ziweiData.solarDate}</Text>
                <Text strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>农历：{ziweiData.lunisolarDate}</Text>
                <Text style={{ color: 'var(--text-body)' }}>
                  性别：{ziweiData.gender === 'male' ? '男' : '女'} |
                  命宫：{ziweiData.mingGongName} |
                  身宫：{ziweiData.shenGongName} |
                  五行局：{ziweiData.fiveElementName}
                </Text>
                <Text type="secondary">紫微在{ziweiData.ziweiBranch}宫</Text>
              </Space>
            </div>
          </Card>

          {/* 哲理引言 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card style={{
              marginBottom: 16,
              border: '1px solid rgba(196,164,90,0.2)',
              background: 'linear-gradient(135deg, rgba(196,164,90,0.04) 0%, rgba(255,255,255,0.6) 100%)',
              textAlign: 'center',
            }}>
              <Text style={{
                fontSize: 14,
                color: 'var(--wx-earth)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
              }}>
                {getRandomQuote()}
              </Text>
            </Card>
          </motion.div>

          {/* SVG星图命盘 */}
          <Card title={<span style={{ color: 'var(--text-primary)' }}>命盘星图</span>} style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}>
            <StarChart
              gongData={ziweiData.gongData}
              mingGongName={ziweiData.mingGongName}
              shenGongName={ziweiData.shenGongName}
              solarDate={ziweiData.solarDate}
              lunisolarDate={ziweiData.lunisolarDate}
              fiveElementName={ziweiData.fiveElementName}
              gender={ziweiData.gender}
            />
          </Card>

          {/* 命盘总评 — 一句话看懂好坏 */}
          {(() => {
            const results = ziweiData.gongData.map((g: any) => ({ name: g.name, ...getPalaceScore(g) }));
            const jiCount = results.filter((r: { level: string }) => r.level === '吉').length;
            const xiongCount = results.filter((r: { level: string }) => r.level === '凶').length;
            const zhongCount = results.filter((r: { level: string }) => r.level === '中').length;
            const jiNames = results.filter((r: { level: string }) => r.level === '吉').map((r: { name: string }) => r.name);
            const xiongNames = results.filter((r: { level: string }) => r.level === '凶').map((r: { name: string }) => r.name);

            let grade: string; let gradeColor: string; let gradeBg: string; let summary: string;
            if (jiCount >= 6) {
              grade = '上等'; gradeColor = '#5B8C5A'; gradeBg = 'rgba(91,140,90,0.08)';
              summary = '命盘整体格局优良，多宫吉星汇聚。你天生底子好，在多个领域都有不错的运势。吉星是天赋，善加利用可成大器。';
            } else if (jiCount >= 4 && xiongCount <= 3) {
              grade = '中上'; gradeColor = '#5B8C5A'; gradeBg = 'rgba(91,140,90,0.06)';
              summary = '命盘中等偏上，吉多于凶。大部分领域较为顺利，少数领域需要多下功夫。整体来说是一副不错的牌。';
            } else if (jiCount >= 2 && xiongCount <= 4) {
              grade = '中等'; gradeColor = '#C4A45A'; gradeBg = 'rgba(196,164,90,0.06)';
              summary = '命盘吉凶参半，有好有坏。不算一帆风顺，但也不是寸步难行。吉星是你的筹码，煞星是你的老师——这副牌怎么打，看你自己。';
            } else if (xiongCount >= 5) {
              grade = '中下'; gradeColor = '#C75B5B'; gradeBg = 'rgba(199,91,91,0.06)';
              summary = '命盘煞星偏多，人生磨砺较多。但请记住——历史上成就大业者，往往命盘煞重。煞星不是诅咒，是逼你变强的磨刀石。宝剑锋从磨砺出。';
            } else {
              grade = '中等'; gradeColor = '#C4A45A'; gradeBg = 'rgba(196,164,90,0.06)';
              summary = '命盘中规中矩，平稳是最大的福气。不求大富大贵，但求岁岁平安。知足常乐，平安是福。';
            }

            return (
              <Card style={{
                marginBottom: 16,
                border: `2px solid ${gradeColor}`,
                background: gradeBg,
              }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Tag style={{
                    fontSize: 18, fontWeight: 700, padding: '4px 16px',
                    background: gradeColor, color: '#fff', border: 'none', borderRadius: 8,
                  }}>
                    {grade}
                  </Tag>
                  <Text style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
                    {jiCount}宫吉 · {zhongCount}宫平 · {xiongCount}宫凶
                  </Text>
                </div>
                <Paragraph style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-body)', marginBottom: 12 }}>
                  {summary}
                </Paragraph>
                <Row gutter={[12, 8]}>
                  {jiNames.length > 0 && (
                    <Col span={12}>
                      <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '8px 12px' }}>
                        <Text strong style={{ color: '#5B8C5A', fontSize: 12 }}>优势领域：</Text>
                        <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{jiNames.join('、')}</Text>
                      </div>
                    </Col>
                  )}
                  {xiongNames.length > 0 && (
                    <Col span={12}>
                      <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '8px 12px' }}>
                        <Text strong style={{ color: '#C75B5B', fontSize: 12 }}>需注意的领域：</Text>
                        <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{xiongNames.join('、')}</Text>
                      </div>
                    </Col>
                  )}
                </Row>
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <Text style={{ fontSize: 11, color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                    {getRandomQuote()}
                  </Text>
                </div>
              </Card>
            );
          })()}

          {/* 十二宫详解 — 传统四列布局 */}
          <Card
            title={<span style={{ color: 'var(--text-primary)' }}>十二宫详解</span>}
            style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}
            extra={
              <Space size={8}>
                <Tag color="green" style={{ fontSize: 11 }}>吉星</Tag>
                <Tag color="red" style={{ fontSize: 11 }}>煞星</Tag>
                <Tag style={{ fontSize: 11, background: 'var(--wx-wood)', color: '#fff', border: 'none' }}>禄</Tag>
                <Tag style={{ fontSize: 11, background: 'var(--wx-water)', color: '#fff', border: 'none' }}>权</Tag>
                <Tag style={{ fontSize: 11, background: 'var(--wx-earth)', color: '#fff', border: 'none' }}>科</Tag>
                <Tag style={{ fontSize: 11, background: 'var(--wx-fire)', color: '#fff', border: 'none' }}>忌</Tag>
              </Space>
            }
          >
            {(() => {
              const gongMap: Record<string, any> = {};
              for (const g of ziweiData.gongData) gongMap[g.name] = g;

              // 传统紫微斗数四列布局，绝对定位确保对称
              // 列1      列2      列3      列4
              // 兄弟     命宫     父母     福德     ← 上排
              // 夫妻     [ 道 ]   [ 道 ]   田宅     ← 中上
              // 子女     [ 道 ]   [ 道 ]   官禄     ← 中下
              // 财帛     疾厄     迁移     交友     ← 下排
              const placements: { gong: any; row: number; col: number }[] = [
                { gong: gongMap['兄弟'], row: 1, col: 1 },
                { gong: gongMap['命宫'], row: 1, col: 2 },
                { gong: gongMap['父母'], row: 1, col: 3 },
                { gong: gongMap['福德'], row: 1, col: 4 },
                { gong: gongMap['夫妻'], row: 2, col: 1 },
                { gong: gongMap['田宅'], row: 2, col: 4 },
                { gong: gongMap['子女'], row: 3, col: 1 },
                { gong: gongMap['官禄'], row: 3, col: 4 },
                { gong: gongMap['财帛'], row: 4, col: 1 },
                { gong: gongMap['疾厄'], row: 4, col: 2 },
                { gong: gongMap['迁移'], row: 4, col: 3 },
                { gong: gongMap['交友'], row: 4, col: 4 },
              ];

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gridTemplateRows: 'auto auto auto auto',
                  gap: 8,
                }}>
                  {/* 中心装饰 */}
                  <motion.div
                    key="center-deco"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      gridRow: '2 / 4',
                      gridColumn: '2 / 4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, rgba(196,164,90,0.05) 0%, rgba(0,0,0,0.02) 100%)',
                      border: '1px dashed rgba(196,164,90,0.15)',
                      minHeight: 100,
                    }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                      >
                        <span style={{
                          fontSize: 36,
                          fontFamily: 'var(--font-display)',
                          color: 'rgba(196,164,90,0.3)',
                          lineHeight: 1,
                          userSelect: 'none',
                        }}>
                          道
                        </span>
                      </motion.div>
                      <Text style={{
                        fontSize: 10,
                        color: 'var(--text-disabled)',
                        marginTop: 4,
                        letterSpacing: '0.04em',
                      }}>
                        一阴一阳之谓道
                      </Text>
                    </div>
                  </motion.div>

                  {/* 十二宫卡片 */}
                  {placements.map(({ gong, row, col }, idx) => {
                    const score = getPalaceScore(gong);
                    const style = PALACE_LEVEL_STYLE[score.level];
                    const isMing = gong.name === '命宫';
                    const isShen = gong.isShenGong;
                    const majorStars = gong.majorStars || [];
                    const minorStars = gong.minorStars || [];

                    return (
                      <motion.div
                        key={gong.name}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.35, ease: 'easeOut' }}
                        className={isMing ? 'ming-pulse' : ''}
                        style={{
                          gridRow: row,
                          gridColumn: col,
                          border: isMing ? style.border : `1px solid var(--border-light)`,
                          borderLeft: `3px solid ${style.tag}`,
                          borderRadius: 10,
                          background: isMing ? style.bg : 'var(--bg-card-solid)',
                          padding: '10px 12px',
                          position: 'relative',
                        }}
                      >
                            {/* 标题栏 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <Text strong style={{
                                fontSize: 13,
                                color: isMing ? 'var(--wx-fire)' : 'var(--text-primary)',
                              }}>
                                {gong.name}
                              </Text>
                              <Space size={2}>
                                {isMing && <Tag style={{ fontSize: 10, background: 'rgba(199,91,91,0.1)', color: 'var(--wx-fire)', border: 'none', padding: '0 4px', lineHeight: '16px' }}>命</Tag>}
                                {isShen && <Tag style={{ fontSize: 10, background: 'rgba(196,164,90,0.1)', color: 'var(--wx-earth)', border: 'none', padding: '0 4px', lineHeight: '16px' }}>身</Tag>}
                                <Tag style={{
                                  fontSize: 10, padding: '0 4px', lineHeight: '16px',
                                  background: score.level === '吉' ? 'rgba(91,140,90,0.1)' : score.level === '凶' ? 'rgba(199,91,91,0.1)' : 'rgba(0,0,0,0.04)',
                                  color: style.tag, border: 'none',
                                }}>
                                  {score.level}
                                </Tag>
                              </Space>
                            </div>

                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
                              {gong.stem}{gong.branch}宫
                            </Text>

                            {/* 星曜 */}
                            <div style={{ marginBottom: 4 }}>
                              {majorStars.length > 0 ? majorStars.map((s: any, i: number) => (
                                <Tag key={`ms-${i}`} color={getStarColor(s)} style={{ fontSize: 10, marginBottom: 2, padding: '0 4px' }}>
                                  {s.name}{s.sihua ? `化${s.sihua}` : ''}
                                </Tag>
                              )) : <Tag style={{ fontSize: 10, padding: '0 4px' }}>空宫</Tag>}
                              {minorStars.filter((s: string) => JI_STARS.has(s) || XIONG_STARS.has(s)).slice(0, 2).map((s: string, i: number) => (
                                <Tag key={`ns-${i}`} color={JI_STARS.has(s) ? 'green' : 'red'} style={{ fontSize: 10, marginBottom: 2, padding: '0 4px' }}>
                                  {s}
                                </Tag>
                              ))}
                              {minorStars.filter((s: string) => !JI_STARS.has(s) && !XIONG_STARS.has(s)).length > 0 && (
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                  +{minorStars.filter((s: string) => !JI_STARS.has(s) && !XIONG_STARS.has(s)).length}辅
                                </Text>
                              )}
                            </div>

                            {/* 一句话提示 */}
                            <Text style={{ fontSize: 10, color: 'var(--text-disabled)', lineHeight: 1.4 }}>
                              {GONG_JI_HINT[gong.name]}
                            </Text>
                          </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

          {/* 十二宫白话解读 */}
          <Card title={<span style={{ color: 'var(--text-primary)' }}>各宫白话解读</span>} style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}>
            {ziweiData.gongData.map((gong: any, idx: number) => {
              const score = getPalaceScore(gong);
              const style = PALACE_LEVEL_STYLE[score.level];
              return (
                <div key={idx} style={{
                  padding: '12px 14px',
                  borderBottom: idx < ziweiData.gongData.length - 1 ? '1px solid var(--border-light)' : 'none',
                  borderLeft: `4px solid ${style.tag}`,
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                  marginBottom: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <Text strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{gong.name}宫</Text>
                    <Tag style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                      background: score.level === '吉' ? '#5B8C5A' : score.level === '凶' ? '#C75B5B' : '#C4A45A',
                      color: '#fff', border: 'none',
                    }}>
                      {score.level === '吉' ? '好' : score.level === '凶' ? '注意' : '平稳'}
                    </Tag>
                    <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      吉星 {score.jiCount} · 煞星 {score.xiongCount}
                      {score.sihuaGood > 0 && ` · 化吉 ${score.sihuaGood}`}
                      {score.sihuaBad > 0 && ` · 化忌 ${score.sihuaBad}`}
                    </Text>
                  </div>
                  <Text style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8, display: 'block' }}>
                    <BookOpen size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--text-secondary)' }} />
                    <span dangerouslySetInnerHTML={{ __html: getGongExplanation(gong) }} />
                  </Text>
                </div>
              );
            })}
          </Card>

          {/* 命盘总结 */}
          <Card title={<span><BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />星曜解读详情</span>} style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title={<span><Star size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />命盘亮点</span>} style={{ background: 'rgba(91,140,90,0.03)', border: '1px solid rgba(91,140,90,0.15)' }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ziweiData.highlights.map((h: string, i: number) => (
                      <li key={i} style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-body)' }}>{h}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title={<span><AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />需要注意</span>} style={{ background: 'rgba(199,91,91,0.03)', border: '1px solid rgba(199,91,91,0.15)' }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ziweiData.warnings.map((w: string, i: number) => (
                      <li key={i} style={{ marginBottom: 6, fontSize: 13, color: 'var(--text-body)' }}>{w}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* 四化说明 */}
          <Card title={<span style={{ color: 'var(--text-primary)' }}>四化星说明</span>} size="small" style={{ marginBottom: 16, border: '1px solid var(--border-light)' }}>
            <Row gutter={[16, 8]}>
              {Object.entries(SIHUA_COLORS).map(([key, color]) => (
                <Col xs={12} sm={6} key={key}>
                  <Space>
                    <Tag color={color} style={{ fontSize: 16, padding: '4px 12px' }}>{key}</Tag>
                    <Text style={{ fontSize: 12, color: 'var(--text-body)' }}>{SIHUA_EFFECT[key]}</Text>
                  </Space>
                </Col>
              ))}
            </Row>
          </Card>

          <Alert message="以上排盘结果仅供娱乐参考。禄=红 权=蓝 科=绿 忌=橙 紫=十四主星。命理是工具，不是宿命。" type="warning" showIcon />
        </motion.div>
      )}
    </div>
  );
}
