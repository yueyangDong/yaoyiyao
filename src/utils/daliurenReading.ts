/**
 * 大六壬 → 分主题吉凶判读（唯一判据出口）。
 *
 * ⚠️ 与六爻最大的不同：
 * 六爻一卦一问，用神只有一个；大六壬一课可问百事，**类神随主题变**——
 * 问财看妻财、问工作看官鬼、问病看官鬼（但方向相反）、问文书看父母。
 * 所以这里必须「先定类神，再算强弱」，不能拿三传直接套吉凶。
 *
 * ⚠️ 极性（polarity）同六爻那条铁律：
 * 同样是「官鬼旺」，问事业是吉（职位在涨），问健康是凶（病势正盛）。
 * `strength` 只讲旺衰，乘上主题极性才是吉凶；天将的吉凶倾向不乘极性
 * （贵人乘官鬼在健康题里仍是「有转机」，不是「病更重」）。
 *
 * ⚠️ 主类神与次类神必须**合并**而不是「取分高的那个」：
 * 健康题是官鬼（病）与子孙（药）两条反向的线，只留一条会得出
 * 「只讲药、不讲病」或「只说病重、不说有没有救」的半截结论。
 */

import {
  type Theme, type ThemeReading, type Evidence,
  verdictOf, clampScore, sortEvidence, composeSummary, adviceOf, normalizeGender,
} from './divinationCore';
import { DZ_WX, SAN_HE_JU, DZ_CHONG, DZ_HE } from './diZhiRelations';
import { WX_SHENG, WX_KE } from './wuXingRelations';
import {
  type KeResult, type SanChuanItem,
  liuQinOf, JIANG_TONE, JIANG_PLAIN, LIU_QIN_PLAIN, DI_ZHI_ORDER,
} from './daliurenCore';

/* ------------------------------------------------------------------ *
 * 类神取用表
 * ------------------------------------------------------------------ */

interface Probe {
  /** 主类神（必看） */
  primary: string;
  /** 次类神（辅助，权重打折后并入同一份结论） */
  secondary?: string;
  /** 这一题在盘面上到底看什么 */
  subject: string;
  /** 取用理由（页面展示，避免「凭什么」说不清） */
  why: string;
}

/** 健康题的官鬼是「病神」，不是「职位」——极性反转的唯一入口 */
function polarityOf(theme: Theme, liuQin: string): 1 | -1 {
  if (theme === '健康') {
    if (liuQin === '官鬼') return -1; // 病势：旺则凶
    if (liuQin === '子孙') return 1;  // 药与恢复力：旺则吉
  }
  return 1;
}

function probeOf(theme: Theme, gender?: string): Probe {
  const g = normalizeGender(gender);
  switch (theme) {
    case '事业':
      return {
        primary: '官鬼',
        secondary: '父母',
        subject: '类神·官鬼（职位与压力）',
        why: '大六壬问工作，以官鬼为职位与上司、父母为文书与平台；官鬼现而受生，位置就动得起来。',
      };
    case '爱情': {
      // ⚠️ 六合/天后是「天将」不是六亲——拿它当次类神会让 findHits 永远空转，
      //    所以婚恋题只取六亲类神，天将的助力在天将那一条里体现。
      if (g === 'male') {
        return {
          primary: '妻财',
          subject: '类神·妻财（男命看另一半）',
          why: '男命以妻财为另一半；六合、天后若乘财爻，是「有人牵线」的辅证，另在天将一条里说明。未设性别时两星合看，不默认男命。',
        };
      }
      if (g === 'female') {
        return {
          primary: '官鬼',
          subject: '类神·官鬼（女命看另一半）',
          why: '女命以官鬼为夫星；六合、天后若乘官爻，是「有人牵线」的辅证，另在天将一条里说明。',
        };
      }
      return {
        primary: '妻财',
        secondary: '官鬼',
        subject: '类神·妻财/官鬼（未设性别，两星合看）',
        why: '男命看妻财、女命看官鬼；未设置性别时两星合看，不默认男命。',
      };
    }
    case '亲情':
      return {
        primary: '父母',
        secondary: '兄弟',
        subject: '类神·父母（长辈与家宅）',
        why: '父母主长辈、家宅与根基，兄弟主手足平辈；两星合看才是一家人。',
      };
    case '财运':
      return {
        primary: '妻财',
        secondary: '子孙',
        subject: '类神·妻财（钱财与进项）',
        why: '妻财主进项与实物；子孙为财之源（生财之神），财源旺则钱来得顺。',
      };
    case '健康':
      return {
        primary: '官鬼',
        secondary: '子孙',
        subject: '类神·官鬼（病势）/ 子孙（药与恢复）',
        why: '这一题方向相反：官鬼是病神，旺则病势盛（凶）；子孙是医药与恢复力，旺则向愈（吉），两星反向计分。',
      };
    case '学业':
      return {
        primary: '父母',
        secondary: '官鬼',
        subject: '类神·父母（文书学业）',
        why: '父母主文书、学历、考试；官鬼主名次与功名。文书旺而名次动，才是真考得好。',
      };
    default:
      return { primary: '妻财', subject: '类神·妻财', why: '按财爻论。' };
  }
}

/* ------------------------------------------------------------------ *
 * 旺衰与三传结构
 * ------------------------------------------------------------------ */

const WANG_LEVEL: Record<string, { level: string; score: number }> = {
  旺: { level: '旺', score: 2 },
  相: { level: '相', score: 1.5 },
  休: { level: '休', score: -1 },
  囚: { level: '囚', score: -1.5 },
  死: { level: '死', score: -2 },
};

/** 以月建（节气月支）为司令，判某支五行的旺相休囚死 */
export function wangShuaiOf(zhi: string, monthZhi: string): { level: string; score: number } {
  const wx = DZ_WX[zhi];
  const mwx = DZ_WX[monthZhi];
  if (!wx || !mwx) return WANG_LEVEL.休;
  if (wx === mwx) return WANG_LEVEL.旺;
  if (WX_SHENG[mwx] === wx) return WANG_LEVEL.相;
  if (WX_SHENG[wx] === mwx) return WANG_LEVEL.休;
  if (WX_KE[wx] === mwx) return WANG_LEVEL.囚;
  return WANG_LEVEL.死;
}

interface ChuanShape {
  diSheng: boolean;
  diKe: boolean;
  ju: { name: string; wx: string } | null;
  kongCount: number;
  badJiangCount: number;
  goodJiangCount: number;
}

export function chuanShapeOf(sanChuan: SanChuanItem[]): ChuanShape {
  const [c, z, m] = sanChuan;
  const wxOf = (s?: SanChuanItem) => (s ? DZ_WX[s.zhi] : '');
  const w1 = wxOf(c), w2 = wxOf(z), w3 = wxOf(m);
  const ju = SAN_HE_JU.find((j) => j.branches.every((b) => sanChuan.some((s) => s.zhi === b))) || null;
  return {
    diSheng: !!w1 && WX_SHENG[w1] === w2 && WX_SHENG[w2] === w3,
    diKe: !!w1 && WX_KE[w1] === w2 && WX_KE[w2] === w3,
    ju: ju ? { name: ju.name, wx: ju.wx } : null,
    kongCount: sanChuan.filter((s) => s.kong).length,
    badJiangCount: sanChuan.filter((s) => JIANG_TONE[s.tianJiang] === -1).length,
    goodJiangCount: sanChuan.filter((s) => JIANG_TONE[s.tianJiang] === 1).length,
  };
}

/** 课体对本题的加成：变动类主题里「返吟」不算坏，「伏吟」才是真卡住 */
function keTiWeight(keTi: string, theme: Theme): { w: number; text: string } {
  const moving = theme === '事业' || theme === '财运' || theme === '爱情';
  if (keTi.includes('元首')) return { w: 1, text: '元首课：事由外推、顺理成章，按规矩推进就有人接。' };
  if (keTi.includes('重审')) return { w: 0, text: '重审课：事从内部或下头起，得先理顺自己这一头。' };
  if (keTi.includes('比用')) return { w: 0, text: '比用课：头绪有两条，取与你气息相近的那条走。' };
  if (keTi.includes('涉害')) return { w: -1, text: '涉害课：几条路都带伤，得挑伤得最轻的那条。' };
  if (keTi.includes('遥克')) return { w: -1, text: '遥克课：压力或目标隔着一层，够不着，得等或绕。' };
  if (keTi.includes('昴星')) return { w: -1, text: '昴星课：事情悬着没有抓手，主动出手反而易失。' };
  if (keTi.includes('别责')) return { w: -1, text: '别责课：没有正面对手，也没有现成抓手，只能借力。' };
  if (keTi.includes('八专')) return { w: -1, text: '八专课：事与己贴得太近，当局者迷，先拉开距离再看。' };
  if (keTi.includes('伏吟')) return { w: -1.5, text: '伏吟课：原地打转，推不动——这段时间的力气多半花在原地。' };
  if (keTi.includes('返吟')) return { w: moving ? 0 : -1, text: '返吟课：翻来覆去、先动后定；怕的是不动，动起来反而有转机。' };
  return { w: 0, text: '' };
}

/* ------------------------------------------------------------------ *
 * 类神落到哪里
 * ------------------------------------------------------------------ */

interface Hit {
  where: '初传' | '中传' | '末传' | '日干上神' | '日支上神';
  zhi: string;
  item?: SanChuanItem;
  base: number;
}

const HIT_BASE: Record<Hit['where'], number> = {
  初传: 3,
  日干上神: 2.5,
  中传: 2,
  末传: 2,
  日支上神: 1.5,
};

function findHits(ke: KeResult, liuQin: string): Hit[] {
  const hits: Hit[] = [];
  for (const item of ke.sanChuan) {
    if (item.liuQin === liuQin) {
      hits.push({ where: item.stage, zhi: item.zhi, item, base: HIT_BASE[item.stage] });
    }
  }
  const ke1 = ke.siKe[0];
  const ke3 = ke.siKe[2];
  if (liuQinOf(ke.dateInfo.dayGan, ke1.upper) === liuQin) {
    hits.push({ where: '日干上神', zhi: ke1.upper, base: HIT_BASE['日干上神'] });
  }
  if (liuQinOf(ke.dateInfo.dayGan, ke3.upper) === liuQin) {
    hits.push({ where: '日支上神', zhi: ke3.upper, base: HIT_BASE['日支上神'] });
  }
  return hits.sort((a, b) => b.base - a.base);
}

/* ------------------------------------------------------------------ *
 * 单条类神的证据
 * ------------------------------------------------------------------ */

interface Part {
  evidence: Evidence[];
  subject: string;
  headline: string;
}

/**
 * @param scale 次类神的权重折扣
 * @param withStructure 三传/课体/上下关系这些「全局证据」只算一次，
 *        否则主次两条类神会各加一遍，分值被结构项吃掉
 */
function analyze(ke: KeResult, theme: Theme, liuQin: string, scale: number, withStructure: boolean): Part {
  const evidence: Evidence[] = [];
  const monthZhi = ke.dateInfo.monthGz[1];
  const shape = chuanShapeOf(ke.sanChuan);
  const polarity = polarityOf(theme, liuQin);
  const chuanText = ke.sanChuan.map((s) => s.zhi).join('→');
  const hits = findHits(ke, liuQin);
  const main = hits[0];
  let subject = `类神·${liuQin}`;
  let headline = '';

  if (main) {
    const ws = wangShuaiOf(main.zhi, monthZhi);
    const jiang = main.item?.tianJiang || '';
    const polarityWord = polarity === -1 ? '这里反向计分：它越旺，这一题越凶' : '这里正向计分：它越旺，这一题越顺';
    subject = main.item
      ? `类神·${liuQin}（${main.where}${main.zhi}·${jiang}）`
      : `类神·${liuQin}（${main.where}${main.zhi}）`;
    headline = main.item
      ? `关键落在${main.where}（${main.zhi}·${jiang}）`
      : `关键落在${main.where}（${main.zhi}）`;

    evidence.push({
      label: `类神·${liuQin}`,
      detail: `${liuQin}落在${main.where}（${main.zhi}），${LIU_QIN_PLAIN[liuQin] || ''}这一路的事情是「在场」的——${
        main.where === '初传' ? '开手就碰上，事情已经在眼前'
          : main.where === '日干上神' ? '正压在你身上，绕不开'
            : main.where === '日支上神' ? '落在事情本身或对方那边'
              : '在中后段才浮出来，先别急'
      }。${polarityWord}。`,
      weight: main.base * polarity * scale,
    });

    evidence.push({
      label: `月建·${liuQin}`,
      detail: `以${monthZhi}月为司令，${main.zhi}（${DZ_WX[main.zhi]}）处「${ws.level}」地${
        ws.level === '旺' || ws.level === '相' ? '，底气是够的'
          : ws.level === '死' ? '，几乎没有力气，说了不算'
            : '，力气偏弱，得靠别处补'
      }。`,
      weight: ws.score * polarity * scale,
    });

    if (jiang) {
      const tone = JIANG_TONE[jiang] ?? 0;
      if (tone !== 0) {
        evidence.push({
          label: `天将·${jiang}`,
          detail: `${jiang}乘${liuQin}——${JIANG_PLAIN[jiang] || ''}。天将只改气质与助力，不改事情的方向。`,
          weight: tone * 0.8 * scale,
        });
      }
    }

    if (main.item?.kong) {
      evidence.push({
        label: '旬空',
        detail: `${main.item.stage}${main.zhi}正落旬空（${ke.flags.kongZhi.join('、')}空）——不是没有，是暂时不落实：口头说得热闹，实际要等填实（逢冲或逢该支之日）才见分晓。`,
        weight: -2 * scale,
      });
    }
    if (main.item?.yiMa) {
      evidence.push({
        label: '驿马',
        detail: `${main.item.stage}是日马（${ke.flags.yiMaZhi}）——主快、主动、主远：这件事要么很快有消息，要么跟外地、走动、换环境有关。`,
        weight: 1 * scale,
      });
    }
    if (hits.length > 1) {
      const others = hits.slice(1, 3).map((h) => `${h.where}${h.zhi}`).join('、');
      evidence.push({
        label: '同类神',
        detail: `同一类神在${others}也有落点——说明这不是一闪而过的事，前后都有呼应。`,
        weight: 0.5 * scale,
      });
    }
  } else {
    subject = `类神·${liuQin}（不入传）`;
    headline = `${liuQin}不入传，这一头暂时没有正主`;
    evidence.push({
      label: `类神·${liuQin}`,
      detail: `三传与两上神里都没有${liuQin}——这件事眼下没有正主，要么问的时机还没到，要么真正的关键不在你以为的那一处。${
        polarity === -1 ? '病神不现，反倒算好消息：问题还没浮到台面上。' : '先把事情本身理清楚，别在盘外找答案。'
      }`,
      weight: (polarity === -1 ? 1.5 : -1.5) * scale,
    });
  }

  if (withStructure) {
    evidence.push({
      label: '三传',
      detail: `三传${chuanText}：${shape.diSheng ? '一路递生，事情有人接力、越推越顺' : shape.diKe ? '一路递克，环环相扣地消耗，越到后面越难' : '生克夹杂，走得不算顺也不算堵'}${shape.ju ? `；三传成${shape.ju.name}，事情会「聚成一件事」收口` : ''}。`,
      weight: (shape.diSheng ? 1.2 : shape.diKe ? -1.2 : 0) * scale,
    });
    if (shape.kongCount >= 2) {
      evidence.push({
        label: '传空',
        detail: `三传里有 ${shape.kongCount} 个落空——过程热热闹闹，结果容易停在「说了但没落地」上。`,
        weight: -1.2 * scale,
      });
    }

    const kt = keTiWeight(ke.keTi.name, theme);
    if (kt.text) {
      evidence.push({ label: `课体·${ke.keTi.name.split('·')[0]}`, detail: kt.text, weight: kt.w * scale });
    }

    const ganUp = ke.siKe[0].upper;
    const zhiUp = ke.siKe[2].upper;
    const ganWx = DZ_WX[ganUp];
    const zhiWx = DZ_WX[zhiUp];
    if (ganWx && zhiWx) {
      if (WX_KE[zhiWx] === ganWx) {
        evidence.push({
          label: '上下关系',
          detail: `事情那一头（${zhiUp}${zhiWx}）克着你这一头（${ganUp}${ganWx}）——对方或环境在给你压力，硬顶不如换方式。`,
          weight: -1 * scale,
        });
      } else if (WX_KE[ganWx] === zhiWx) {
        evidence.push({
          label: '上下关系',
          detail: `你这一头（${ganUp}${ganWx}）克着事情那一头（${zhiUp}${zhiWx}）——主动权在你，但「克」也是消耗，别用力过猛。`,
          weight: 0.8 * scale,
        });
      } else if (WX_SHENG[zhiWx] === ganWx) {
        evidence.push({
          label: '上下关系',
          detail: `事情那一头（${zhiUp}）在生你（${ganUp}）——外界对你有善意，多借力、多开口。`,
          weight: 1 * scale,
        });
      }
    }
  }

  return { evidence, subject, headline };
}

/* ------------------------------------------------------------------ *
 * 对外入口
 * ------------------------------------------------------------------ */

export function buildDaliurenReading(ke: KeResult, theme: Theme, gender?: string): ThemeReading {
  const probe = probeOf(theme, gender);
  const main = analyze(ke, theme, probe.primary, 1, true);
  const parts: Part[] = [main];
  if (probe.secondary && probe.secondary !== probe.primary) {
    parts.push(analyze(ke, theme, probe.secondary, 0.6, false));
  }

  const evidence = sortEvidence(parts.flatMap((p) => p.evidence));
  const score = clampScore(evidence.reduce((s, e) => s + e.weight, 0));
  const verdict = verdictOf(score);
  const subject = parts.map((p) => p.subject).join(' ／ ');
  const headline = `${main.headline}，三传${ke.sanChuan.map((s) => s.zhi).join('→')}`;

  return {
    theme,
    verdict,
    score,
    subject,
    summary: composeSummary(theme, verdict, headline),
    evidence,
    advice: adviceOf(theme, verdict),
    note: `本课取「${probe.primary}${probe.secondary && probe.secondary !== probe.primary ? `」为主、「${probe.secondary}` : ''}」为类神。${probe.why}`,
  };
}

export function buildAllDaliurenReadings(ke: KeResult, gender?: string): ThemeReading[] {
  const themes: Theme[] = ['事业', '爱情', '亲情', '财运', '健康', '学业'];
  return themes.map((t) => buildDaliurenReading(ke, t, gender));
}

/* ------------------------------------------------------------------ *
 * 应期层：不改吉凶，只回答「大概什么时候见分晓」
 *
 * ⚠️ 为什么单独一层、且必须挂在判读文件里（而不是页面算）：
 * 应期的锚点就是「类神落在哪一支」——和吉凶用的是同一个 `probeOf` / `findHits`。
 * 若页面各自算一份，改了类神取用就会两处对不上（判据唯一出口）。
 *
 * 取法四路（传统通行，逐条落到盘面事实，不写"大概近期"这种话）：
 *  1. **发用/类神之支定月日**：事以用神为机，用神所在的支就是应期之支。
 *  2. **空亡填实 / 冲实**：发用或类神落旬空，要等该支值月值日（填实）或冲该支
 *     之月日（冲实）才落实——这是「推后」的正解，不是没希望。
 *  3. **驿马主速**：临日马则事快，先按「日」论而不是「月」。
 *  4. **三传成局定季**：三传合成三合局，应期落在该局当令那一季。
 *  另加两条「节奏修正」：伏吟主慢（要等冲）、返吟主快（但反复）。
 *
 * ⚠️ 不采的一派：以「三传支数相加取日数」（如子1丑2……相加得几天）。它给的是
 *    假精确——盘面同样的支在不同月份起点下差好几个月，用户会拿去当承诺。
 *    所以本项目只给「支 + 相对月数/天数」，且明写这是节奏参考。
 * ------------------------------------------------------------------ */

/** 地支 → 农历月名（月建以节气换，故子为十一月、寅为正月） */
const ZHI_TO_MONTH_NAME: Record<string, string> = {
  寅: '正月', 卯: '二月', 辰: '三月', 巳: '四月', 午: '五月', 未: '六月',
  申: '七月', 酉: '八月', 戌: '九月', 亥: '十月', 子: '十一月', 丑: '十二月',
};

/** 三合局五行 → 当令之季与季首之月（四立之月） */
const WX_SEASON: Record<string, { season: string; month: string }> = {
  木: { season: '春', month: '寅' },
  火: { season: '夏', month: '巳' },
  金: { season: '秋', month: '申' },
  水: { season: '冬', month: '亥' },
};

/** 「见分晓」在各主题里具体指什么——换主题必须换话，不能通用一句 */
const MATTER_WORD: Record<Theme, string> = {
  事业: '有回音、位置定下来',
  爱情: '关系有明确进展或明确断掉',
  亲情: '见上面、话说开',
  财运: '钱到手、账结清',
  健康: '病情有明确转折（见好或查清）',
  学业: '出结果、名次定',
};

export interface TimingWindow {
  /** 主＝类神/发用之支（正法，取应期以此为准）；参考＝末传、中传、成局等旁证 */
  role: '主' | '参考';
  /** 应期之支 */
  zhi: string;
  /** 月尺度：「子月（农历十一月），约 2 个月后」 */
  when: string;
  /** 日尺度：「最近的子日：约 4 天后」——问眼前小事时看这个 */
  dayHint: string;
  /** 凭什么落在这一支 */
  basis: string;
  /** 距当前月建几个月（0＝本月），页面排序或调试用 */
  monthGap: number;
}

export interface DaliurenTiming {
  summary: string;
  speed: { level: '快' | '平' | '慢'; why: string };
  windows: TimingWindow[];
  rules: string[];
  note: string;
}

const zIdx = (z: string) => DI_ZHI_ORDER.indexOf(z);

/** 距离目标支还有几个月 / 几天（含 0＝就在当下这一月/这一天） */
function gapOf(fromZhi: string, toZhi: string): number {
  return ((zIdx(toZhi) - zIdx(fromZhi)) % 12 + 12) % 12;
}

/**
 * 把「应期之支」折成可读的月尺度与日尺度。
 * ⚠️ 不在这里定「主/参考」——那由调用处按取法层级决定（类神/发用＝主，其余＝参考）。
 */
function windowOf(
  zhi: string,
  basis: string,
  ctx: { monthZhi: string; dayGz: string },
): Omit<TimingWindow, 'role' | 'monthGap'> {
  const months = gapOf(ctx.monthZhi, zhi);
  const days = gapOf(ctx.dayGz[1], zhi);
  const monthName = ZHI_TO_MONTH_NAME[zhi] || '';
  return {
    zhi,
    basis,
    when: months === 0
      ? `${zhi}月（农历${monthName}）——就在本月`
      : `${zhi}月（农历${monthName}），约 ${months} 个月后`,
    dayHint: days === 0
      ? `最近的${zhi}日就是今天（${ctx.dayGz} 已逢${zhi}）`
      : `最近的${zhi}日：约 ${days} 天后`,
  };
}

/** 「够不着」类课体各自的实义——不能一律套「没抓手」，涉害是「路路带伤」 */
const ROUGH_KE_TI: Record<string, string> = {
  昴星: '悬着没抓手，主动出手反而易失',
  遥克: '压力隔着一层、够不着，只能等或绕',
  别责: '没有正面对手也没有抓手，只能借力',
  八专: '事与己贴得太近，容易当局者迷',
  涉害: '几条路都带伤，得挑伤得最轻的那条走',
};

/** 节奏：驿马/元首/返吟主快，伏吟/旬空/够不着的课体主慢（只是节奏，不改吉凶） */
function speedOf(ke: KeResult, shape: ChuanShape): { level: '快' | '平' | '慢'; why: string } {
  const votes: { v: number; t: string }[] = [];
  const first = ke.sanChuan[0];
  const ti = ke.keTi.name;
  if (first.yiMa) votes.push({ v: 2, t: '发用正临日马，驿马主速' });
  else if (ke.sanChuan.some((s) => s.yiMa)) votes.push({ v: 1, t: '三传里带驿马，事情本身有「动」性' });
  if (ti.includes('元首')) votes.push({ v: 1, t: '元首课事由外推，按规矩走就有人接' });
  if (ti.includes('返吟')) votes.push({ v: 1, t: '返吟课翻覆，动得快但会回头' });
  if (ti.includes('伏吟')) votes.push({ v: -2, t: '伏吟课原地打转，推不动' });
  if (first.kong) votes.push({ v: -1, t: '发用落旬空，眼下不落实' });
  if (shape.kongCount >= 2) votes.push({ v: -1.5, t: `三传有 ${shape.kongCount} 支落空，要等填实` });
  // ⚠️ 只按**命中的那个**课体词写理由：返吟·涉害 里「够不着」的原因是涉害，
  //    不能拿 `name.split('·')[0]` 拼成「返吟课够不着」——那是解释错因。
  const rough = Object.keys(ROUGH_KE_TI).find((k) => ti.includes(k));
  if (rough) votes.push({ v: -1, t: `${rough}课：${ROUGH_KE_TI[rough]}，起步就慢` });
  const sum = votes.reduce((a, b) => a + b.v, 0);
  const level: '快' | '平' | '慢' = sum >= 1.5 ? '快' : sum <= -1.5 ? '慢' : '平';
  /**
   * ⚠️ 理由要能解释「这个档位」，不是「按绝对值取前两条」：
   * 曾出现「判成平，却只列了两条快因」——因为第三条反向的恰好并列绝对值被挤掉。
   * 所以：快就只列快因，慢就只列慢因，平则一快一慢各列一条。
   */
  const fast = votes.filter((v) => v.v > 0).sort((a, b) => b.v - a.v);
  const slow = votes.filter((v) => v.v < 0).sort((a, b) => a.v - b.v);
  const picked = level === '快'
    ? fast.slice(0, 2)
    : level === '慢'
      ? slow.slice(0, 2)
      : [...fast.slice(0, 1), ...slow.slice(0, 1)];
  return {
    level,
    why: picked.length ? picked.map((x) => x.t).join('；') : '三传无马、课体无速象也无阻象，按常速走',
  };
}

/**
 * 应期层。
 * @param theme 指定主题时以该类神的落点为锚；不指定则以发用为锚（未定主题时以「事之始」论）
 */
export function buildDaliurenTiming(ke: KeResult, theme?: Theme, gender?: string): DaliurenTiming {
  const shape = chuanShapeOf(ke.sanChuan);
  const speed = speedOf(ke, shape);
  const monthZhi = ke.dateInfo.monthGz[1];
  const ctx = { monthZhi, dayGz: ke.dateInfo.dayGz };
  const chongOf = (z: string) => DZ_CHONG[z] || z;
  const heOf = (z: string) => DZ_HE[z] || z;

  /* ---- 锚点：类神落点 > 发用 ---- */
  const probe = theme ? probeOf(theme, gender) : null;
  const hit = probe ? findHits(ke, probe.primary)[0] : undefined;
  const anchorZhi = hit ? hit.zhi : ke.sanChuan[0].zhi;
  const anchorWhere = hit ? `${hit.where}` : '发用（初传）';
  const anchorIsSha = hit ? false : true;
  const anchorKong = hit?.item?.kong ?? ke.sanChuan[0].kong;

  const rules: string[] = [];
  /** 先收「支 + 依据」，等全部收齐再按实际月距排序打「近/中/远」标签 */
  const raw: { zhi: string; basis: string }[] = [];
  const pushWindow = (zhi: string, basis: string) => {
    if (raw.some((w) => w.zhi === zhi)) return;
    raw.push({ zhi, basis });
  };

  const anchorBasis = anchorIsSha
    ? `未指定主题，以发用${anchorZhi}为事之始——应期取发用之支`
    : `${probe!.primary}落在${anchorWhere}（${anchorZhi}），问这件事就以它为应期之支`;
  pushWindow(anchorZhi, anchorBasis);
  rules.push(`定支：${anchorBasis}，故先看${anchorZhi}月／${anchorZhi}日。`);

  /* ---- 第二窗口：空则等填实/冲实；伏吟等冲；返吟等合；否则看末传 ---- */
  if (anchorKong) {
    const c = chongOf(anchorZhi);
    pushWindow(c, `${anchorZhi}落旬空，需「冲实」——${c}冲${anchorZhi}方可落实`);
    rules.push(`落空：${anchorZhi}逢旬空（${ke.flags.kongZhi.join('、')}空），空则等填实——要么${anchorZhi}值月值日自填，要么${c}来冲实。`);
  } else if (ke.flags.fuYin) {
    const c = chongOf(anchorZhi);
    pushWindow(c, `伏吟主静，要等${c}冲${anchorZhi}才有动静`);
    rules.push(`伏吟：天地盘重叠，静中无变——须等${c}来冲${anchorZhi}，事情才松动。`);
  } else if (ke.flags.fanYin) {
    const h = heOf(anchorZhi);
    pushWindow(h, `返吟主动而反复，${h}合${anchorZhi}时才定得住`);
    rules.push(`返吟：翻来覆去、先动后定——要等${h}与${anchorZhi}相合才收口。`);
  } else {
    const last = ke.sanChuan[2].zhi;
    if (last !== anchorZhi) {
      pushWindow(last, `末传${last}是事情的落点，结果那一头看它`);
      rules.push(`落点：末传${last}为结果所在，次看${last}月。`);
    }
  }

  /* ---- 第三窗口：三传成局取季；不成局则看中传 ---- */
  if (shape.ju) {
    const s = WX_SEASON[shape.ju.wx];
    if (s) {
      pushWindow(s.month, `三传成${shape.ju.name}，按季取${s.season}（${s.month}月起）`);
      rules.push(`成局：三传${ke.sanChuan.map((x) => x.zhi).join('')}成${shape.ju.name}，事情会聚成一件收口，应期落在${s.season}季（${s.month}月起）。`);
    }
  } else {
    const mid = ke.sanChuan[1].zhi;
    pushWindow(mid, `中传${mid}是转折所在，慢一步的事看它`);
    rules.push(`转折：三传不成局，中传${mid}主过程转折，慢的事看${mid}月。`);
  }

  /* ---- 驿马：主速，按日论 ---- */
  const maItem = ke.sanChuan.find((s) => s.yiMa);
  if (maItem) {
    rules.push(`驿马：${maItem.stage}${maItem.zhi}临日马（${ke.flags.yiMaZhi}），主快主远——问眼前的事先按「日」看，别按「月」等。`);
  } else {
    rules.push('驿马：三传无马，事情不带「快」性，按常速的月论即可。');
  }

  /* ---- 分层：主窗口（类神/发用，正法）+ 参考窗口（按真实月距排序的旁证） ----
     ⚠️ 不能让「末传＝本月」排到「类神＝10 个月后」前面：那等于让旁证抢了正法的主位，
        用户会读成「本月就该有信儿」，而判读依据明明落在类神那一支。 */
  const CIRCLED = ['①', '②', '③', '④', '⑤'];
  const mainWindow: TimingWindow = {
    ...windowOf(anchorZhi, anchorBasis, ctx),
    role: '主',
    monthGap: gapOf(monthZhi, anchorZhi),
  };
  const refWindows: TimingWindow[] = raw
    .filter((r) => r.zhi !== anchorZhi)
    .map((r) => ({ ...windowOf(r.zhi, r.basis, ctx), role: '参考' as const, monthGap: gapOf(monthZhi, r.zhi) }))
    .sort((a, b) => a.monthGap - b.monthGap)
    .slice(0, 2);
  const windows: TimingWindow[] = [mainWindow, ...refWindows];

  // 未定主题时不能说「有回音、位置定下来」——那是事业题的措辞
  const matter = theme ? MATTER_WORD[theme] : '见分晓';
  const lead = speed.level === '快'
    ? `按这张盘，事情偏「快」——${matter}最可能落在`
    : speed.level === '慢'
      ? `按这张盘，事情偏「慢」，${matter}别指望立刻见分晓，先看`
      : `按这张盘，事情按常速走，${matter}的窗口落在`;
  const summary = `${lead}${mainWindow.when}；若问的是眼前小事，按「日」看，${mainWindow.dayHint}。`;

  return {
    summary,
    speed,
    windows,
    rules: rules.map((r, i) => `${CIRCLED[i] || `${i + 1}.`} ${r}`),
    note: `应期只给「节奏与窗口」，不给具体某一天，也不作承诺：四路取法各说一层，成立的是它们的交集。另有「三传支数相加取日数」一派，本项目不采——那种精确是假的。同一件事反复起课，应期会越来越散，起一次就按它走。`,
  };
}

/** 十二宫盘上「哪一宫值得看」的提示语（页面用，不改判据） */
export function positionHints(ke: KeResult): string[] {
  const out: string[] = [];
  const gui = ke.tianDiPan.positions.find((p) => p.isGuiRen);
  if (gui) out.push(`贵人落${gui.tian}临${gui.di}——遇到麻烦先找这个人：${JIANG_PLAIN['贵人']}`);
  out.push(`你这一头看第一课：${ke.siKe[0].lowerLabel}上见${ke.siKe[0].upper}（${DZ_WX[ke.siKe[0].upper]}）`);
  out.push(`事情那一头看第三课：${ke.siKe[2].lower}上见${ke.siKe[2].upper}（${DZ_WX[ke.siKe[2].upper]}）`);
  const kong = ke.sanChuan.filter((s) => s.kong);
  if (kong.length > 0) out.push(`${kong.map((k) => k.stage + k.zhi).join('、')}落空——这几步要等到填实才算数`);
  out.push(`三传顺序即事情先后：${ke.sanChuan.map((s) => `${s.stage}${s.zhi}`).join(' → ')}`);
  return out;
}

/** 地支顺序，页面画盘时对齐用（不要在页面另写一张） */
export { DI_ZHI_ORDER };
