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
  signature: string; // 本命盘指纹总结（让每次排盘都有独特文字感）
}

// ========== 基础映射表 ==========

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const DZ_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const WX_SHENG: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
const WX_SHENG_CHU: Record<string, string> = { '水': '木', '木': '火', '火': '土', '土': '金', '金': '水' };
const WX_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
const WX_BEI_KE: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

const WX_COLOR: Record<string, string> = { '木': '绿色/青色', '火': '红色/紫色', '土': '黄色/棕色', '金': '白色/金色', '水': '蓝色/黑色' };
const WX_NUMBER: Record<string, string> = { '木': '3、8', '火': '2、7', '土': '5、0', '金': '4、9', '水': '1、6' };
const WX_DIRECTION: Record<string, string> = { '木': '东方', '火': '南方', '土': '中央/本地', '金': '西方', '水': '北方' };

const DZ_ZODIAC: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
};

const SAN_HE: Record<string, string[]> = {
  '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
  '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
  '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
  '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
};

const LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'];
const PILLAR_AGES: Record<string, string> = {
  '年柱': '0-16岁（童年/少年）',
  '月柱': '17-32岁（青年/成家立业）',
  '日柱': '33-48岁（中年/人生主场）',
  '时柱': '49岁以后（晚年/子女/归宿）',
};
const PILLAR_AGE_RANGE: Record<string, [number, number]> = {
  '年柱': [0, 16],
  '月柱': [17, 32],
  '日柱': [33, 48],
  '时柱': [49, 99],
};

// ========== 地支藏干表 ==========
const DZ_CANG_GAN: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// 天干阴阳
const TG_YIN_YANG: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
};

// ========== 个性化差异化引擎 ==========
// 目的：让五维解读（爱情/事业/健康/家庭/社交）随命局不同而显著不同。
// 六层锚点：日主天干(10) × 日支夫妻宫(12) × 配偶星天干(10) × 桃花地支(4) × 月令调候(12) × 十神主气(10)

/** 日主十天干性格底色（比五行更细一倍的个性锚） */
const DAY_GAN_PROFILE: Record<string, { core: string; love: string; social: string; family: string }> = {
  '甲': {
    core: '你是甲木日主——像一棵直挺的大树，正直有担当，认准的事不轻易回头',
    love: '你在感情中是"扛事型"伴侣：对方遇到困难你第一个站出来，但也要小心把"讲道理"当成解决问题的唯一方式——伴侣有时要的是共情不是方案',
    social: '你在朋友圈里是"主心骨"型——大家有事愿意找你拿主意，但你习惯照顾所有人，容易把自己累到',
    family: '你在家里习惯当"顶梁柱"，家人依赖你，但你也容易把责任全揽在自己身上',
  },
  '乙': {
    core: '你是乙木日主——像藤蔓花草，柔韧灵活，善于借势而上，打不垮也压不弯',
    love: '你在感情中擅长以柔克刚：不硬碰硬，但心里有自己的算盘。注意别把不满憋成"冷战"，你有本事让对方察觉不到你生气',
    social: '你社交中八面玲珑，能在不同圈子之间穿梭，但真正交心的朋友屈指可数——你防备心其实不低',
    family: '你是家里的"润滑剂"，擅长调和矛盾，但自己的委屈常常留到最后才说',
  },
  '丙': {
    core: '你是丙火日主——像太阳一样光明磊落，热情大方，走到哪里都自带光和热',
    love: '你爱起来轰轰烈烈、掏心掏肺，但热度来得快也可能降温快——你要找的是能接得住你热情又不被灼伤的人',
    social: '你是天生的"场暖机"，聚会因为有你才热闹；但热闹散场后的空虚感，是你少数不愿示人的角落',
    family: '你对家人大方慷慨，家里有你在气氛就不冷场，但偶尔强势——"我都是为你们好"是你的口头禅',
  },
  '丁': {
    core: '你是丁火日主——像烛火灯芯，温柔细腻，外柔内热，越在黑暗处越显出你的光',
    love: '你的爱是细水长流型的：记得对方的喜好和纪念日，用细节表达心意。但你敏感，容易把对方一句无心的话放大成"他不在乎我"',
    social: '你不是人群中最吵的那个，却是最会照顾个别情绪的那个——朋友向你倾诉过一次，就会把你当树洞',
    family: '你和家人相处温柔体贴，但你心里藏着的事往往不愿说出来，家人未必真正懂你',
  },
  '戊': {
    core: '你是戊土日主——像高山城墙，厚重沉稳，说到做到，是天生的"信用担当"',
    love: '你谈恋爱慢热但极其专一，认定了就不改；缺点是浪漫细胞少——你觉得"我在就行"就是爱，对方却可能想要仪式感',
    social: '你的朋友是一年一年沉淀下来的，不靠嘴甜靠靠谱。别人托你办的事，你办不到就不会答应',
    family: '你是家里的"定海神针"，家人有事第一个想到你；但你不太表达感情，爱都藏在做的事里',
  },
  '己': {
    core: '你是己土日主——像田园沃土，包容务实，能屈能伸，善于把平凡的日子过出滋味',
    love: '你在感情里是"过日子型"选手：把对方的生活照顾得妥妥帖帖。但你容易操心过头，把伴侣惯成"甩手掌柜"然后自己委屈',
    social: '你人缘好在于"让人觉得没负担"——你从不强人所难。但你也因此常常是迁就的那一方',
    family: '你是家里的实际操持者，柴米油盐你最上心；记得也给自己留点松快时间，别把自己活成了后勤部长',
  },
  '庚': {
    core: '你是庚金日主——像刀剑矿石，果敢刚毅，爱恨分明，是"讲原则"三个字的化身',
    love: '你在感情里直来直去，讨厌猜来猜去；你的爱体现为"护短"——外人不能说你伴侣半句不好。但你的硬话有时候像刀子，记得包一层糖',
    social: '你交朋友讲义气，答应的事赴汤蹈火；但你看不惯的人连装都懒得装，社交圈两极分化明显',
    family: '你对家人管得多也护得狠，嘴上不饶人心里全是牵挂——典型的"刀子嘴豆腐心"',
  },
  '辛': {
    core: '你是辛金日主——像珠玉首饰，精致敏锐，自尊心强，对品质和细节有天然的挑剔',
    love: '你对感情的要求是"精神共鸣"——聊不来的人条件再好也没用。你嘴上爱挑剔对方，但谁说你伴侣不好你跟谁急',
    social: '你在社交中优雅有分寸，第一印象极好；但你内心有把尺子，达不到标准的人很难真正走进你的圈子',
    family: '你在家里看似好说话，其实很有主见；家人可能觉得你"讲究多"，其实你只是想把日子过得有质感',
  },
  '壬': {
    core: '你是壬水日主——像江河奔流，聪明通透，适应力极强，心里装着远方和更大的世界',
    love: '你在感情里需要"智性吸引"——对方要能跟你聊到一块。你讨厌被管束，伴侣管得越紧你跑得越快，放养反而拴得住你',
    social: '你是天生的消息枢纽，什么圈子都认识人；但你的交情来得快淡得也快，真正留在心里的没几个',
    family: '你理想远、跑得远，家里可能觉得你"心野"；其实你挣面子、寄钱回家，用的是自己的方式孝顺',
  },
  '癸': {
    core: '你是癸水日主——像雨露泉水，心思细腻，直觉敏锐，表面安静内心千回百转',
    love: '你在感情里重感觉、爱得深，但不容易开口——总希望对方"懂我"。学会把需求直接说出来，是你感情幸福的必修课',
    social: '你安静低调，是人群中的观察者；你以为自己没存在感，其实很多人默默觉得你"靠谱又舒服"',
    family: '你跟家人情感联结深但不善表达，把关心藏在行动里；偶尔一句"我想你们"，胜过你做的十件事',
  },
};

/** 12日支夫妻宫画像：坐支不同，感情模式与择偶倾向显著不同 */
const SPOUSE_PALACE_PROFILE: Record<string, string> = {
  '子': '你的夫妻宫坐子水——你内心向往聪明机灵、聊得来的伴侣，喜欢"智性恋"。另一半大概率思路清晰、点子多，但情绪像水一样起伏，你需要接得住TA偶尔的敏感',
  '丑': '你的夫妻宫坐丑土——你渴望踏实过日子的伴侣，不追求轰轰烈烈但求细水长流。另一半可能话不多、慢热务实，婚后是"把日子越过越好"的类型，但你要主动制造情趣',
  '寅': '你的夫妻宫坐寅木——你容易被有冲劲、有事业心的人吸引。另一半上进心强、说干就干，但也可能聚少离多或脾气急；你们更像事业同盟，互相成就',
  '卯': '你的夫妻宫坐卯木——你的理想伴侣是温和儒雅、有审美有品位的人。另一半大概率外形清秀、人缘好，感情模式偏浪漫；但TA人缘太好，你要注意经营安全感',
  '辰': '你的夫妻宫坐辰土——你倾向找包容大度、能兜底的人。另一半成熟稳重、有库存有积累，是"能扛事"的类型；相处像老友，激情不多但风雨同舟',
  '巳': '你的夫妻宫坐巳火——你欣赏聪明外向、有才华有表现力的人。另一半能说会道、社交面广，跟TA在一起不无聊；但两人都急脾气时容易一点就着，要学会降温',
  '午': '你的夫妻宫坐午火——你向往热烈浪漫的爱情，要的是心动而不是凑合。另一半热情开朗、爱憎分明，恋爱体验感强；但激情需要管理，学会把热烈转化为细水长流',
  '未': '你的夫妻宫坐未土——你要的是温暖包容的家人型伴侣。另一半体贴顾家、心思细腻，会把你照顾得很好；但TA也可能多思多虑，需要你多给确定的回应',
  '申': '你的夫妻宫坐申金——你被聪明伶俐、执行力强的人吸引。另一半脑子活、动手能力强，属于"方法总比困难多"的类型；你们在一起效率高，但注意别把日子过成纯理性合作',
  '酉': '你的夫妻宫坐酉金——你的择偶眼光高，看重气质、品味和原则性。另一半往往形象气质佳、对自己要求严；但两人都爱较真时容易起摩擦，小事别争对错',
  '戌': '你的夫妻宫坐戌土——你倾向于忠诚可靠的伴侣，"忠诚"在你的择偶标准里排第一。另一半重情重义、说一不二；但TA认定的事不太好说服，家里大事要商量着来',
  '亥': '你的夫妻宫坐亥水——你向往灵魂伴侣式的感情，要的是懂得和包容。另一半心软善良、有奉献精神，对你掏心掏肺；但TA情绪需要出口，你要做TA的定心丸',
};

/** 配偶星按具体天干的10种画像（替代原5行笼统版） */
const SPOUSE_GAN_TRAITS: Record<string, string> = {
  '甲': '对方大概率身材挺拔、性格正直，是"能扛事"的类型——有原则、有点倔，认准的道理九头牛拉不回',
  '乙': '对方大概率身形清瘦灵活、性格温和韧性强——表面随和好说话，实际心里有数、打不垮',
  '丙': '对方大概率外向开朗、精神气足，像小太阳——热情大方爱交朋友，但性子急、来去都快',
  '丁': '对方大概率斯文细腻、心思敏感——外在安静温和，内心炽热专一，容易多想，需要你给足安全感',
  '戊': '对方大概率体格厚实、沉稳可靠——话不多但说到做到，是"闷葫芦型"的靠谱，浪漫细胞少',
  '己': '对方大概率随和包容、擅长持家——好相处、会照顾人，但容易操心唠叨，也容易委屈自己',
  '庚': '对方大概率轮廓分明、性格果决——爱恨分明讲义气，脾气来得快去得也快，吃软不吃硬',
  '辛': '对方大概率形象气质出众、精致讲究——对自己要求高，有点完美主义，说话带刺但心不坏',
  '壬': '对方大概率聪明机灵、见多识广——主意多、朋友多、闲不住，讨厌被管束，需要给彼此空间',
  '癸': '对方大概率温柔安静、直觉敏锐——外表柔弱内心有主见，感情细腻爱幻想，需要被理解多于被说教',
};

/** 桃花按具体地支的四种子差异（子午卯酉） */
const PEACH_DZ_TRAITS: Record<string, string> = {
  '子': '子水桃花偏"智性浪漫"型——你容易被聪明有趣的人吸引，也容易因为聊天投机而动心，注意别把"聊得来"直接当成"适合在一起"',
  '午': '午火桃花偏"热烈外放"型——你的魅力是明晃晃的，容易一见钟情也容易被人一见钟情，感情来得快，热恋期轰轰烈烈，要学会在热度过后看人品',
  '卯': '卯木桃花偏"温和吸粉"型——你不是主动出击的类型，但温和干净的气质让人如沐春风，往往是别人先动心；你的烂桃花少，正缘质量高',
  '酉': '酉金桃花偏"气质高冷"型——你的吸引力来自品味和距离感，欣赏你的人往往默默关注很久才敢开口；你的麻烦不在没人追，而在门槛太高错过对的人',
};

/** 月令调候健康要点（按月支12条）——出生季节决定体质底色的经典调候思路 */
const SEASON_HEALTH: Record<string, string> = {
  '寅': '你生于初春（寅月），春寒料峭、木气萌动——体质底色偏"寒湿未散"，注意保暖驱寒、少食生冷，肝气容易郁结，情绪疏导对你格外重要',
  '卯': '你生于仲春（卯月），木气正旺——肝阳容易偏亢，注意春季易怒、偏头痛和睡眠问题；春天多踏青疏肝，少熬夜',
  '辰': '你生于暮春（辰月），土湿渐重——脾胃偏湿是你的底色，少吃甜腻寒凉，梅雨季注意关节和肠胃',
  '巳': '你生于初夏（巳月），火气渐旺——心火容易偏亢，注意失眠、口舌生疮和血压问题；入夏后少辛辣、多补水',
  '午': '你生于仲夏（午月），火气最烈——体质偏燥热，心脑血管和情绪管理是终生课题；盛夏防中暑，平时少熬夜上火食物',
  '未': '你生于长夏（未月），湿热交蒸——脾胃湿热是你的底色，皮肤和消化容易报警；饮食清淡祛湿，绿豆冬瓜是你的好朋友',
  '申': '你生于初秋（申月），金气渐肃——肺和大肠是你的敏感带，换季时呼吸道容易先出问题；秋天注意润燥',
  '酉': '你生于仲秋（酉月），金气最旺——肺气偏亢，皮肤干燥、呼吸道敏感是常见困扰；多食白色润肺食物，防秋燥',
  '戌': '你生于暮秋（戌月），燥土当令——脾胃偏燥，注意消化和皮肤保湿；深秋防寒胃，少吃烧烤辛辣',
  '亥': '你生于初冬（亥月），水气渐旺——体质偏寒，肾气和腰腿保暖是终生课题；冬天泡脚驱寒，少食冷饮',
  '子': '你生于仲冬（子月），水气最盛、天寒地冻——阳气体质偏弱，特别怕冷；补肾阳、护腰膝、冬天晒背，比吃任何补品都有效',
  '丑': '你生于隆冬腊月（丑月），寒湿凝滞——脾胃虚寒加肾阳不足是你的底色；忌生冷，冬天注意腰腹保暖，姜茶是你的日常饮品',
};

/** 十神主气特质：命局数量最多的十神，决定一个人的主导气质 */
const SHISHEN_SIGNATURE: Record<string, string> = {
  '正官': '你命局主气是正官——规则感、责任感刻在骨子里，做事有底线有章法，天生的"体制内气质"',
  '七杀': '你命局主气是七杀——你身上有股狠劲和狼性，压力越大反弹越大，危机感是你的燃料',
  '正印': '你命局主气是正印——书卷气和学习力是你的底色，你相信知识改变命运，也确实如此',
  '偏印': '你命局主气是偏印——你的思维方式总与常人差一个角度，冷门领域和非常规路径反而是你的主场',
  '正财': '你命局主气是正财——你务实本分，一分耕耘一分收获是你的信仰，你也确实靠踏实积累了成果',
  '偏财': '你命局主气是偏财——你嗅觉灵、出手快，对机会有天然的敏感度，钱在你的手里是流动的活水',
  '食神': '你命局主气是食神——你懂生活、有才艺、心态松弛，"会玩"背后是天生的审美和表达力',
  '伤官': '你命局主气是伤官——你才华外露、思维犀利，看问题一针见血；锋芒是你的武器，也要小心伤己',
  '比肩': '你命局主气是比肩——你独立要强，凡事习惯靠自己，同行和朋友既是你的伙伴也是你的镜子',
  '劫财': '你命局主气是劫财——你行动力强、敢想敢干，人生字典里没有"怂"字；但冲动消费和义气用事是你的暗坑',
};

/** 统计命局十神，返回数量最多的"主气"十神（至少出现2次才算） */
function dominantShiShen(pillars: PillarData[]): { name: string; count: number } | null {
  const cnt: Record<string, number> = {};
  for (const p of pillars) {
    if (p.shiShen) cnt[p.shiShen] = (cnt[p.shiShen] || 0) + 1;
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of Object.entries(cnt)) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best && bestN >= 2 ? { name: best, count: bestN } : null;
}

// ========== 综合日主强弱分析（新版） ==========

export interface DayMasterStrengthResult {
  level: string;     // '身强' | '身弱' | '中和' | '身极强' | '身极弱'
  score: number;
  details: {
    season: string;
    roots: string;
    yinSupport: string;
    bijieSupport: string;
    weakenForces: string;
  };
  summary: string;
}

/**
 * 综合判断日主强弱 —— 考虑月令、地支根气、印星生扶、比劫帮助、克泄力量
 */
export function analyzeDayMasterStrength(
  dayGan: string,
  monthZhi: string,
  pillars: PillarData[]
): DayMasterStrengthResult {
  const dayWx = TG_WX[dayGan];
  const dayYY = TG_YIN_YANG[dayGan]; // 阴阳

  // 生我者（印星）的五行
  const shengWoWx = WX_SHENG[dayWx];
  // 我生者（食伤）的五行
  const woShengWx = WX_SHENG_CHU[dayWx];
  // 克我者（官杀）的五行
  const keWoWx = WX_BEI_KE[dayWx];
  // 我克者（财星）的五行
  const woKeWx = WX_KE[dayWx];

  let score = 0;
  const maxScore = 11; // 理论满分：月令3 + 根气3 + 印星3 + 比劫2

  // ===== 1. 月令分析（最高±3分） =====
  const monthWx = DZ_WX[monthZhi];
  const cangGanOfMonth = DZ_CANG_GAN[monthZhi] || [];
  const monthCangWx = cangGanOfMonth.map(g => TG_WX[g]);

  let seasonDetail = '';
  if (monthWx === dayWx) {
    score += 3;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月（${monthWx}月），月令与日主同五行——得令，力量最强。好比树木生在春天，天时地利。`;
  } else if (shengWoWx && monthWx === shengWoWx) {
    score += 2;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月（${monthWx}月）。月令${monthWx}生${dayWx}（${monthWx}→${dayWx}），虽然月令不是直接比扶，但月令之气能生助日主——得生扶之令，力量较强。`;
  } else if (monthCangWx.includes(dayWx)) {
    score += 1;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月，月令本身不是${dayWx}，但月支藏干中有${dayWx}根——有暗藏之力，不算太弱。`;
  } else if (woShengWx && monthWx === woShengWx) {
    score -= 1;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月（${monthWx}月）。日主生月令（${dayWx}→${monthWx}），代表日主之气被月令泄耗——失令，力量有所损耗。`;
  } else if (keWoWx && monthWx === keWoWx) {
    score -= 2;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月（${monthWx}月）。月令${monthWx}克日主${dayWx}——严重失令，月令克制日主，力量受压制。`;
  } else {
    score -= 1;
    seasonDetail = `日主${dayGan}（${dayWx}）生于${monthZhi}月（${monthWx}月）。月令与日主无直接生克关系——不得令但也不受克。`;
  }

  // ===== 2. 地支根气分析（最高±3分） =====
  let rootCount = 0;
  const rootPillars: string[] = [];

  for (let i = 0; i < pillars.length; i++) {
    const dz = pillars[i].diZhi;
    const dzWx = DZ_WX[dz];
    // 地支本身同五行
    if (dzWx === dayWx) {
      rootCount += 1;
      rootPillars.push(`${PILLAR_LABELS[i]}（${dz}）`);
    }
    // 地支藏干中的根气
    const cg = DZ_CANG_GAN[dz] || [];
    for (const g of cg) {
      if (TG_WX[g] === dayWx) {
        rootCount += 0.5;
        if (!rootPillars.includes(`${PILLAR_LABELS[i]}（${dz}）`)) {
          rootPillars.push(`${PILLAR_LABELS[i]}藏${g}（${dz}）`);
        }
      }
    }
  }

  let rootsDetail = '';
  if (rootCount >= 3) {
    score += 3;
    rootsDetail = `地支根气充沛（根气数${rootCount}）：${rootPillars.join('、')}。根深蒂固，好比大树扎根深厚，风吹不倒。`;
  } else if (rootCount >= 2) {
    score += 2;
    rootsDetail = `地支有一定根气（根气数${rootCount}）：${rootPillars.join('、')}。有根但不深厚，算是有立足之地。`;
  } else if (rootCount >= 1) {
    score += 1;
    rootsDetail = `地支根气较弱（根气数${rootCount}）：${rootPillars.join('、')}。有根但浅，需要大运流年来补充。`;
  } else {
    score -= 1;
    rootsDetail = `四柱地支中无${dayWx}根——根气全无。好比浮萍无根，力量来源不足，需要扶持。`;
  }

  // ===== 3. 印星生扶分析（最高±3分） =====
  let yinCount = 0;
  const yinPillars: string[] = [];

  for (let i = 0; i < pillars.length; i++) {
    const tg = pillars[i].tianGan;
    const tgWx = TG_WX[tg];
    const dz = pillars[i].diZhi;
    const dzWxT = DZ_WX[dz];

    // 天干印星
    if (tgWx === shengWoWx) {
      yinCount += 1;
      yinPillars.push(`${PILLAR_LABELS[i]}天干${tg}（${tgWx}）`);
    }
    // 地支印星
    if (dzWxT === shengWoWx) {
      yinCount += 0.5;
      yinPillars.push(`${PILLAR_LABELS[i]}地支${dz}（${dzWxT}）`);
    }
    // 地支藏干印星
    const cg = DZ_CANG_GAN[dz] || [];
    for (const g of cg) {
      if (TG_WX[g] === shengWoWx) {
        yinCount += 0.3;
      }
    }
  }

  let yinDetail = '';
  if (yinCount >= 2.5) {
    score += 3;
    yinDetail = `印星（${shengWoWx}）生扶充足：${yinPillars.join('、')}。印星有力，代表有长辈贵人扶持，学习能力强，遇事有人帮。`;
  } else if (yinCount >= 1.5) {
    score += 2;
    yinDetail = `印星（${shengWoWx}）有一定生扶：${yinPillars.join('、')}。有贵人缘，但不能完全依赖，自己的努力也很重要。`;
  } else if (yinCount >= 0.8) {
    score += 1;
    yinDetail = `印星（${shengWoWx}）生扶较弱：${yinPillars.join('、') || '藏干中有微弱印气'}。贵人运有限，需要自己多主动争取资源。`;
  } else {
    yinDetail = `印星（${shengWoWx}）缺失——四柱中没有生扶日主的印星。代表你在成长中可能缺乏长辈指导，或者不喜欢依赖别人，更习惯自己摸索。`;
  }

  // ===== 4. 比劫帮助分析（最高±2分） =====
  let bijieCount = 0;
  const bijiePillars: string[] = [];

  for (let i = 0; i < pillars.length; i++) {
    const tg = pillars[i].tianGan;
    const tgWx = TG_WX[tg];
    const dz = pillars[i].diZhi;
    const dzWxT = DZ_WX[dz];

    if (tgWx === dayWx && tg !== dayGan) {
      bijieCount += 1;
      bijiePillars.push(`${PILLAR_LABELS[i]}天干${tg}`);
    }
    if (dzWxT === dayWx) {
      bijieCount += 0.5;
      bijiePillars.push(`${PILLAR_LABELS[i]}地支${dz}`);
    }
  }

  let bijieDetail = '';
  if (bijieCount >= 2) {
    score += 2;
    bijieDetail = `比劫帮身有力：${bijiePillars.join('、')}。同辈朋友多，有人帮衬，团队中能找到归属感。但比劫多也意味着竞争多，朋友之间利益容易交叉。`;
  } else if (bijieCount >= 1) {
    score += 1;
    bijieDetail = `比劫有一定帮助：${bijiePillars.join('、')}。身边有关键的一两个伙伴或兄弟姐妹，能帮到你。`;
  } else {
    score += 0;
    bijieDetail = `四柱中比劫较少，缺乏同辈帮衬。你比较独立，习惯一个人扛事，不太依赖同伴。这也让你不被他人拖累，走自己的路。`;
  }

  // ===== 5. 克泄力量分析（削弱日主的力量，最高-3分） =====
  let weakenScore = 0;
  const weakenItems: string[] = [];

  for (let i = 0; i < pillars.length; i++) {
    const tg = pillars[i].tianGan;
    const tgWx = TG_WX[tg];
    const dz = pillars[i].diZhi;
    const dzWxT = DZ_WX[dz];

    // 我生者（食伤）——泄身
    if (woShengWx && tgWx === woShengWx) {
      weakenScore += 1;
      weakenItems.push(`${PILLAR_LABELS[i]}天干${tg}（食伤，泄身）`);
    }
    if (woShengWx && dzWxT === woShengWx) {
      weakenScore += 0.5;
      weakenItems.push(`${PILLAR_LABELS[i]}地支${dz}（食伤）`);
    }

    // 克我者（官杀）——克身
    if (keWoWx && tgWx === keWoWx) {
      weakenScore += 1;
      weakenItems.push(`${PILLAR_LABELS[i]}天干${tg}（官杀，克身）`);
    }
    if (keWoWx && dzWxT === keWoWx) {
      weakenScore += 0.5;
      weakenItems.push(`${PILLAR_LABELS[i]}地支${dz}（官杀）`);
    }

    // 我克者（财星）——耗身
    if (woKeWx && tgWx === woKeWx) {
      weakenScore += 0.5;
      weakenItems.push(`${PILLAR_LABELS[i]}天干${tg}（财星，耗身）`);
    }
  }

  let weakenDetail = '';
  if (weakenScore >= 4) {
    score -= 3;
    weakenDetail = `克泄耗力量很强（总计${weakenScore}）：${weakenItems.join('、')}。日主被多方消耗，容易感到身心疲惫，需要学会保存精力。`;
  } else if (weakenScore >= 2.5) {
    score -= 2;
    weakenDetail = `克泄耗力量中等（总计${weakenScore}）：${weakenItems.join('、')}。有压力但也有动力，需要在耗能的同时注意补充。`;
  } else if (weakenScore >= 1) {
    score -= 1;
    weakenDetail = `克泄耗力量较轻（总计${weakenScore}）：${weakenItems.join('、') || '四柱中克泄耗元素较少'}。日主受的损耗不大，算是比较轻松。`;
  } else {
    weakenDetail = `克泄耗力量很弱——四柱中缺乏食伤泄秀和官杀约束。日主释放和受到制约的渠道都少，能量容易"憋着"，需要通过运动或创作来疏导。`;
  }

  // ===== 6. 综合判断（五档） =====
  // 身极强(≥8) / 身强(5-7) / 中和(2-4) / 身弱(-1~1) / 身极弱(≤-2)
  // 校准说明：旧版此处的"极强/极弱判定"把结果又赋回'身强'/'身弱'（死代码），
  // 导致 mingGe.ts 的专旺格/从格（依赖身极强/身极弱）在生产中永远不会触发。
  let level = '';
  if (score >= 8) {
    level = '身极强';
  } else if (score >= 5) {
    level = '身强';
  } else if (score >= 2) {
    level = '中和';
  } else if (score >= -1) {
    level = '身弱';
  } else {
    level = '身极弱';
  }

  // 生成综合总结
  const strengthLabel = level === '身极强' ? '极强，一行得势' : level === '身强' ? '偏强' : level === '身弱' ? '偏弱' : level === '身极弱' ? '极弱，易从势' : '中和平衡';
  const summary = `综合分析：日主${dayGan}（${dayWx}）综合评分${score}/${maxScore}，属于「${level}」(${strengthLabel})。` +
    `得令情况：${seasonDetail.split('。')[0]}。` +
    `根气情况：${rootsDetail.split('。')[0]}。` +
    `生助情况：${yinDetail.split('。')[0]}。` +
    `损耗情况：${weakenDetail.split('。')[0]}。`;

  return {
    level,
    score,
    details: {
      season: seasonDetail,
      roots: rootsDetail,
      yinSupport: yinDetail,
      bijieSupport: bijieDetail,
      weakenForces: weakenDetail,
    },
    summary,
  };
}

/**
 * 《穷通宝鉴》调候用神表（十日干 × 十二月支）。
 * 调候为命理第一优先：生于寒冬需火暖、生于酷暑需水润、木旺需金斫……
 * 与扶抑（身强身弱）是两个独立体系——调候解决"寒暖燥湿"，扶抑解决"强弱平衡"。
 * yong: 该月该干的调候喜用五行（取天干所属五行）
 * reason: 简要命理依据
 * 数据依《穷通宝鉴》通行本校订，癸水部分与用户提供的逐月提要完全一致。
 */
const TIAOHOU_TABLE: Record<string, Record<string, { yong: string[]; reason: string }>> = {
  // ===== 甲木 =====
  '甲': {
    '寅': { yong: ['火', '金'], reason: '初春余寒，先用丙火暖局，次用庚金斫木' },
    '卯': { yong: ['金', '火'], reason: '卯月木旺，庚金克木为要，丁火泄木为辅' },
    '辰': { yong: ['金', '火'], reason: '辰月土旺，用庚金伐木疏土，丁火暖局' },
    '巳': { yong: ['水', '金'], reason: '巳月火旺木燥，急须癸水滋润，庚金生水' },
    '午': { yong: ['水', '金'], reason: '午月火炎土燥，癸水为第一用神，庚金发源' },
    '未': { yong: ['水', '金'], reason: '未月火土燥烈，癸水润土，庚金生水' },
    '申': { yong: ['火', '金'], reason: '申月金旺木囚，丁火制金，庚金劈甲' },
    '酉': { yong: ['火'], reason: '酉月金旺，丁火制金护木，丙火佐之' },
    '戌': { yong: ['水', '木'], reason: '戌月土燥木枯，癸水滋润，甲木帮身' },
    '亥': { yong: ['火', '土'], reason: '亥月水寒木漂，丙火暖局，戊土止水' },
    '子': { yong: ['火', '土'], reason: '子月天寒地冻，丙火解冻，戊土筑堤' },
    '丑': { yong: ['火'], reason: '丑月寒凝，丙丁火温暖为急' },
  },
  // ===== 乙木 =====
  '乙': {
    '寅': { yong: ['火', '水'], reason: '寅月余寒，丙火暖之，癸水滋之' },
    '卯': { yong: ['火', '水'], reason: '卯月木旺，丙火泄秀，癸水滋润' },
    '辰': { yong: ['水', '火'], reason: '辰月土旺，癸水润土，丙火暖局' },
    '巳': { yong: ['水', '金'], reason: '巳月火旺木枯，癸水滋润，庚金生水' },
    '午': { yong: ['水', '金'], reason: '午月火炎，癸水为第一用神，庚金发源' },
    '未': { yong: ['水', '金'], reason: '未月燥土，癸水润土，庚金生水' },
    '申': { yong: ['水', '火'], reason: '申月金旺克木，癸水化金生木，丙火制金' },
    '酉': { yong: ['水', '火'], reason: '酉月金旺，癸水化金，丙火暖局' },
    '戌': { yong: ['水', '金'], reason: '戌月土燥，癸水滋润，辛金生水' },
    '亥': { yong: ['火', '土'], reason: '亥月水寒，丙火暖局，戊土制水' },
    '子': { yong: ['火', '土'], reason: '子月严寒，丙火解冻，戊土止水' },
    '丑': { yong: ['火', '土'], reason: '丑月寒湿，丙火暖局，戊土培木' },
  },
  // ===== 丙火 =====
  '丙': {
    '寅': { yong: ['水', '金'], reason: '寅月火渐旺，壬水调候，庚金生水' },
    '卯': { yong: ['水', '金'], reason: '卯月木旺火相，壬水济火，庚金发源' },
    '辰': { yong: ['水', '木'], reason: '辰月土旺，壬水润土，甲木疏土' },
    '巳': { yong: ['水', '金'], reason: '巳月火旺，壬水调候为急，庚金生水' },
    '午': { yong: ['水', '金'], reason: '午月火炎，壬水为君，庚金为辅' },
    '未': { yong: ['水', '金'], reason: '未月火土燥烈，壬水润局，庚金生水' },
    '申': { yong: ['水', '土'], reason: '申月火退，壬水调候，戊土蓄水' },
    '酉': { yong: ['水', '木'], reason: '酉月金旺，壬水泄金，甲木生火' },
    '戌': { yong: ['木', '水'], reason: '戌月土燥，甲木生火，壬水润土' },
    '亥': { yong: ['木', '土'], reason: '亥月水旺克火，甲木生火，戊土制水' },
    '子': { yong: ['木', '水'], reason: '子月水寒，甲木生火，壬水帮身（比劫）' },
    '丑': { yong: ['木', '水'], reason: '丑月寒湿，甲木生火，壬水帮身' },
  },
  // ===== 丁火 =====
  '丁': {
    '寅': { yong: ['木', '金'], reason: '寅月火渐旺，甲木生火，庚金劈甲引丁' },
    '卯': { yong: ['木', '金'], reason: '卯月木旺，甲木生火，庚金劈木' },
    '辰': { yong: ['木', '水'], reason: '辰月土旺，甲木生火，壬水滋润' },
    '巳': { yong: ['木', '金'], reason: '巳月火旺，甲木生火，庚金生水济火' },
    '午': { yong: ['木', '水'], reason: '午月火炎，甲木为薪，壬水调候' },
    '未': { yong: ['木', '水'], reason: '未月火土燥，甲木生火，壬水润土' },
    '申': { yong: ['木', '金'], reason: '申月金旺，甲木生火，庚金劈甲' },
    '酉': { yong: ['木', '金'], reason: '酉月金旺，甲木生火，庚金劈甲' },
    '戌': { yong: ['木', '金'], reason: '戌月土燥，甲木生火，庚金疏土' },
    '亥': { yong: ['木', '金'], reason: '亥月水寒，甲木生火，庚金劈甲' },
    '子': { yong: ['木', '金'], reason: '子月严寒，甲木生火，庚金劈甲' },
    '丑': { yong: ['木', '金'], reason: '丑月寒湿，甲木生火，庚金劈甲' },
  },
  // ===== 戊土 =====
  '戊': {
    '寅': { yong: ['火', '木'], reason: '寅月土寒，丙火暖土，甲木疏土' },
    '卯': { yong: ['火', '木'], reason: '卯月木旺克土，丙火化木生土，甲木疏土' },
    '辰': { yong: ['木', '火'], reason: '辰月土旺，甲木疏土，丙火暖局' },
    '巳': { yong: ['水', '木'], reason: '巳月火土燥，壬水润土，甲木疏土' },
    '午': { yong: ['水', '木'], reason: '午月火炎土燥，壬水为急，甲木疏土' },
    '未': { yong: ['水', '木'], reason: '未月燥土，壬水滋润，甲木疏土' },
    '申': { yong: ['火', '木'], reason: '申月金旺土泄，丙火生土，甲木疏土' },
    '酉': { yong: ['火', '木'], reason: '酉月金旺，丙火生土，甲木疏土' },
    '戌': { yong: ['木', '水'], reason: '戌月土燥，甲木疏土，壬水润土' },
    '亥': { yong: ['火', '木'], reason: '亥月水寒土湿，丙火暖土，甲木疏土' },
    '子': { yong: ['火', '木'], reason: '子月水旺土湿，丙火暖土，甲木疏土' },
    '丑': { yong: ['火', '木'], reason: '丑月寒湿，丙火暖土，甲木疏土' },
  },
  // ===== 己土 =====
  '己': {
    '寅': { yong: ['火', '木'], reason: '寅月土寒，丙火暖土，甲木疏土' },
    '卯': { yong: ['火', '木'], reason: '卯月木旺，丙火化木生土，甲木疏土' },
    '辰': { yong: ['火', '木'], reason: '辰月土旺，丙火暖局，甲木疏土' },
    '巳': { yong: ['水', '火'], reason: '巳月火土燥，壬水润土，丙火暖局' },
    '午': { yong: ['水', '火'], reason: '午月火炎，壬水润土为急' },
    '未': { yong: ['水', '火'], reason: '未月燥土，壬水滋润' },
    '申': { yong: ['火', '木'], reason: '申月金旺，丙火生土，甲木疏土' },
    '酉': { yong: ['火', '木'], reason: '酉月金旺，丙火生土，甲木疏土' },
    '戌': { yong: ['木', '火'], reason: '戌月土燥，甲木疏土，丙火暖局' },
    '亥': { yong: ['火', '木'], reason: '亥月水寒，丙火暖土，甲木疏土' },
    '子': { yong: ['火', '木'], reason: '子月寒湿，丙火暖土，甲木疏土' },
    '丑': { yong: ['火', '木'], reason: '丑月寒湿，丙火暖土，甲木疏土' },
  },
  // ===== 庚金 =====
  '庚': {
    '寅': { yong: ['火', '木'], reason: '寅月金囚，丁火锻炼，甲木引丁' },
    '卯': { yong: ['火', '木'], reason: '卯月金弱，丁火炼金，甲木生火' },
    '辰': { yong: ['火', '木'], reason: '辰月土旺生金，丁火锻炼，甲木引丁' },
    '巳': { yong: ['水', '金'], reason: '巳月火旺金囚，壬水济火，庚金帮身' },
    '午': { yong: ['水', '金'], reason: '午月火炎金熔，壬水为第一用神，庚金帮身' },
    '未': { yong: ['水', '金'], reason: '未月火土燥，壬水润金，庚金帮身' },
    '申': { yong: ['火', '木'], reason: '申月金旺，丁火锻炼，甲木引丁' },
    '酉': { yong: ['火', '木'], reason: '酉月金旺极，丁火炼金，甲木引丁' },
    '戌': { yong: ['木', '火'], reason: '戌月土旺金埋，甲木疏土，丁火炼金' },
    '亥': { yong: ['火', '木'], reason: '亥月水寒金冷，丁火暖局，甲木引丁' },
    '子': { yong: ['火', '木'], reason: '子月金寒，丁火暖金，甲木引丁' },
    '丑': { yong: ['火', '木'], reason: '丑月寒湿，丁火暖金，甲木引丁' },
  },
  // ===== 辛金 =====
  '辛': {
    '寅': { yong: ['土', '水'], reason: '寅月金弱，己土生金，壬水洗金' },
    '卯': { yong: ['土', '水'], reason: '卯月金弱，己土生金，壬水洗金' },
    '辰': { yong: ['木', '水'], reason: '辰月土旺金埋，甲木疏土，壬水洗金' },
    '巳': { yong: ['水', '金'], reason: '巳月火旺金熔，壬水济火，庚金帮身' },
    '午': { yong: ['水', '金'], reason: '午月火炎，壬水为第一用神，庚金帮身' },
    '未': { yong: ['水', '金'], reason: '未月火土燥，壬水润金，庚金帮身' },
    '申': { yong: ['水', '木'], reason: '申月金旺，壬水洗金，甲木疏土' },
    '酉': { yong: ['水', '木'], reason: '酉月金旺，壬水淘洗，甲木疏土' },
    '戌': { yong: ['木', '水'], reason: '戌月土旺金埋，甲木疏土，壬水洗金' },
    '亥': { yong: ['火', '土'], reason: '亥月水寒金冷，丙火暖局，戊土制水' },
    '子': { yong: ['火', '土'], reason: '子月金寒，丙火暖金，戊土制水' },
    '丑': { yong: ['火', '土'], reason: '丑月寒湿，丙火暖金，戊土生金' },
  },
  // ===== 壬水 =====
  '壬': {
    '寅': { yong: ['金', '火'], reason: '寅月水弱木旺，庚金生水，丙火暖局' },
    '卯': { yong: ['金'], reason: '卯月木旺泄水，庚金生水为要' },
    '辰': { yong: ['火', '金'], reason: '辰月土旺，丙火暖局，辛金生水' },
    '巳': { yong: ['金'], reason: '巳月火旺水绝，辛金生水为第一用神' },
    '午': { yong: ['金', '水'], reason: '午月火炎水干，庚辛金生水，壬癸水帮身' },
    '未': { yong: ['金', '水'], reason: '未月火土燥，庚辛金生水，壬癸水帮身' },
    '申': { yong: ['火', '木'], reason: '申月金旺水相，丁火暖局，甲木生火' },
    '酉': { yong: ['金', '火'], reason: '酉月金白水清，辛金发水源，丙火温暖' },
    '戌': { yong: ['金', '木'], reason: '戌月土旺克水，辛金生水，甲木制土' },
    '亥': { yong: ['土', '火'], reason: '亥月水旺且寒，戊土制水，丁火暖局' },
    '子': { yong: ['火', '土'], reason: '子月水旺极寒，丙火解冻，戊土筑堤' },
    '丑': { yong: ['火'], reason: '丑月天寒，丙丁火温暖为急' },
  },
  // ===== 癸水 =====
  '癸': {
    '寅': { yong: ['金', '火'], reason: '初春余寒，先用辛金生助水源，再用丙火温暖全局' },
    '卯': { yong: ['金'], reason: '木旺耗水，需强有力的金（庚金为主）生水' },
    '辰': { yong: ['火', '金', '木'], reason: '上半月寒需丙火暖局；下半月土旺需辛金生水、甲木疏土' },
    '巳': { yong: ['金'], reason: '火旺水绝，癸水最弱，急需辛金生助，无辛可用庚代' },
    '午': { yong: ['金', '水'], reason: '火势极盛，单用金易被火克，需金水并用抗旺火' },
    '未': { yong: ['金', '水'], reason: '上半月同午月急需金水帮扶；下半月火气稍退' },
    '申': { yong: ['火', '木'], reason: '金旺水相但金多水浊，需丁火炼金，甲木生火' },
    '酉': { yong: ['金', '火'], reason: '金白水清之时，辛金发水源，丙火温暖' },
    '戌': { yong: ['金', '木', '水'], reason: '土旺克水，专用辛金生水，甲木制土，比劫助力' },
    '亥': { yong: ['金', '土', '火'], reason: '水旺且寒，庚辛金生水；水过多则戊土制水，丁火暖局' },
    '子': { yong: ['火', '金'], reason: '水旺至极且天寒地冻，必须丙火解冻，辅以辛金生扶' },
    '丑': { yong: ['火'], reason: '天气最为寒冷，急需火温暖全局，调候为第一要务' },
  },
};

/**
 * 推荐用神（八字页 / 合盘共用的唯一口径）：
 * 以《穷通宝鉴》调候为第一优先，扶抑（身强身弱）为第二参考。
 * - 调候用神：解决寒暖燥湿，无论强弱都必须优先（如癸水夏生必用金）
 * - 扶抑用神：解决强弱平衡（身强喜克泄耗、身弱喜生扶）
 * 最终喜用 = 调候用神 ∪ 扶抑用神；忌神 = 克泄调候用神之物。
 * wxStats 预留给后续按全局五行统计微调。
 */
export function recommendYongShen(
  dayWx: string,
  strengthLevel: string,
  _wxStats?: Record<string, { count: number; level: string }>,
  dayGan?: string,
  monthZhi?: string
): { yongShen: string[]; xiShen: string[]; desc: string } {
  let yongShen: string[] = [];
  let xiShen: string[] = [];
  let desc = '';

  // ===== 第一优先：调候用神（《穷通宝鉴》逐月）=====
  let tiaoHouYong: string[] = [];
  let tiaoHouReason = '';
  if (dayGan && monthZhi && TIAOHOU_TABLE[dayGan]?.[monthZhi]) {
    tiaoHouYong = TIAOHOU_TABLE[dayGan][monthZhi].yong;
    tiaoHouReason = TIAOHOU_TABLE[dayGan][monthZhi].reason;
    yongShen.push(...tiaoHouYong);
    desc += `【调候】${dayGan}日生于${monthZhi}月，${tiaoHouReason}。故先取${tiaoHouYong.join('、')}为调候用神。\n`;
  }

  // ===== 第二参考：扶抑用神（身强身弱）=====
  let fuyiYong: string[] = [];
  if (strengthLevel.includes('强')) {
    fuyiYong = [WX_KE[dayWx], WX_BEI_KE[dayWx]];
    xiShen.push(dayWx);
    desc += `【扶抑】日主偏强，宜克泄耗——${fuyiYong.filter(Boolean).join('、')}可助平衡。`;
  } else if (strengthLevel.includes('弱')) {
    fuyiYong = [WX_SHENG[dayWx], dayWx];
    xiShen.push(WX_KE[dayWx]);
    desc += `【扶抑】日主偏弱，宜生扶——${fuyiYong.filter(Boolean).join('、')}可助身。`;
  } else {
    fuyiYong = [WX_SHENG[dayWx], WX_KE[dayWx]];
    desc += `【扶抑】日主中和，生克皆宜。`;
  }

  // 合并：调候优先，扶抑补充（去重）
  yongShen = [...new Set([...yongShen, ...fuyiYong.filter(Boolean)])];

  // 忌神：扶抑忌神 ∪ 克调候用神之物
  if (tiaoHouYong.length > 0) {
    for (const ty of tiaoHouYong) {
      // 克调候用神的五行为忌（如火旺水绝时，火克金——火为忌）
      const keTy = WX_KE[ty];
      if (keTy) xiShen.push(keTy);
    }
  }
  xiShen = [...new Set(xiShen.filter(Boolean))];

  return { yongShen, xiShen, desc };
}

// ========== 辅助函数 ==========

/** 根据十神名称确认该十神出现在哪些柱 */
function findShiShenPillars(pillars: PillarData[], shiShenName: string): PillarData[] {
  return pillars.filter(p => p.shiShen === shiShenName);
}

/** 获取某柱对应的人生阶段描述 */
function getPillarLifeStage(pillarLabel: string): string {
  return PILLAR_AGES[pillarLabel] || pillarLabel;
}

/** 获取某柱对应年龄段 */
function getPillarAgeRange(pillarLabel: string): [number, number] {
  return PILLAR_AGE_RANGE[pillarLabel] || [0, 99];
}

/** 神煞是否出现在指定柱 */
function hasShenShaOnPillar(
  shenSha: { name: string; pillar: string }[],
  name: string,
  pillar: string
): boolean {
  return shenSha.some(s => s.name === name && s.pillar === pillar);
}

/** 获取同类型的神煞 */
function getShenShaByName(shenSha: { name: string; pillar: string }[], names: string[]): { name: string; pillar: string }[] {
  return shenSha.filter(s => names.includes(s.name));
}

/** 查看某个柱是否与日柱有冲/合/刑关系 */
function getRiZhiRelationType(relations: { type: string; desc: string }[]): string[] {
  return relations
    .filter(r => r.desc.includes('日柱') || r.desc.includes('日支'))
    .map(r => r.type);
}

/** 查看某个柱涉及的冲合刑害关系 */
function getPillarRelations(relations: { type: string; desc: string }[], pillarLabel: string): { type: string; desc: string }[] {
  return relations.filter(r => r.desc.includes(pillarLabel));
}

/** 列出某个柱的具体冲合刑害详情 */
function describePillarRelations(relations: { type: string; desc: string }[], pillarLabel: string): string {
  const rels = getPillarRelations(relations, pillarLabel);
  if (rels.length === 0) return '';
  return rels.map(r => r.desc).join('；');
}

// ========== 1. 爱情婚姻分析 ==========
export function analyzeLove(
  pillars: PillarData[],
  shenSha: { name: string; pillar: string }[],
  gender: string,
  dayGan: string,
  dayZhi: string,
  relations: { type: string; desc: string }[]
): LoveAnalysis {
  const dayWx = TG_WX[dayGan];
  const spouseStarName = gender === 'male' ? '正财' : '正官';
  const spouseStarPlain = gender === 'male' ? '正财（代表妻子和稳定收入）' : '正官（代表丈夫和事业规则）';
  const dayGanProfile = DAY_GAN_PROFILE[dayGan];
  const spousePalace = SPOUSE_PALACE_PROFILE[dayZhi] || '';

  // ===== 配偶特征 =====
  const spousePillars = findShiShenPillars(pillars, spouseStarName);
  // 如果没有正配星，男命查偏财、女命查七杀
  const secondarySpouseName = gender === 'male' ? '偏财' : '七杀';
  const secondarySpousePillars = findShiShenPillars(pillars, secondarySpouseName);

  let spouseFeature = '';
  const loveAnchor = dayGanProfile ? `${dayGanProfile.core}。${dayGanProfile.love}。\n\n` : '';

  if (spousePillars.length > 0) {
    const sp = spousePillars[0];
    const spWx = TG_WX[sp.tianGan];
    const spLabel = sp.pillar;
    const spStage = getPillarLifeStage(spLabel);
    const spGanZhi = sp.ganZhi;
    const [ageStart, ageEnd] = getPillarAgeRange(spLabel);

    // 配偶五行特质
    const wxSpouseTraits: Record<string, string> = {
      '木': '性格正直善良，像大树一样可靠。可能身材修长、肤色偏青，做事有原则，但有时候过于直接。',
      '火': '热情主动，活力十足。可能眼睛明亮、性格外向，喜欢成为焦点。对感情热烈但有时急躁。',
      '土': '踏实稳重，忠诚可靠。给人安全感，做事不急不躁。体型可能偏圆润，是典型的"靠谱型"伴侣。',
      '金': '果断刚毅，有原则讲义气。五官轮廓分明，性格鲜明。爱憎分明，对伴侣要求也比较高。',
      '水': '聪明灵活，善于沟通。性格柔和但有主见，直觉敏锐。可能身形偏圆润或肤色偏白，感情中懂得浪漫。',
    };

    spouseFeature = `你的${spouseStarPlain}出现在${spLabel}（${spGanZhi}，${spWx}），对应你${spStage}认识或显现的缘分。`;

    if (spLabel === '年柱') {
      spouseFeature += `配偶星在年柱，代表姻缘可能来自远方/不同城市，或者对方与你家庭背景差异较大。对方可能比你成熟稳重，也可能年龄相差较大。你们可能在${ageStart}-${ageEnd}岁左右就已经相遇或有婚恋机会。`;
    } else if (spLabel === '月柱') {
      spouseFeature += `配偶星在月柱，代表姻缘比较正常——在适婚年龄（${ageStart}-${ageEnd}岁）遇到的缘分。对方很可能是你的同事、同学、或通过朋友介绍认识的。同辈人推荐的成功率较高。`;
    } else if (spLabel === '日柱') {
      spouseFeature += `配偶星在日柱（夫妻宫），代表姻缘近在眼前——另一半可能就是你的身边人，或者通过熟人直接介绍认识。因为${spGanZhi}就在你的日柱，说明配偶与你关系紧密，婚姻在${ageStart}-${ageEnd}岁的阶段是最重要的人生主题。`;
    } else if (spLabel === '时柱') {
      spouseFeature += `配偶星在时柱，姻缘来得比较晚（${ageStart}岁以后）。虽然等得久，但晚婚反而更稳定幸福，因为你在心智更成熟时才遇到对的人。`;
    }

    // 配偶五行特质（细化到具体天干）
    spouseFeature += `从五行看，配偶${spWx}性特质明显：${SPOUSE_GAN_TRAITS[sp.tianGan] || wxSpouseTraits[spWx] || '有其独特的个人魅力'}。`;

    // 夫妻宫坐支画像（12地支专属）
    if (spousePalace) {
      spouseFeature += `${spousePalace}。`;
    }

    // 如果偏财/七杀也在，说明还有"偏缘"
    if (spouseStarName === '正财' && pillars.some(p => p.shiShen === '偏财')) {
      const pianPillars = findShiShenPillars(pillars, '偏财');
      spouseFeature += `不过你命中也带有偏财（${pianPillars.map(p => `${p.pillar}${p.ganZhi}`).join('、')}），偏财代表偏缘或桃花，说明除了正缘之外可能还有其他感情机会。注意区分正缘和烂桃花，别让偏财影响了正财的稳定。`;
    }
    if (spouseStarName === '正官' && pillars.some(p => p.shiShen === '七杀')) {
      const shaPillars = findShiShenPillars(pillars, '七杀');
      spouseFeature += `不过你命中也带有七杀（${shaPillars.map(p => `${p.pillar}${p.ganZhi}`).join('、')}），七杀是偏官，代表你容易吸引一些"坏男人"类型——有魅力但不太稳定。分清正官和七杀，选人品比选感觉重要。`;
    }
  } else if (secondarySpousePillars.length > 0) {
    // 用偏财/七杀代替
    const ssp = secondarySpousePillars[0];
    const ssWx = TG_WX[ssp.tianGan];
    const ssPlain = gender === 'male' ? '偏财（偏缘/桃花）' : '七杀（偏官/压力型缘分）';

    spouseFeature = `你命局中${spouseStarPlain}不显，但${ssPlain}出现在${ssp.pillar}（${ssp.ganZhi}，${ssWx}）。这意味着你的正缘可能不那么明显，婚姻更依赖偏缘或非传统方式认识。`;
    if (spousePalace) {
      spouseFeature += `${spousePalace}。建议在交友和相亲中留意这种气质的人。`;
    }
  } else {
    spouseFeature = `你命局中${spouseStarPlain}不显，代表婚姻宫信息比较含蓄，你的姻缘更多看大运流年何时触发。`;
    if (spousePalace) {
      spouseFeature += `${spousePalace}。`;
    }
    spouseFeature += `不必担心，配偶星不显不等于没有婚姻，而是你的姻缘模式不走寻常路，可能通过特殊机缘认识。`;
  }

  // 拼回日主个性锚：开篇锚定"你这个人"在感情中的底色
  if (loveAnchor) {
    spouseFeature = loveAnchor + spouseFeature;
  }

  // ===== 婚姻质量 =====
  const riZhiRelTypes = getRiZhiRelationType(relations);
  const hasChong = riZhiRelTypes.includes('冲');
  const hasHe = riZhiRelTypes.includes('合');
  const hasXing = riZhiRelTypes.includes('刑');
  const hasHai = riZhiRelTypes.includes('害');

  const riZhiRelDescs = relations
    .filter(r => r.desc.includes('日柱') || r.desc.includes('日支'))
    .map(r => r.desc);

  let marriageQuality = '';

  if (hasChong) {
    const chongDesc = riZhiRelDescs.filter(d => d.includes('冲')).join('；');
    marriageQuality = `你的日支${dayZhi}（夫妻宫）受到冲克：${chongDesc}。日支冲克代表婚姻中容易有变动和波折。`;
    // 具体分析是什么冲
    if (dayZhi === '子' && chongDesc.includes('午')) {
      marriageQuality += '子午冲是水火相冲，代表夫妻之间可能热情时很热、冷战时就真的冷——情绪起伏大。';
    } else if (dayZhi === '午' && chongDesc.includes('子')) {
      marriageQuality += '午子冲是火水相冲，同样的道理——夫妻之间一热一冷，温差大，需要多一些包容。';
    } else if (dayZhi === '卯' && chongDesc.includes('酉')) {
      marriageQuality += '卯酉冲是金木相战，代表夫妻可能各执己见、谁也不让谁。需要学会妥协，而不是争对错。';
    } else if (dayZhi === '酉' && chongDesc.includes('卯')) {
      marriageQuality += '酉卯冲是金木相战，同样的道理——两人都有主见，需要找到一个平衡点。';
    } else if (dayZhi === '寅' && chongDesc.includes('申')) {
      marriageQuality += '寅申冲是金木冲战加上驿马对冲，代表婚姻中可能有聚少离多的情况，或者因为工作、出差等原因经常分开。';
    } else if (dayZhi === '申' && chongDesc.includes('寅')) {
      marriageQuality += '申寅冲同理，驿马对冲代表夫妻可能因为事业原因聚少离多，异地可能性大。';
    }
    marriageQuality += '建议：夫妻多沟通、多制造仪式感维系感情。尽量不要长期异地，如果客观需要分开，要有定期见面的计划。';
  } else if (hasHe) {
    const heDesc = riZhiRelDescs.filter(d => d.includes('合')).join('；');
    marriageQuality = `你的日支${dayZhi}（夫妻宫）有合：${heDesc}。夫妻宫被合代表婚姻缘分深厚，夫妻之间相处融洽、互相吸引。`;
    if (dayZhi === '子' && heDesc.includes('丑')) {
      marriageQuality += '子丑合化为土，代表你们的感情从热烈的"水"慢慢沉淀为踏实的"土"——越久越稳定。';
    } else if (dayZhi === '午' && heDesc.includes('未')) {
      marriageQuality += '午未合化为土，代表你们的感情有温度也有分量，是那种"平平淡淡才是真"的类型。';
    }
    marriageQuality += '不过合也有"过于合拍"的可能——两个人太像了，反而缺少个人空间。记得给彼此留一点自己的时间。';
  } else if (hasXing) {
    const xingDesc = riZhiRelDescs.filter(d => d.includes('刑')).join('；');
    marriageQuality = `你的日支${dayZhi}（夫妻宫）有刑：${xingDesc}。刑代表隐性的摩擦和心结——不一定会大吵大闹，但心里可能有疙瘩。`;
    marriageQuality += '两个人需要学会把真实感受说出来，别把心事闷在心里。定期做一次"真心话时间"比较重要。';
  } else if (hasHai) {
    const haiDesc = riZhiRelDescs.filter(d => d.includes('害')).join('；');
    marriageQuality = `你的日支${dayZhi}（夫妻宫）有"害"：${haiDesc}。害是一种暗中妨害的关系——表面上可能相安无事，但实际上有些暗流涌动。`;
    marriageQuality += '注意不要因为小事积累成大矛盾，有问题及时沟通解决。';
  } else {
    marriageQuality = `你的日支${dayZhi}（夫妻宫，${DZ_WX[dayZhi] || ''}）比较安静——没有明显的冲合刑害。`;
    // 看夫妻宫本身的性质
    const riDzWx = DZ_WX[dayZhi] || '';
    if (riDzWx === dayWx) {
      marriageQuality += `夫妻宫${riDzWx}与日主${dayWx}同五行，说明你找的伴侣大概率和你"同类"——三观相近、性格相合，婚姻平淡但稳定。`;
    } else if (WX_SHENG[dayWx] === riDzWx) {
      marriageQuality += `夫妻宫${riDzWx}生助日主${dayWx}，说明你的另一半会比较照顾你、支持你，是那种"旺夫/旺妻"的类型。`;
    } else {
      marriageQuality += '平淡是福，但偶尔也需要主动制造一些小惊喜和仪式感来保鲜。';
    }
  }

  // ===== 桃花运 =====
  const allPeach = getShenShaByName(shenSha, ['桃花', '红鸾', '天喜']);
  let peachBlossom = '';

  if (allPeach.length >= 3) {
    const peachDetails = allPeach.map(s => `${s.name}在${s.pillar}（${getPillarLifeStage(s.pillar)}）`).join('、');
    peachBlossom = `你命中桃花神煞较多：${peachDetails}。你的异性缘很旺，从小到大身边都不缺追求者，在人群中容易成为被关注的对象。`;

    // 桃花地支子差异（子午卯酉四种桃花气质）
    const peachDzList = allPeach
      .map(s => pillars.find(p => p.pillar === s.pillar)?.diZhi)
      .filter((d): d is string => !!d && ['子', '午', '卯', '酉'].includes(d));
    if (peachDzList.length > 0 && PEACH_DZ_TRAITS[peachDzList[0]]) {
      peachBlossom += `从桃花落宫看，${PEACH_DZ_TRAITS[peachDzList[0]]}。`;
    }

    // 桃花在年柱 = 早恋倾向
    if (allPeach.some(s => s.pillar === '年柱')) {
      peachBlossom += '桃花在年柱代表你从小就讨人喜欢，青春期就可能有不少异性关注。但早年的桃花多半不太成熟，20岁前不建议投入太深。';
    }
    // 桃花在日柱 = 婚后异性缘
    if (allPeach.some(s => s.pillar === '日柱')) {
      peachBlossom += '桃花在日柱（33-48岁），即使婚后你的魅力也不减，这既是优势也是考验——已婚者要注意和异性保持适当距离。';
    }

    peachBlossom += '桃花多也意味着选择的烦恼——正桃花和烂桃花混在一起，需要擦亮眼睛。';
  } else if (allPeach.length >= 1) {
    const peachDetail = allPeach.map(s => `${s.name}在${s.pillar}`).join('、');
    peachBlossom = `你命中带有${peachDetail}，代表你有不错的异性缘和魅力。`;
    const stage = getPillarLifeStage(allPeach[0].pillar);
    peachBlossom += `这颗桃花出现在你的${stage}，说明这段时期你的异性缘会比较活跃，是谈恋爱的高峰期。`;
    // 桃花地支子差异
    const peachDz = pillars.find(p => p.pillar === allPeach[0].pillar)?.diZhi;
    if (peachDz && PEACH_DZ_TRAITS[peachDz]) {
      peachBlossom += `${PEACH_DZ_TRAITS[peachDz]}。`;
    }
    peachBlossom += '桃花不在多而在于精——遇到对的人比谈很多恋爱更重要。';
  } else {
    // 虽然没有明显的桃花煞，但可以看日支和配偶星
    peachBlossom = '你命局中桃花神煞不多，不属于那种一见钟情的万人迷类型。';
    // 看日支是不是桃花位
    const peachDz = ['子', '午', '卯', '酉'];
    if (peachDz.includes(dayZhi)) {
      peachBlossom += `但你的夫妻宫坐${dayZhi}，本身就在四正桃花位——${PEACH_DZ_TRAITS[dayZhi]}。遇到对的人时，你的魅力会自然散发。`;
    }
    peachBlossom += '这种配置的好处是：一旦进入感情，反而更专一、更持久。桃花少不代表没人爱，而是你不把精力浪费在浅层关系上。';
  }

  // ===== 综合建议 =====
  const adviceItems: string[] = [];
  if (hasChong) {
    adviceItems.push('夫妻宫被冲，建议晚婚（28岁以后），或找一个年龄差距大一些的对象来化解冲克，婚后避免长期异地');
  }
  if (hasXing) {
    adviceItems.push('夫妻宫有刑，平时多表达感受、多做深度沟通。可以约定"每月至少一次约会日"来维持感情新鲜度');
  }
  if (gender === 'male' && pillars.some(p => p.shiShen === '偏财')) {
    const pp = findShiShenPillars(pillars, '偏财')[0];
    adviceItems.push(`你命带偏财（${pp.ganZhi}在${pp.pillar}），偏财除了代表外快，也代表偏缘——注意不要因为钱财或桃花问题影响夫妻感情，心里要有一把尺`);
  }
  if (gender === 'female' && pillars.some(p => p.shiShen === '七杀')) {
    const qs = findShiShenPillars(pillars, '七杀')[0];
    adviceItems.push(`你命带七杀（${qs.ganZhi}在${qs.pillar}），七杀是"有魅力的压力"——小心别被外表光鲜但人品不过关的人吸引。选对象时看人品比看感觉更重要`);
  }
  // 查看配偶星五行
  if (spousePillars.length > 0) {
    const spWx = TG_WX[spousePillars[0].tianGan];
    const shengRiWx = WX_SHENG[dayWx];
    if (spWx === shengRiWx) {
      adviceItems.push(`你的配偶星五行（${spWx}）刚好生助你的日主（${dayWx}），说明你的另一半会比较旺你——婚后运势可能比婚前好，是典型的"嫁/娶对人"类型`);
    }
  }
  if (!adviceItems.length) {
    // 无冲无刑无偏星时，基于日主+夫妻宫生成个性化建议，而非万能句
    if (dayGanProfile && spousePalace) {
      adviceItems.push(`${dayGanProfile.love}；${spousePalace.split('——')[1] || spousePalace}`);
    } else {
      adviceItems.push('你的感情底色平稳，重点在于经营：把对方放在"队友"的位置而不是"对手"，感情自然长久');
    }
  }

  return {
    spouseFeature,
    marriageQuality,
    peachBlossom,
    advice: adviceItems.join('；'),
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
  const dayWx = TG_WX[dayGan];

  // 各十神的位置
  const zhengGuanPillars = findShiShenPillars(pillars, '正官');
  const qiShaPillars = findShiShenPillars(pillars, '七杀');
  const zhengYinPillars = findShiShenPillars(pillars, '正印');
  const pianYinPillars = findShiShenPillars(pillars, '偏印');
  const shiShenList = findShiShenPillars(pillars, '食神');
  const shangGuanPillars = findShiShenPillars(pillars, '伤官');
  const zhengCaiPillars = findShiShenPillars(pillars, '正财');
  const pianCaiPillars = findShiShenPillars(pillars, '偏财');
  const biJianPillars = findShiShenPillars(pillars, '比肩');
  const jieCaiPillars = findShiShenPillars(pillars, '劫财');

  const allShiShen = pillars.map(p => p.shiShen).filter(Boolean);
  const hasGuan = zhengGuanPillars.length > 0;
  const hasSha = qiShaPillars.length > 0;
  const hasYin = zhengYinPillars.length > 0 || pianYinPillars.length > 0;
  const hasShiShang = shiShenList.length > 0 || shangGuanPillars.length > 0;
  const hasZhengCai = zhengCaiPillars.length > 0;
  const hasPianCai = pianCaiPillars.length > 0;
  const hasCai = hasZhengCai || hasPianCai;
  const hasBiJie = biJianPillars.length > 0 || jieCaiPillars.length > 0;

  // 财星处于哪些柱
  const allCaiPillars = [...zhengCaiPillars, ...pianCaiPillars];
  // 官星处于哪些柱
  const allGuanPillars = [...zhengGuanPillars, ...qiShaPillars];
  // 印星处于哪些柱
  const allYinPillars = [...zhengYinPillars, ...pianYinPillars];

  // ===== 事业方向 =====
  let direction = '';

  // 命局主气锚：数量最多的十神决定主导气质
  const dominant = dominantShiShen(pillars);
  let dominantAnchor = '';
  if (dominant && SHISHEN_SIGNATURE[dominant.name]) {
    dominantAnchor = `${SHISHEN_SIGNATURE[dominant.name]}（${dominant.count}处，为全局最旺）。这是你职业气质的底色——找方向时优先匹配这种特质的工作，你会比别人干得更顺、更出成绩。\n\n`;
  }

  if (hasGuan && hasYin) {
    const guanInfo = allGuanPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    const yinInfo = allYinPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    direction = `你的八字中正官（${guanInfo}）与印星（${yinInfo}）兼具，属于"官印相生"的经典好组合。`;
    direction += '正官代表规则、纪律和平台，印星代表学历、贵人和保护——两者结合意味着你适合在有结构的环境中发展：公务员、事业单位、国企、大型企业的管理岗位都是很匹配的方向。';
    direction += '你的优势在于"既能守规矩又能被认可"——领导觉得你靠谱，同事觉得你好相处。走管理路线（而非纯技术路线）会更有利于你的发展。';
  } else if (hasSha && !hasGuan) {
    const shaInfo = qiShaPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    direction = `你的八字七杀（${shaInfo}）明显而正官不显，七杀代表竞争、魄力和执行力。你骨子里有"不服输"的劲头，比较适合竞争激烈的领域。`;
    direction += '七杀人不爱按部就班，适合需要果断决策的职业：创业者、销售总监、军警、外科医生、律师、竞技体育、项目管理。你把压力变成动力的时候，往往就是爆发的时候。';
    if (zhengYinPillars.length > 0) {
      direction += `好在你八字中有正印（${zhengYinPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、')}）制衡七杀——就像有了"刹车"，你的魄力不会变成冲动，而是有智慧的果敢。`;
    }
  } else if (hasShiShang && hasCai) {
    const shiShangInfo = [...shiShenList, ...shangGuanPillars].map(p => `${p.ganZhi}在${p.pillar}(${p.shiShen})`).join('、');
    const caiInfo = allCaiPillars.map(p => `${p.ganZhi}在${p.pillar}(${p.shiShen})`).join('、');
    direction = `你的八字中有食伤（${shiShangInfo}）和财星（${caiInfo}），属于"食伤生财"的组合。食伤是你的才华和技术，财星是你的变现能力——靠本事赚钱就是你最好的路。`;
    direction += '你不太适合死板的办公室工作，更适合用创造力和专业技能变现。推荐方向：程序员、设计师、自媒体、作家、艺术家、咨询顾问、教育培训——简而言之，你做什么就靠什么赚钱。';
  } else if (hasYin && !hasGuan && !hasCai) {
    const yinInfo = allYinPillars.map(p => `${p.ganZhi}在${p.pillar}(${p.shiShen})`).join('、');
    direction = `你的八字中印星（${yinInfo}）较旺，官星和财星相对不显，说明你更适合走"学识型"路线而非"功利型"路线。`;
    direction += '印星代表学习、研究、深度思考——你适合学术、教育、文化、出版、咨询、科研等需要深耕的领域。比起追求升职加薪，你追求知识和专业成就可能更让你满足。技术专家路线比管理路线更适合你。';
  } else if (hasCai && hasBiJie) {
    const caiInfo = allCaiPillars.map(p => `${p.ganZhi}在${p.pillar}(${p.shiShen})`).join('、');
    const bijieInfo = [...biJianPillars, ...jieCaiPillars].map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    direction = `你的八字财星（${caiInfo}）和比劫（${bijieInfo}）并存，这在命理中叫"比劫夺财"的配置——既想赚钱又有竞争压力。`;
    direction += '这意味着你赚钱需要靠团队、靠合作——自己单干可能不如抱团发展。适合依靠人脉和团队协作的行业：销售团队、合伙创业、社群运营、渠道开发等。但要注意合伙中的利益分配一定要清晰。';
  } else {
    // 根据日主天干个性化推荐（10种，替代原5行五行版）
    const ganCareer: Record<string, string> = {
      '甲': '你的日主是甲木——大树型人格，适合"越长越大"的平台型赛道：教育、法务、工程管理、大型项目负责人。给你一片天，你就能撑起一片荫',
      '乙': '你的日主是乙木——藤蔓型人格，适合借势发展的赛道：品牌运营、公共关系、花艺设计、跨境贸易。跟对平台和贵人，你爬得比谁都稳',
      '丙': '你的日主是丙火——太阳型人格，适合被看见的赛道：主播、培训讲师、市场品牌、餐饮门店。你的热情本身就是生产力',
      '丁': '你的日主是丁火——烛火型人格，适合精细深耕的赛道：研发、财务、心理咨询、内容写作。安静的地方才是你发光的地方',
      '戊': '你的日主是戊土——高山型人格，适合重资产重信用的赛道：地产建筑、金融信贷、供应链、制造业。你的靠谱就是你的招牌',
      '己': '你的日主是己土——田园型人格，适合服务与运营的赛道：人力行政、电商运营、母婴家政、农业生鲜。把平凡的事做细就是你的护城河',
      '庚': '你的日主是庚金——刀剑型人格，适合硬碰硬的赛道：军警执法、外科医疗、机械重工、竞技体育。怕苦别选这行，选了这行没人比你狠',
      '辛': '你的日主是辛金——珠玉型人格，适合高精尖高审美的赛道：珠宝设计、精工制造、审计、医美口腔。你的挑剔就是你的专业',
      '壬': '你的日主是壬水——江河型人格，适合流动性的赛道：贸易物流、旅游出行、投资、传媒。哪里有流动，哪里就有你的机会',
      '癸': '你的日主是癸水——雨露型人格，适合滋养型赛道：护理医疗、教育培训、茶饮咖啡、数据分析。润物无声的功夫，别人替代不了',
    };
    direction = ganCareer[dayGan] || '综合来看，你的八字格局比较灵活，职业选择面较宽。建议根据自己的兴趣和实际技能来选择，而非盲目跟风。';
  }

  // 拼回主气锚
  if (dominantAnchor) {
    direction = dominantAnchor + direction;
  }

  // ===== 赚钱方式 =====
  let moneyMethod = '';

  if (hasZhengCai && hasPianCai) {
    const zcInfo = zhengCaiPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    const pcInfo = pianCaiPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    moneyMethod = `你正财（${zcInfo}）和偏财（${pcInfo}）俱全，属于"两条腿走路"的赚钱类型。正财代表稳定的工资收入，偏财代表副业、投资、意外之财。`;
    // 哪颗财星在好的位置？
    if (zhengCaiPillars.some(p => p.pillar === '月柱')) {
      moneyMethod += '正财在月柱说明你通过正常工作就能获得不错的收入，先把主业做好是基础。';
    }
    if (pianCaiPillars.some(p => p.pillar === '时柱')) {
      moneyMethod += '偏财在时柱说明你中晚年可能会有一笔意外的财富机会——投资或副业在后期可能开花结果。';
    }
    moneyMethod += '建议主副并进，用主业的钱养副业，用副业的钱做投资——不要把所有鸡蛋放在一个篮子里。';
  } else if (hasZhengCai) {
    const zcInfo = zhengCaiPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    moneyMethod = `你的财星以正财为主（${zcInfo}），正财代表老实赚钱、稳定收入——工资、固定生意、长期项目。`;
    if (zhengCaiPillars.some(p => p.pillar === '月柱')) {
      moneyMethod += '正财在月柱，青年时期（17-32岁）就能通过工作赚钱。建议在这个阶段打好职业基础。';
    } else if (zhengCaiPillars.some(p => p.pillar === '日柱')) {
      moneyMethod += '正财在日柱（夫妻宫），你的收入和配偶可能有很大关系——结婚后财运反而好转，或者和另一半一起经营事业会更顺。';
    }
    moneyMethod += '不建议高风险投机（比如炒股、虚拟币），稳健存钱和长期理财更适合你。稳扎稳打才是你的财富密码。';
  } else if (hasPianCai) {
    const pcInfo = pianCaiPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、');
    moneyMethod = `你以偏财为主（${pcInfo}），偏财代表投资、生意、奖金、意外之财——来的方式不太传统。`;
    moneyMethod += '你天生有做生意的头脑，适合自己当老板、做销售拿提成、投资理财、贸易等弹性收入的行业。但偏财来得快去得也快——赚了钱要强制储蓄，最好把收入的30%先存起来不动。';
    if (pianCaiPillars.some(p => p.pillar === '时柱')) {
      moneyMethod += '偏财在时柱，中晚年财运比年轻时更好。年轻时积累经验和本金，后期的投资或创业回报会更大。';
    }
  } else if (hasShiShang) {
    const ssInfo = [...shiShenList, ...shangGuanPillars].map(p => `${p.ganZhi}在${p.pillar}(${p.shiShen})`).join('、');
    moneyMethod = `你八字中食伤（${ssInfo}）较旺但财星不显，这叫"食伤不转财"——你有技术有才华，但变现的渠道不够直接。`;
    moneyMethod += '赚钱的核心是"把自己的能力产品化"——把技术变成课程、把创意变成内容、把经验变成咨询。你需要的不是更努力，而是更会"包装自己"。';
    if (strengthLevel === '身弱') {
      moneyMethod += '另外你日主偏弱，不要同时搞太多方向——先精钻一件事，做到行业前20%，钱自然就来了。';
    }
  } else {
    moneyMethod = `综合来看，你的八字财星和食伤都不太明显。赚钱不是你的天赋赛道，但也意味着你不会被钱牵着走。`;
    moneyMethod += '找到自己真正擅长且有人愿意付费的方向，专注深耕——你的优势可能不在"赚钱快"而在"赚得稳"。选择永远比努力重要。';
  }

  // ===== 财运走势 =====
  let fortuneTrend = '';

  if (strengthLevel === '身强' && hasCai) {
    const caiInfo = allCaiPillars.map(p => `${p.pillar}${p.ganZhi}(${p.shiShen})`).join('、');
    fortuneTrend = `你${strengthLevel}能担财——好比一个大容器能装很多水。财星（${caiInfo}）在你的命中，说明你只要行动就有收获。`;
    if (allCaiPillars.some(p => p.pillar === '月柱' || p.pillar === '日柱')) {
      fortuneTrend += '财星在月柱或日柱，青壮年时期（17-48岁）是你的创富黄金期，机会最多、精力最旺。这个阶段不要畏首畏尾，该拼就拼。';
    }
    fortuneTrend += '你的理财重点是"开源"——多开拓收入渠道，你的身体和能力都撑得住。';
  } else if (strengthLevel === '身弱' && hasCai) {
    const caiInfo = allCaiPillars.map(p => `${p.pillar}${p.ganZhi}(${p.shiShen})`).join('、');
    fortuneTrend = `你命中有财（${caiInfo}）但日主${dayGan}(${dayWx})偏弱——好比小容器装不下太多水，财多反而会累。`;
    fortuneTrend += '赚钱不要太拼，身体健康和精力管理比赚钱更重要。35岁以后运势逐渐走稳，不用急着在年轻时暴富。';
    if (hasYin) {
      const yinWx = TG_WX[allYinPillars[0].tianGan];
      fortuneTrend += `你八字中有印星（${yinWx}生助${dayWx}），建议通过学习和考证来提升自己的"容量"——学历和专业技能就是你的"增容器"，先学习后赚钱。`;
    }
    fortuneTrend += '理财重点是"节流"——赚钱不求大，求稳。高风险投资不太适合你。';
  } else if (strengthLevel === '身强' && !hasCai) {
    fortuneTrend = `你${strengthLevel}但财星不显——你有能力和精力，但需要主动去找赚钱机会。`;
    if (hasShiShang) {
      const ssWx = TG_WX[(shiShenList[0] || shangGuanPillars[0]).tianGan];
      fortuneTrend += `幸好你八字有食伤（${ssWx}），食伤可以生财——你的出路在于用自己的才华和技能来创造财富。不要等机会，要主动输出自己的价值。`;
    }
    fortuneTrend += '多关注市场趋势和商机，你的能力匹配上了机会，财运就会爆发。';
  } else {
    fortuneTrend = `财运整体比较平稳，没有大起大落。${hasZhengCai ? '正财为主，说明你有稳定的收入来源' : ''}${hasPianCai ? '偏财为辅，偶尔有一些意外之财' : ''}。`;
    fortuneTrend += '保持稳定的收入来源，辅以稳健的理财规划。不追求暴富，追求"细水长流"反而更适合你。';
  }

  // ===== 贵人运 =====
  const hasTianYi = shenSha.some(s => s.name === '天乙贵人');
  const hasTianDe = shenSha.some(s => s.name === '天德贵人');
  const hasYueDe = shenSha.some(s => s.name === '月德贵人');
  const hasWenChang = shenSha.some(s => s.name === '文昌');
  const hasJiangXing = shenSha.some(s => s.name === '将星');

  let nobleHelp = '';

  if (hasTianYi) {
    const tianYiItems = shenSha.filter(s => s.name === '天乙贵人');
    const tianYiStages = tianYiItems.map(s => `${s.pillar}（${getPillarLifeStage(s.pillar)}）`).join('、');
    nobleHelp = `你命带天乙贵人——最尊贵的吉星（出现在${tianYiStages}）。天乙贵人代表关键时刻有人拉你一把，走到哪里都容易得人赏识。`;
    nobleHelp += `你的贵人可能比你年长，或者在职场中比你级别高。需要注意的是，贵人在${tianYiItems[0].pillar}对应的人生阶段最为得力——在这个阶段，别害羞，大胆去求助和请教。`;
  } else if (hasTianDe || hasYueDe) {
    const deItems = shenSha.filter(s => s.name === '天德贵人' || s.name === '月德贵人');
    nobleHelp = `你命带${deItems.map(s => s.name).join('、')}（出现在${deItems.map(s => s.pillar).join('、')}），有天德/月德护佑的人，虽然不是大富大贵，但遇到困难时总会有转机。`;
    nobleHelp += '你的贵人运主要体现在"无形"的层面——危难时刻的转机、关键时候的消息，这些都是贵人相助的体现。多做好事、保持善念，福报会回馈到你身上。';
  } else if (hasWenChang) {
    const wcItems = shenSha.filter(s => s.name === '文昌');
    nobleHelp = `你命带文昌星（出现在${wcItems.map(s => s.pillar).join('、')}），文昌主学业和文职。你的贵人主要是学术型或文化型的人——老师、导师、行业专家。`;
    nobleHelp += '多在专业领域深耕和输出，你的"贵人"会以"引路人"的形式出现在你的专业圈子里。';
  } else if (hasYin) {
    const yinWx = TG_WX[allYinPillars[0].tianGan];
    nobleHelp = `你八字印星较旺（${allYinPillars.map(p => `${p.ganZhi}在${p.pillar}`).join('、')}），印星${yinWx}生助日主${dayWx}。虽然没有明显的贵人星，但印星本身代表长辈缘和贵人运。`;
    nobleHelp += '你的贵人可能是女性长辈、老师、或者上级领导。多和资历深的人交往，他们的一句话可能改变你的职业方向。';
  } else {
    nobleHelp = '你的八字中没有明显的贵人星，但不代表没有贵人。你的贵人运更多来自你自己的人际积累——平时多帮人、多交朋友、多输出价值，需要时自然有人愿意帮你。';
  }

  // ===== 综合建议 =====
  const adviceItems: string[] = [];
  if (hasSha && !hasYin) {
    adviceItems.push(`你七杀(${qiShaPillars.map(p => p.ganZhi).join('、')})较旺但印星不足，魄力有余但后盾不够。做事前多做调研和规划，别只凭直觉行动`);
  }
  if (hasPianCai) {
    adviceItems.push(`偏财运旺但要注意理财纪律——每月固定存一部分钱，别等钱到手才想存`);
  }
  if (hasJiangXing) {
    const jx = shenSha.find(s => s.name === '将星');
    adviceItems.push(`你命带将星（${jx?.pillar}），天生有领导才能，不要怕挑大梁——你扛得住`);
  }
  if (strengthLevel === '身弱' && hasCai) {
    adviceItems.push(`身弱担财有限，赚钱的同时别忘了投资健康和学习——你本人的能力才是最大的财富`);
  }
  if (hasBiJie && hasCai) {
    adviceItems.push(`比劫（${[...biJianPillars, ...jieCaiPillars].map(p => p.shiShen).join('、')}）和财星并存，注意合伙和借钱的问题——亲兄弟明算账，账目要清楚`);
  }
  if (!adviceItems.length) {
    const mainYong = yongShen[0] || dayWx;
    adviceItems.push(`你的喜用五行是${mainYong}——事业发展多往${WX_DIRECTION[mainYong] || mainYong}方向考虑，颜色多用${WX_COLOR[mainYong] || mainYong}会更顺手`);
  }

  return {
    direction,
    moneyMethod,
    fortuneTrend,
    nobleHelp,
    advice: adviceItems.join('；'),
  };
}

// ========== 3. 身体健康分析 ==========
export function analyzeHealth(
  pillars: PillarData[],
  wxStats: Record<string, { count: number; level: string }>,
  dayGan: string,
  strengthLevel: string,
  relations: { type: string; desc: string }[]
): HealthAnalysis {
  const dayWx = TG_WX[dayGan];

  const wxBody: Record<string, string> = {
    '木': '肝胆、筋骨、神经系统、甲状腺',
    '火': '心脏、小肠、眼睛、血液、心血管系统',
    '土': '脾胃、皮肤、肌肉、消化系统、胰腺',
    '金': '肺、大肠、呼吸道、骨骼、牙齿',
    '水': '肾、膀胱、耳朵、生殖泌尿系统、骨髓',
  };

  const wxSymptom: Record<string, { excess: string; deficient: string }> = {
    '木': { excess: '肝火旺、易怒、偏头痛、眼睛干涩疲劳、肩颈僵硬', deficient: '肝功能偏弱、容易疲劳、筋骨酸痛、指甲易断、视力下降' },
    '火': { excess: '心火旺、失眠多梦、口腔溃疡、血压偏高、容易焦虑', deficient: '心悸心慌、手脚冰凉、血液循环不好、面色苍白、低血压' },
    '土': { excess: '胃火大、消化不良、口臭、皮肤长痘、便秘', deficient: '脾胃虚弱、食欲不振、容易腹胀腹泻、四肢无力、面色萎黄' },
    '金': { excess: '肺热、干咳、皮肤干燥瘙痒、便秘、容易感冒发烧', deficient: '容易感冒、呼吸道敏感、哮喘、皮肤松弛、牙齿不好' },
    '水': { excess: '水肿、肾负担重、腰膝酸软、听力下降、夜尿多', deficient: '肾气不足、怕冷畏寒、精力不济、耳鸣、脱发、记忆力下降' },
  };

  const wxFood: Record<string, string> = {
    '木': '绿色蔬菜（菠菜、西兰花、芹菜）、绿茶、枸杞、柠檬、乌梅',
    '火': '红色食物（番茄、红枣、红豆、枸杞）、苦瓜、莲子心、菊花茶',
    '土': '黄色食物（南瓜、小米、玉米、山药）、土豆、红薯、蜂蜜',
    '金': '白色食物（百合、银耳、雪梨、白萝卜）、杏仁、豆浆、牛奶',
    '水': '黑色食物（黑豆、黑芝麻、黑木耳、黑米）、海带、核桃、桑葚',
  };

  const wxSport: Record<string, string> = {
    '木': '拉伸运动、瑜伽、散步、太极、八段锦',
    '火': '有氧运动、跑步、跳舞、球类运动、游泳',
    '土': '登山、徒步、力量训练、八段锦、站桩',
    '金': '呼吸训练、游泳、骑行、羽毛球、普拉提',
    '水': '游泳、冥想、太极拳、慢跑、深蹲',
  };

  const sorted = Object.entries(wxStats).sort((a, b) => b[1].count - a[1].count);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const keDayWx = WX_BEI_KE[dayWx]; // 克日主的五行
  const woShengWx = WX_SHENG_CHU[dayWx]; // 日主生的五行

  // ===== 体质概况 =====
  let bodyOverview = `日主${dayGan}（${dayWx}）代表你自身的能量核心。你的八字五行分布中「${strongest[0]}」最旺、「${weakest[0]}」最弱。`;

  // 日主体质锚（10天干）
  const ganHealth: Record<string, string> = {
    '甲': '甲木之人精力底子好，但最怕"憋"——情绪和压力都往肝上压，疏解比进补重要',
    '乙': '乙木之人韧性足恢复快，但耐力储备一般，属于"细水长流"型，硬拼爆发会透支',
    '丙': '丙火之人气血旺盛面色好，但容易"烧过头"——上火、失眠、血压是你最该盯的指标',
    '丁': '丁火之人外表柔弱内里有劲，神经系统敏感，睡眠质量决定了你第二天的状态',
    '戊': '戊土之人底子厚实抗造，但脾胃是你的阿喀琉斯之踵——吃出来的问题最多',
    '己': '己土之人消化吸收是强项，但思虑重，"想太多"会直接反映在胃口和肚子上',
    '庚': '庚金之人骨架壮、肺气足，感冒发烧少；但一旦累了就是真累，别硬扛',
    '辛': '辛金之人皮肤和呼吸道娇贵，对空气质量、温湿度变化反应比常人灵敏',
    '壬': '壬水之人代谢快、好动坐不住，泌尿和腰部是你的薄弱带，多喝水也要多休息',
    '癸': '癸水之人先天肾气敏感，怕冷、易疲劳是常态——保暖和规律作息是你的养生主旋律',
  };
  if (ganHealth[dayGan]) {
    bodyOverview += `${ganHealth[dayGan]}。`;
  }

  // 月令调候锚：出生季节决定体质底色（12月支）
  const monthZhi = pillars[1]?.diZhi;
  if (monthZhi && SEASON_HEALTH[monthZhi]) {
    bodyOverview += `${SEASON_HEALTH[monthZhi]}。`;
  }

  if (strengthLevel === '身强') {
    bodyOverview += `你属于${strengthLevel}体质——就像一台发动机功率较大，精力比较充沛。但"过犹不及"，过旺的五行对应的身体部位容易出现功能亢进型问题。`;
    if (strongest[1].level === '旺' && strongest[0] !== dayWx) {
      bodyOverview += `具体来说，「${strongest[0]}」过旺会压制其他五行，${wxBody[strongest[0]]}容易成为你的"短板"。`;
    }
    if (strongest[0] === woShengWx) {
      bodyOverview += `食伤（${woShengWx}）过旺泄身，代表你平时容易用脑过度或思虑过多——精神层面的消耗需要特别注意。`;
    }
  } else if (strengthLevel === '身弱') {
    bodyOverview += `你属于${strengthLevel}体质——好比手机电池容量偏小，精力有限，容易感到疲劳。`;
    if (weakest[0] === dayWx) {
      bodyOverview += `你的日主五行（${dayWx}）本身在八字中偏弱，代表身体素质天生不算特别强。需要后天多注意保养，规律作息比吃什么补品都重要。`;
    }
    bodyOverview += '不适合高强度透支身体的运动和工作方式，劳逸结合是你健康的关键。';
  } else {
    bodyOverview += '你的体质比较均衡，日主中和——身体各系统相对协调，不会有某个方面特别突出或特别弱的问题。保持目前的节奏就好。';
  }

  // ===== 需要留意的身体部位 =====
  const concerns: string[] = [];

  // 1. 过旺的五行
  if (strongest[1].level === '旺' || strongest[1].level === '太旺') {
    concerns.push(
      `【${strongest[0]}过旺】五行${strongest[0]}在你的八字中力量最强，对应${wxBody[strongest[0]] || ''}。容易出现的症状：${wxSymptom[strongest[0]]?.excess || '功能亢进相关的问题'}。` +
      `比如你的${wxBody[strongest[0]]?.split('、')[0] || ''}可能负担较重，建议每年体检时重点关注这部分指标。`
    );
  }

  // 2. 过弱的五行
  if (weakest[1].level === '弱' || weakest[1].level === '缺') {
    concerns.push(
      `【${weakest[0]}偏弱】五行${weakest[0]}在你的八字中力量最弱，对应${wxBody[weakest[0]] || ''}。容易出现的症状：${wxSymptom[weakest[0]]?.deficient || '功能不足相关的问题'}。` +
      `你的${wxBody[weakest[0]]?.split('、')[0] || ''}可能是天生的薄弱环节，生活中要多注意保护。`
    );
  }

  // 3. 克日主的五行过旺
  if (keDayWx && wxStats[keDayWx]?.level === '旺') {
    concerns.push(
      `【官杀克身】克你日主的五行是${keDayWx}（官杀），在八字中力量较强。日主${dayWx}被${keDayWx}所克，意味着${wxBody[dayWx]}被压制——${wxBody[dayWx]?.split('、')[0] || ''}的健康需要你格外重视。` +
      `长期的压力感可能影响你的${dayWx === '火' ? '心血管和睡眠' : dayWx === '木' ? '肝功能和情绪' : dayWx === '土' ? '消化系统' : dayWx === '金' ? '呼吸系统' : '肾脏和精力'}。学会减压是你健康管理的核心。`
    );
  }

  // 4. 日主生的五行过旺（泄身）
  if (woShengWx && wxStats[woShengWx]?.level === '旺') {
    concerns.push(
      `【食伤泄身】日主${dayWx}生${woShengWx}（食伤），而${woShengWx}在八字中较旺——就像一个泵不断在抽水。` +
      `你可能容易感到精力透支，尤其是用脑过度之后。注意不要同时做太多事情，精力分配要有节制。`
    );
  }

  // 5. 冲克对应的健康问题
  const chongRelations = relations.filter(r => r.type === '冲');
  for (const cr of chongRelations) {
    if (cr.desc.includes('子午冲')) {
      concerns.push('【子午冲】子水（肾）冲午火（心），水火不相容。注意心血管与肾脏的平衡——容易一会心跳快、一会怕冷，情绪起伏大也会影响身体。保持情绪稳定、不熬夜是最重要的。');
    }
    if (cr.desc.includes('卯酉冲')) {
      concerns.push('【卯酉冲】卯木（肝）冲酉金（肺），金木交战。注意肝胆和呼吸系统的问题——少喝酒、少抽烟、少吃辛辣油炸。春季和秋季换季时尤其要注意。');
    }
    if (cr.desc.includes('寅申冲')) {
      concerns.push('【寅申冲】寅木（肝/筋骨）冲申金（肺/大肠），寅申都是驿马星，冲代表动荡。注意关节扭伤和呼吸系统问题，同时寅申冲动也可能导致出行中的意外伤害——开车注意安全。');
    }
    if (cr.desc.includes('辰戌冲')) {
      concerns.push('【辰戌冲】辰戌都是土（脾胃），两土相冲。注意消化系统问题——饮食规律、细嚼慢咽、少暴饮暴食。脾虚/胃火都可能交替出现。');
    }
    if (cr.desc.includes('丑未冲')) {
      concerns.push('【丑未冲】丑未都是土（脾胃），但内含金木冲突。消化系统容易出问题，同时皮肤（土主皮肤）也可能敏感——注意保湿和饮食清淡。');
    }
  }

  // 6. 刑害的影响
  const xingRelations = relations.filter(r => r.type === '刑');
  for (const xr of xingRelations) {
    if (xr.desc.includes('自刑')) {
      concerns.push('【自刑】命局中有自刑，代表你有时会自我较劲——思虑多、内耗大，容易给自己造成心理压力。心理上的"自刑"比身体上的伤害更需要注意——学会放下完美主义。');
    }
  }

  if (concerns.length === 0) {
    concerns.push('整体来看，你的八字五行相对均衡，没有特别突出的健康短板。但这不代表可以大意——规律作息、均衡饮食、定期体检仍是基本功课。');
  }

  // ===== 养生建议 =====
  // 缺什么补什么，但同时考虑日主的需求
  const defWx = weakest[0];

  // 实际建议的五行为最弱的那个（补短板）
  let targetWx = defWx;
  // 但如果最弱的是克日主的五行，那就更应该补日主自己
  if (keDayWx && defWx === keDayWx) {
    targetWx = dayWx;
  }

  const wellnessAdvice =
    `从五行平衡的角度，你最需要补充的是「${targetWx}」的能量。` +
    `饮食方面：多吃${wxFood[targetWx] || '均衡营养的食物'}（补${targetWx}）。` +
    `运动方面：适合${wxSport[targetWx] || '适度的有氧运动'}。` +
    `颜色方面：多接触${WX_COLOR[targetWx] || '柔和色调'}（衣饰、家居、手机壁纸都可以）。` +
    `方位方面：有条件可以多往${WX_DIRECTION[targetWx] || '适合自己的方向'}走走。` +
    `${strengthLevel === '身弱' ? '另外你日主偏弱，建议配合规律作息（最晚23点前睡）和轻度运动来增强体质，比吃保健品更有效。' : ''}`;

  return { bodyOverview, concerns, wellnessAdvice };
}

// ========== 4. 家庭亲情分析 ==========
export function analyzeFamily(
  pillars: PillarData[],
  relations: { type: string; desc: string }[],
  dayGan: string
): FamilyAnalysis {
  const dayWx = TG_WX[dayGan];
  const yearPillar = pillars[0];
  const monthPillar = pillars[1];

  const yearRelations = getPillarRelations(relations, '年柱');
  const monthRelations = getPillarRelations(relations, '月柱');

  // 年干代表父亲（偏财），年支代表母亲（正印）
  // 或：年干正印=母亲，偏财=父亲
  const yearGan = yearPillar.tianGan;
  const yearZhi = yearPillar.diZhi;
  const yearGanWx = TG_WX[yearGan];
  const yearZhiWx = DZ_WX[yearZhi];

  // ===== 父母关系 =====
  const hasYearChong = yearRelations.some(r => r.type === '冲');
  const hasYearHe = yearRelations.some(r => r.type === '合');
  const hasYearXing = yearRelations.some(r => r.type === '刑');

  // 日主家庭角色锚
  const dayGanProfile = DAY_GAN_PROFILE[dayGan];
  const familyRole = dayGanProfile?.family || '';

  // 看年柱十神
  const yearShiShen = yearPillar.shiShen;
  const monthShiShen = monthPillar.shiShen;

  let parentRelation = '';

  if (hasYearChong) {
    const chongDescs = yearRelations.filter(r => r.type === '冲').map(r => r.desc).join('；');
    parentRelation = `你的年柱${yearPillar.ganZhi}（代表祖上和父母根基）受到冲克：${chongDescs}。`;
    // 解析具体是什么冲
    const yearDz = yearPillar.diZhi;
    const chongTarget = chongDescs;
    parentRelation += `年柱被冲，代表你${getPillarLifeStage('年柱')}期间家运可能不太稳定。具体来说：`;

    if (yearDz === '子' && chongTarget.includes('午')) {
      parentRelation += '子午冲是水火相战，代表父母之间可能性格差异大、观念不同，小时候的家庭氛围时有紧张。但也锻炼了你察言观色的能力——你能敏锐感知别人的情绪。';
    } else if (yearDz === '午' && chongTarget.includes('子')) {
      parentRelation += '午子冲同样是水火相冲——父母可能一个急性子一个慢性子，小时候家里可能因工作或观念问题有过争执。但你从中学会了如何平衡不同意见。';
    } else if (yearDz === '卯' && chongTarget.includes('酉')) {
      parentRelation += '卯酉冲是金木相战——父母可能一个讲原则一个讲感情，家庭中"法制"和"人情"两条线容易碰撞。不过这种碰撞也让你很早就懂得了世界的复杂性。';
    }

    parentRelation += '年柱冲不代表和父母感情不好，而是缘分模式比较"距离产生美"——你可能比较早就离开家（寄宿、外出读书、工作），独立得早。';
  } else if (hasYearHe) {
    const heDescs = yearRelations.filter(r => r.type === '合').map(r => r.desc).join('；');
    parentRelation = `你的年柱${yearPillar.ganZhi}有合（${heDescs}），代表家庭根基比较稳固。`;
    parentRelation += '年柱被合，你和父母的缘分较深——从小家庭是你重要的依靠和后盾。父母对你的影响很深，你性格中的很多部分都来自原生家庭。但合也意味着你和父母之间的"黏性"较强——独立出来可能需要更多的勇气。';
  } else if (hasYearXing) {
    const xingDescs = yearRelations.filter(r => r.type === '刑').map(r => r.desc).join('；');
    parentRelation = `你的年柱${yearPillar.ganZhi}有刑（${xingDescs}），代表家庭中隐隐有一些不顺畅的地方。不一定有大冲突，但可能有些"心结"——比如父母对你期望很高让你有压力，或者你和父母性格不合但又不愿意说破。`;
  } else {
    parentRelation = `你的年柱${yearPillar.ganZhi}（${yearShiShen || ''}）整体平稳，没有明显的冲合刑，与父母的缘分属于正常范围。`;

    // 根据年柱十神解读
    if (yearShiShen === '正印') {
      parentRelation += `年柱正印代表母亲对你的影响最深——你小时候母亲照顾你很多，她的价值观和处事方式对你性格的塑造起了关键作用。`;
    } else if (yearShiShen === '偏财') {
      parentRelation += `年柱偏财代表父亲对你的影响较大——父亲的赚钱能力或为人处世方式对你成年后的选择有潜在影响。`;
    } else if (yearShiShen === '正官') {
      parentRelation += `年柱正官代表家庭对你要求比较严格——小时候家教较严，规矩多，但也养成了你良好的自律习惯。长大后你可能会感谢这种"严管"。`;
    } else if (yearShiShen === '食神') {
      parentRelation += `年柱食神代表家庭氛围比较温馨宽松——你从小被呵护得比较好，性格中有随和开朗的一面。父母给你的自由度比较大。`;
    }

    // 结合月柱看
    if (monthShiShen === '正印' || monthShiShen === '偏印') {
      parentRelation += `月柱为印星（${monthPillar.ganZhi}，${monthShiShen}），代表你在成长关键期（${getPillarLifeStage('月柱')}）得到了很好的教育和引导。`;
    }
  }

  // 拼回家庭角色锚
  if (familyRole) {
    parentRelation = `${familyRole}。\n\n` + parentRelation;
  }

  // ===== 兄弟姐妹 =====
  const biJieCount = pillars.filter(p => ['比肩', '劫财'].includes(p.shiShen || '')).length;
  const biJieInfo = pillars
    .filter(p => ['比肩', '劫财'].includes(p.shiShen || ''))
    .map(p => `${p.shiShen}在${p.pillar}（${p.ganZhi}）`)
    .join('、');

  let siblings = '';

  if (biJieCount >= 3) {
    siblings = `你八字中比劫（代表兄弟姐妹和同辈）较多：${biJieInfo}。比劫多意味着：1）兄弟姐妹可能比较多，或者你在朋友堆里很活跃；2）团队协作能力好，但竞争关系也明显。`;
    if (jieCaiPillars(pillars).length > 0) {
      siblings += `你命带劫财（${jieCaiPillars(pillars).map(p => `${p.ganZhi}在${p.pillar}`).join('、')}），意味着与兄弟姐妹或密友之间在金钱上偶尔会有小摩擦——"亲兄弟明算账"这句话对你很重要。`;
    }
    siblings += '兄弟姐妹之间，建议在重大财务问题上提前约定好规则，避免因为钱伤感情。';
  } else if (biJieCount >= 1) {
    siblings = `你八字中比劫有${biJieCount}处：${biJieInfo}。兄弟姐妹不算多，但关系还不错。`;
    const bj = pillars.find(p => p.shiShen === '比肩' || p.shiShen === '劫财');
    if (bj?.shiShen === '比肩') {
      siblings += '比肩代表平等的兄弟姐妹关系——你和兄弟姐妹之间比较相像，想法相近，属于"有商有量"的类型。';
    } else if (bj?.shiShen === '劫财') {
      siblings += '劫财代表虽然亲近但利益容易交叉——比如一起做生意或者共同承担家庭开支的兄弟姐妹关系。金钱方面需要多沟通。';
    }
    siblings += '你比较独立，不太依赖兄弟姐妹，但也不会疏远。保持适当距离反而让关系更舒服。';
  } else {
    siblings = '你八字中比劫较少，可能兄弟姐妹不多，或者你和同辈关系比较清淡。但你也在这种环境里养成了独立的性格——不随波逐流、有自己的主见。这不是缺陷，而是你的特质。';
  }

  // ===== 家庭氛围 =====
  let familyAtmosphere = '';

  if (monthShiShen === '正印' || monthShiShen === '偏印') {
    familyAtmosphere = `你的月柱为${monthShiShen}（${monthPillar.ganZhi}），印星代表家庭环境和教育。你的家庭氛围偏向温暖和重视教育——从小到大，家人对你的学习、成长比较上心。`;
    familyAtmosphere += '但这种"上心"也可能表现为对你的期望较高，有时让你有压力。不过长大后回头看，家庭给你的安全感是你的底气和财富。';
  } else if (monthShiShen === '正官' || monthShiShen === '七杀') {
    familyAtmosphere = `你的月柱为${monthShiShen}（${monthPillar.ganZhi}），官杀代表规范和压力。你的家庭可能比较注重规矩和纪律——小时候父母管得比较严。`;
    familyAtmosphere += monthShiShen === '正官'
      ? '正官是良性约束——规矩多但有道理，让你养成了良好的自律和责任心。'
      : '七杀是带有压力的管束——你可能小时候觉得"喘不过气"，但这种环境也让你的抗压能力和执行力比别人强。';
  } else if (monthShiShen === '正财' || monthShiShen === '偏财') {
    familyAtmosphere = `你的月柱为${monthShiShen}（${monthPillar.ganZhi}），财星代表务实和物质基础。你的家庭比较务实——父母重视"把日子过好"，对经济方面比较看重。`;
    familyAtmosphere += '成长过程中，你耳濡目染了务实的价值观和赚钱的头脑。但也可能因为家庭比较关注"物质"而忽略了情感交流——长大后你可能需要刻意练习表达感情。';
  } else if (monthShiShen === '食神' || monthShiShen === '伤官') {
    familyAtmosphere = `你的月柱为${monthShiShen}（${monthPillar.ganZhi}），食伤代表自由和创造力。你的家庭氛围偏向宽松自由——父母相对开明，不太约束你的天性。`;
    familyAtmosphere += monthShiShen === '食神'
      ? '食神的家庭氛围是温暖轻松的——你可能从小被比较温柔地对待，性格中也有随和的底色。'
      : '伤官的家庭氛围是"不拘一格"——父母可能比较有个性，或者家庭中有某种"叛逆"的氛围。你也因此养成了独立思考的习惯。';
  } else {
    familyAtmosphere = `月柱${monthPillar.ganZhi}代表你的成长环境。整体来看你的家庭氛围属于比较正常的范围——有温暖也有摩擦，有好日子也有小困难。这就是大多数普通家庭的写照。`;
  }

  // ===== 建议 =====
  const adviceItems: string[] = [];
  if (hasYearChong) {
    adviceItems.push('年柱被冲，和父母的缘分适合"距离美"——常回家看看但不必天天在一起。各自过好就是对彼此最好的交代');
  }
  if (biJieCount >= 3) {
    adviceItems.push('兄弟姐妹/密友之间在金钱合作上要提前约定好规则和边界，避免"因为感情好就不说清楚"，后面反而容易闹别扭');
  }
  if (monthShiShen === '七杀') {
    adviceItems.push('月柱七杀代表成长中压力较大，可能内心有些"小时候没被充分理解"的感受。成年后可以尝试和父母做一次坦诚的沟通——不是为了翻旧账，而是为了和解和放下');
  }
  if (!adviceItems.length) {
    // 基于月柱十神动态生成建议，而非万能句
    if (monthShiShen === '正印' || monthShiShen === '偏印') {
      adviceItems.push('你的家庭给了你充分的学习支持——回馈的最好方式不是汇款，而是把日子过好让他们放心；多和他们聊聊你的近况，比买礼物更能让他们开心');
    } else if (monthShiShen === '正财' || monthShiShen === '偏财') {
      adviceItems.push('你的家庭偏务实，感情表达可能不多——试着主动打破"都不说"的默契，一句谢谢、一个拥抱，家里氛围会大不一样');
    } else if (monthShiShen === '食神' || monthShiShen === '伤官') {
      adviceItems.push('你和父母更像朋友，这是难得的缘分——但别忘了他们也在变老，偶尔也让他们"被你需要"一下，长辈的价值感很重要');
    } else {
      adviceItems.push('和家人保持定期联系的习惯：固定一个日子打电话或回家吃饭——仪式感不需要贵，需要的是稳定');
    }
  }

  return { parentRelation, siblings, familyAtmosphere, advice: adviceItems.join('；') };
}

// 辅助：获取劫财所在的柱
function jieCaiPillars(pillars: PillarData[]): PillarData[] {
  return pillars.filter(p => p.shiShen === '劫财');
}

// ========== 5. 社交朋友分析 ==========
export function analyzeSocial(
  pillars: PillarData[],
  shenSha: { name: string; pillar: string }[],
  dayGan: string
): SocialAnalysis {
  const dayWx = TG_WX[dayGan];

  const biJianPs = findShiShenPillars(pillars, '比肩');
  const jieCaiPs = findShiShenPillars(pillars, '劫财');
  const shiShenPs = findShiShenPillars(pillars, '食神');
  const shangGuanPs = findShiShenPillars(pillars, '伤官');

  const biJieCount = biJianPs.length + jieCaiPs.length;
  const hasShiShang = shiShenPs.length > 0 || shangGuanPs.length > 0;
  const hasBiJian = biJianPs.length > 0;
  const hasJieCai = jieCaiPs.length > 0;

  // ===== 社交特质 =====
  let socialTrait = '';

  // 日主社交锚（10天干）
  const dayGanProfile = DAY_GAN_PROFILE[dayGan];
  // 命局主气锚
  const dominant = dominantShiShen(pillars);
  const dominantLead = dominant && SHISHEN_SIGNATURE[dominant.name]
    ? `${SHISHEN_SIGNATURE[dominant.name]}。`
    : '';

  if (hasShiShang && biJieCount >= 2) {
    const ssInfo = [...shiShenPs, ...shangGuanPs].map(p => `${p.shiShen}在${p.pillar}`).join('、');
    const bjInfo = [...biJianPs, ...jieCaiPs].map(p => `${p.shiShen}在${p.pillar}`).join('、');
    socialTrait = `${dominantLead}你的八字中食伤（${ssInfo}，代表口才和表达力）和比劫（${bjInfo}，代表朋友和圈子）都很旺。你在社交中是"核心人物"类型——有话题、有能量、有人缘。`;
    socialTrait += '在各种场合你都能自然融入，朋友有什么活动都喜欢叫上你。但要注意，社交应酬多了也会累——学会偶尔拒绝也是对自己好。';
    if (dayGanProfile) {
      socialTrait += `另外，${dayGanProfile.social}——这是你在热闹之外的真实底色。`;
    }
  } else if (hasShiShang) {
    const ssInfo = [...shiShenPs, ...shangGuanPs].map(p => `${p.shiShen}在${p.pillar}（${p.ganZhi}）`).join('、');
    socialTrait = `你的八字食伤较旺（${ssInfo}），代表你有不错的表达能力、才华和个人魅力。`;
    if (shiShenPs.length > 0 && shangGuanPs.length === 0) {
      socialTrait += '食神型的社交风格是"润物细无声"——你不是刻意去社交，但因为性格随和、有趣、让人觉得舒服，别人会主动想接近你。';
    } else if (shangGuanPs.length > 0) {
      socialTrait += '伤官型的社交风格是"锋芒毕露"——你有独到的见解和创意，说话有趣但有时候也容易得罪人。喜欢你的人很喜欢，不喜欢的人会觉得你太较真。';
    }
    socialTrait += '你不是那种靠"混脸熟"来社交的人，你是靠"内容"吸引人——做好自己的事情，社交网络会自然建立起来。';
    if (dayGanProfile) {
      socialTrait += `${dayGanProfile.social}。`;
    }
  } else if (biJieCount >= 2) {
    const bjInfo = [...biJianPs, ...jieCaiPs].map(p => `${p.shiShen}在${p.pillar}（${p.ganZhi}）`).join('、');
    socialTrait = `${dominantLead}你的八字比劫较旺（${bjInfo}），比劫代表同辈朋友、伙伴、团队。你讲义气、重感情，朋友圈子广，是那种"兄弟/姐妹需要帮忙立马就到"的类型。`;
    if (hasJieCai) {
      socialTrait += '但比劫多（特别是劫财多）也意味着朋友之间的界限有时不太清晰——你帮别人很多，但别人未必能同等回报。需要学会筛选真正值得深交的人。';
    }
    if (dayGanProfile) {
      socialTrait += `${dayGanProfile.social}。`;
    }
  } else {
    // 根据日主天干个性化分析（10种，替代原5行五行版）
    if (dayGanProfile) {
      socialTrait = `${dominantLead}${dayGanProfile.core}。${dayGanProfile.social}。`;
    } else {
      socialTrait = '你的社交风格比较自然随和——不是人群中最高调的那个，但有自己稳定的朋友圈子。';
    }
  }

  // ===== 朋友质量 =====
  let friendQuality = '';

  if (hasJieCai && biJieCount >= 2) {
    friendQuality = `你命中劫财较旺（${jieCaiPs.map(p => `${p.ganZhi}在${p.pillar}`).join('、')}），结交的朋友三教九流都有——朋友圈子广，但质量参差不齐。`;
    friendQuality += '劫财在金钱方面尤其要警惕——真心朋友帮助你，但也有些人会在利益面前变脸。不是让你怀疑所有人，而是提醒你在涉及钱财时要多一个心眼。借大钱出去的之前，想清楚"这笔钱就当送了"，能接受再借。';
  } else if (hasBiJian && biJieCount >= 2) {
    friendQuality = `你命中比肩较旺（${biJianPs.map(p => `${p.ganZhi}在${p.pillar}`).join('、')}），朋友以同辈同类人居多——学历背景、经济水平、三观比较接近。`;
    friendQuality += '比肩的朋友圈比较"同频"——大家聊得来、玩得开心，但可能缺少"互补性"。偶尔去接触一些完全不同类型的人，会给你带来新的视角和机会。';
  } else if (biJieCount === 1) {
    const bj = (biJianPs[0] || jieCaiPs[0]);
    friendQuality = `你命中${bj.shiShen}出现在${bj.pillar}（${bj.ganZhi}），代表你生命中有关键的好朋友或伙伴，虽然数量不多但质量很高。`;
    friendQuality += '你不轻易相信别人，但一旦认可了就是一辈子的朋友。这种交友策略在现代社会中其实很明智——交十个普通朋友不如有一个真朋友。';
  } else {
    friendQuality = '你的朋友不多但质量极高——你不太喜欢泛泛之交的应酬，宁愿一个人待着也不想应付无意义的社交。这在当代社会其实是非常健康的方式。';
    friendQuality += '朋友少不代表人缘差——你只是不把精力分散在浅层关系上。真正需要帮助的时候，你的朋友一定会站出来。';
  }

  // ===== 贵人类型 =====
  const hasTianYi = shenSha.some(s => s.name === '天乙贵人');
  const hasWenChang = shenSha.some(s => s.name === '文昌');
  const hasTaiJi = shenSha.some(s => s.name === '太极贵人');
  const hasFuXing = shenSha.some(s => s.name === '福星贵人');

  let nobleType = '';

  if (hasTianYi) {
    const tianYiItem = shenSha.find(s => s.name === '天乙贵人');
    const stage = getPillarLifeStage(tianYiItem?.pillar || '');
    nobleType = `你的天乙贵人出现在${tianYiItem?.pillar}（${stage}），代表你在${stage}遇到的"贵人型"人物对你的帮助最大。`;
    nobleType += '天乙贵人多半是比你年长、有社会地位或资源的人。可能以"上司""老师""前辈介绍人"的身份出现。你不需要刻意去找，但需要保持谦逊和学习的心——贵人喜欢帮助"值得帮的人"。';
  } else if (hasWenChang) {
    const wc = shenSha.find(s => s.name === '文昌');
    nobleType = `你的文昌贵人出现在${wc?.pillar}，代表老师和有学识的人是你命中的贵人。学术圈、专业圈、文化圈的人最容易帮到你。`;
    nobleType += '你的贵人运更多通过知识和专业能力来体现——在你深耕的领域里，总会有前辈愿意拉你一把。多在专业圈里输出有价值的内容，贵人会自然出现。';
  } else if (hasTaiJi) {
    nobleType = '你命带太极贵人——天生对哲学、命理、传统文化有缘分。你的贵人可能是"导师型"的人物——在你迷茫时给你指路的人。';
  } else if (hasFuXing) {
    nobleType = '你命带福星贵人——贵人运比较"散"但很实用。各行各业的人都可能帮你，不一定是很厉害的大人物，但总是在你需要的时候出现对的人。';
  } else {
    nobleType = '你的八字中没有特别突出的贵人星，但贵人运不是全靠命局——更多靠你自己的人际经营。多参加行业活动、多帮助别人、多输出自己的价值——贵人会随着你的"价值曝光"而出现。';
  }

  // ===== 合伙建议 =====
  let partnerAdvice = '';

  if (hasJieCai) {
    partnerAdvice = `你命带劫财（${jieCaiPs.map(p => `${p.ganZhi}在${p.pillar}`).join('、')}），合伙做生意要特别谨慎。劫财的意思是"有人分你的钱"——哪怕是好朋友，在利益面前人也可能变。`;
    partnerAdvice += '如果一定要合伙，建议：1）股份和职责白纸黑字写清楚；2）财务账目独立透明；3）找一个和你专业互补的合伙人（比如你懂技术就找懂市场的），而非和你做同样事情的合伙人。';
  } else if (hasBiJian && biJieCount >= 2) {
    partnerAdvice = '你比肩旺，合伙是可以的，但建议找"互补型"合伙人。比如你擅长研发就找擅长销售的——双方能力不重叠，少了竞争、多了合作。';
    partnerAdvice += '另外注意：朋友归朋友，生意归生意。合夥协议提前签好，以后反而不会伤感情。';
  } else {
    const wxPartner: Record<string, string> = {
      '木': '你日主为木，适合找五行属水（生你）或属木（同你）的合伙人——能滋养你而不是消耗你。避免和属金（克你）气太重的人深度绑定。',
      '火': '你日主为火，适合找五行属木（生你）或属火（同你）的合伙人。避免和属水（克你）气太强的人合作核心业务。',
      '土': '你日主为土，适合找五行属火（生你）或属土（同你）的合伙人。避免和属木（克你）的合伙人太多利益纠葛。',
      '金': '你日主为金，适合找五行属土（生你）或属金（同你）的合伙人。避免和属火（克你）的人合伙做压力大的事。',
      '水': '你日主为水，适合找五行属金（生你）或属水（同你）的合伙人。避免和属土（克你）的人深度合伙。',
    };
    partnerAdvice = wxPartner[dayWx] || '建议先从小范围合作试水，磨合好了再深度合伙。合夥前把各自的底线和预期说清楚，丑话说在前头反而省事。';
  }

  return { socialTrait, friendQuality, nobleType, partnerAdvice };
}

// ========== 人生阶段描述辅助函数 ==========

/** 构建每个人生阶段的描述 */
function buildLifeStageDesc(
  index: number,
  pillars: PillarData[],
  shenSha: { name: string; pillar: string; type: string }[]
): string {
  const p = pillars[index];
  const label = PILLAR_LABELS[index];
  const ss = p.shiShen;
  const ganZhi = p.ganZhi;
  const tgWx = TG_WX[p.tianGan];
  const dzWx = DZ_WX[p.diZhi];
  const stageShenSha = shenSha.filter(s => s.pillar === label);

  let desc = '';

  // 年柱 = 早年
  if (index === 0) {
    desc = `年柱${ganZhi}是你的人生根基。天干${p.tianGan}（${tgWx}）代表你的外在表现，地支${p.diZhi}（${dzWx}）代表你的家庭背景。`;
    if (ss === '正印') {
      desc += '年柱正印代表童年有长辈细心呵护，学习环境不错，小时候是"别人家的孩子"类型。';
    } else if (ss === '偏印') {
      desc += '年柱偏印代表你小时候可能受到特殊的培养——比如学艺术、学冷门技能，或者在家庭中有一个对你影响很大的长辈（可能是祖辈）。';
    } else if (ss === '正官') {
      desc += '年柱正官代表家庭规矩比较多，父母对你的管教比较严格。但正因为如此，你从小就养成了自律的习惯。';
    } else if (ss === '七杀') {
      desc += '年柱七杀代表早年环境有一定压力——可能家庭条件不是特别优渥，或者父母对你期望高、要求严。但这也让你很早熟、抗压能力强。';
    } else if (ss === '正财' || ss === '偏财') {
      desc += `年柱${ss}代表家庭经济条件相对稳定，父母重视物质基础，给你创造了不错的成长环境。`;
    } else if (ss === '食神') {
      desc += '年柱食神代表童年比较幸福快乐——家庭氛围宽松，你从小性格开朗，很有口福也很有创造力。';
    } else if (ss === '伤官') {
      desc += '年柱伤官代表你从小就有自己的想法和主见——可能不太"听话"，但很有创造力。需要引导而非压制。';
    } else {
      desc += '早年生活比较随性自然，这个阶段你的性格基本定型。';
    }
    if (stageShenSha.length > 0) {
      desc += `此阶段神煞：${stageShenSha.map(s => s.name).join('、')}，代表${stageShenSha.map(s => s.type === '吉' ? '吉星护佑' : s.type === '凶' ? '需加注意' : '有得有失').join('、')}。`;
    }
  }

  // 月柱 = 青年
  if (index === 1) {
    desc = `月柱${ganZhi}代表你的青壮年时期。天干${p.tianGan}（${tgWx}）是你对外打拼的武器，地支${p.diZhi}（${dzWx}）是你的内在资源。`;
    if (ss === '正官') {
      desc += '月柱正官是在事业上"守正出奇"的好配置——你在工作中给人靠谱、有责任感的印象，适合在公司或体制内稳步发展。';
    } else if (ss === '七杀') {
      desc += '月柱七杀代表事业上竞争激烈——你可能是"越战越勇"的类型，在高压环境中反而能超常发挥。创业者或销售型人才常有此配置。';
    } else if (ss === '正印') {
      desc += '月柱正印代表学习和成长机会多——你可能在青年时期遇到好老师或好领导，为后续发展打下坚实基础。';
    } else if (ss === '偏印') {
      desc += '月柱偏印代表你可能走"非典型"的职业路线——比如跨专业就业、自由职业、或者冷门行业。不走寻常路反而适合你。';
    } else if (ss === '正财') {
      desc += '月柱正财代表你在青年时期就能通过工作获得稳定收入。踏实做事、积累经验是这个阶段的重心。';
    } else if (ss === '偏财') {
      desc += '月柱偏财代表青年时期就有赚钱的头脑和机会——可能尝试过副业、投资或创业。但切记：先学稳再求快。';
    } else if (ss === '食神' || ss === '伤官') {
      desc += `月柱${ss}代表你的职业方向很可能与"创造"和"表达"相关——技术、艺术、内容创作都是不错的选择。`;
    } else if (ss === '比肩' || ss === '劫财') {
      desc += `月柱${ss}代表你在事业上需要"借力"——团队合作、或加入一个有前景的平台，比单打独斗更有效率。`;
    }
    if (stageShenSha.length > 0) {
      desc += `青壮年阶段神煞：${stageShenSha.map(s => s.name).join('、')}。`;
    }
  }

  // 日柱 = 中年
  if (index === 2) {
    desc = `日柱${ganZhi}是你人生的核心——日干代表你自己，日支代表你的另一半和内心世界。`;
    if (ss === '正官') {
      desc += '日坐正官代表中年事业和家庭责任并重——你在这个阶段可能担任管理职务或承担更大的家庭责任。压力大，但也是最有成就感的时期。';
    } else if (ss === '七杀') {
      desc += '日坐七杀代表中年压力会比较大——事业上的挑战、家庭的负担可能让你觉得"有点喘不过气"。但熬过去之后回头看，这恰恰是你成长最快的时期。';
    } else if (ss === '正财') {
      desc += '日坐正财代表中年财运不错——这20年是你财富积累的黄金期。注意平衡工作和家庭，别因为赚钱忽略了家人。';
    } else if (ss === '偏财') {
      desc += '日坐偏财代表中年可能有不错的投资或副业机遇——但偏财不稳定，赚了记得存住。';
    } else if (ss === '正印') {
      desc += '日坐正印代表中年精神层面会比较充实——可能在这期间有进修、考学或转型的机会。精神和物质并重。';
    } else if (ss === '偏印') {
      desc += '日坐偏印代表中年可能会有"出奇制胜"的机会——比如转型到一个冷门但高价值的领域，或者依靠特殊技能脱颖而出。';
    } else if (ss === '食神') {
      desc += '日坐食神代表中年生活相对惬意——事业稳定、家庭和睦，有时间和精力享受生活。';
    } else if (ss === '伤官') {
      desc += '日坐伤官代表中年可能有"二次创业"或"转型"的冲动——不安于现状，想做一些不一样的事。但转型有风险，建议做足准备再行动。';
    } else if (ss === '比肩' || ss === '劫财') {
      desc += `日坐${ss}代表中年可能需要和更多人协作——团队管理、合伙人关系是这个阶段的重点。`;
    }
    if (stageShenSha.length > 0) {
      desc += `此阶段神煞：${stageShenSha.map(s => s.name).join('、')}，需留意其影响。`;
    }
  }

  // 时柱 = 晚年
  if (index === 3) {
    desc = `时柱${ganZhi}代表你的晚年运势和子女状况。${p.diZhi}（${dzWx}）为子女宫。`;
    if (ss === '食神') {
      desc += '时柱食神是晚运很好的标志——子女有才艺、有口福，晚年生活惬意，不用为吃穿发愁。是一个"有福之人"的配置。';
    } else if (ss === '伤官') {
      desc += '时柱伤官代表子女可能有比较强的个性——有主见、有创造力，但也需要你多包容他们的"不一样"。';
    } else if (ss === '正印') {
      desc += '时柱正印代表晚年有依靠——子女孝顺、或有精神寄托（读书、学习、信仰），精神状态好。';
    } else if (ss === '偏印') {
      desc += '时柱偏印代表晚年可能有独特的兴趣爱好——比如研究传统文化、命理、养生等。精神世界丰富。';
    } else if (ss === '正财' || ss === '偏财') {
      desc += `时柱${ss}代表晚年经济状况不错——要么有自己的积蓄，要么子女经济条件好能帮到你。但${ss === '偏财' ? '偏财' : '正财'}也提醒你不要在晚年做高风险投资。`;
    } else if (ss === '正官') {
      desc += '时柱正官代表子女比较有出息——可能在正规单位工作，让你比较放心。晚年生活质量不错。';
    } else if (ss === '七杀') {
      desc += '时柱七杀代表晚年仍需注意健康和压力管理——虽然不用操心太多，但身体方面要多加保养。';
    } else {
      desc += '晚年宜多注意健康保养，保持积极乐观的心态过好每一天。';
    }
    if (stageShenSha.length > 0) {
      desc += `晚年神煞：${stageShenSha.map(s => `${s.name}(${s.type})`).join('、')}。`;
    }
  }

  return desc;
}

// ========== 6. 综合运势总览 ==========
export function analyzeFortuneOverview(
  pillars: PillarData[],
  dayGan: string,
  strengthLevel: string,
  yongShen: string[],
  shenSha: { name: string; pillar: string; type: string }[],
  dayun: { startAge: number; steps: Array<{ ganZhi: string }> },
  birthYear: number,
  wxStats: Record<string, { count: number; level: string }>
): FortuneOverview {
  const dayWx = TG_WX[dayGan];
  const dayZhi = pillars[2].diZhi;

  // ===== 关键词 =====
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
  const jiangXing = shenSha.find(s => s.name === '将星');
  if (jiangXing) keywords.push('领导才能');
  const huaGai = shenSha.find(s => s.name === '华盖');
  if (huaGai) keywords.push('慧眼独具');
  const yiMa = shenSha.find(s => s.name === '驿马');
  if (yiMa) keywords.push('行走四方');

  if (keywords.length < 3) {
    const wxKw: Record<string, string> = {
      '木': '正直成长', '火': '热情进取', '土': '稳重踏实', '金': '刚毅果决', '水': '智慧灵动',
    };
    keywords.push(wxKw[dayWx] || '独一无二');
  }
  const finalKeywords = keywords.slice(0, 4);

  // ===== 人生阶段 =====
  const lifeStages = [
    {
      stage: `童年/少年 (0-16岁) —— 年柱${pillars[0].ganZhi}`,
      desc: buildLifeStageDesc(0, pillars, shenSha),
    },
    {
      stage: `青年 (17-32岁) —— 月柱${pillars[1].ganZhi}`,
      desc: buildLifeStageDesc(1, pillars, shenSha),
    },
    {
      stage: `中年 (33-48岁) —— 日柱${pillars[2].ganZhi}`,
      desc: buildLifeStageDesc(2, pillars, shenSha),
    },
    {
      stage: `晚年 (49岁+) —— 时柱${pillars[3].ganZhi}`,
      desc: buildLifeStageDesc(3, pillars, shenSha),
    },
  ];

  // ===== 一生课题 =====
  const sorted = Object.entries(wxStats).sort((a, b) => b[1].count - a[1].count);
  const strongest = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];
  const keDayWx = WX_BEI_KE[dayWx];

  let lifeLesson = `日主${dayGan}（${dayWx}），${strengthLevel}。` +
    `你的八字中「${strongest}」最旺而「${weakest}」最弱。你一生的修行方向是学会平衡这种能量差：`;

  if (keDayWx && wxStats[keDayWx]?.level === '旺') {
    lifeLesson += `「${keDayWx}」克制你的日主「${dayWx}」，代表你的人生中会不断遇到挑战和压力来"淬炼"你。这不是坏事——压力让你成长，让你变得更坚韧。`;
    lifeLesson += `但同时，不要忘记给自己留出恢复的空间。${dayWx}是你最核心的能量，需要被保护和滋养。`;
  }

  if (strongest[0] === strongest[0] && weakest[0] === weakest[0]) {
    const wxQuality: Record<string, string> = {
      '木': '仁爱和包容心',
      '火': '热情和行动力',
      '土': '诚信和稳重感',
      '金': '正义和决断力',
      '水': '智慧和灵活性',
    };
    lifeLesson += `具体来说：培养「${weakest}」对应的${wxQuality[weakest] || '品质'}，同时注意不要被「${strongest}」的${wxQuality[strongest] || '特质'}主导过头。`;
  }

  // 如果日主和克己的五行旺
  if (strengthLevel === '身弱') {
    lifeLesson += `因为你日主偏弱，人生的课题是"先站稳再走远"——不要在根基不稳时盲目扩张。`;
  } else if (strengthLevel === '身强') {
    lifeLesson += `因为你日主偏强，人生的课题是"学会释放和分享"——把你的能量投入到有价值的事情上，而不是憋着较劲。`;
  } else {
    lifeLesson += `你的日主中和平衡，人生的课题是"保持平衡"——在进取和休息之间、在付出和接受之间找到自己的节奏。`;
  }

  // ===== 本命盘指纹（让每次排盘都不同） =====
  // 1) 列出日主关联十神
  const allShiShenSet = new Set(pillars.map(p => p.shiShen).filter(Boolean));
  const ssList = Array.from(allShiShenSet);
  // 2) 找出特定神煞（最有代表性的 3 个）
  const notableShenSha = shenSha
    .filter(s => ['天乙贵人', '文昌', '将星', '驿马', '桃花', '华盖', '禄神', '天德贵人', '月德贵人', '太极贵人'].includes(s.name))
    .slice(0, 3)
    .map(s => `${s.name}（${s.pillar}）`);
  // 3) 整体阴阳分布
  const yangCount = pillars.filter(p => TG_YIN_YANG[p.tianGan] === '阳').length;
  const yinCount = 4 - yangCount;
  const yinYangDesc = yangCount > yinCount ? '阳气偏盛' : yinCount > yangCount ? '阴气柔和' : '阴阳平衡';
  // 4) 拼指纹
  const signature =
    `四柱干支为「${pillars.map(p => p.ganZhi).join(' · ')}」，格局${strengthLevel}；` +
    `命中显${ssList.length}种十神（${ssList.slice(0, 4).join('、')}），${yinYangDesc}。` +
    (notableShenSha.length > 0 ? `显著神煞：${notableShenSha.join('、')}，这些吉星/特点会在不同人生阶段被激活。` : '无特别显著的神煞，命局靠十神与五行平衡自主运行。') +
    `整体来看，这是属于"${strengthLevel}型 + ${strongest}旺 + ${dayWx}日主"的一张盘——`;
  const signatureHints: Record<string, string> = {
    '身强': '有能量、有主见，适合做开拓性的事。',
    '身弱': '敏感细腻、靠协作取胜，适合做"加法"而非"乘法"。',
    '中和': '可塑性强，能在不同环境切换角色，是"全能选手"的底子。',
  };
  const fullSignature = signature + (signatureHints[strengthLevel] || '是独特的一张命盘。');


  // ===== 幸运元素 =====
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

  // ===== 贵人属相 =====
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
    luckyZodiac: Array.from(new Set(luckyZodiac)),
    signature: fullSignature,
  };
}

