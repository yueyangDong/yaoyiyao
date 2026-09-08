import type { PillarData } from '../pages/Bazi';

// ========== 八字六大领域深度解读（干支 + 十神 + 神煞分层白话） ==========
// 结构对标紫微四化深度解读：干支密码 → 神煞点睛 → 暗线与矛盾 → 开运建议

export interface DomainDeepSection {
  heading: string;
  text: string;
}

export interface DomainDeepReading {
  domainKey: 'love' | 'career' | 'health' | 'family' | 'social';
  sections: DomainDeepSection[];
}

export interface DomainDeepInput {
  pillars: PillarData[];
  shenSha: { name: string; pillar: string }[];
  gender: string;
  dayGan: string;
  strengthLevel?: string;
  yongShen: string[];
  relations: { type: string; desc: string }[];
}

// ---------- 工具 ----------
const PLAIN: Record<string, string> = { '年柱': '早年与祖上', '月柱': '青年与父母兄弟', '日柱': '中年与自我配偶', '时柱': '晚年与子女' };
const YONG_SHEN_LIFE: Record<string, string> = {
  '木': '多亲近绿植、早起晒晨光、穿青绿色系，办公学习朝东，肝气舒畅则思路顺',
  '火': '多晒太阳、运动出汗、穿红色系，重要事放上午办，保持乐观是补火的关键',
  '土': '规律吃饭、爬山徒步、接触陶艺园艺，黄色棕色系随身，稳定作息就是你的吉',
  '金': '秋季多做决断、戴金属饰品、白金银色系，书桌朝西，说话算话会积攒金气',
  '水': '多喝水、游泳泡澡、蓝黑色系，重要决策放夜深人静时，常临水边行走',
};

function findSha(input: DomainDeepInput, matcher: (n: string) => boolean): { name: string; pillar: string }[] {
  return input.shenSha.filter((s) => matcher(s.name));
}
function findShaExact(input: DomainDeepInput, names: string[]): { name: string; pillar: string }[] {
  return input.shenSha.filter((s) => names.includes(s.name));
}
function dayPillar(pillars: PillarData[]): PillarData {
  return pillars[2];
}
/** 日支十神主气 */
function dayZhiShiShen(pillars: PillarData[]): string {
  const raw = dayPillar(pillars).shiShenZhi || '';
  return raw.split('/')[0] || '';
}
/** 月支藏干主气十神（格局发动机） */
function monthZhiShiShen(pillars: PillarData[]): string {
  const raw = pillars[1]?.shiShenZhi || '';
  return raw.split('/')[0] || '';
}
/** 日支是否逢冲/合/刑/害（借 relations 文本判断） */
function dayZhiRelationTypes(relations: { type: string; desc: string }[]): string[] {
  const relDescs = relations.filter((r) => r.desc.includes('日柱') || r.desc.includes('日支')).map((r) => r.desc);
  const types: string[] = [];
  for (const t of ['冲', '合', '刑', '害']) {
    if (relDescs.some((d) => d.includes(t))) types.push(t);
  }
  return types;
}
/** 柱位列表转可读文本："月柱（庚午）" */
function fmtPillars(list: { pillar: string; ganZhi: string }[]): string {
  return list.map((p) => `${p.pillar}${p.ganZhi}`).join('、');
}

// ---------- 领域语境神煞文案（命带才写） ----------
const LOVE_SHA: Record<string, string> = {
  '桃花': '魅力在，缘分开端多——你的感情多始于"被吸引"，只是要分清心动与合适',
  '红鸾': '婚缘正桃花，恋爱结婚信号强，遇到对的人别拖',
  '天喜': '婚恋自带喜气，感情进展常伴随家中喜事',
  '红艳': '异性缘旺、社交场合自带光，已婚则要把握分寸',
  '孤辰': '内心有一块"独处区"，越亲密越容易关上门——学会把情绪说出口，比等对方猜强',
  '寡宿': '感情里偏清冷，容易让人觉得"不好接近"——主动表达温度，是你要练的功课',
  '阴差阳错': '感情常在关键时刻"错位"——时机不对、家人有意见、错过又回头，多沟通能解',
  '孤鸾煞': '感情路上聚少离多或晚婚倾向，晚婚反而更稳，择偶重内在契合',
  '八专': '感情投入容易过深过猛，爱起来不留退路——给自己留边界，别为爱透支',
  '魁罡': '个性强、眼光高，感情中"服软不服硬"，遇到能镇得住你又真心的人是福',
  '十灵日': '直觉敏锐，感情里一眼看穿人心——但别用直觉代替沟通',
};
const CAREER_SHA: Record<string, string> = {
  '天乙贵人': '一生贵人运强，职场遇坎总有人搭手——维护好师长与前辈，是你的隐形资产',
  '三奇': '罕见贵格，思维与众不同，事业上常有破格提拔与奇遇，适合走差异化路线',
  '将星': '天生领导命，能独当一面拍板决策——往管理岗走，别浪费统御天赋',
  '驿马': '动中求财，出差、外派、跨区域业务反而旺你，长期坐办公室会"闷住"',
  '华盖': '适合专业深耕而非人情场，技术、学术、设计、玄学类领域能出成绩',
  '禄神': '自带食禄，工资财稳定，衣食无忧——适合大平台、正规军路线',
  '金舆': '富贵之车，容易随事业升级享受水涨船高，仪容仪表也为你加分',
  '魁罡': '果断刚毅，执行力强，适合军警、执法、外科、竞技类硬核赛道',
  '国印贵人': '与体制、公章有缘，考公考编、大机构任职有优势',
  '进神日': '做事有始有进、节节攀升，事业上认准的事别轻易换赛道',
  '十恶大败': '传统认为禄入空亡——忌孤注一掷的投机，踏实积累反而走得远',
  '金神': '刚毅果决才华外露，喜火炼——技术、工程、竞技类领域发光，忌讳安逸度日',
  '福星贵人': '一生少灾少难，职场虽不一定大富，但安稳知足，遇事总有底线托着',
  '文昌': '考试运文采佳，考证、学历、文书类晋升通道对你格外友好',
  '学堂': '学新东西快，适合持续深造——学历和证书会直接变现',
  '词馆': '口才笔才俱佳，适合文职、内容、法务、谈判类工作',
  '太极贵人': '对哲学玄学有天赋，也主贵人提携，研究型路线有潜力',
};
const HEALTH_SHA: Record<string, string> = {
  '羊刃': '肝胆之气过旺，注意血压、炎症与外伤——运动宜泄不宜堵，定期体检',
  '飞刃': '羊刃之对冲，意外磕碰信号——开车骑行守规矩，利器要小心',
  '流霞': '主失血、手术之象——女命生产注意安全，男命防酒色伤身，避免高危活动',
  '灾煞': '注意安全底线：不冒险、不酒驾、极端天气少出门，买好保险是理性选择',
  '劫煞': '破财兼耗身——疲劳是它的入口，别长期熬夜硬扛',
  '丧门': '注意家中长辈健康，也提醒自己别过度操办忧愁之事伤神',
  '吊客': '小病小灾信号，别拖——小症状早检查早安心',
  '披麻': '易因家事忧心伤神，情绪对免疫的影响比你想的大',
  '天罗地网': '易受约束、心气不顺——保持规律作息，别把自己"网"进执念里',
  '四废': '天生体质偏弱、精力易不足——以养为主：早睡、补养、别硬拼消耗战',
  '天医': '自愈力强，也适合了解医疗养生知识——身体会用得好的人',
  '天赦': '逢凶化吉的体质底子，大病概率低——但别拿好运赌作息',
};
const FAMILY_SHA: Record<string, string> = {
  '空亡': '所落宫位的人事易"有名无实"——年柱空亡祖上缘薄，月柱空亡与父母聚少离多，日柱空亡婚姻宜多经营，时柱空亡晚岁宜早规划',
  '孤辰': '与家人沟通偏少，亲情在心口难开——节日多回家，多打一个电话',
  '寡宿': '对家人清冷、报喜不报忧——家人要的不是你的成就，是你的消息',
  '元辰': '主破耗与不顺，家中钱财往来要清爽，亲情账算清楚反而不伤感情',
  '天德': '祖上有德，家中逢难有解——这份庇荫也值得你传下去',
  '月德': '家风温和，与母亲缘分偏厚，家庭是你能量补给站',
  '丧门': '流年遇之多关心长辈身体，重要体检别省',
  '吊客': '家人健康的小警钟，尤其是长辈的慢病管理',
  '披麻': '家中忧愁事的提示——陪伴就是最好的化解',
  '勾绞': '家事易扯皮纠缠，财产分配、家务分工提前说清楚',
};
const SOCIAL_SHA: Record<string, string> = {
  '华盖': '独处型社交——朋友不用多，灵魂共鸣的二三子足矣，孤独是你的充电方式',
  '驿马': '朋友遍布远方，人生重要的机会常来自外地朋友与旅途相识',
  '天乙贵人': '朋友圈质量高，关键时刻总有"大佬"拉一把——记住还人情',
  '福星贵人': '人缘温和稳定，虽不八面玲珑，但人人觉得你可靠',
  '天厨贵人': '饭局缘分好——吃喝之间谈成事，是你的社交武器',
  '亡神': '心思深、城府稳，朋友觉得你"看不透"——适当自我暴露，关系反而更近',
  '勾绞': '易被卷入是非拉扯——站队之前先想清楚，果断切割消耗型关系',
  '劫煞': '注意因朋友破财——借钱合伙，白纸黑字',
};

// ---------- 日支十神（夫妻宫）爱情语境 ----------
const DAY_ZHI_LOVE: Record<string, string> = {
  '正财': '妻星入妻宫（男命），你把伴侣放在"自己人"的位置，成家后财运反而更顺；女命则婚后善持家、务实过日',
  '偏财': '夫妻宫坐偏财，感情自带"活水"——容易遇到条件不错或性格洒脱的伴侣，但也要守住正缘、少招偏缘',
  '正官': '夫星入妻宫（女命），配偶正直有担当，婚姻是你会认真经营的正事；男命则自律顾家，是靠谱型伴侣',
  '七杀': '夫妻宫坐七杀，感情浓烈带"张力"——容易被强势有魅力的人吸引，爱得深也累得快，择偶要避开控制欲过强的人',
  '正印': '夫妻宫坐正印，渴望被照顾、找"治愈系"伴侣——对方多半温柔包容，但注意别把对方当妈/当爸用',
  '偏印': '夫妻宫坐偏印，感情上精神需求高，需要一个懂你"怪"的人；亲密关系中容易想太多，安全感要自己先立住',
  '比肩': '夫妻宫坐比肩，伴侣像战友——平等、并肩、有话直说；但两个人都硬时容易顶起来，家不是讲输赢的地方',
  '劫财': '夫妻宫坐劫财，感情里"争夺感"强——容易因钱、因家人产生摩擦；财务透明是你们婚姻的稳定器',
  '食神': '夫妻宫坐食神，婚姻生活有滋有味——吃喝玩乐都是你们的相处语言，找一个热爱生活的人你会很幸福',
  '伤官': '夫妻宫坐伤官，对伴侣要求高、嘴上不饶人——你欣赏才华横溢的人，但记得夸奖比挑剔更能留住一个人',
};

// ---------- 月令十神（格局发动机）事业语境 ----------
const MONTH_SHI_SHEN_CAREER: Record<string, string> = {
  '正官': '月令正官——规则内取胜的命：考试、考编、大厂、晋升通道都适合你，名声和职位是你的安全感来源',
  '七杀': '月令七杀——高压高成长的命：越有挑战的环境越出你的成绩，适合竞争性行业；但要学会给自己"泄压"',
  '正财': '月令正财——细水长流型的财：适合稳定收入+复利积累，一步一个脚印的生意最稳',
  '偏财': '月令偏财——活水财：适合业务、贸易、投资等流动性强的进财方式，人脉就是你的钱脉',
  '食神': '月令食神——才华变现型：内容、餐饮、教育、创作都是你的赛道，把热爱做成产品就是你的财路',
  '伤官': '月令伤官——技术+创意吃饭：专业能力是你的铁饭碗，但要注意职场表达，锋芒配成绩才是王牌',
  '正印': '月令正印——凭资历与学问立身：教育、文化、体制、研究类领域如鱼得水，名誉是你的隐形简历',
  '偏印': '月令偏印——冷门赛道天才：编程、设计、玄学、心理等"非常规"领域容易出圈，别逼自己走大众路线',
  '比肩': '月令比肩——独立型选手：合伙要谨慎，独立执业、技术入股、小而美的模式最适合你',
  '劫财': '月令劫财——敢闯敢拼但防破财：行动力是你的本钱，财务管理是必修课，现金为王',
};

// ---------- 五行健康 ----------
const WX_HEALTH: Record<string, { organ: string; advice: string }> = {
  '木': { organ: '肝胆与神经系统', advice: '情绪是肝的镜子——少熬夜、多伸展、疏解怒气' },
  '火': { organ: '心血管与眼睛', advice: '心静自然凉——控制咖啡因、注意心率与睡眠质量' },
  '土': { organ: '脾胃与消化', advice: '三餐规律是第一药——少生冷、细嚼慢咽、饭后散步' },
  '金': { organ: '肺与呼吸道、皮肤', advice: '肺喜润恶燥——秋季注意呼吸道，戒烟限酒、多做深呼吸' },
  '水': { organ: '肾与泌尿、内分泌', advice: '肾主藏精——节欲保精、不憋尿、冬季注意保暖' },
};

// ---------- 日主五行体质底色 ----------
const WX_BODY_BASE: Record<string, string> = {
  '木': '肝胆气机为主——精力恢复快、生长代谢旺盛，但情绪直接，怒伤肝是你的第一忌',
  '火': '心血管与心神为主——体温偏高、精力充沛，但易上火失眠，静养心神是关键',
  '土': '脾胃运化为主——体质厚实耐造，但消化系统是你最敏感的反馈器，饮食规律第一',
  '金': '肺气与皮毛为主——呼吸道、皮肤容易打头阵出问题，肺喜润恶燥要常记',
  '水': '肾水与内分泌为主——先天肾气充盈与否直接体现在精力与腰膝，节律作息是养肾根本',
};

// ---------- 生成器 ----------
export function generateDomainDeepReadings(input: DomainDeepInput): DomainDeepReading[] {
  const out: DomainDeepReading[] = [];
  const { pillars, gender, dayGan, yongShen } = input;
  const dp = dayPillar(pillars);
  const dayZhiShiShenName = dayZhiShiShen(pillars);
  const monthShiShen = monthZhiShiShen(pillars);
  const dayRelTypes = dayZhiRelationTypes(input.relations);
  const yongText = yongShen.map((w) => YONG_SHEN_LIFE[w]).filter(Boolean);
  const yongShort = yongShen.join('、');

  // ===== 爱情婚姻 =====
  const loveSections: DomainDeepSection[] = [];
  loveSections.push({
    heading: '夫妻宫的底牌（干支密码）',
    text: `你的日柱是${dp.ganZhi}，日支（夫妻宫）坐${dayZhiShiShenName}——${DAY_ZHI_LOVE[dayZhiShiShenName] || '夫妻宫藏着你对亲密关系最真实的态度'}。`,
  });
  const loveShas = findShaExact(input, Object.keys(LOVE_SHA));
  if (loveShas.length > 0) {
    loveSections.push({
      heading: '神煞点睛（感情的暗号）',
      text: loveShas.map((s) => `【${s.name}·${s.pillar}】${LOVE_SHA[s.name] || ''}（${PLAIN[s.pillar] || ''}）。`).join(''),
    });
  } else {
    loveSections.push({
      heading: '神煞点睛（感情的暗号）',
      text: '感情宫位无桃花孤煞——你的姻缘走"稳"字路线：不靠浪漫邂逅靠日常相处，越踏实的关系越长久。',
    });
  }
  // 暗线
  const loveTension: string[] = [];
  if (dayRelTypes.includes('冲')) loveTension.push('日支逢冲，夫妻宫不稳——聚少离多或观念冲突是常态课题，"搬出去冷静"不如"说开了再睡"');
  if (dayRelTypes.includes('合')) loveTension.push('日支逢合，夫妻缘分深但也要防"合走"——第三方（包括双方父母）介入易搅动关系');
  if (dayRelTypes.includes('刑')) loveTension.push('日支逢刑，容易因细节积累怨气——小事当面说，别攒');
  if (dayRelTypes.includes('害')) loveTension.push('日支逢害，亲密中易有暗伤——翻旧账是你们的雷区，就事论事');
  const zhengYuanExtra = gender === 'male'
    ? findShaExact(input, ['桃花']).length > 0 && pillars.some((p) => p.shiShen === '偏财')
    : findShaExact(input, ['桃花']).length > 0 && pillars.some((p) => p.shiShen === '七杀');
  if (zhengYuanExtra) loveTension.push('命带桃花且偏缘星同现，正缘与烂桃花会同时出现——"被追得很紧"不等于"合适"，留时间观察人品');
  loveSections.push({
    heading: '感情暗线（虚实对决）',
    text: loveTension.length > 0
      ? `${loveTension.join('；')}。`
      : `你的夫妻宫没有明显的冲刑害——感情底子是稳的，课题不在"有没有矛盾"，而在"别让平淡磨掉了表达"。`,
  });
  loveSections.push({
    heading: '经营之道',
    text: `喜用神为${yongShort}——${yongText[0] || '顺应喜用五行安排生活'}。感情上，约会选对你们"旺"的环境；吵架时先处理情绪再处理事情。${findShaExact(input, ['红鸾', '天喜']).length > 0 ? '命带红鸾天喜，遇到对的人时别犹豫，是你的就是你的。' : ''}`,
  });
  out.push({ domainKey: 'love', sections: loveSections });

  // ===== 事业财运 =====
  const careerSections: DomainDeepSection[] = [];
  careerSections.push({
    heading: '事业格局的发动机（月令十神）',
    text: `月令（${pillars[1]?.ganZhi || ''}）藏干主气为${monthShiShen}——${MONTH_SHI_SHEN_CAREER[monthShiShen] || '你的事业底盘由月令定调'}`,
  });
  const careerShas = findShaExact(input, Object.keys(CAREER_SHA))
    .concat(findSha(input, (n) => n.includes('三奇')).map((s) => ({ ...s, name: '三奇' })));
  if (careerShas.length > 0) {
    careerSections.push({
      heading: '神煞点睛（职场的底牌）',
      text: careerShas.map((s) => `【${s.name}·${s.pillar}】${CAREER_SHA[s.name] || ''}（${PLAIN[s.pillar] || ''}）。`).join(''),
    });
  }
  // 财富的形状
  const zhengCai = pillars.filter((p) => p.shiShen === '正财');
  const pianCai = pillars.filter((p) => p.shiShen === '偏财');
  const biJie = pillars.filter((p) => p.shiShen === '劫财' || p.shiShen === '比肩');
  const moneyLines: string[] = [];
  if (zhengCai.length > 0) moneyLines.push(`正财在${fmtPillars(zhengCai)}——工资财、稳定进项是基本盘`);
  if (pianCai.length > 0) moneyLines.push(`偏财在${fmtPillars(pianCai)}——灵活财、机会财可锦上添花`);
  if (moneyLines.length === 0) moneyLines.push('命局财星不透——你的财富模式是"先有本事再有钱"，专业能力到位财自然来');
  if (biJie.length > 0) moneyLines.push(`比劫在${fmtPillars(biJie)}——同行朋友分财之象，合伙与借贷务必立字据`);
  careerSections.push({ heading: '财富的形状', text: `${moneyLines.join('；')}。` });
  careerSections.push({
    heading: '发力建议',
    text: `喜用神为${yongShort}——${yongText[0] || ''}。${findSha(input, (n) => n.includes('驿马')).length > 0 ? '驿马在命，主动出击、多走动多见人，机会在路上。' : '你的机会在深耕——选定赛道至少沉淀三年再评值不值得。'}`,
  });
  out.push({ domainKey: 'career', sections: careerSections });

  // ===== 身体健康 =====
  const healthSections: DomainDeepSection[] = [];
  healthSections.push({
    heading: '体质的底色（日主看先天）',
    text: `日主${dayGan}（${TG_WX_LOCAL[dayGan] || ''}）——${WX_BODY_BASE[TG_WX_LOCAL[dayGan]] || '体质由五行属性定调'}${input.strengthLevel ? `；当前日主偏${input.strengthLevel.includes('弱') ? '弱，精力储备偏紧，以养为主、运动宜温和渐进' : '强，代谢旺精力足，但注意别把好底子当成透支的资本'}` : ''}。`,
  });
  const healthShas = findShaExact(input, Object.keys(HEALTH_SHA));
  healthSections.push({
    heading: '神煞警示灯（先看命带什么）',
    text: healthShas.length > 0
      ? healthShas.map((s) => `【${s.name}·${s.pillar}】${HEALTH_SHA[s.name] || ''}`).join('')
      : '命局无羊刃飞刃流霞等血光灾煞之星——体质底子平顺，健康主要取决于作息与心态，别仗着没警示牌就透支。',
  });
  // 五行短板：找四柱五行中最缺/最弱的一行
  const wxCount: Record<string, number> = {};
  for (const p of pillars) {
    for (const ch of p.ganZhi) {
      const wx = TG_WX_LOCAL[ch];
      if (wx) wxCount[wx] = (wxCount[wx] || 0) + 1;
    }
  }
  const allWx = ['木', '火', '土', '金', '水'];
  const weakest = allWx.filter((w) => (wxCount[w] || 0) === Math.min(...allWx.map((x) => wxCount[x] || 0)));
  const weakInfo = weakest.map((w) => `${w}（${WX_HEALTH[w]?.organ || ''}偏弱——${WX_HEALTH[w]?.advice || ''}）`).join('；');
  healthSections.push({
    heading: '五行短板（藏干点出的系统）',
    text: `四柱五行分布中${weakest.join('、')}最弱——${weakInfo}。${input.strengthLevel ? `日主偏${input.strengthLevel.includes('弱') ? '弱' : '强'}，${input.strengthLevel.includes('弱') ? '以养为主、运动宜温和' : '代谢旺精力足，注意别过劳透支'}。` : ''}`,
  });
  healthSections.push({
    heading: '养生方案（喜用神开方）',
    text: `喜用神为${yongShort}——${yongText.slice(0, 2).join('；')}。规律作息大于一切补品，体检按年做，情绪管理是养生的上半场。`,
  });
  out.push({ domainKey: 'health', sections: healthSections });

  // ===== 家庭亲情 =====
  const familySections: DomainDeepSection[] = [];
  // 父母宫：月柱天干十神（偏财=父 正印=母 男命；女命正财=父 偏印=母）
  const fatherStar = gender === 'male' ? '偏财' : '正财';
  const motherStar = gender === 'male' ? '正印' : '偏印';
  const fatherP = pillars.filter((p) => p.shiShen === fatherStar);
  const motherP = pillars.filter((p) => p.shiShen === motherStar);
  familySections.push({
    heading: '六亲宫位的温度（干支密码）',
    text: `${fatherP.length > 0 ? `父星（${fatherStar}）在${fmtPillars(fatherP)}，父亲对你影响${fatherP.some((p) => p.pillar === '月柱') ? '深、常伴左右' : '偏理性或聚少离多'}` : '父星不透，与父亲的缘分偏"意会型"，爱在行动不在言语'}；${motherP.length > 0 ? `母星（${motherStar}）在${fmtPillars(motherP)}，${motherP.some((p) => p.pillar === '月柱') ? '母亲照顾细致、连接紧密' : '与母亲缘深但不黏腻'}` : '母星不透，与母亲交流偏含蓄，主动一点会打开很多'}。`,
  });
  const familyShas = findShaExact(input, Object.keys(FAMILY_SHA));
  if (familyShas.length > 0) {
    familySections.push({
      heading: '神煞点睛（亲缘的暗号）',
      text: familyShas.map((s) => `【${s.name}·${s.pillar}】${FAMILY_SHA[s.name] || ''}。`).join(''),
    });
  } else {
    familySections.push({
      heading: '神煞点睛（亲缘的暗号）',
      text: '六亲宫位无孤辰寡宿空亡等缘薄之煞——你的家庭缘分底子是厚的：亲情不靠节日突击，日常一条消息、一顿家常饭就是维护。',
    });
  }
  familySections.push({
    heading: '亲缘的暗线',
    text: `${familyShas.some((s) => ['孤辰', '寡宿', '空亡'].includes(s.name)) ? '命带孤辰/寡宿/空亡，亲情表达是你要练的功课——家人之间最怕"都爱着但都不说"。' : '你的六亲缘分没有大煞冲撞——家庭是稳定的后盾，别因为忙碌把后盾冷落了。'}${findShaExact(input, ['天德', '月德']).length > 0 ? '天月二德护家，家中逢难有解，家风正则代代顺。' : ''}`,
  });
  familySections.push({
    heading: '相处建议',
    text: `喜用神为${yongShort}——带家人一起做喜用五行的事（${yongText[0] || '顺应五行安排'}），比送礼更能拉近关系。长辈的健康问题按年排查，家事账目提前说清。`,
  });
  out.push({ domainKey: 'family', sections: familySections });

  // ===== 社交朋友 =====
  const socialSections: DomainDeepSection[] = [];
  const biJianP = pillars.filter((p) => p.shiShen === '比肩');
  const shiShenP = pillars.filter((p) => p.shiShen === '食神');
  const shangGuanP = pillars.filter((p) => p.shiShen === '伤官');
  socialSections.push({
    heading: '社交风格（十神给的底色）',
    text: `${biJianP.length > 0 ? `比肩在${fmtPillars(biJianP)}——朋友圈里有"并肩作战"的伙伴，你的社交偏重义气与同频` : '比肩不显——你社交偏独立型，不需要人多，但要人对'}；${shiShenP.length > 0 || shangGuanP.length > 0 ? `食伤星${shiShenP.length > 0 ? '（食神）' : '（伤官）'}透出——饭局、兴趣圈是你的主场，会玩会聊让你天然聚人` : '食伤不透——你的表达偏内敛，社交场合容易"被低估"，慢热是你的正常节奏'}`,
  });
  const socialShas = findShaExact(input, Object.keys(SOCIAL_SHA));
  if (socialShas.length > 0) {
    socialSections.push({
      heading: '神煞点睛（人脉的暗号）',
      text: socialShas.map((s) => `【${s.name}·${s.pillar}】${SOCIAL_SHA[s.name] || ''}（${PLAIN[s.pillar] || ''}）。`).join(''),
    });
  } else {
    socialSections.push({
      heading: '神煞点睛（人脉的暗号）',
      text: '人际宫位无华盖孤高、无劫煞勾绞——你的社交没有大坑也没有大贵，靠真诚经营：记得朋友的事、按时回消息，就是你最好的"人设"。',
    });
  }
  socialSections.push({
    heading: '朋友圈的形状',
    text: `${findSha(input, (n) => n.includes('驿马')).length > 0 ? '驿马在命，你的人脉网横跨地域——走出去才有贵人，宅着就只有熟人。' : '你的人脉以深耕熟人圈为主——把身边三五个人经营到位，胜过泛泛之交一百个。'}${findShaExact(input, ['劫煞', '勾绞']).length > 0 ? '命带劫煞/勾绞，警惕"兄弟式"借贷与站队——好的关系经得起AA，也经得起拒绝。' : ''}`,
  });
  socialSections.push({
    heading: '择友建议',
    text: `喜用神为${yongShort}——你的贵人多属"${yongShen.map((w) => WX_PERSON[w]).filter(Boolean).join('、') || '志同道合'}"的气质类型。判断一段关系值不值：聊完更有劲，就是滋养；聊完更内耗，趁早降温。`,
  });
  out.push({ domainKey: 'social', sections: socialSections });

  return out;
}

// 本地天干五行映射（避免循环依赖）
const TG_WX_LOCAL: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
// 喜用神对应的贵人气质
const WX_PERSON: Record<string, string> = {
  '木': '正直有原则',
  '火': '热情有行动力',
  '土': '踏实可靠',
  '金': '果断讲义气',
  '水': '灵活会变通',
};
