// ========== 大运白话解读：按「人生阶段 × 十神关系」二维取内容重心 ==========
//
// 为什么需要这个模块：
// 旧实现只按「日主五行 vs 大运天干五行」给一句模板，且文案池全部是事业/财富/社交导向。
// 一个 62 岁的人翻开自己的大运表，看到的是「适合交朋友、组团队、拓展人脉」「事业上升的十年」
// 「赚钱窗口期」——句子没错，但完全不是他此刻的人生课题，读起来就是套话。
//
// 设计要点：
// 1. 每步大运按其覆盖的年龄段（取区间中点）归属一个人生阶段；
// 2. 每个阶段有明确的「内容重心」与「刻意不谈」——例如 60 岁后不再铺陈事业与求财，
//    转向健康、家庭、生活节奏与心性；
// 3. 阶段 × 十神关系（比劫/印/食伤/官杀/财）交叉出该阶段语境下的具体解读，
//    避免「同一句话套在所有人身上」。
//
// 详见 docs/dayun-life-stage-reading.md

export type LifeStage = 'student' | 'young' | 'prime' | 'mature' | 'retire' | 'elder';
export type RelationKind = 'bijie' | 'yin' | 'shishang' | 'guansha' | 'cai';

export interface LifeStageSpec {
  key: LifeStage;
  /** 展示用阶段名 */
  label: string;
  /** 年龄段（展示用） */
  range: string;
  /** 下限（含），单位：岁（虚岁，与大运卡片口径一致） */
  min: number;
  /** 上限（含） */
  max: number;
  /** 该阶段的解读内容重心 */
  focus: string;
  /** 该阶段刻意不谈、或只作一句带过的内容 */
  exclude: string;
}

/**
 * 人生阶段划分。
 *
 * 边界取值理由：
 * - 22 岁：常规本科毕业，学业打底的尾声；
 * - 35 岁：职场"立业"基本完成，进入攻坚期；
 * - 50 岁：事业从扩张转向收束，家庭进入"上有老下有小"的峰值；
 * - 60 岁：法定退休年龄附近（男性 60、女性工人 50 / 干部 55），是"从业余生活为主"的转折点。
 *   此后不再铺陈事业晋升与财富扩张，主谈健康、家庭、生活节奏与心性；
 * - 75 岁：进入高龄，主谈养生、天伦与心性安顿。
 */
export const LIFE_STAGES: LifeStageSpec[] = [
  {
    key: 'student',
    label: '求学成长期',
    range: '起运~22岁',
    min: 0,
    max: 22,
    focus: '学业与技能打底、性格塑形、身体根基、与父母师长的关系',
    exclude: '事业晋升、投资经营、婚姻承诺',
  },
  {
    key: 'young',
    label: '立业成家期',
    range: '23~34岁',
    min: 23,
    max: 34,
    focus: '立业方向的选择与试错、成家与亲密关系、人脉的第一圈扩张',
    exclude: '稳健守成、养老养生',
  },
  {
    key: 'prime',
    label: '事业爬坡期',
    range: '35~49岁',
    min: 35,
    max: 49,
    focus: '事业攻坚与带团队、财富结构的搭建、家庭双线责任、健康预警',
    exclude: '从零开荒、慢节奏生活',
  },
  {
    key: 'mature',
    label: '中年转型期',
    range: '50~59岁',
    min: 50,
    max: 59,
    focus: '把事业做深或开第二曲线、把财富从"赚"转向"守"、体检与父母子女的关键期',
    exclude: '激进扩张、拿健康换业绩',
  },
  {
    key: 'retire',
    label: '退休生活期',
    range: '60~74岁',
    min: 60,
    max: 74,
    focus: '生活节奏的重建、健康管理、伴侣与家庭、兴趣与社交圈的筛选',
    exclude: '事业晋升、求财扩张、合伙投资——这一阶段只从"守成与安排"的角度谈钱',
  },
  {
    key: 'elder',
    label: '颐养天年期',
    range: '75岁起',
    min: 75,
    max: 200,
    focus: '养生与起居、天伦与陪伴、心性安顿、把经验与家事交代清楚',
    exclude: '事业与求财——这阶段完全不再作为解读重心',
  },
];

/** 按年龄（岁）解析所属人生阶段 */
export function resolveLifeStage(age: number): LifeStageSpec {
  for (const s of LIFE_STAGES) {
    if (age >= s.min && age <= s.max) return s;
  }
  return age < 0 ? LIFE_STAGES[0] : LIFE_STAGES[LIFE_STAGES.length - 1];
}

// 十神关系 → 该关系在一生中的通用含义标签（用于展示）
const RELATION_LABEL: Record<RelationKind, string> = {
  bijie: '比劫运（同辈、竞争与自立）',
  yin: '印运（学习、长辈与庇护）',
  shishang: '食伤运（才华、表达与产出）',
  guansha: '官杀运（责任、规则与压力）',
  cai: '财运（资源、经营与所得）',
};

const STAGE_RELATION_TEXT: Record<LifeStage, Record<RelationKind, string>> = {
  // ---------- 求学成长期 ----------
  student: {
    bijie: '同学之间既是同伴也是参照——这十年你的心气最容易被"别人跑得比我快"搅动。把比较对象换成一年前的自己，专注度立刻不一样。',
    yin: '最适合"把地基打厚"的十年：学一门硬技能、拿一个证、跟对一位老师，回报会在十年后兑现。别急着用短期收入证明自己。',
    shishang: '想法多、坐不住，是这十年的常态——把表达欲导进作品里（比赛、社团、写作、作品集），比硬压着它强。',
    guansha: '升学、考试、家长期待，外部要求会明显变紧。这不是针对你，是这个阶段的规则——先借规则的力把自己推上去，再谈自由。',
    cai: '开始对钱有感觉了——这十年真正该练的是记账和延迟满足，而不是急着挣。会管小钱的人，后面才端得稳大钱。',
  },
  // ---------- 立业成家期 ----------
  young: {
    bijie: '同辈是你的第一波杠杆——合伙、结伴、抱团做事，这十年效率最高。但要立字据：合伙先谈散伙，借钱先假设收不回来。',
    yin: '这十年会有人愿意带你——师长、前辈、平台。最贵的不是工资，是"跟谁学"，选老板比选公司重要。',
    shishang: '你的才华开始值钱了——技术、内容、创意能直接换成收入。别把精力耗在无意义的职场内斗上，作品会替你说话。',
    guansha: '这十年会被规则和上级"磨"——加班、考核、责任压身。扛过去会明显升一个段位；实在扛不住就先换环境，别硬耗。',
    cai: '进账开始变多，也最容易乱花——这十年决定你三十岁后的财务底子。先存出六个月生活费，再谈消费升级。',
  },
  // ---------- 事业爬坡期 ----------
  prime: {
    bijie: '团队与同行是这十年的主战场——带人、分利、立规矩，别一个人扛。同时警惕"什么都想抓、什么都不精"。',
    yin: '该从"自己干"转向"带人干"了——资源、背书、口碑会向你聚拢。把经验沉淀成方法，比继续拼体力更值钱。',
    shishang: '这是你的产出高峰——作品、产品、专业成果会集中出现。但别只顾输出，把健康和家庭预算一起排进日程。',
    guansha: '责任最重的十年——上有老下有小，外面还有 KPI。学会把"必须我做"和"可以交出去"分开，不然透支的是身体。',
    cai: '收入与资产结构在这十年定型——储蓄、不动产、投资、副业都该有配比。别把身家压在一个篮子里，也别为了面子撑消费。',
  },
  // ---------- 中年转型期 ----------
  mature: {
    bijie: '这十年身边会明显"分岔"——有人上升，有人掉队。少比较、多收拢：把精力交给自己真正说了算的事。',
    yin: '适合"往回收"——做减法、立口碑、带后辈。这十年的价值不在新开多少摊子，而在把已有的做深做稳。',
    shishang: '沉淀开始变现——经验、方法、作品可以打包成课程、顾问、传承。这是把"手艺"变成"资产"的窗口。',
    guansha: '压力会从"业绩"转到"健康与家庭"——体检报告、父母的身体、孩子的关键期，才是这十年真正要紧的事。',
    cai: '重点从"赚"转向"守"——这十年一次失误的代价，比年轻时大得多。远离看不懂的高收益，把资产结构调简单、调稳妥。',
  },
  // ---------- 退休生活期（不谈事业与求财扩张） ----------
  retire: {
    bijie: '同辈陪伴是这十年的重要支撑——老同事、老同学、街坊，常走动会让你精神头很好。但要留意两件不划算的事：面子型应酬，和无谓的攀比。',
    yin: '这十年适合"向内收"——读书、写字、园艺、含饴弄孙都能滋养你。你操心了半辈子，学会"享清福"也是一门要练的功课。',
    shishang: '你的表达欲和创造力还在——把爱好做成作品：写字、画画、拍摄、口述往事。有输出的人，退下来之后老得慢、心气也足。',
    guansha: '外界对你的"管束"会明显减少，但身体的规矩要自己立——体检、作息、按时吃药这些"被要求"的事，反而是你的护身符。儿孙的事让他们自己拿主意，别把操心当责任。',
    cai: '这十年是"与钱和解"的十年——收入趋于固定，重点在守不在攻。别被高收益话术打动，大额支出和给子女的钱，跟家人商量、留个凭据。',
  },
  // ---------- 颐养天年期（不谈事业与求财） ----------
  elder: {
    bijie: '老友一年少过一年，孤独感会时不时冒头——主动联系是老朋友的义务，不是打扰。有固定的小圈子，晚年质量差很多。',
    yin: '心宽一寸，病退一丈——这十年的养生重在心境：规律、清淡、有事做、有人念。你比自己以为的更被人惦记。',
    shishang: '把一生的经验讲出来、写下来，是这十年最有价值的事——不为发表，只为留下。家人听你说话的时间，就是最好的陪伴。',
    guansha: '身体的信号要当真、别硬扛——定期复查、小病早看，比什么补品都管用。也别再替晚辈扛事，你安稳，就是全家最大的福。',
    cai: '钱财的事交给规矩和预案——该立的遗嘱、该交代的账户、该说清的分寸，早说早安心。和为贵，但账要清。',
  },
};

// 五行关系无法判定时的阶段兜底（保证任何输入都有贴合阶段的话）
const STAGE_FALLBACK: Record<LifeStage, string> = {
  student: '这十年以"打底"为主——把学业、身体和心性稳住，比抢跑重要。',
  young: '这十年是"定方向"的十年——试错成本还低，选定一条路走深，比频繁换道划算。',
  prime: '这十年是"扛事"的十年——事业与家庭两头都要顾，会分配精力比拼命更关键。',
  mature: '这十年是"调结构"的十年——把事业、健康、家庭的比例重排一遍，收比放重要。',
  retire: '这十年是"换节奏"的十年——从赶路转向看景，把身体和心情照顾好，就是最大的正事。',
  elder: '这十年是"养"的十年——起居有常、心里有事、身边有人，就是最好的运势。',
};

/**
 * 同一阶段内、同一种十神关系可能对应两步大运（例：6~15 岁与 16~25 岁都落在求学成长期，
 * 且天干同属木 → 都是比劫）。若直接复用同一句话，用户会看到两段一字不差的解读。
 * 这里按"在该阶段中的出现次序"追加一句定位，使每一段都有独立信息量。
 */
const STAGE_PHASE_REFINE: Record<LifeStage, string[]> = {
  student: [
    '这一段更靠前，主题是"建立节奏"：习惯和兴趣的分量大于成绩。',
    '这一段更靠后，主题是"定型"：升学与专业选择会放大你后面的路，值得多花时间想。',
  ],
  young: [
    '这一段更靠前，主题是"敢试"：试错成本还低，多试几种可能，别过早把自己锁死。',
    '这一段更靠后，主题是"收窄"：从"什么都试试"过渡到"选一条走深"。',
  ],
  prime: [
    '这一段更靠前，主题是"上量"：体力和机会都还在高位，该抓的别客气。',
    '这一段更靠后，主题是"分层"：哪些必须亲自扛、哪些该交出去，想清楚会轻松很多。',
  ],
  mature: [
    '这一段更靠前，主题是"转舵"：还有体力试第二曲线，别等彻底没力气才想这件事。',
    '这一段更靠后，主题是"落定"：把结构调顺，比再拼一把更划算。',
  ],
  retire: [
    '这一段更靠前，主题是"换轨"：从被事情推着走，改成自己排时间——头两年最难过，熬过去就顺了。',
    '这一段更靠后，主题是"定盘"：把医疗、财务、居住这三件事的安排定下来，心里就踏实了。',
  ],
  elder: [
    '这一段更靠前，主题是"安顿"：把该交代的交代清楚，剩下的日子都是赚的。',
    '这一段更靠后，主题是"守静"：起居有常、情绪平稳，就是最好的养生。',
  ],
};

const TG_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
// 生我者（用于判定印）
const WO_SHENG_ME: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
// 克我者（用于判定官杀）
const WO_KE_ME: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

/** 由「日主天干 + 大运天干」判定十神关系大类 */
export function resolveRelation(dayGan: string, dayunGan: string): RelationKind | null {
  const dayWx = TG_WX[dayGan];
  const yunWx = TG_WX[dayunGan];
  if (!dayWx || !yunWx) return null;
  if (dayWx === yunWx) return 'bijie';
  if (WO_SHENG_ME[dayWx] === yunWx) return 'yin';
  if (WO_SHENG_ME[yunWx] === dayWx) return 'shishang';
  if (WO_KE_ME[dayWx] === yunWx) return 'guansha';
  if (WO_KE_ME[yunWx] === dayWx) return 'cai';
  return null;
}

export interface DayunStep {
  ganZhi: string;
  startAge: number;
  endAge: number;
  startYear?: number;
  endYear?: number;
  isPreStart?: boolean;
}

export interface DayunReading {
  startAge: number;
  endAge: number;
  ganZhi: string;
  startYear?: number;
  endYear?: number;
  stage: LifeStage;
  stageLabel: string;
  stageRange: string;
  /** 该阶段的解读重心（供 UI 展示"为什么这样讲"） */
  stageFocus: string;
  /** 大运天干对日主的十神关系标签 */
  relationLabel: string;
  /** 该步大运是否已走过 */
  isPast: boolean;
  /** 该步大运是否是当前所在 */
  isCurrent: boolean;
  text: string;
}

export interface DayunReadingResult {
  /** 阶段导航：说明"你当前处于哪一阶段，所以重点看什么" */
  stageLead: string;
  /** 当前所处阶段（无法判定时为空） */
  currentStage: LifeStageSpec | null;
  readings: DayunReading[];
}

/**
 * 生成大运白话解读。
 *
 * @param steps      大运步骤（应已过滤掉起运前无干支的小运）
 * @param dayGan     日主天干
 * @param currentAge 当前周岁；用于标注"当前大运"与生成阶段导航
 */
export function buildDayunReadings(
  steps: DayunStep[],
  dayGan: string,
  currentAge: number,
): DayunReadingResult {
  // 同一阶段 + 同一种关系可能落在两步大运上（例：6~15 与 16~25 都在求学成长期，天干同为木）。
  // 这里记录出现次序，第二次起追加"阶段内定位句"，避免两段解读一字不差。
  const stageRelationSeen = new Map<string, number>();
  const readings = steps.map((s) => {
    // 用区间中点判定阶段：一步 10 年，中点最能代表该步的主要人生课题
    const midAge = Math.floor((s.startAge + s.endAge) / 2);
    const stage = resolveLifeStage(midAge);
    const relation = resolveRelation(dayGan, s.ganZhi.charAt(0));
    let text = relation ? STAGE_RELATION_TEXT[stage.key][relation] : STAGE_FALLBACK[stage.key];

    const seenKey = `${stage.key}:${relation || 'none'}`;
    const seenCount = stageRelationSeen.get(seenKey) ?? 0;
    stageRelationSeen.set(seenKey, seenCount + 1);
    if (seenCount > 0) {
      const refine = STAGE_PHASE_REFINE[stage.key];
      text += ` ${refine[Math.min(seenCount, refine.length - 1)]}`;
    }

    return {
      startAge: s.startAge,
      endAge: s.endAge,
      ganZhi: s.ganZhi,
      startYear: s.startYear,
      endYear: s.endYear,
      stage: stage.key,
      stageLabel: stage.label,
      stageRange: stage.range,
      stageFocus: stage.focus,
      relationLabel: relation ? RELATION_LABEL[relation] : '五行关系平顺',
      isPast: s.endAge <= currentAge,
      isCurrent: currentAge >= s.startAge && currentAge < s.endAge,
      text,
    };
  });

  const currentStage = currentAge > 0 ? resolveLifeStage(currentAge) : null;
  let stageLead = '';
  if (currentStage) {
    const weightHint =
      currentStage.key === 'student' || currentStage.key === 'young'
        ? '以下解读以学业、立业、成家与试错为主，晚年大运可先浏览、不必细究。'
        : currentStage.key === 'prime' || currentStage.key === 'mature'
          ? '以下解读以事业、财富与家庭双线责任为主，健康预警部分请重点看。'
          : '以下解读里事业与求财的权重最低，健康、家庭与生活节奏才是重点——60 岁以后的运，本来就是"运"而非"业"。';
    stageLead = `你今年 ${currentAge} 岁，正处于「${currentStage.label}」（${currentStage.range}）——这一阶段的解读重心是：${currentStage.focus}。${weightHint}`;
  }

  return { stageLead, currentStage, readings };
}
