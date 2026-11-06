/**
 * 占卜三板块（六爻 / 梅花易数 / 灵签）共用的「吉凶刻度 + 主题词表 + 判读口径」。
 *
 * ⚠️ 为什么必须收口：
 * 三个板块原本各写一套吉凶话术——六爻用「旺相/大吉」、梅花用「大吉/小吉/凶」、
 * 灵签只看「上上/下下」等级。于是同一个用户在不同板块拿到互相打架的结论，
 * 而且同一板块里「用神分析」说有利、「综合断语」说变化、「大师解读」说大吉，
 * 三处各写一遍判据，必然对打。这里定义唯一刻度，三个引擎只负责把盘面事实
 * 折算成 [-10, +10] 的分数，再由 `verdictOf` 统一出档。
 *
 * ⚠️ 刻度是分布量纲的锚点（同 MEMORY 里合盘档位那条）：改档位阈值 =
 * 改全部三板块的产出分布，改前先跑 `divinationReading.test.ts` 的分布快照。
 */

export type Theme = '事业' | '爱情' | '亲情' | '财运' | '健康' | '学业';

export const THEMES: Theme[] = ['事业', '爱情', '亲情', '财运', '健康', '学业'];

export type Verdict = '大吉' | '吉' | '平' | '小凶' | '凶';

export type VerdictTone = 'good' | 'neutral' | 'bad';

export interface VerdictBand {
  verdict: Verdict;
  /** 进入该档的最低分（含） */
  min: number;
  tone: VerdictTone;
  icon: string;
  /** 档位的一句话定性，供各板块拼句，避免各写一套 */
  word: string;
}

/**
 * 唯一档位表。分数区间刻意设计成能容纳三板块的最大振幅：
 * 六爻用神最强约 +11 / 最弱约 -12，梅花体用约 ±9，灵签签等约 ±6。
 * 档位阈值取「需要多个因子同时有利才算大吉」，避免单项得令就报大吉。
 */
export const VERDICT_BANDS: VerdictBand[] = [
  { verdict: '大吉', min: 6, tone: 'good', icon: '🌟', word: '底盘很硬，可以主动推进' },
  { verdict: '吉', min: 3, tone: 'good', icon: '🌤', word: '方向对，顺势做能成' },
  { verdict: '平', min: -3, tone: 'neutral', icon: '⚖️', word: '不冷不热，看你怎么使力' },
  { verdict: '小凶', min: -6, tone: 'bad', icon: '🌧', word: '有阻滞，宜收不宜放' },
  { verdict: '凶', min: -Infinity, tone: 'bad', icon: '⛈', word: '逆风局，先保不失再谈进取' },
];

export const VERDICT_ORDER: Verdict[] = ['凶', '小凶', '平', '吉', '大吉'];

export function verdictOf(score: number): Verdict {
  for (const band of VERDICT_BANDS) {
    if (score >= band.min) return band.verdict;
  }
  return '凶';
}

export function bandOf(verdict: Verdict): VerdictBand {
  return VERDICT_BANDS.find((b) => b.verdict === verdict) || VERDICT_BANDS[VERDICT_BANDS.length - 1];
}

/** 档位对应的语义色调，页面据此选卡片配色（勿在页面里再写一张映射表） */
export function verdictTone(verdict: Verdict): VerdictTone {
  return bandOf(verdict).tone;
}

export function verdictIcon(verdict: Verdict): string {
  return bandOf(verdict).icon;
}

/** 把任意分值夹回统一量纲，防止某个引擎因子叠加后越界 */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(-10, Math.min(10, score));
}

/** 一条判读依据：盘面上的一个事实 + 它对本题的正负贡献 */
export interface Evidence {
  /** 因子名，如「月建」「日辰」「动化」「签等」「仙机·婚姻」 */
  label: string;
  /** 白话说明：先讲盘面事实，再讲它意味着什么（不得只讲术语） */
  detail: string;
  /** 该因子对总分的有符号贡献，0 表示只作背景说明不计分 */
  weight: number;
}

/** 三个板块统一的产出结构；页面只认这一种，不再各自拼文案 */
export interface ThemeReading {
  theme: Theme;
  verdict: Verdict;
  /** 原始分（-10~10），用于展示强弱与调试，不给用户看绝对值 */
  score: number;
  /** 这一题在盘面上对应谁，如「用神·妻财」「体卦·兑」 */
  subject: string;
  /** 结论白话：先给判断，再给理由，不出现未解释的术语 */
  summary: string;
  /** 依据清单，顺序即权重顺序（ |weight| 从大到小） */
  evidence: Evidence[];
  /** 行动建议，按主题 × 档位出，不按盘面出（避免出现「换个盘还是这句」） */
  advice: string;
  /** 降级说明：数据缺失、伏神、未分级签等，必须显式告知而不是悄悄兜底 */
  note?: string;
}

/**
 * 三大板块的判读口径声明。页面必须原样展示——
 * 「吉凶到底谁说了算」讲不清，用户就会拿卦辞的吉去对冲用神的凶。
 */
export const JUDGE_RULE: Record<'liuyao' | 'meihua' | 'lot', string> = {
  liuyao:
    '吉凶以「用神」的旺衰生克为主判：月建定旺相休囚死，日辰定当下的生克与冲合，动爻与变爻定变化方向；卦辞、卦象、典故只描述情境与应对方式，不单独定吉凶。',
  meihua:
    '吉凶以「体用生克」为主判：体卦代表你，用卦代表所问之事；时令旺衰给体卦加权，变卦定结局，互卦看过程；六十四卦意象只描述处境，不单独定吉凶。',
  lot: '吉凶以「签等」为基调（上上→大吉、上→吉、中→平、下→小凶、下下→凶），签文分项（仙机、白话注解、签诗）只在一档之内微调，不会把下签读成吉签。',
};

/** 主题的中性说法，用于拼句时避免「爱情」出现在长辈问题里显得别扭 */
export const THEME_WORD: Record<Theme, string> = {
  事业: '事业与工作',
  爱情: '感情与婚恋',
  亲情: '家人与亲情',
  财运: '钱财与收入',
  健康: '身体与健康',
  学业: '学业与考试',
};

/** 押韵/口语化的档位短语，拼句用（与 VERDICT_BANDS.word 互补：一个偏断言，一个偏口语） */
export const VERDICT_PLAIN: Record<Verdict, string> = {
  大吉: '大可以主动争取',
  吉: '值得往前推一步',
  平: '维持现状最稳',
  小凶: '先收一收手',
  凶: '别硬来，先止损',
};

/** 建议表：主题 × 档位。只按主题与档位出，不掺盘面细节（细节在 evidence 里） */
const ADVICE: Record<Theme, Record<Verdict, string>> = {
  事业: {
    大吉: '该争的位置、该谈的条件现在就谈，别等「准备更充分」——顺风的时候推门，门是虚掩的。',
    吉: '手上正在推进的事可以加一档力度，但要留一个可退的边界，别把全部筹码压上去。',
    平: '别急着换赛道，也别急着表忠心。把手上的事做扎实，等一个明确信号再动。',
    小凶: '先守住现有位置，暂缓跳槽、创业、接新项目。这段时间的力气花在补短板上更值。',
    凶: '现在不是争的时候。保住饭碗、别签没看清的条款、别跟上级正面硬刚，等风向变。',
  },
  爱情: {
    大吉: '想说的话可以说，想见的人可以去见。眼下的气场是帮你的，别把好时机耗在猜心上。',
    吉: '关系可以往前推一步，但推的方式要轻——一次约会、一句实话，比一次摊牌有用。',
    平: '不必急着定性。多相处、多观察，感情的温度靠自己升，不是靠问出来的。',
    小凶: '近期别追问、别试探、别翻旧账。对方不是不在意，是当下没余力回应。',
    凶: '先把自己稳住。这个阶段任何强求都会加速消耗，退半步反而留得住。',
  },
  亲情: {
    大吉: '家里的事现在谈得通，该说的话趁这时候说，该和解的和解，别拖成旧账。',
    吉: '家人之间的善意是够的，主动打个电话、回趟家，比讲道理管用。',
    平: '各自安好就是最好的状态。不必强行拉近，也不必为小事较真。',
    小凶: '家里容易起口角，少说一句就少一场。钱和旧事这两样，近期都别在饭桌上提。',
    凶: '有硬碰硬的风险。先降温、先分开一段时间，等情绪过去再谈事。',
  },
  财运: {
    大吉: '该收的账去收、该谈的价去谈。这时候进的钱是实的，不是账面上的热闹。',
    吉: '正财稳，可以适度扩大投入；偏财小试可以，别加杠杆。',
    平: '收支大体平衡。别追热点，也别因为焦虑去砍掉该花的钱。',
    小凶: '以守为主：控制开支、别借钱给人、别碰不懂的产品。现金流比收益率重要。',
    凶: '收紧口袋。任何「稳赚」的说法都要当骗局看，先保住本金。',
  },
  健康: {
    大吉: '底子是好的，可以开始规律运动或调理计划，身体接得住。',
    吉: '整体无碍，把作息和饮食的漏洞补一补，比吃补品有效。',
    平: '没有明显问题，也没有明显红利。别熬夜、别久坐，维持就是赢。',
    小凶: '有小信号在提示你了——睡眠、肠胃、肩颈，别扛。该查的查一次。',
    凶: '当务之急是把节奏停下来。持续的不适要去做检查，别用「忙」当理由。',
  },
  学业: {
    大吉: '状态在线，可以冲高分、报难考的、接有挑战的题目。',
    吉: '按计划推进就有回报，重点补最弱那一科，性价比最高。',
    平: '进度正常，别换方法、别换资料，把手上这套走完。',
    小凶: '效率在下降，先调整作息和方法，别用延长时长来硬撑。',
    凶: '现在硬攻只会更乱。停下来复盘基础，把不会的清单列出来再谈进度。',
  },
};

export function adviceOf(theme: Theme, verdict: Verdict): string {
  return ADVICE[theme][verdict];
}

/** 依据按贡献绝对值排序，页面直接按序渲染即可 */
export function sortEvidence(evidence: Evidence[]): Evidence[] {
  return [...evidence].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

/** 把要素拼成一句结论：判断 → 主因 → 定性 */
export function composeSummary(
  theme: Theme,
  verdict: Verdict,
  headline: string,
  tail?: string,
): string {
  const base = `${THEME_WORD[theme]}这一题，盘面给的判读是「${verdict}」——${headline}`;
  // ⚠️ 两段都要各自收口：headline 有些分支不带句号，直接拼 tail 会出现
  //    「…要等一个「露头」的时间点多爻齐动…」这种粘字，读起来像病句
  const head = /[。！？]$/.test(base) ? base : `${base}。`;
  const body = tail || `${bandOf(verdict).word}。`;
  const closing = /[。！？]$/.test(body) ? body : `${body}。`;
  return `${head}${closing}`;
}

/** 性别归一化的宽松入参：六爻问婚姻要分男女，但不能因为没填就默认男命 */
export function normalizeGender(g?: string | null): 'male' | 'female' | undefined {
  if (g === 'male' || g === '男') return 'male';
  if (g === 'female' || g === '女') return 'female';
  return undefined;
}
