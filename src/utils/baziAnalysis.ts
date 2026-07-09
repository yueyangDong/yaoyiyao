import type { PillarData } from '../pages/Bazi';

// ========== 六大领域分析接口 ==========

export interface LoveAnalysis {
  spouseFeature: string;
  marriageQuality: string;
  peachBlossom: string;
  advice: string;
}

export interface CareerAnalysis {
  direction: string;
  moneyMethod: string;
  fortuneTrend: string;
  nobleHelp: string;
  advice: string;
}

export interface HealthAnalysis {
  bodyOverview: string;
  concerns: string[];
  wellnessAdvice: string;
}

export interface FamilyAnalysis {
  parentRelation: string;
  siblings: string;
  familyAtmosphere: string;
  advice: string;
}

export interface SocialAnalysis {
  socialTrait: string;
  friendQuality: string;
  nobleType: string;
  partnerAdvice: string;
}

export interface FortuneOverview {
  keywords: string[];
  lifeStages: { stage: string; desc: string }[];
  lifeLesson: string;
  luckyColor: string;
  luckyNumber: string;
  luckyDirection: string;
  luckyIndustries: string[];
  luckyZodiac: string[];
}

// 辅助映射
const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const WX_SHENG: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

const WX_COLOR: Record<string, string> = { '木': '绿色/青色', '火': '红色/紫色', '土': '黄色/棕色', '金': '白色/金色', '水': '蓝色/黑色' };
const WX_NUMBER: Record<string, string> = { '木': '3、8', '火': '2、7', '土': '5、0', '金': '4、9', '水': '1、6' };
const WX_DIRECTION: Record<string, string> = { '木': '东方', '火': '南方', '土': '中央/本地', '金': '西方', '水': '北方' };

const DZ_ZODIAC: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
};

// 三合生肖
const SAN_HE: Record<string, string[]> = {
  '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
  '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
  '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
  '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
};

// 六合生肖
const LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};

// ========== 1. 爱情婚姻分析 ==========
export function analyzeLove(
  pillars: PillarData[],
  shenSha: { name: string; pillar: string }[],
  gender: string,
  dayGan: string,
  dayZhi: string,
  relations: { type: string; desc: string }[]
): LoveAnalysis {
  const dayPillarSS = shenSha.filter(s => s.pillar === '日柱').map(s => s.name);

  // 配偶星
  const spouseStar = gender === 'male' ? '正财' : '正官';
  const spouseStarPlain = gender === 'male' ? '正财（代表妻子和稳定收入）' : '正官（代表丈夫和事业规则）';

  let spouseFeature = '';
  const spouseStarPillar = pillars.find(p => p.shiShen === spouseStar);
  if (spouseStarPillar) {
    const wx = TG_WX[spouseStarPillar.tianGan] || '';
    const wxTraits: Record<string, string> = {
      '木': '性格正直善良，像大树一样可靠，可能有较高的身高或清瘦体型',
      '火': '热情主动，性格开朗，可能有明亮的眼睛和较强的表现欲',
      '土': '踏实稳重，忠诚可靠，体型可能偏圆润，给人安全感',
      '金': '果断刚毅，有原则，五官轮廓分明，性格讲义气',
      '水': '聪明灵活，善于沟通，可能身形偏圆润或肤色偏白',
    };
    spouseFeature = `你的${spouseStarPlain}出现在${spouseStarPillar.pillar}，说明你的另一半可能是：${wxTraits[wx] || '一个有独特魅力的人'}。`;
    if (spouseStarPillar.pillar === '日柱') {
      spouseFeature += '配偶星就在日支（夫妻宫），代表婚姻缘比较近，另一半可能就在你的身边或通过熟人介绍认识。';
    } else if (spouseStarPillar.pillar === '年柱') {
      spouseFeature += '配偶星在年柱，可能远嫁/远娶，或者另一半来自远方/不同城市。';
    } else if (spouseStarPillar.pillar === '时柱') {
      spouseFeature += '配偶星在时柱，姻缘来得比较晚，但晚婚反而更稳定幸福。';
    }
  } else {
    const dayWx = TG_WX[dayGan] || '';
    spouseFeature = `你命局中${spouseStarPlain}不显，不代表没有姻缘，而是你的婚姻更看大运流年的配合。你日支（夫妻宫）是${dayZhi}（${DZ_WX[dayZhi] || ''}），代表你的另一半气质偏向${DZ_WX[dayZhi] || ''}性特质。`;
  }

  // 婚姻质量：看日支是否被冲合
  const riZhiRelations = relations.filter(r => r.desc.includes('日柱'));
  const hasChong = riZhiRelations.some(r => r.type === '冲');
  const hasHe = riZhiRelations.some(r => r.type === '合');
  const hasXing = riZhiRelations.some(r => r.type === '刑');

  let marriageQuality = '';
  if (hasChong) {
    marriageQuality = `你的日支（夫妻宫）受到冲克，代表婚姻中容易有波折和变动。需要双方多沟通包容，多制造浪漫来维系感情，不建议长期异地。`;
  } else if (hasHe) {
    marriageQuality = `你的日支（夫妻宫）有合，代表婚姻基础比较稳固，夫妻之间缘分深、互相吸引。婚姻质量整体不错，但也要注意不要因为"太合拍"而忽略了个人空间。`;
  } else if (hasXing) {
    marriageQuality = `你的日支（夫妻宫）有刑，婚姻中可能有些小摩擦和心结。两个人需要学着表达真实感受，别把事情闷在心里。`;
  } else {
    marriageQuality = `你的日支（夫妻宫）比较安静，没有明显的冲合刑，婚姻生活比较平淡稳定。平淡是福，但偶尔也需要主动制造一些仪式感。`;
  }

  // 桃花运
  const peachCount = dayPillarSS.filter(n => ['桃花', '红鸾', '天喜'].includes(n)).length;
  const allPeach = shenSha.filter(s => ['桃花', '红鸾', '天喜'].includes(s.name));
  let peachBlossom = '';
  if (allPeach.length >= 3) {
    peachBlossom = '你命中桃花神煞较多（' + allPeach.map(s => s.name).join('、') + '），异性缘很旺，身边从不缺追求者。但桃花多也意味着选择的烦恼——正桃花和烂桃花混在一起，需要擦亮眼睛分辨。已婚者要注意和异性保持适当距离。';
  } else if (allPeach.length >= 1) {
    peachBlossom = `你命中带有${allPeach.map(s => s.name).join('、')}，代表你有不错的异性缘和魅力。桃花不在多而在于精，质量比数量重要。`;
  } else {
    peachBlossom = '你命局中桃花神煞不多，不属于那种"万人迷"类型，但一旦遇到对的人，感情反而更专一、更持久。';
  }

  // 建议
  const adviceItems: string[] = [];
  if (hasChong) adviceItems.push('建议晚婚（28岁以后），或找个年龄差距大一些的对象来化解冲克');
  if (gender === 'male' && pillars.some(p => p.shiShen === '偏财')) adviceItems.push('你命带偏财，注意不要因为钱财问题影响夫妻感情');
  if (gender === 'female' && pillars.some(p => p.shiShen === '七杀')) adviceItems.push('你命带七杀（偏官），注意不要被"坏男人"类型吸引，选对象看人品比看感觉重要');

  return {
    spouseFeature,
    marriageQuality,
    peachBlossom,
    advice: adviceItems.join('；') || '珍惜眼前人，婚姻需要经营，主动沟通比什么都重要。',
  };
}

// ========== 2. 事业财运分析 ==========
export function analyzeCareer(
  pillars: PillarData[],
  shenSha: { name: string; pillar: string }[],
  strengthLevel: string,
  yongShen: string[],
  dayGan: string
): CareerAnalysis {
  const allShiShen = pillars.map(p => p.shiShen).filter(Boolean);
  const hasGuan = allShiShen.includes('正官');
  const hasSha = allShiShen.includes('七杀');
  const hasYin = allShiShen.includes('正印') || allShiShen.includes('偏印');
  const hasShiShang = allShiShen.includes('食神') || allShiShen.includes('伤官');
  const hasCai = allShiShen.includes('正财') || allShiShen.includes('偏财');

  // 事业方向
  let direction = '';
  if (hasGuan && hasYin) {
    direction = '你八字中正官（代表事业规矩）和正印（代表贵人学历）都有，属于"官印相生"的好组合。你适合在体制内、大型企业、事业单位等正规机构发展，走管理路线会比较顺。公务员、教师、国企管理都是不错的选择。';
  } else if (hasSha) {
    direction = '你八字中七杀（代表竞争和魄力）较旺，性格敢拼敢闯，不太适合按部就班的工作。你适合竞争激烈的行业——销售、创业、军警、外科医生、竞技体育等需要果断决策的领域。';
  } else if (hasShiShang && hasCai) {
    direction = '你八字中食伤（代表才华创意）和财星兼备，属于"食伤生财"的组合。最适合用自己的技术和创意赚钱——程序员、设计师、自媒体、作家、艺术家都是很匹配的方向。不太适合死板的办公室工作。';
  } else if (hasYin) {
    direction = '你八字中印星较旺，代表学问和研究能力。适合学术、教育、文化、咨询、出版等需要深度思考的行业。技术专家路线比管理路线更适合你。';
  } else {
    direction = '你八字格局比较灵活，职业选择面较宽。建议根据自己的兴趣和特长来选择方向，不一定局限在某个特定行业。';
  }

  // 赚钱方式
  let moneyMethod = '';
  const hasZhengCai = allShiShen.includes('正财');
  const hasPianCai = allShiShen.includes('偏财');
  if (hasZhengCai && hasPianCai) {
    moneyMethod = '你正财（稳定工资）和偏财（投资外快）俱全，属于"两条腿走路"型。既有稳定的主业收入，又有副业或投资的额外进账。建议主副并进，不要把所有鸡蛋放在一个篮子里。';
  } else if (hasZhengCai) {
    moneyMethod = '你八字正财为主，正财代表老实赚钱、稳定收入。你适合拿工资、做稳定生意，不太适合高风险投资。稳扎稳打地积累财富是正道。';
  } else if (hasPianCai) {
    moneyMethod = '你八字偏财为主，偏财代表投资、生意、意外之财。你是天生的生意人，适合自己做老板，或者从事销售、贸易、投资等弹性收入的行业。但偏财来得快去得也快，赚了钱要记得理财存钱。';
  } else if (hasShiShang) {
    moneyMethod = '你八字食伤生财（靠技术/才华赚钱），赚钱的方式最重要的是提升自己的专业能力。技术越强、创意越好，钱来得越轻松。';
  } else {
    moneyMethod = '综合来看，你赚钱需要付出对应努力。找到适合自己的变现方式是关键，不要盲目跟风别人的赚钱方式。';
  }

  // 财运走势
  let fortuneTrend = '';
  if (strengthLevel === '身强' && hasCai) {
    fortuneTrend = '你身强能担财，好比一个大容器能装很多水。只要能抓住机会，财运不会差，尤其在中青年时期（25-50岁）机会最多。';
  } else if (strengthLevel === '身弱' && hasCai) {
    fortuneTrend = '你命中有财但身偏弱，好比小容器装不下太多水。赚钱不要太拼，先养好身体和状态，运气到了钱自然来。35岁以后财运相对更稳。';
  } else if (strengthLevel === '身强') {
    fortuneTrend = '你身强但财星不显，说明你有能力但需要主动去找赚钱机会，不会自动送上门。多关注市场趋势，主动出击。';
  } else {
    fortuneTrend = '财运整体比较平稳，不会有爆发式增长，但也不会有大的财务危机。保持稳定的收入来源，辅以稳健的理财就好。';
  }

  // 贵人运
  const hasTianYi = shenSha.some(s => s.name === '天乙贵人');
  const hasTianDe = shenSha.some(s => s.name === '天德贵人');
  const hasYueDe = shenSha.some(s => s.name === '月德贵人');
  let nobleHelp = '';
  if (hasTianYi) {
    nobleHelp = '你命带天乙贵人（最尊贵的吉星），一生中有贵人相助。走到哪里都有人愿意帮你，关键时候总能遇到"对的人"。这些贵人可能比你年长，或是属' + (shenSha.find(s => s.name === '天乙贵人')?.pillar || '') + '的亲友。';
  } else if (hasTianDe || hasYueDe) {
    nobleHelp = '你命带天德/月德贵人，有上天庇佑。虽然不是大富大贵，但遇到困难时总有转机，这是比金钱更宝贵的福气。';
  } else if (hasYin) {
    nobleHelp = '你八字印星较旺，虽然没有明显的贵人星，但印星本身就代表长辈缘和贵人运。你的贵人可能是老师、长辈或上级领导。';
  } else {
    nobleHelp = '你的贵人运不在命局中，而在你自己的为人处事上。多行善事、多结交志同道合的朋友，贵人自然会出现。';
  }

  // 建议
  const adviceItems: string[] = [];
  if (hasSha) adviceItems.push('你的魄力是你的优势，但切记不要过于冒险，留有退路很重要');
  if (hasPianCai) adviceItems.push('偏财运旺但也要注意理财规划，赚了钱先存一部分');
  const jiangXing = shenSha.find(s => s.name === '将星');
  if (jiangXing) adviceItems.push('你命带将星，天生有领导才能，别害怕挑大梁，你担得起');
  if (!adviceItems.length) adviceItems.push('找到自己真正热爱的事业方向，专注深耕，财富会自然随之而来');

  return { direction, moneyMethod, fortuneTrend, nobleHelp, advice: adviceItems.join('；') };
}

// ========== 3. 身体健康分析 ==========
export function analyzeHealth(
  pillars: PillarData[],
  wxStats: Record<string, { count: number; level: string }>,
  dayGan: string,
  strengthLevel: string,
  relations: { type: string; desc: string }[]
): HealthAnalysis {
  const dayWx = TG_WX[dayGan] || '';

  const wxBody: Record<string, string> = {
    '木': '肝胆、筋骨、神经系统',
    '火': '心脏、眼睛、血液、心血管',
    '土': '脾胃、皮肤、肌肉、消化系统',
    '金': '肺、呼吸道、大肠、骨骼',
    '水': '肾、膀胱、耳朵、生殖泌尿系统',
  };

  const wxSymptom: Record<string, { excess: string; deficient: string }> = {
    '木': { excess: '肝火旺、易怒、头痛、眼睛疲劳', deficient: '肝功能偏弱、容易疲劳、筋骨酸痛' },
    '火': { excess: '心火旺、失眠、口腔溃疡、血压偏高', deficient: '心悸、手脚冰凉、血液循环不好' },
    '土': { excess: '胃火大、消化不良、皮肤问题', deficient: '脾胃虚弱、食欲不振、容易腹胀' },
    '金': { excess: '肺热、咳嗽、皮肤干燥、便秘', deficient: '容易感冒、呼吸道敏感、气喘' },
    '水': { excess: '水肿、肾负担重、腰酸、听力下降', deficient: '肾气不足、怕冷、精力不济、耳鸣' },
  };

  const wxFood: Record<string, string> = {
    '木': '绿色蔬菜（菠菜、芹菜）、酸性食物、绿茶',
    '火': '红色食物（番茄、红枣）、苦味食物、莲子',
    '土': '黄色食物（南瓜、小米）、甘味食物、山药',
    '金': '白色食物（百合、银耳、梨）、辛味食物',
    '水': '黑色食物（黑豆、黑芝麻、黑木耳）、咸味食物',
  };

  const wxSport: Record<string, string> = {
    '木': '拉伸运动、瑜伽、散步、太极',
    '火': '有氧运动、跑步、跳舞、球类运动',
    '土': '登山、徒步、健身、八段锦',
    '金': '呼吸训练、游泳、骑行、羽毛球',
    '水': '游泳、冥想、太极拳、慢跑',
  };

  // 体质概况
  const sorted = Object.entries(wxStats).sort((a, b) => b[1].count - a[1].count);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let bodyOverview = `日主${dayGan}（${dayWx}），五行中「${strongest[0]}」最旺、「${weakest[0]}」最弱。`;

  if (strengthLevel === '身强') {
    bodyOverview += '你的体质总体偏强，精力较为充沛，不容易累。但要注意"过犹不及"——过于旺盛的五行对应的身体部位容易出问题。';
  } else if (strengthLevel === '身弱') {
    bodyOverview += '你的体质偏弱一些，精力有限，需要多注意保养身体，不要太拼。适当运动和规律作息对你来说特别重要。';
  } else {
    bodyOverview += '体质比较均衡，不算特别强壮但也不差。保持目前的生活节奏就好，不用刻意大补。';
  }

  // 需要留意的部位
  const concerns: string[] = [];
  if (strongest[1].level === '旺') {
    concerns.push(`「${strongest[0]}」过旺 → 对应${wxBody[strongest[0]] || ''}，容易出现${wxSymptom[strongest[0]]?.excess || '相关问题'}。`);
  }
  if (weakest[1].level === '弱' || weakest[1].level === '缺') {
    concerns.push(`「${weakest[0]}」偏弱 → 对应${wxBody[weakest[0]] || ''}，容易出现${wxSymptom[weakest[0]]?.deficient || '相关问题'}。`);
  }

  // 克日主的五行对应的健康问题
  const keDayWx = WX_KE[dayWx]; // 克日主的五行（官杀）
  if (keDayWx && wxStats[keDayWx]?.level === '旺') {
    const dayBody = wxBody[dayWx] || '';
    concerns.push(`日主${dayWx}被${keDayWx}所克 → 需格外注意${dayBody}的健康，${dayBody.split('、')[0]}相关的体检要定期做。`);
  }

  // 刑冲对应的健康
  const chongRelations = relations.filter(r => r.type === '冲');
  if (chongRelations.some(r => r.desc.includes('子午冲'))) {
    concerns.push('子午冲（水火相冲）→ 注意心血管和内分泌的平衡，保持情绪稳定很重要。');
  }
  if (chongRelations.some(r => r.desc.includes('卯酉冲'))) {
    concerns.push('卯酉冲（金木相战）→ 注意肝胆和呼吸系统，少喝酒、少抽烟。');
  }

  // 羊刃
  const hasYangRen = relations.some(r => (r as any).subtype?.includes('羊刃'));
  if (hasYangRen) {
    concerns.push('命带羊刃 → 注意外伤、血光之灾，运动时做好防护，开车出行多加小心。');
  }

  if (concerns.length === 0) {
    concerns.push('整体来看没有特别需要担心的健康问题，保持良好生活习惯即可。');
  }

  // 养生建议
  const defWx = weakest[0];
  const defWx2 = wxStats[keDayWx]?.level === '弱' ? keDayWx : defWx;
  const wellnessAdvice = `建议多补益「${defWx2}」的五行能量。饮食上多吃${wxFood[defWx2] || '均衡营养的食物'}，运动上适合${wxSport[defWx2] || '适度运动'}。颜色上多接触${WX_COLOR[defWx2] || '柔和色调'}。`;

  return { bodyOverview, concerns, wellnessAdvice };
}

// ========== 4. 家庭亲情分析 ==========
export function analyzeFamily(
  pillars: PillarData[],
  relations: { type: string; desc: string }[],
  dayGan: string
): FamilyAnalysis {
  const yearPillar = pillars[0];
  const monthPillar = pillars[1];
  const yearRelations = relations.filter(r => r.desc.includes('年柱'));

  // 与父母关系
  const hasYearChong = yearRelations.some(r => r.type === '冲');
  const hasYearHe = yearRelations.some(r => r.type === '合');
  const hasZhengYin = pillars.some(p => p.shiShen === '正印');
  const hasPianCai = pillars.some(p => p.shiShen === '偏财');

  let parentRelation = '';
  if (hasYearChong) {
    parentRelation = `你的年柱（代表祖上和父母根基）有冲克，代表你和父母之间可能存在一些观念差异，或者早年与父母有分离的经历（比如寄宿学校、外出求学工作等）。但这不代表感情不好，只是缘分模式比较"距离产生美"。`;
  } else if (hasYearHe) {
    parentRelation = `你的年柱有合，代表与父母的感情比较紧密，家庭是你很重要的后盾。父母对你的成长影响很大，你也比较依赖他们。`;
  } else {
    parentRelation = `年柱${yearPillar.ganZhi}整体平稳，与父母的缘分属于正常水平。`;
    if (hasZhengYin) parentRelation += '八字中有正印（代表母亲），说明母亲对你的成长帮助很大，母亲的个性或价值观对你影响深远。';
    if (hasPianCai) parentRelation += '八字中有偏财（代表父亲），说明父亲的赚钱能力或为人处事对你有一定影响。';
  }

  // 兄弟姐妹
  const biJieCount = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen || '')).length;
  let siblings = '';
  if (biJieCount >= 3) {
    siblings = '你八字中比劫（代表兄弟姐妹和同辈朋友）较多，代表兄弟姐妹可能比较多，或者你在朋友圈中很活跃。比劫多的人通常团队协作能力好，但也容易有竞争关系——和兄弟姐妹/同事之间偶尔有利害冲突。';
  } else if (biJieCount >= 1) {
    siblings = '兄弟姐妹不多但关系尚可。你比较独立，不太依赖兄弟姐妹的帮助，但也不会疏远。';
  } else {
    siblings = '八字中比劫较少，可能兄弟姐妹不多，或者你比较独立，习惯一个人扛事。但这也意味着你自我意识较强，不随波逐流。';
  }

  // 家庭氛围
  const monthShiShen = monthPillar.shiShen;
  let familyAtmosphere = '';
  if (monthShiShen === '正印' || monthShiShen === '偏印') {
    familyAtmosphere = '月柱为印星，代表你的家庭氛围比较温暖，父母对你的教育比较重视，也可能对你期望较高。家庭是你精神上的港湾。';
  } else if (monthShiShen === '正官' || monthShiShen === '七杀') {
    familyAtmosphere = '月柱为官杀，代表家庭可能比较注重规矩和纪律，父母对你要求严格。小时候可能感觉"管得太严"，但长大后会发现这对你的自律和责任感很有帮助。';
  } else if (monthShiShen === '正财' || monthShiShen === '偏财') {
    familyAtmosphere = '月柱为财星，家庭可能比较务实，注重物质基础。父母重视"把日子过好"，给你创造了比较稳定的成长环境。';
  } else {
    familyAtmosphere = '月柱为食伤，家庭氛围比较自由宽松，父母相对开明，尊重你的选择。你比较早独立自主，有自己的想法和主见。';
  }

  // 建议
  const adviceItems: string[] = [];
  if (hasYearChong) adviceItems.push('和父母保持适当距离反而有利于关系，常回家看看但不必天天在一起');
  if (biJieCount >= 3) adviceItems.push('兄弟姐妹之间在金钱上最好"亲兄弟明算账"，避免钱财纠纷伤感情');
  if (!adviceItems.length) adviceItems.push('多给父母打电话，陪伴是最好的孝顺');

  return { parentRelation, siblings, familyAtmosphere, advice: adviceItems.join('；') };
}

// ========== 5. 社交朋友分析 ==========
export function analyzeSocial(
  pillars: PillarData[],
  shenSha: { name: string; pillar: string }[],
  dayGan: string
): SocialAnalysis {
  const allShiShen = pillars.map(p => p.shiShen).filter(Boolean);
  const hasShiShang = allShiShen.includes('食神') || allShiShen.includes('伤官');
  const hasBiJian = allShiShen.includes('比肩');
  const hasJieCai = allShiShen.includes('劫财');
  const biJieCount = allShiShen.filter(s => s === '比肩' || s === '劫财').length;

  // 社交特质
  let socialTrait = '';
  if (hasShiShang && biJieCount >= 2) {
    socialTrait = '你八字中食伤（表达能力）和比劫（朋友）都旺，属于社交达人型——能说会道、人缘好，在各种场合都能混得开。是朋友聚会中的"气氛组"。';
  } else if (hasShiShang) {
    socialTrait = '你八字食伤较旺，有不错的表达能力和个人魅力。你不是那种刻意社交的人，但因为有趣、有才华，别人会主动想认识你。属于"被动社交"型。';
  } else if (biJieCount >= 2) {
    socialTrait = '你八字比劫较旺，喜欢交朋友、讲义气，朋友圈子较大。但比劫多也意味着朋友之间的界限有时不太清晰，小心"朋友多了反而累"。';
  } else {
    const dayWx = TG_WX[dayGan] || '';
    const wxTraits: Record<string, string> = {
      '木': '内在有原则，社交中比较真诚实在，不喜欢虚伪的客套',
      '火': '热情有礼貌，社交场合会主动活跃气氛，但内心有界限',
      '土': '稳重可靠，是朋友眼中的"靠谱担当"，不轻易交心但交了就很真心',
      '金': '讲义气、有底线，朋友不多但质量很高，是那种关键时刻靠得住的人',
      '水': '聪明灵活，社交中善于倾听和沟通，人缘不错但比较慢热',
    };
    socialTrait = `整体来看，你的社交风格偏向：${wxTraits[dayWx] || '真实自然，不做作'}。你不是人群中最高调的那个，但有自己稳定的朋友圈子。`;
  }

  // 朋友质量
  let friendQuality = '';
  if (hasJieCai && biJieCount >= 2) {
    friendQuality = '你命中劫财较旺，结交的朋友三教九流都有，朋友圈子广但质量参差不齐。真心朋友有，但也会有不太靠谱的人混进来，尤其是在钱的问题上要小心。';
  } else if (hasBiJian && biJieCount >= 2) {
    friendQuality = '你命中比肩旺，朋友以同辈、同类人居多，学历背景、经济水平比较接近。朋友之间比较有共同语言，关系也比较平等。';
  } else if (biJieCount === 1) {
    friendQuality = '朋友不算多，但交到的都是比较靠谱的。你不轻易相信别人，但一旦认可了就是一辈子的朋友。';
  } else {
    friendQuality = '你的朋友不多但质量高，不太喜欢泛泛之交。宁愿一个人待着也不想应付无意义的社交。这在现代社会中其实是一种很健康的方式。';
  }

  // 贵人类型
  const hasTianYi = shenSha.some(s => s.name === '天乙贵人');
  const hasWenChang = shenSha.some(s => s.name === '文昌');
  let nobleType = '';
  if (hasTianYi) {
    const tianYiPillar = shenSha.find(s => s.name === '天乙贵人')?.pillar || '';
    nobleType = '你命带天乙贵人，贵人多是比你年长或有地位的人。可能出现在职场（上司提携）、学业（老师赏识）或生活中（长辈介绍资源）。';
  } else if (hasWenChang) {
    nobleType = '你的贵人运更多体现在学业和文职方面，老师和有学问的人会帮你。多在专业领域深耕，贵人会在专业圈子里出现。';
  } else {
    nobleType = '你的贵人运需要自己主动去争取——多参加行业活动、多输出自己的价值、多帮助别人。贵人喜欢帮"值得帮的人"。';
  }

  // 合伙建议
  let partnerAdvice = '';
  if (hasJieCai) {
    partnerAdvice = '你命带劫财，合伙做生意要特别谨慎。劫财就像是"朋友分你的钱"。股份要明确、账目要清晰，不能因为是朋友就含糊。最好的方式是找专业互补但不涉及利益分配的合作模式。';
  } else if (hasBiJian && biJieCount >= 2) {
    partnerAdvice = '你比肩旺，合伙是可以的，但建议找"互补型"合伙人——比如你擅长技术就找擅长市场的，双方分工明确、不会互相抢功。';
  } else {
    partnerAdvice = '整体来看，你更适合独立作业或找专业领域外的合伙人。合夥前先小范围试合作，磨合好了再深入。';
  }

  return { socialTrait, friendQuality, nobleType, partnerAdvice };
}

// ========== 6. 综合运势总览 ==========
export function analyzeFortuneOverview(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
  yongShen: string[],
  shenSha: { name: string; pillar: string }[],
  dayun: { startAge: number; steps: Array<{ ganZhi: string }> },
  birthYear: number,
  wxStats: Record<string, { count: number; level: string }>
): FortuneOverview {
  const dayWx = TG_WX[dayGan] || '';
  const dayZhi = pillars[2].diZhi;

  // 关键词
  const keywords: string[] = [];
  const allSS = pillars.map(p => p.shiShen).filter(Boolean);
  if (allSS.includes('正官')) keywords.push('正直守规');
  if (allSS.includes('七杀')) keywords.push('果断魄力');
  if (allSS.includes('食神')) keywords.push('才华横溢');
  if (allSS.includes('伤官')) keywords.push('创意无限');
  if (allSS.includes('正财')) keywords.push('务实求稳');
  if (allSS.includes('偏财')) keywords.push('灵活变通');
  if (allSS.includes('正印')) keywords.push('温厚智慧');
  if (allSS.includes('偏印')) keywords.push('独辟蹊径');
  const tianYi = shenSha.find(s => s.name === '天乙贵人');
  if (tianYi) keywords.push('贵人相扶');
  if (keywords.length < 3) {
    const wxKw: Record<string, string> = {
      '木': '正直成长', '火': '热情进取', '土': '稳重踏实', '金': '刚毅果决', '水': '智慧灵动',
    };
    keywords.push(wxKw[dayWx] || '独一无二');
  }
  const finalKeywords = keywords.slice(0, 3);

  // 人生阶段
  const lifeStages = [
    {
      stage: '青少年 (0-20岁)',
      desc: `年柱${pillars[0].ganZhi}是根基，代表你早年的成长环境。${
        pillars[0].shiShen === '正印' || pillars[0].shiShen === '偏印'
          ? '早年有长辈呵护，学业运不错。'
          : pillars[0].shiShen === '正官' || pillars[0].shiShen === '七杀'
            ? '小时候可能被管得比较严，但也养成了好习惯。'
            : '早年生活比较自在，性格在这个阶段基本定型。'
      }`,
    },
    {
      stage: '壮年 (20-40岁)',
      desc: `月柱${pillars[1].ganZhi}代表你的青壮年，是事业发展的关键期。${
        strengthLevel === '身强'
          ? '身强体健，精力旺盛，是打拼事业的好时机，大胆去闯。'
          : '这个阶段建议稳扎稳打，先把基础打好，不宜冒进。'
      }${dayun.steps[1] ? ` 第一步关键大运「${dayun.steps[1].ganZhi}」在此期间发挥作用。` : ''}`,
    },
    {
      stage: '中年 (40-60岁)',
      desc: `日柱${pillars[2].ganZhi}代表你的人生主场，中年运势看日柱。${
        pillars[2].shiShen === '正财' || pillars[2].shiShen === '偏财'
          ? '日坐财星，中年财运不错，是财富积累的黄金期。'
          : pillars[2].shiShen === '正官' || pillars[2].shiShen === '七杀'
            ? '日坐官杀，中年事业可能有大的突破或挑战。'
            : '中年阶段家庭和事业趋于稳定，注意身体健康。'
      } 这个阶段是承上启下的关键期，上有老下有小，责任重大，但也是最有成就感的阶段。`,
    },
    {
      stage: '晚年 (60岁+)',
      desc: `时柱${pillars[3].ganZhi}代表晚年运势和子女状况。${
        pillars[3].shiShen === '食神' || pillars[3].shiShen === '伤官'
          ? '时柱食伤，晚年生活比较惬意，子女有才艺，晚年不愁吃喝。'
          : pillars[3].shiShen === '正印' || pillars[3].shiShen === '偏印'
            ? '时柱印星，晚年有依靠，子女孝顺或精神生活丰富。'
            : '晚年宜多注意健康保养，心态放平过好每一天。'
      }`,
    },
  ];

  // 一生课题
  const sorted = Object.entries(wxStats).sort((a, b) => b[1].count - a[1].count);
  const strongest = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];
  const keDayWx = Object.entries(WX_KE).find(([, v]) => v === dayWx)?.[0] || '';

  let lifeLesson = `你八字中最突出的五行矛盾是「${strongest}」过旺而「${weakest}」偏弱。`;
  if (keDayWx && wxStats[keDayWx]?.level === '旺') {
    lifeLesson += `同时「${keDayWx}」克制你的日主「${dayWx}」。你一生的修行方向是：学会平衡「${strongest}」和「${weakest}」的能量。`;
  }
  lifeLesson += `具体来说，你需要注意不要被「${strongest}」的特质主导过头，同时有意识地培养「${weakest}」对应的品质。`;

  // 幸运元素
  const mainYong = yongShen[0] || dayWx;
  const luckyColor = WX_COLOR[mainYong] || '各种颜色';
  const luckyNumber = WX_NUMBER[mainYong] || '';
  const luckyDirection = WX_DIRECTION[mainYong] || '';
  const luckyIndustries: string[] = [];
  const industryMap: Record<string, string[]> = {
    '木': ['教育/培训', '文化/出版', '林业/园艺', '医疗/健康', '环保/生态'],
    '火': ['互联网/科技', '能源/电力', '餐饮/娱乐', '美容/化妆', '传媒/广告'],
    '土': ['房地产/建筑', '农业/食品', '金融/保险', '矿产/资源', '咨询/中介'],
    '金': ['金融/银行', '法律/公证', '机械/制造', '珠宝/奢侈品', '军警/安保'],
    '水': ['物流/运输', '贸易/电商', '旅游/酒店', '传媒/影视', '心理咨询'],
  };
  luckyIndustries.push(...(industryMap[mainYong] || ['各行皆可']));

  // 贵人属相
  const luckyZodiac: string[] = [];
  const sanHe = SAN_HE[dayZhi] || [];
  const liuHe = LIU_HE[dayZhi];
  if (liuHe) luckyZodiac.push(DZ_ZODIAC[liuHe] || liuHe);
  sanHe.forEach(z => luckyZodiac.push(DZ_ZODIAC[z] || z));
  luckyZodiac.push(DZ_ZODIAC[dayZhi] || dayZhi);

  return {
    keywords: finalKeywords,
    lifeStages,
    lifeLesson,
    luckyColor,
    luckyNumber,
    luckyDirection,
    luckyIndustries,
    luckyZodiac: [...new Set(luckyZodiac)],
  };
}
