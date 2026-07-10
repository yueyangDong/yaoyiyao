// ========== 紫微斗数十二宫白话解读生成器 ==========
// 兼容 @ziweijs/core v0.3.0 的排盘结果

// ========== 类型定义 ==========

/**
 * 星曜数据结构（兼容 @ziweijs/core 原始格式与本项目简化格式）
 */
export interface StarInfo {
  name: string;          // 星曜中文名
  type?: 'major' | 'minor' | string;  // 主星/辅星
  sihua?: string | null;              // 四化标记：'禄'|'权'|'科'|'忌'
  YT?: { name: string; key: string }; // @ziweijs/core 生年四化
  ST?: Partial<Record<string, { name: string; key: string }>>; // @ziweijs/core 自化
}

/**
 * 宫位数据（兼容层）
 */
export interface PalaceData {
  name: string;                    // 宫位名：命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/交友/官禄/田宅/福德/父母
  stem?: string;                   // 天干
  branch?: string;                 // 地支
  majorStars?: StarInfo[];         // 主星
  minorStars?: (StarInfo | string)[];  // 辅星（可混合字符串和对象）
  isLaiYin?: boolean;             // 是否来因宫
  isShenGong?: boolean;           // 是否身宫
  index?: number;                  // 宫位索引 0-11
}

/**
 * 对宫信息（简化）
 */
export interface OppositePalaceInfo {
  name: string;
  majorStars: string[];    // 对宫主星名列表
  sihua: string | null;    // 对宫主要四化
}

/**
 * 三合宫信息
 */
export interface TrianglePalacesInfo {
  palaces: {
    name: string;
    majorStars: string[];
    sihua: string | null;
  }[];
}

/**
 * 单宫解读结果
 */
export interface PalaceReading {
  palaceName: string;
  reading: string;         // 200-400字白话解读
  length: number;          // 实际字数
}

/**
 * 命盘总结
 */
export interface SummarizedReport {
  highlights: string[];    // 3-5条亮点
  cautions: string[];      // 2-3条注意点
  overall: string;         // 整体运势约200字
  generatedAt: string;     // 生成时间
}

// ========== 星曜特性库 ==========

/**
 * 十四主星性格描述模板
 */
const MAIN_STAR_TRAITS: Record<string, {
  personality: string;         // 性格核心描述
  career: string;              // 事业倾向
  love: string;                // 感情特征
  fortune: string;             // 财运特点
  health: string;              // 健康关注
  positive: string;            // 正面评价
  negative: string;            // 需注意
}> = {
  '紫微': {
    personality: '天生带有领导气质，有主见不随波逐流，自尊心强爱面子',
    career: '适合担任管理岗位，能在体制内或大企业中脱颖而出',
    love: '对另一半要求较高，希望对方能配得上自己的身份和品味',
    fortune: '懂得理财但不屑于小钱，大进大出的格局',
    health: '注意心血管和消化系统，压力大时容易头痛',
    positive: '王者风范，自带威严，有大局观',
    negative: '有时过于好面子，听不进逆耳忠言',
  },
  '天机': {
    personality: '聪明灵活，反应快，善于分析和谋划，思维缜密',
    career: '适合策划、咨询、IT、研究等需要脑力的行业',
    love: '感情上思虑太多，容易犹豫不决，需要一个能包容的人',
    fortune: '靠头脑赚钱，偏财运时有斩获但不太稳定',
    health: '思虑过度容易神经衰弱、失眠',
    positive: '智慧型人才，能看透事物本质',
    negative: '容易想太多，行动力跟不上思维',
  },
  '太阳': {
    personality: '热情开朗，光明磊落，乐于助人有担当，像个太阳温暖身边人',
    career: '适合教育、公益、外交、公关等需要正能量的行业',
    love: '对感情真诚热情，但容易因为付出太多而累到自己',
    fortune: '花钱大方，乐于分享，存钱不是强项',
    health: '注意心脏和眼睛健康，避免过度操劳',
    positive: '正能量满满，走到哪都能带动氛围',
    negative: '有时过于热心，容易被人利用',
  },
  '武曲': {
    personality: '刚强果断，执行力超强，性格刚硬不轻易妥协',
    career: '金融、技术、军警、工程等需要专业和纪律的行业',
    love: '不擅表达柔情，但行动上很可靠，属于行动派伴侣',
    fortune: '是十四主星中的正财星，理财能力和赚钱能力都很强',
    health: '注意骨骼、牙齿、呼吸系统',
    positive: '执行力强，说到做到，经济独立',
    negative: '性格偏硬，容易给人不近人情的感觉',
  },
  '天同': {
    personality: '温和善良，知足常乐，人缘好，是天生的"福星"',
    career: '适合服务行业、文化艺术、餐饮等轻松愉快的领域',
    love: '感情上被动但真诚，期待平淡温馨的关系',
    fortune: '不太计较钱财，知足常乐，但也容易存不住钱',
    health: '注意肠胃和代谢，容易发福',
    positive: '好心态就是最大的福气，人见人爱',
    negative: '有时缺乏上进心，安于现状',
  },
  '廉贞': {
    personality: '心思细腻，有艺术细胞，重感情但也容易情绪化',
    career: '适合艺术、设计、法律、监察类工作',
    love: '情深义重，对爱人忠贞不二，但情绪起伏需要对方理解',
    fortune: '偏财运好，但容易因为感情和情绪影响理性消费',
    health: '注意内分泌和情绪引起的身体问题',
    positive: '感性细腻，有独特的审美和品味',
    negative: '多愁善感，容易钻牛角尖',
  },
  '天府': {
    personality: '稳重踏实，有管理才能，天生的"管家"，能守住家业',
    career: '适合财务、行政、房地产、仓储物流等需要稳扎稳打的行业',
    love: '对待感情理性务实，不会一时冲动，是靠谱的另一半',
    fortune: '守财能力强，是天生的财库，能存住钱',
    health: '注意脾胃和体重管理',
    positive: '稳重可靠，能给人安全感，理财高手',
    negative: '有时过于保守，不敢冒险错失机会',
  },
  '太阴': {
    personality: '温柔细腻，有文学艺术天赋，性格内向但洞察力强',
    career: '适合写作、美学、设计、护理、财务等需要耐心和美感的工作',
    love: '感情细腻体贴，但容易患得患失，需要一个能懂自己的人',
    fortune: '善于精细理财，对数字敏感，适合管账',
    health: '注意妇科/泌尿系统，女性需注意生理期',
    positive: '温柔体贴，审美品味高，做事细致',
    negative: '有时过于敏感，容易想太多',
  },
  '贪狼': {
    personality: '多才多艺，社交能力强，追求新鲜感，桃花运旺盛',
    career: '适合娱乐、社交、市场营销、艺术表演等与人打交道的行业',
    love: '桃花运旺，感情经历丰富，但需注意不要过于博爱',
    fortune: '偏财运极旺但起伏也大，容易暴富也容易破财',
    health: '注意肝胆和皮肤问题，注意作息规律',
    positive: '才艺满分，社交达人，人生多姿多彩',
    negative: '容易贪多嚼不烂，桃花多也带来烦恼',
  },
  '巨门': {
    personality: '善于深度思考，口才好辩才佳，但容易多疑和钻牛角尖',
    career: '适合律师、记者、学者、评论员、研究员等需要深入分析的行业',
    love: '对感情要求很高，需要一个能和自己在精神层面交流的人',
    fortune: '善于发现赚钱机会，但容易因为话多得罪贵人',
    health: '注意口腔、咽喉和消化系统',
    positive: '思辨能力强，能看到别人看不到的细节',
    negative: '容易多疑挑剔，讲话太直让人下不来台',
  },
  '天相': {
    personality: '处事周全，善于协调，是团队中的润滑剂，口碑好',
    career: '适合人事、行政、外交、公关、服务等需要协调能力的岗位',
    love: '感情中温和体贴，懂得照顾对方感受，是"理想伴侣"候选人',
    fortune: '财运平稳，不偏不倚，属于细水长流型',
    health: '注意皮肤过敏和水肿问题',
    positive: '为人圆融，左右逢源，人缘极佳',
    negative: '有时过于平衡，缺乏立场和棱角',
  },
  '天梁': {
    personality: '成熟稳重有长者风范，喜欢帮助别人，是天生的"老大哥/大姐"',
    career: '适合医疗、教育、社会福利、顾问咨询等助人行业',
    love: '在感情中扮演照顾者角色，但有时会让对方觉得像被管教',
    fortune: '晚年财运好，年轻时积累的信誉和人脉会转化为财富',
    health: '注意骨骼关节和血压问题',
    positive: '有长者智慧，乐于助人，受人尊敬',
    negative: '有时过于好为人师，让人觉得啰嗦',
  },
  '七杀': {
    personality: '敢闯敢拼，有开拓精神，适合创业和竞争，是"战将"型人格',
    career: '适合创业、销售、军警、竞技体育等需要冲劲和魄力的领域',
    love: '感情直接热烈，不拖泥带水，但耐心不足',
    fortune: '有暴富潜力但风险也大，一生大起大落',
    health: '注意意外伤害和急性疾病',
    positive: '有魄力有胆识，能在逆境中杀出一条路',
    negative: '容易冲动急躁，缺乏耐心和柔和',
  },
  '破军': {
    personality: '我行我素不拘一格，有强大的创造力和破坏力双重特质',
    career: '适合创新、改革、艺术创作、新兴行业等打破常规的领域',
    love: '感情强烈但不太稳定，需要一个能跟得上自己节奏的人',
    fortune: '敢于投资新兴领域，要么大赚要么大亏',
    health: '注意内分泌紊乱和情绪波动',
    positive: '创新力强，不按常理出牌，能开辟新天地',
    negative: '容易破坏现有秩序，稳定性差，让人捉摸不定',
  },
};

/**
 * 辅星描述库
 */
const MINOR_STAR_DESC: Record<string, string> = {
  '文昌': '代表文采学识，对考试和学术特别有利',
  '文曲': '口才好、有才艺，艺术天赋突出',
  '天魁': '天乙贵人，得男性贵人相助，考试运好',
  '天钺': '玉堂贵人，得女性贵人相助，有文化缘',
  '左辅': '左膀右臂，团队协作能力强，有人帮衬',
  '右弼': '得力助手在侧，执行力和协助力强',
  '禄存': '财库加持，能存住钱，财富积累稳定',
  '擎羊': '刚烈冲动，行动力强但容易树敌',
  '陀罗': '慢工出细活，持久力强但容易拖延',
  '火星': '脾气急躁爆发力强，来得快去得也快',
  '铃星': '内心急躁不外露，暗中较劲',
  '地空': '想法天马行空不切实际，但创意出众',
  '地劫': '波折历练型，需经历风雨才能见彩虹',
  '天马': '奔波劳碌命，适合动态和出差类工作',
  '天姚': '桃花缘分多，但也容易为情所困',
  '天刑': '个性严谨有原则，适合需要纪律的工作',
  '天哭': '感性多愁，同理心强但容易情绪波动',
  '天虚': '内心空虚感强，需要找到精神寄托',
  '红鸾': '正桃花星，主婚恋喜庆之事',
  '天喜': '喜事多多，利于人缘和社交',
  '龙池': '有贵气和才气，适合追求精神层面',
  '凤阁': '文采斐然，有艺术和文化天赋',
  '三台': '阶梯式上升，运势逐步提升',
  '八座': '地位尊崇，有社会地位和声望',
  '恩光': '有贵人提携和特殊机遇',
  '天贵': '贵气加身，受人尊重',
  '台辅': '辅助型人才，适合在团队中发挥作用',
  '封诰': '有名誉地位，适合考取资格证书',
  '天官': '适合仕途和体制内发展',
  '天福': '自带福气，困难中总有转机',
  '蜚廉': '容易有小人是非，需防小人',
  '解神': '化解灾难之星，遇事有转机',
  '天巫': '对神秘学、宗教有感应和天赋',
  '阴煞': '直觉灵敏但容易招惹阴气',
  '华盖': '孤独感强但有艺术和哲学天赋',
  '咸池': '桃花泛滥，需注意烂桃花',
  '天空': '空想主义，理想远大但落地困难',
  '孤辰': '孤独感重，不太合群',
  '寡宿': '独处能力强但不擅长社交',
};

/**
 * 主星正面评价（用于拼凑命盘亮点）
 */
const MAIN_STAR_HIGHLIGHT: Record<string, string> = {
  '紫微': '紫微坐命/关键宫，天生具有王者之气和领导才能',
  '天机': '天机入命，聪明灵动，思维缜密，是天生谋士',
  '太阳': '太阳照命，光明磊落，走到哪里都能发光发热',
  '武曲': '武曲值位，执行力强，是稳扎稳打的实干家',
  '天同': '天同入局，自带福气，心态好运气也不会差',
  '廉贞': '廉贞在位，艺术细胞丰富，才华横溢',
  '天府': '天府坐守，稳重可靠，有守成之才和理财天赋',
  '太阴': '太阴入命，温柔细腻，审美品味出众',
  '贪狼': '贪狼入局，多才多艺，社交能量爆棚',
  '巨门': '巨门坐守，思辨力强，能洞察事物本质',
  '天相': '天相值位，处事周全，人缘口碑好',
  '天梁': '天梁入命，有长者风范，人生越来越稳',
  '七杀': '七杀在命，魄力十足，敢闯敢拼是本色',
  '破军': '破军入局，创新力和破坏力并存，不走寻常路',
};

// ========== 十二宫固定说明文本 ==========

const GONG_BASE_DESC: Record<string, string> = {
  '命宫': '命宫是整张命盘的起点，代表你的性格本质、先天禀赋和人生基调。命宫坐什么星，你就是什么样的人。',
  '兄弟': '兄弟宫看你和兄弟姐妹、平辈朋友、合作伙伴的关系。兄弟宫好的人社交圈优质，合作运佳。',
  '夫妻': '夫妻宫决定了你的配偶类型、婚姻质量和感情模式。夫妻宫不只是看婚姻，也反映你的合作能力。',
  '子女': '子女宫不只是孩子缘分，还代表你的下属、学生、享乐方式和偏财投资运。子女宫好的人带小孩也轻松。',
  '财帛': '财帛宫看赚钱能力和花钱方式——你靠什么赚钱、钱又花在哪里。财帛宫是"收入流"的体现，不是存款数。',
  '疾厄': '疾厄宫看身体健康和体质强弱。疾厄宫好不代表不生病，而是生病后恢复快、抗压能力强。',
  '迁移': '迁移宫看外出运、社会形象和人生舞台。迁移宫好的人适合外地发展、经常出差或从事涉外工作。',
  '交友': '交友宫也叫仆役宫，看朋友质量、同事关系和下属运。交友宫有煞星的话，合伙和用人要格外小心。',
  '官禄': '官禄宫是你的事业方向和发展天花板——适合做什么行业、能做到多高的位置。',
  '田宅': '田宅宫看房产运、家庭环境和居住品质，也代表你的"人生根基"稳不稳、有没有安身立命之所。',
  '福德': '福德宫是你精神世界的质量。福德宫好的人"会享福"，是打心底里能快乐的人，晚年生活安逸。',
  '父母': '父母宫看与父母的关系、家庭教育背景，也代表上司缘和长辈缘，以及你的学历天花板和文书运。',
};

/**
 * 各宫位的三方四正关系定义
 * 紫微斗数中十二宫布局（顺时针）：
 *   命宫-兄弟-夫妻-子女-财帛-疾厄-迁移-交友-官禄-田宅-福德-父母
 *
 * 对宫（六冲）：相隔6个宫位
 * 三合宫：本宫之外，每隔4个宫位取一个
 */

/** 十二宫标准顺序 */
const GONG_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

/** 对宫映射 */
const OPPOSITE_MAP: Record<string, string> = {
  '命宫': '迁移', '兄弟': '交友', '夫妻': '官禄', '子女': '田宅',
  '财帛': '福德', '疾厄': '父母', '迁移': '命宫', '交友': '兄弟',
  '官禄': '夫妻', '田宅': '子女', '福德': '财帛', '父母': '疾厄',
};

/** 三合宫映射 */
const TRIANGLE_MAP: Record<string, string[]> = {
  '命宫': ['官禄', '财帛'],
  '兄弟': ['田宅', '疾厄'],
  '夫妻': ['迁移', '福德'],
  '子女': ['交友', '父母'],
  '财帛': ['命宫', '官禄'],
  '疾厄': ['兄弟', '田宅'],
  '迁移': ['夫妻', '福德'],
  '交友': ['子女', '父母'],
  '官禄': ['财帛', '命宫'],
  '田宅': ['疾厄', '兄弟'],
  '福德': ['迁移', '夫妻'],
  '父母': ['子女', '交友'],
};

// ========== 工具函数 ==========

/**
 * 从星曜对象中提取四化标记（兼容多种数据格式）
 */
function extractSihua(star: StarInfo): string | null {
  // 优先使用已提取的 sihua 字段
  if (star.sihua) return star.sihua;
  // @ziweijs/core 原始格式：YT（生年四化）
  if (star.YT?.name) return star.YT.name;
  // @ziweijs/core 原始格式：ST（自化）- CF（离心自化）
  if (star.ST?.CF?.name) return star.ST.CF.name;
  // @ziweijs/core 原始格式：ST - CP（向心自化）
  if (star.ST?.CP?.name) return star.ST.CP.name;
  return null;
}

/**
 * 从星曜对象或字符串中提取星名
 */
function getStarName(star: StarInfo | string): string {
  if (typeof star === 'string') return star;
  return star.name || '';
}

/**
 * 判断星是否为煞星（擎羊、陀罗、火星、铃星、地空、地劫）
 */
function isMaleficStar(starName: string): boolean {
  const malefics = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
  return malefics.includes(starName);
}

/**
 * 判断星是否为吉星（文昌、文曲、天魁、天钺、左辅、右弼、禄存）
 */
function isAuspiciousStar(starName: string): boolean {
  const auspicious = ['文昌', '文曲', '天魁', '天钺', '左辅', '右弼', '禄存'];
  return auspicious.includes(starName);
}

/**
 * 获取主星名列表（从 StarInfo 数组中筛选 type 为 major 的）
 */
function getMainStarNames(stars: (StarInfo | string)[]): string[] {
  return stars
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s.type === 'minor') return null;
      return s.name;
    })
    .filter(Boolean) as string[];
}

/**
 * 获取某宫的四化汇总
 */
function getPalaceSihua(stars: (StarInfo | string)[]): { star: string; sihua: string }[] {
  const result: { star: string; sihua: string }[] = [];
  for (const star of stars) {
    if (typeof star === 'string') continue;
    const sihua = extractSihua(star);
    if (sihua) {
      result.push({ star: star.name, sihua });
    }
  }
  return result;
}

/**
 * 检测某宫是否为特定四化
 */
function hasSpecificSihua(stars: (StarInfo | string)[], sihuaType: string): boolean {
  for (const star of stars) {
    if (typeof star === 'string') continue;
    if (extractSihua(star) === sihuaType) return true;
  }
  return false;
}

// ========== 核心解读函数 ==========

/**
 * 根据宫位名生成该宫的个性化解读（适用于单个宫位的情境化白话解读）
 *
 * 场景适配：每个宫位侧重不同的生活层面，解读逻辑随之调整
 */
function getPalaceSpecificContext(
  palaceName: string,
  mainStars: string[],
  minorStars: string[],
  sihuaInfos: { star: string; sihua: string }[],
  oppositeInfo: OppositePalaceInfo | null,
  triangleInfos: { name: string; majorStars: string[]; sihua: string | null }[],
): string {
  const parts: string[] = [];

  // 1. 宫位开场白
  parts.push(GONG_BASE_DESC[palaceName] || `${palaceName}宫反映你人生中重要的一个面向。`);

  // 2. 本宫星曜分析
  if (mainStars.length > 0) {
    const starDetails = mainStars.map((sn) => {
      const sihuaTag = sihuaInfos.find((s) => s.star === sn);
      const trait = MAIN_STAR_TRAITS[sn];
      let detail = `${sn}`;
      if (sihuaTag) detail += `化${sihuaTag.sihua}`;
      if (trait) {
        // 根据宫位类型选取对应的描述维度
        if (palaceName === '命宫') detail += `（${trait.personality}）`;
        else if (palaceName === '夫妻') detail += `（${trait.love}）`;
        else if (palaceName === '财帛') detail += `（${trait.fortune}）`;
        else if (palaceName === '官禄') detail += `（${trait.career}）`;
        else if (palaceName === '疾厄') detail += `（${trait.health}）`;
        else detail += `（${trait.personality}）`;
      }
      return detail;
    });

    if (starDetails.length === 1) {
      parts.push(`此宫坐${starDetails[0]}，这是你的核心特质。`);
    } else if (starDetails.length === 2) {
      parts.push(`${starDetails.join('与')}同宫，两种特质交融——`);
      // 双星同宫需要描述冲突或融合
      if (mainStars.length === 2) {
        const trait0 = MAIN_STAR_TRAITS[mainStars[0]];
        const trait1 = MAIN_STAR_TRAITS[mainStars[1]];
        if (trait0 && trait1) {
          parts.push(`${trait0.positive}的同时，又有${trait1.positive}的一面。`);
        }
      }
    } else {
      parts.push(`此宫群星汇聚（${starDetails.join('、')}），能量强大但格局复杂。`);
    }
  } else {
    parts.push('此宫为空宫，无主星坐守——空宫不代表空无一物，而是弹性更大、需要借对宫星曜来考量。');
  }

  // 3. 四化分析
  if (sihuaInfos.length > 0) {
    for (const { star, sihua } of sihuaInfos) {
      switch (sihua) {
        case '禄':
          parts.push(`${star}化禄在${palaceName}宫——这是你的福气点，在${palaceName}领域容易有收获、机遇和贵人相助。`);
          break;
        case '权':
          parts.push(`${star}化权在此——${palaceName}领域你有强大的掌控力和决策力，适合主动出击、把握主导权。`);
          break;
        case '科':
          parts.push(`${star}化科照${palaceName}宫——你在这个领域有天然的魅力加成，容易获得名声、认可和贵人赏识。`);
          break;
        case '忌':
          parts.push(`${star}化忌落${palaceName}宫——这是你人生需要修炼的功课。这个领域容易遇到波折，但也因此会让你成长最多。`);
          break;
      }
    }
  }

  // 4. 辅星分析
  if (minorStars.length > 0) {
    const descParts: string[] = [];
    const ausp: string[] = [];
    const malef: string[] = [];

    for (const sn of minorStars) {
      if (isAuspiciousStar(sn)) ausp.push(sn);
      else if (isMaleficStar(sn)) malef.push(sn);
      if (MINOR_STAR_DESC[sn]) descParts.push(`${sn}（${MINOR_STAR_DESC[sn]}）`);
    }

    if (descParts.length > 0) {
      parts.push(`辅星方面，${descParts.join('、')}，为${palaceName}宫增添了更多色彩。`);
    }

    if (ausp.length > 0) {
      parts.push(`吉星${ausp.join('、')}加持，${palaceName}宫得到正面助益。`);
    }
    if (malef.length > 0) {
      parts.push(`但煞星${malef.join('、')}在此，${palaceName}方面会有些波折，需要多加注意。`);
    }
  }

  // 5. 对宫分析
  if (oppositeInfo && oppositeInfo.majorStars.length > 0) {
    const oppStars = oppositeInfo.majorStars.join('、');
    const oppTag = oppositeInfo.sihua ? `，有化${oppositeInfo.sihua}加持` : '';
    parts.push(`对宫${oppositeInfo.name}坐${oppStars}${oppTag}——对宫就像一面镜子，照出${palaceName}宫的另外一面。`);
  }

  // 6. 三合宫分析
  if (triangleInfos && triangleInfos.length > 0) {
    const triDetails = triangleInfos
      .filter((t) => t.majorStars.length > 0)
      .map((t) => {
        const base = `${t.name}宫有${t.majorStars.join('、')}`;
        return t.sihua ? `${base}并化${t.sihua}` : base;
      });
    if (triDetails.length > 0) {
      parts.push(`三合来看，${triDetails.join('；')}——这些宫位的能量都会汇入${palaceName}宫，形成合力。`);
    }
  }

  // 7. 收尾句
  const closingSentences: Record<string, string> = {
    '命宫': '命宫的格局决定了你人生的底色，理解它，不是为了认命，而是为了更好地发挥自己的天赋。',
    '夫妻': '感情是两个人的事，了解自己的夫妻宫能帮你更清醒地选择伴侣，而不是被感觉牵着走。',
    '财帛': '财运不是天注定，而是看你如何运用自己的天赋和机会。财帛宫告诉你的赚钱方向，路还得你自己走。',
    '官禄': '事业成就取决于你是否在自己擅长的领域深耕。官禄宫给你指明了方向，剩下的靠努力。',
    '疾厄': '身体是革命的本钱，疾厄宫的提醒不是吓唬你，而是让你提前注意、主动保养。',
    '福德': '真正的富有是内心的安宁。福德宫好的人，不一定最有钱，但一定最会生活。',
  };

  if (closingSentences[palaceName]) {
    parts.push(closingSentences[palaceName]);
  } else {
    parts.push(`${palaceName}宫的格局不是一成不变的——命盘是地图，怎么走，永远在你手里。`);
  }

  return parts.join('');
}

// ========== 公开 API ==========

/**
 * 为单个宫位生成200-400字的白话解读
 *
 * @param palaceName - 宫位名称（命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/交友/官禄/田宅/福德/父母）
 * @param stars - 该宫主星辅星数组（兼容 @ziweijs/core Star 对象和简化格式）
 * @param sihua - 四化标记（可选，若 stars 中已包含 sihua/YT/ST 信息可传 null）
 * @param oppositePalace - 对宫信息（对宫宫名和主星列表）
 * @param trianglePalaces - 三合宫信息数组
 * @returns 200-400字白话解读字符串
 */
export function generatePalaceReading(
  palaceName: string,
  stars: (StarInfo | string)[],
  sihua: { star: string; sihua: string }[] | null,
  oppositePalace: OppositePalaceInfo | null,
  trianglePalaces: TrianglePalacesInfo | null,
): PalaceReading {
  // 分离主星和辅星
  const mainStars: string[] = [];
  const minorStars: string[] = [];
  const allSihua: { star: string; sihua: string }[] = [];

  for (const star of stars) {
    const name = getStarName(star);

    if (typeof star === 'string') {
      // 纯字符串，无法判断类型，按主星处理
      if (MAIN_STAR_TRAITS[name]) {
        mainStars.push(name);
      } else {
        minorStars.push(name);
      }
    } else {
      if (star.type === 'minor') {
        minorStars.push(name);
      } else {
        mainStars.push(name);
      }
      // 提取四化
      const extractedSihua = extractSihua(star);
      if (extractedSihua) {
        allSihua.push({ star: name, sihua: extractedSihua });
      }
    }
  }

  // 合并传入的四化参数
  if (sihua) {
    for (const item of sihua) {
      if (!allSihua.some((s) => s.star === item.star && s.sihua === item.sihua)) {
        allSihua.push(item);
      }
    }
  }

  // 提取三合宫信息
  const triInfos = trianglePalaces?.palaces?.map((p) => ({
    name: p.name,
    majorStars: p.majorStars,
    sihua: p.sihua,
  })) || [];

  // 生成解读文本
  const reading = getPalaceSpecificContext(palaceName, mainStars, minorStars, allSihua, oppositePalace, triInfos);

  return {
    palaceName,
    reading,
    length: reading.length,
  };
}

/**
 * 获取所有十二宫的白话解读
 *
 * @param allPalacesData - 十二宫完整数据数组（兼容 @ziweijs/core 的 Astrolabe.palaces 和本项目简化格式）
 * @returns 各宫解读结果数组
 */
export function getAllPalacesReading(allPalacesData: PalaceData[]): PalaceReading[] {
  // 构建宫位查找映射（按宫名快速索引）
  const palaceMap: Record<string, PalaceData> = {};
  for (const p of allPalacesData) {
    palaceMap[p.name] = p;
  }

  // 预先提取各宫的四化信息（全局汇总）
  const globalSihua: Record<string, { star: string; sihua: string }[]> = {};
  for (const p of allPalacesData) {
    const allStars: (StarInfo | string)[] = [
      ...(p.majorStars || []),
      ...(p.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    globalSihua[p.name] = getPalaceSihua(allStars);
  }

  const results: PalaceReading[] = [];

  for (const palace of allPalacesData) {
    const palaceName = palace.name;

    // 收集该宫所有星曜
    const allStars: (StarInfo | string)[] = [
      ...(palace.majorStars || []),
      ...(palace.minorStars || []).map((s) =>
        typeof s === 'string' ? { name: s, type: 'minor' } : s,
      ),
    ];

    // 构建对宫信息
    const oppositeName = OPPOSITE_MAP[palaceName];
    let oppositeInfo: OppositePalaceInfo | null = null;
    if (oppositeName && palaceMap[oppositeName]) {
      const oppPalace = palaceMap[oppositeName];
      const oppStars: (StarInfo | string)[] = [
        ...(oppPalace.majorStars || []),
        ...(oppPalace.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
      ];
      const oppMainStars = getMainStarNames(oppStars);
      // 获取对宫第一个四化（如果有）
      const oppSihuas = getPalaceSihua(oppStars);
      oppositeInfo = {
        name: oppositeName,
        majorStars: oppMainStars,
        sihua: oppSihuas.length > 0 ? oppSihuas[0].sihua : null,
      };
    }

    // 构建三合宫信息
    const triNames = TRIANGLE_MAP[palaceName] || [];
    const triangleInfo: TrianglePalacesInfo = {
      palaces: triNames
        .filter((name) => palaceMap[name])
        .map((name) => {
          const triPalace = palaceMap[name];
          const triStars: (StarInfo | string)[] = [
            ...(triPalace.majorStars || []),
            ...(triPalace.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
          ];
          const triMainStars = getMainStarNames(triStars);
          const triSihuas = getPalaceSihua(triStars);
          return {
            name: triPalace.name,
            majorStars: triMainStars,
            sihua: triSihuas.length > 0 ? triSihuas[0].sihua : null,
          };
        }),
    };

    const reading = generatePalaceReading(palaceName, allStars, null, oppositeInfo, triangleInfo);
    results.push(reading);
  }

  return results;
}

/**
 * 生成命盘总结报告
 *
 * @param allPalacesData - 全部十二宫数据
 * @returns 包含亮点、注意点和整体运势的总结报告
 */
export function generateSummarizedReport(allPalacesData: PalaceData[]): SummarizedReport {
  const highlights: string[] = [];
  const cautions: string[] = [];

  // 构建查找映射
  const palaceMap: Record<string, PalaceData> = {};
  for (const p of allPalacesData) {
    palaceMap[p.name] = p;
  }

  // 收集全盘所有星的汇总信息
  const allStarsGlobal: { name: string; palace: string; sihua: string | null }[] = [];
  const allSihuaList: { star: string; palace: string; sihua: string }[] = [];

  for (const palace of allPalacesData) {
    const stars: (StarInfo | string)[] = [
      ...(palace.majorStars || []),
      ...(palace.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    for (const star of stars) {
      const name = typeof star === 'string' ? star : star.name;
      const sihua = typeof star === 'string' ? null : extractSihua(star);
      allStarsGlobal.push({ name, palace: palace.name, sihua });
      if (sihua) {
        allSihuaList.push({ star: name, palace: palace.name, sihua });
      }
    }
  }

  // ---- 亮点分析 (3-5条) ----

  // 1. 命宫主星亮点
  const mingGong = palaceMap['命宫'];
  if (mingGong) {
    const mingAllStars: (StarInfo | string)[] = [
      ...(mingGong.majorStars || []),
      ...(mingGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const mingMain = getMainStarNames(mingAllStars);
    if (mingMain.length > 0) {
      const mainStar = mingMain[0];
      if (MAIN_STAR_HIGHLIGHT[mainStar]) {
        highlights.push(`命宫坐${mainStar}——${MAIN_STAR_HIGHLIGHT[mainStar]}。` +
          `${MAIN_STAR_TRAITS[mainStar]?.positive || ''}`);
      }
    }
  }

  // 2. 四化禄所在宫 —— 福气所在
  const luItems = allSihuaList.filter((s) => s.sihua === '禄');
  if (luItems.length > 0) {
    const luStars = luItems.map((s) => `${s.star}在${s.palace}宫化禄`).join('、');
    highlights.push(`四化中有化禄——${luStars}，这是你的福气源泉，在这些领域顺势而为会有事半功倍的效果。`);
  }

  // 3. 四化权所在宫 —— 掌控力所在
  const quanItems = allSihuaList.filter((s) => s.sihua === '权');
  if (quanItems.length > 0) {
    const quanStars = quanItems.map((s) => `${s.star}在${s.palace}宫化权`).join('、');
    highlights.push(`命盘有化权——${quanStars}，你在这个领域具备领导力和主导权，适合主动争取和掌控局面。`);
  }

  // 4. 财帛宫、田宅宫有财星
  const caiBoGong = palaceMap['财帛'];
  const tianZhaiGong = palaceMap['田宅'];
  for (const [gong, label] of [['财帛', '财帛宫'], ['田宅', '田宅宫']] as const) {
    const p = palaceMap[gong];
    if (p) {
      const pStars: (StarInfo | string)[] = [
        ...(p.majorStars || []),
        ...(p.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
      ];
      const pMainStars = getMainStarNames(pStars);
      const pSihua = getPalaceSihua(pStars);
      const wealthStars = ['武曲', '天府', '太阴', '禄存'];
      const matched = pMainStars.filter((s) => wealthStars.includes(s));
      if (matched.length > 0) {
        const sihuaTag = pSihua.length > 0 ? `，且有${pSihua.map((s) => `${s.star}化${s.sihua}`).join('、')}` : '';
        highlights.push(`${label}有${matched.join('、')}坐守${sihuaTag}，理财能力和财富积累有先天优势。`);
      }
    }
  }

  // 5. 官禄宫亮点
  const guanLuGong = palaceMap['官禄'];
  if (guanLuGong) {
    const glStars: (StarInfo | string)[] = [
      ...(guanLuGong.majorStars || []),
      ...(guanLuGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const glMainStars = getMainStarNames(glStars);
    const glSihua = getPalaceSihua(glStars);

    const guiXing = ['紫微', '天府', '天相', '太阳', '天梁'];
    const matched = glMainStars.filter((s) => guiXing.includes(s));
    if (matched.length > 0) {
      highlights.push(`官禄宫有${matched.join('、')}坐守，事业上有贵人运，适合往管理或专业权威方向发展。`);
    }

    if (glSihua.some((s) => s.sihua === '科')) {
      highlights.push('官禄宫化科——在事业和公众领域容易获得名声和认可，适合建立个人品牌。');
    }
  }

  // 6. 福德宫亮点
  const fuDeGong = palaceMap['福德'];
  if (fuDeGong) {
    const fdStars: (StarInfo | string)[] = [
      ...(fuDeGong.majorStars || []),
      ...(fuDeGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const fdMainStars = getMainStarNames(fdStars);
    const fdSihua = getPalaceSihua(fdStars);

    if (fdMainStars.some((s) => ['天同', '天梁', '天府', '太阴'].includes(s))) {
      highlights.push('福德宫有吉星坐守——内心富足、懂得享受生活，精神世界丰盈，晚年运势尤其不错。');
    }
    if (fdSihua.some((s) => s.sihua === '禄')) {
      highlights.push('福德宫化禄——天生的享福命，物质和精神双丰收，日子过得舒心。');
    }
  }

  // 7. 夫妻宫亮点
  const fuQiGong = palaceMap['夫妻'];
  if (fuQiGong) {
    const fqStars: (StarInfo | string)[] = [
      ...(fuQiGong.majorStars || []),
      ...(fuQiGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const fqMainStars = getMainStarNames(fqStars);
    if (fqMainStars.some((s) => ['天相', '天同', '太阴', '天府'].includes(s))) {
      highlights.push('夫妻宫格局不错，配偶类型属于稳重可靠型，婚姻生活有质量。');
    }
  }

  // ---- 注意点分析 (2-3条) ----

  // 1. 化忌所在宫 —— 人生功课
  const jiItems = allSihuaList.filter((s) => s.sihua === '忌');
  if (jiItems.length > 0) {
    const jiDesc = jiItems.map((s) => `${s.star}在${s.palace}宫化忌`).join('、');
    cautions.push(`${jiDesc}——这是你命盘中的"功课区"，在这些领域容易遇到挑战，但跨过去就是成长。不要逃避，而要花更多心思经营。`);
  }

  // 2. 疾厄宫煞星警示
  const jiEGong = palaceMap['疾厄'];
  if (jiEGong) {
    const jeStars: (StarInfo | string)[] = [
      ...(jiEGong.majorStars || []),
      ...(jiEGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const jeMainStars = getMainStarNames(jeStars);
    const jeAllNames = jeStars.map((s) => getStarName(s));
    const dangerStars = ['七杀', '破军', '廉贞', '擎羊', '火星', '铃星', '陀罗', '地空', '地劫'];
    const matched = jeAllNames.filter((s) => dangerStars.includes(s));
    if (matched.length > 0) {
      cautions.push(`疾厄宫有${matched.join('、')}——体质上需要注意，建议保持规律作息和定期体检，避免意外伤害。`);
    }
  }

  // 3. 交友宫煞星警示
  const jiaoYouGong = palaceMap['交友'];
  if (jiaoYouGong) {
    const jyStars: (StarInfo | string)[] = [
      ...(jiaoYouGong.majorStars || []),
      ...(jiaoYouGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const jyAllNames = jyStars.map((s) => getStarName(s));
    const dangerStars = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '七杀', '破军'];
    const matched = jyAllNames.filter((s) => dangerStars.includes(s));
    if (matched.length > 0) {
      cautions.push(`交友宫有${matched.join('、')}——在选择朋友和合作伙伴时需谨慎，建议多观察再深交，合伙要用合同保护自己。`);
    }
  }

  // 4. 命宫化忌或空宫
  if (mingGong) {
    const mingAllStars: (StarInfo | string)[] = [
      ...(mingGong.majorStars || []),
      ...(mingGong.minorStars || []).map((s) => (typeof s === 'string' ? s : s)),
    ];
    const mingMain = getMainStarNames(mingAllStars);
    const mingSihua = getPalaceSihua(mingAllStars);
    if (mingMain.length === 0 && cautions.length < 3) {
      cautions.push('命宫为空宫——并不代表运势不好，而是你的性格可塑性很强，需要更多的时间探索和确立自我。');
    }
    if (mingSihua.some((s) => s.sihua === '忌')) {
      cautions.push('命宫化忌——人生早期可能比别人多走一些弯路，但正是这些经历让你比别人更坚韧、更有深度。');
    }
  }

  // 限制数量
  const finalHighlights = highlights.slice(0, 5);
  const finalCautions = cautions.slice(0, 3);

  if (finalHighlights.length === 0) {
    finalHighlights.push('命盘整体格局清朗，各方面能量均衡，没有明显的偏颇之处。');
  }
  if (finalCautions.length === 0) {
    finalCautions.push('各宫位整体配置较好，暂无特别需要警惕之处。保持平常心即可。');
  }

  // ---- 整体运势解读 (约200字) ----
  const overall = generateOverallReading(allPalacesData, allSihuaList, finalHighlights, finalCautions);

  return {
    highlights: finalHighlights,
    cautions: finalCautions,
    overall,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 生成整体运势白话解读（约200字）
 */
function generateOverallReading(
  _allPalacesData: PalaceData[],
  allSihua: { star: string; palace: string; sihua: string }[],
  highlights: string[],
  cautions: string[],
): string {
  const parts: string[] = [];

  // 开场
  parts.push('综合来看，这张命盘展现了独特的生命图景。');

  // 四化特征总结
  const luCount = allSihua.filter((s) => s.sihua === '禄').length;
  const quanCount = allSihua.filter((s) => s.sihua === '权').length;
  const keCount = allSihua.filter((s) => s.sihua === '科').length;
  const jiCount = allSihua.filter((s) => s.sihua === '忌').length;

  if (luCount > 1) {
    parts.push('命盘中化禄较多，整体运气不错，人生中容易遇到机遇和贵人，关键是要懂得抓住。');
  } else if (luCount === 1) {
    parts.push('命盘中有化禄加持，在对应领域会有不错的福报，顺势而为就能收获。');
  }

  if (jiCount > 0) {
    parts.push(`同时有化忌分布在${jiCount}个宫位，这些领域需要你更多耐心和智慧去经营，是人生成长的必修课。`);
  }

  if (quanCount > 0) {
    parts.push('化权的力量赋予你掌控和主导的能力，建议在你擅长的领域主动出击、大胆决策。');
  }

  if (keCount > 0) {
    parts.push('化科带来了名声和人缘的助力，你的才华容易被看见，适合在公众领域建立个人影响力。');
  }

  // 格局判断
  const hasManyHighlights = highlights.length >= 4;
  const hasManyCautions = cautions.length >= 3;

  if (hasManyHighlights && !hasManyCautions) {
    parts.push('整体格局向上，命盘中吉星汇聚之处较多，是天生运势不错的类型。');
  } else if (!hasManyHighlights && hasManyCautions) {
    parts.push('命盘中有几个需要留意的领域，但这不代表命运不好——越是需要修炼的地方，越能成就你的深度和厚度。');
  } else {
    parts.push('命盘中有吉有煞，福祸相倚——这正是人生常态。了解自己的优势去发挥，知道短板去补足，才是看盘的意义。');
  }

  // 收尾
  parts.push('紫微斗数不是宿命论，它给你的是一张人生地图。路怎么走、风景怎么看，永远在你自己的手中。愿你在了解自己命盘之后，更加清醒、更加笃定地走好每一步。');

  return parts.join('');
}

/**
 * 将 @ziweijs/core 的 Astrolabe 结果转换为分析器可用的 PalaceData 格式
 *
 * @param astrolabe - @ziweijs/core ziwei.bySolar() 或 ziwei.byLunisolar() 返回的结果
 * @returns 标准化后的十二宫数据
 */
export function normalizeAstrolabeData(astrolabe: any): PalaceData[] {
  if (!astrolabe || !astrolabe.palaces || !Array.isArray(astrolabe.palaces)) {
    console.warn('ziweiAnalysis: 输入数据不包含有效的 palaces 数组，尝试兼容处理');
    // 兼容：可能整个对象就是数组
    if (Array.isArray(astrolabe)) {
      return normalizePalaceArray(astrolabe);
    }
    return [];
  }
  return normalizePalaceArray(astrolabe.palaces);
}

function normalizePalaceArray(palaces: any[]): PalaceData[] {
  return palaces.map((p: any) => {
    // 处理 majorStars
    const majorStars: StarInfo[] = (p.majorStars || []).map((s: any) => {
      // @ziweijs/core 原始 Star 对象
      if (s && typeof s === 'object') {
        // 兼容：可能已经是简化格式 { name, sihua }
        if (s.sihua !== undefined && !s.YT && !s.ST) {
          return {
            name: s.name,
            type: s.type || 'major',
            sihua: s.sihua,
          };
        }
        // @ziweijs/core 原始格式
        return {
          name: s.name,
          type: s.type || 'major',
          YT: s.YT,
          ST: s.ST,
          sihua: s.YT?.name || s.ST?.CF?.name || s.ST?.CP?.name || null,
        };
      }
      // 纯字符串
      return { name: String(s), type: 'major', sihua: null };
    });

    // 处理 minorStars
    const minorStars: (StarInfo | string)[] = (p.minorStars || []).map((s: any) => {
      if (s && typeof s === 'object') {
        if (s.sihua !== undefined && !s.YT && !s.ST) {
          return {
            name: s.name,
            type: 'minor',
            sihua: s.sihua,
          };
        }
        return {
          name: s.name,
          type: 'minor',
          sihua: null,
        };
      }
      return String(s);
    });

    return {
      name: p.name,
      stem: p.stem,
      branch: p.branch,
      majorStars,
      minorStars,
      isLaiYin: p.isLaiYin || false,
      isShenGong: p.isShenGong || false,
      index: p.index,
    };
  });
}
