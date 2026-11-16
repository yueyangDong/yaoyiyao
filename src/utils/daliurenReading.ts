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
  isYangZhi, GAN_LU, benMingOf,
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
          // ⚠️ 必须带落点：只写「X 乘 Y——主……」的话，同一颗天将乘同一六亲的盘一字不差
          //    （实测 21 张盘同一句）。「天将不改吉凶」这条口径放在页面上说一次，不逐条复读。
          detail: `${jiang}乘${liuQin}，落在${main.where}（${main.zhi}）——${JIANG_PLAIN[jiang] || ''}。`,
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
      const kongZhis = ke.sanChuan.filter((s) => s.kong).map((s) => `${s.stage}${s.zhi}`);
      evidence.push({
        label: '传空',
        // ⚠️ 必须点名是哪几步落空：只写「有 2 个落空」，几十张盘一字不差
        detail: `${kongZhis.join('、')}落空（${ke.flags.kongZhi.join('、')}空）——过程热热闹闹，结果容易停在「说了但没落地」上。`,
        weight: -1.2 * scale,
      });
    }

    const kt = keTiWeight(ke.keTi.name, theme);
    if (kt.text) {
      evidence.push({
        label: `课体·${ke.keTi.name.split('·')[0]}`,
        // ⚠️ 只说「重审课：事从内部起」不行——这一句在几十张盘上一字不差。必须带上这一次的落点
        detail: `${kt.text}这张盘按它取出${ke.sanChuan.map((s) => s.zhi).join('→')}，从${ke.sanChuan[0].zhi}起手。`,
        weight: kt.w * scale,
      });
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

/**
 * 「落到你这张盘上」的一句。
 *
 * ⚠️ `adviceOf(theme, verdict)` 是按「主题 × 档位」查表的，只有 5 个档位——
 *    于是六成以上的盘拿到同一句（实测：爱情「平」69%、亲情「平」69%）。
 *    这就是套话的定义：换个盘一字不差。所以档位句只讲「该做什么」，
 *    真正属于这张盘的那半句必须由类神落在第几步、旺衰如何来定。
 */
function dropPointOf(ke: KeResult, theme: Theme, gender?: string): string {
  const probe = probeOf(theme, gender);
  const hit = findHits(ke, probe.primary)[0];
  if (!hit) {
    return `这张盘上${probe.primary}没入三传、也不在日干支上——不是没这回事，是这次没摆到明面上，先按常规节奏走。`;
  }
  const kong = ke.flags.kongZhi.includes(hit.zhi);
  // ⚠️ 落点句**只讲结构，不讲时机、不讲「有没有劲」**。
  //    档位句已经带了时机判断（「现在就谈」「先守住」），落点句再来一句「急不来」「它没劲」
  //    就会自相矛盾——曾出现「可以加一档力度」紧接着「它眼下没劲，先养着」。
  //    所以这里只说「这一步在整条线的哪个位置、它意味着什么」，旺衰的实情交给「月建·类神」那条依据。
  const byWhere: Record<Hit['where'], string> = {
    初传: `它落在起手（${hit.zhi}）——这一步成不成，决定后面两步有没有戏`,
    中传: `它落在中间（${hit.zhi}）——两头都靠这一环接上，断了就两头空`,
    末传: `它落在收尾（${hit.zhi}）——它的样子，就是这件事最后的样子`,
    日干上神: `它压在你这一头（${hit.zhi}）——这件事的变量主要在你身上`,
    日支上神: `它落在对面那一头（${hit.zhi}）——这件事的变量主要在对方身上`,
  };
  return `${byWhere[hit.where]}${kong ? `；不过${hit.zhi}这支还在旬空，眼下说的都是「还没落实」的部分` : ''}。`;
}

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
    advice: `${adviceOf(theme, verdict)}${dropPointOf(ke, theme, gender)}`,
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

/* ------------------------------------------------------------------ *
 * 行动层：把「驿马主快」「贵人临亥」翻成「找谁、往哪、怎么做、别踩哪」
 *
 * ⚠️ 为什么单独一层：吉凶说「会怎么样」，应期说「什么时候」，都还没回答用户
 *    关掉页面之前最想问的那句——「所以我现在该干什么」。但这一层**不许生新判据**：
 *    每一条都必须由盘面已有事实推出来（贵人落宫、驿马支、类神乘的天将、课体、
 *    旬空、四课上下关系），并且把这些事实写进 basis 让用户能自己核对。
 *
 * ⚠️ 也不许越界：占卜不给医疗/法律/财务的指令，只给「找谁、往哪个方向、
 *    用什么方式开口」这类可核对的行动，判断权始终在用户手里。
 * ------------------------------------------------------------------ */

export interface DaliurenAction {
  /**
   * 谁出面 = 年命层（只在你填了出生信息时才有）：
   * 它和「找人」不是一回事——「找人」说的是去哪一类人里借力，
   * 「谁出面」说的是这件事该你本人去，还是得有人替你先开口。
   * 两个都挂「找人」会让用户以为页面写重复了，所以单独一类。
   */
  kind: '找人' | '方向' | '方式' | '避坑' | '谁出面';
  /** 具体做什么（一句话，可执行） */
  action: string;
  /** 盘面依据（必须含具体支/天将/课体，能被用户核对） */
  basis: string;
}

/** 地支 → 方位（后天八卦方位，子正北；地支固定方位，不随盘变） */
const ZHI_DIRECTION: Record<string, string> = {
  子: '正北', 丑: '东北偏北', 寅: '东北偏东', 卯: '正东',
  辰: '东南偏东', 巳: '东南偏南', 午: '正南', 未: '西南偏南',
  申: '西南偏西', 酉: '正西', 戌: '西北偏西', 亥: '西北偏北',
};

/** 天将 → 该找的是「哪一类人」。只描述人的属性，不判吉凶 */
const JIANG_PERSON: Record<string, string> = {
  贵人: '有位置、能拍板的前辈或上级',
  螣蛇: '消息灵通的中间人（听消息，别全信）',
  朱雀: '能写能说的人——文书、法务、经办窗口',
  六合: '能牵线的中间人——客户介绍、同行引荐、共同朋友',
  勾陈: '管旧账、跑流程的老经办',
  青龙: '手上有资源或预算的东家',
  天空: '只会许诺的人（他的话一定要落到纸上）',
  白虎: '能办硬事的人——一线负责人、执法、医、工程',
  太常: '管后勤与日常的人（饭桌上谈成的事多在他手上）',
  玄武: '暗处的人（可以听，别托付）',
  太阴: '不露面却说得上话的内助',
  天后: '女性长辈或照料型的人',
};

/**
 * ⚠️ 健康题的天将不能套上面那张表：
 * 「官鬼乘勾陈」在事业题是「跑流程的老经办」，在健康题却是「老病历」——
 * 同一颗星换个主题就是另一类人。这就是「该分档却写死」的硬错，必须单独一张。
 */
const JIANG_PERSON_MED: Record<string, string> = {
  贵人: '有经验的主任级医生（别在小诊所反复试）',
  螣蛇: '让你越查越慌的那条线——认准一家把检查做完整',
  朱雀: '能把病历与报告讲清楚的人（复查、转诊靠他）',
  六合: '能帮你约上号、接上人的熟人',
  勾陈: '掌握旧病历、旧检查结果的老医生',
  青龙: '愿意给你好资源的一方（好科室、好设备）',
  天空: '别信「包好」「马上见效」这类许诺',
  白虎: '要动手处置的那一类——外科、急诊、该做的检查',
  太常: '偏调理与日常起居的那一类（营养、作息、康复）',
  玄武: '有没说清的症状——把既往资料带全，别漏说',
  太阴: '细心、愿意听你说完的医护',
  天后: '照料型的医护或家人（能陪你去的那种）',
};

/** 爱情题同理：「暗处的人」在感情里是「没说清的第三方」，不是合作方 */
const JIANG_PERSON_LOVE: Record<string, string> = {
  贵人: '双方都敬重的长辈或介绍人',
  螣蛇: '爱传话的人（听一半就好）',
  朱雀: '会说话、会递话的中间人',
  六合: '现成的牵线人——共同朋友、同事、介绍人',
  勾陈: '牵着旧关系的人（前任、旧账相关）',
  青龙: '条件不错的介绍对象',
  天空: '许诺多、兑现少的人',
  白虎: '脾气硬的人——硬碰只会更僵',
  太常: '常来往的熟人（饭局上的介绍最有效）',
  玄武: '有第三方没说清的人或事',
  太阴: '不露面却说得上话的人（她的闺蜜、家人）',
  天后: '女性长辈或她的好友',
};

/** 课体 → 这件事该用什么方式推（只说动作，不说好坏；措辞要能跨主题通用） */
const KE_TI_ACTION: Record<string, string> = {
  元首: '按正规路子走：该走的程序走完，别一上来就托关系绕开它',
  重审: '先把内部或自己这一头理顺，再往外推。外部推不动，通常是里面还没通',
  比用: '两条路都通，选与你气场更像的那条走到底，别脚踩两条船',
  涉害: '几条路都带伤，挑伤得最轻的那条走，别追求最优解',
  遥克: '目标隔着一层，先找中间人搭桥，别直接冲上去',
  昴星: '先别出手，等对方给信号。这阶段越主动越被动',
  别责: '没有正面对手，去借力——借人、借平台、借名头',
  八专: '事与己贴得太近，先拉开一段时间或换个位置再看',
  伏吟: '别推。该做的做完就停，硬推只会在原地消耗',
  返吟: '别反复改主意：定了就执行，改到第三次事情就散了',
};

/**
 * 各主题「这件事」指代什么——让「找人」那句落在具体事上
 */
const THEME_TARGET: Record<Theme, string> = {
  事业: '你想要的这个位置或项目',
  爱情: '你想要的这段关系',
  亲情: '家里这件事',
  财运: '这笔钱或这个单子',
  健康: '这次的身体问题',
  学业: '这场考试或这份材料',
};

/**
 * 「这一步是空的」该怎么落地——同样必须分主题。
 * ⚠️ 让问健康的人「别付钱」、让问感情的人「定金再谈」，就是把财务话术套到别处去了。
 */
const KONG_TIP: Record<Theme, string> = {
  事业: '先别表态、别签字，把话落到纸面或一张定金上再谈',
  爱情: '先别摊牌、别定关系，等对方把话说到明处',
  亲情: '先别一口答应，把话问到底再说',
  财运: '先别付钱、别投，等钱或合同真到位',
  健康: '结果没出来之前别自己下结论，也别急着定方案',
  学业: '先别急着报名或交材料，等条件确认清楚再递',
};

/**
 * 行动层。产出 4~5 条，每条都带盘面依据。
 * @param theme 决定「找的是哪一类人」与事件指代；缺省按事业口径
 * @param birth 档案里的出生信息（可选）。给了才出「年命」那一条——只用来定「你自己出面还是托人」，
 *              不参与吉凶计分；没给就静默跳过，不写「你没填生日」那种兜底话。
 *              ⚠️ 结构上直接传 `UserProfile` 即可（多余字段无所谓），本文件不依赖 UserContext。
 */
export interface BirthInput {
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  birthCalendar?: 'solar' | 'lunar' | null;
}

export function buildDaliurenActions(
  ke: KeResult, theme?: Theme, gender?: string, birth?: BirthInput,
): DaliurenAction[] {
  const t: Theme = theme || '事业';
  const probe = probeOf(t, gender);
  const hit = findHits(ke, probe.primary)[0];
  const dir = (z: string) => ZHI_DIRECTION[z] || '';
  const out: DaliurenAction[] = [];

  /* ---------- ① 找谁 ---------- */
  // ⚠️ 天将取人必须按主题分表：同一颗「勾陈」在事业是跑流程的经办，在健康是老病历。
  // ⚠️ 而且「凶将」不能当「去找的人」：天空/玄武/白虎/螣蛇描述的是风险，不是人选
  //    ——写出「去找暗处的人」「去找有第三方没说清的人」就是逻辑错位。
  const personTable = t === '健康' ? JIANG_PERSON_MED : t === '爱情' ? JIANG_PERSON_LOVE : JIANG_PERSON;
  const HAZARD_JIANG = ['天空', '玄武', '白虎', '螣蛇'];
  const PERSON_FALLBACK: Record<Theme, string> = {
    事业: '贵人', 爱情: '六合', 健康: '贵人', 亲情: '贵人', 财运: '青龙', 学业: '朱雀',
  };
  // ⚠️ 天将在天地盘上「按天盘支」挂，不按「在哪一课挂」：类神从三传取到时直接读，
  //    从四课取到时要回天地盘查同一支的天将——否则会写出「官鬼乘（这一颗主风险…）」这种断句。
  const jiangOfZhi = (z: string) => ke.tianDiPan.positions.find((p) => p.tian === z)?.jiang || '';
  const jiang = hit ? (hit.item?.tianJiang || jiangOfZhi(hit.zhi)) : '';
  const cheng = jiang ? `乘${jiang}` : '';
  const usablePerson = jiang && personTable[jiang] && !HAZARD_JIANG.includes(jiang) ? personTable[jiang] : '';
  if (hit && usablePerson) {
    out.push({
      kind: '找人',
      action: `先去找「${usablePerson}」这一类人——${THEME_TARGET[t]}要多借一道手，别一个人扛。`,
      basis: `${probe.primary}${cheng}落${hit.where}（${hit.zhi}），这类人在${dir(hit.zhi)}；方位只是参照，圈子对得上更重要。`,
    });
  } else {
    const fallbackKey = PERSON_FALLBACK[t];
    const fallbackPerson = personTable[fallbackKey];
    const guiZhi = ke.tianDiPan.guiRenZhi;
    const why = !hit
      ? `${probe.primary}不入三传也不上日干支`
      : jiang
        ? `${probe.primary}${cheng}（这一颗主风险，不是人选）`
        : `${probe.primary}落${hit.where}（${hit.zhi}），未取到天将`;
    out.push({
      kind: '找人',
      action: `这张盘上「帮你的人」还没现形，就先按「${fallbackPerson}」去找——${THEME_TARGET[t]}从${dir(ke.tianDiPan.guiRenOnDi)}这一头问起（贵人临${ke.tianDiPan.guiRenOnDi}），找对人比做对事省力。`,
      basis: `${why}；贵人（${guiZhi}）临地盘${ke.tianDiPan.guiRenOnDi}，在${dir(ke.tianDiPan.guiRenOnDi)}，先从这一头问路。`,
    });
  }

  /* ---------- ①′ 谁出面（年命 · 本命上神） ---------- */
  // 古法：「本命，定位不移者也。命上神将为坐命神将」「年命上神可生克制化三传一切物事」，
  // 又「命上神空亡，一生无成」。断法上讲的是吉凶，但行动层不判吉凶——
  // 这里只取「命上神 ↔ 类神」这一对生克，回答的是**这件事该你自己出面还是托人**。
  // ⚠️ 不取行年：三说互斥，见 daliurenCore.benMingOf 的注释。
  const bm = birth ? benMingOf(birth.birthYear, birth.birthMonth, birth.birthDay, birth.birthCalendar || 'solar') : null;
  if (bm) {
    const seat = ke.tianDiPan.positions.find((p) => p.di === bm.zhi);
    const shangShen = seat?.tian || '';
    const zuoJiang = seat?.jiang || '';
    const shangKong = !!shangShen && ke.flags.kongZhi.includes(shangShen);
    const inChuan = ke.sanChuan.find((s) => s.zhi === bm.zhi);
    const mingWx = DZ_WX[shangShen] || '';
    const leiWx = hit ? (DZ_WX[hit.zhi] || '') : '';
    const rel: '克它' | '生它' | '被它克' | '被它生' | '比和' | '无' = !mingWx || !leiWx
      ? '无'
      : mingWx === leiWx ? '比和'
        : WX_KE[mingWx] === leiWx ? '克它'
          : WX_KE[leiWx] === mingWx ? '被它克'
            : WX_SHENG[mingWx] === leiWx ? '生它'
              : WX_SHENG[leiWx] === mingWx ? '被它生' : '无';

    // 措辞只说「谁去办」：不许出现成不成、快不快 —— 那是判读层的事。
    // ⚠️ 而且必须带上具体支（本命支 / 命上神 / 类神支），否则 5 种关系只够拼出 5 句话，
    //    换个盘一字不差 = 套话。实测第一版 action 只有 10 种、最高频占 29%，就是没带支。
    // ⚠️ 别写「子上坐白虎」：子是本命（地盘位），坐上去的是天盘支，天将挂在**天盘支**上。
    //    所以句子里必须把「上见何支」和「此支乘何将」分开说，否则用户对着盘核对不上。
    const ton = JIANG_TONE[zuoJiang] ?? 0;
    const zuoTip = ton > 0
      ? `你这一头（本命${bm.zhi}上见${shangShen}）坐${zuoJiang}，直接自己出面递话，别绕中间人。`
      : ton < 0
        ? `你自己出面容易把话说僵——本命${bm.zhi}上见${shangShen}乘${zuoJiang}，找个中间人陪你开口。`
        : `你自己跑流程、递材料最合适——本命${bm.zhi}上见${shangShen}乘${zuoJiang}，别转手。`;
    const byRel: Record<typeof rel, string> = {
      克它: `这件事你自己出面比托人快——你这一头（${bm.zhi}上见${shangShen}）压得住${hit?.zhi}那一头。`,
      比和: `你自己去谈就行——${bm.zhi}上见${shangShen}，与${hit?.zhi}同一股气，话对得上。`,
      被它克: `你先别自己冲在前头——${hit?.zhi}那一头正压着你这一头（${bm.zhi}上见${shangShen}），找个中间人替你先开口。`,
      被它生: `不用你追着跑——${hit?.zhi}那一头在生你这一头（${bm.zhi}上见${shangShen}），让对方先开口。`,
      生它: `你自己推得动，但要出力——你这一头（${bm.zhi}上见${shangShen}）在往${hit?.zhi}那头送，别指望对方主动。`,
      无: zuoTip,
    };
    const lead = shangKong
      ? `你本人这一头眼下是「空」的——话说出去暂时不算数，先托人递话，等${shangShen}填实了再自己出面。`
      : byRel[rel];
    const relWord: Record<typeof rel, string> = {
      克它: '克', 生它: '生', 被它克: '被克于', 被它生: '受生于', 比和: '比和于', 无: '无从比',
    };
    out.push({
      kind: '谁出面',
      action: lead,
      basis: `本命${bm.zhi}（${bm.ganZhi}年${bm.approximate ? '，按公历年未分立春' : ''}），命上神${shangShen}${zuoJiang ? `乘${zuoJiang}` : ''}${shangKong ? '（落旬空）' : ''}；${rel === '无' ? `${probe.primary}不入三传、也不上日干支，只能在命上论` : `此支${mingWx}${relWord[rel]}类神${probe.primary}之${hit?.zhi}（${leiWx}）`}${inChuan ? `；本命正入${inChuan.stage}` : ''}。`,
    });
  }

  /* ---------- ② 往哪 ---------- */
  const ma = ke.sanChuan.find((s) => s.yiMa);
  if (ma) {
    out.push({
      kind: '方向',
      action: `要动就往${dir(ma.zhi)}动——换场地、出差、走一趟见人，都比在原地等强。`,
      basis: `${ma.stage}${ma.zhi}临日马（日支${ke.dateInfo.dayZhi}的马在${ke.flags.yiMaZhi}），驿马主「动」，这个方向最省力。`,
    });
  } else {
    // ⚠️ 锚点不能落在旬空之支上：空是「暂时不落实」，拿它指方向等于指了个虚位。
    const kongZhi = ke.flags.kongZhi;
    const firstLive = ke.sanChuan.find((s) => !s.kong)?.zhi || ke.sanChuan[0].zhi;
    const hitIsKong = !!hit && kongZhi.includes(hit.zhi);
    const focusZhi = hit && !hitIsKong ? hit.zhi : firstLive;
    const anchorBy = hit
      ? (hitIsKong ? `${probe.primary}落${hit.zhi}，但${hit.zhi}旬空、不作着力点` : `${probe.primary}落此`)
      : `取三传中不空的${focusZhi}（发用之支）`;
    out.push({
      kind: '方向',
      action: `这件事的着力点在${dir(focusZhi)}——相关的人、场合、机会往那个方向找；三传无马，不必刻意远行。`,
      basis: `锚定${focusZhi}（${anchorBy}），三传${ke.sanChuan.map((s) => s.zhi).join('/')}无驿马。`,
    });
  }

  /* ---------- ③ 怎么做（课体定方式） ---------- */
  const tiWord = Object.keys(KE_TI_ACTION).find((k) => ke.keTi.name.includes(k));
  if (tiWord) {
    const c0 = ke.sanChuan[0];
    const kongHit = c0.kong || (hit?.item?.kong ?? false);
    out.push({
      kind: '方式',
      // ⚠️ 「空」的提醒也必须分主题：让问健康的人「别付钱」、让问感情的人「定金再谈」都是错位
      action: `${KE_TI_ACTION[tiWord]}。${kongHit ? `而且现在这一步是「空」的——${KONG_TIP[t]}。` : ''}`,
      basis: `课体${ke.keTi.name}，发用${c0.dunGan}${c0.zhi}${kongHit ? `；${c0.kong ? '发用' : '类神'}落旬空（${ke.flags.kongZhi.join('、')}空）` : ''}。`,
    });
  }

  /* ---------- ④ 别踩哪里 ---------- */
  const ganUp = ke.siKe[0].upper;
  const zhiUp = ke.siKe[2].upper;
  const guiWx = DZ_WX[ganUp];
  const shiWx = DZ_WX[zhiUp];
  const kongCount = ke.sanChuan.filter((s) => s.kong).length;
  if (shiWx && guiWx && WX_KE[shiWx] === guiWx) {
    out.push({
      kind: '避坑',
      action: '别硬顶：对面正在压你这一头，硬碰只会更僵——换时间、换场合、或换一个层级去谈。',
      basis: `第三课上神${zhiUp}（${shiWx}）克第一课上神${ganUp}（${guiWx}），压力是从对面过来的。`,
    });
  } else if (kongCount >= 2) {
    out.push({
      kind: '避坑',
      action: '现在多数的「进展」都还悬着——别提前庆祝，也别提前投入；等落地了再动。',
      basis: `三传里 ${kongCount} 支落旬空（${ke.flags.kongZhi.join('、')}空），过程热但结果没落实。`,
    });
  } else if (jiang === '白虎' || jiang === '玄武' || jiang === '天空') {
    // 同一颗天将，在健康/爱情里提醒的是完全不同的事
    const tip = t === '健康'
      ? (jiang === '白虎' ? '别硬扛——该做的检查别拖，能动刀的别拖成慢病'
        : jiang === '玄武' ? '症状里有没说清的部分，别自己按感觉定性'
          : '别信「包好」「一次就好」这类许诺')
      : t === '爱情'
        ? (jiang === '玄武' ? '这段里还有没说清的第三方，先弄清再动'
          : jiang === '白虎' ? '硬碰只会更僵，缓一缓再看'
            : '对方许诺多、兑现少，先看他做了什么')
        : `这条线上${jiang === '白虎' ? '有硬碰硬的成分' : jiang === '玄武' ? '有没说清的部分' : '口惠多于实惠'}——别把底牌先亮出来`;
    out.push({
      kind: '避坑',
      action: `${tip}。`,
      basis: `类神${probe.primary}乘${jiang}，天将只定气质、定不了成不成，但提醒你留一手。`,
    });
  } else if (ke.flags.fuYin) {
    out.push({
      kind: '避坑',
      action: '别在这段时间做「大动作」——换方向、签约、摊牌都往后放，先守住手里已有的。',
      basis: '伏吟课天地盘重叠，静中无变；这阶段的动作多半花在原地。',
    });
  } else {
    // ⚠️ 「无坑」是多数盘的结局（约六成）。若只给一句固定话，这层等于没讲——
    //    必须落到这张盘的具体支上：气顺的、有劲的、都没劲的，三种说法。
    const monthZhi = ke.dateInfo.monthGz[1];
    const lvList = ke.sanChuan.map((s) => ({ zhi: s.zhi, lv: wangShuaiOf(s.zhi, monthZhi).level }));
    const best = lvList.find((x) => x.lv === '旺') || lvList.find((x) => x.lv === '相');
    const tip = chuanShapeOf(ke.sanChuan).diSheng
      ? `盘上没有硬坑，气还是顺的（${ke.sanChuan.map((s) => s.zhi).join('→')}一路相生）——顺着走完就行，别自己加戏。`
      : best
        ? `盘上没有硬坑：${best.zhi}这一步最有劲（${best.lv}），把它做到底，别同时开三条线。`
        : '盘上没有硬坑，可三步的劲都差不多（都不当令）——那就别自己造：别反复起课问同一件事，也别把结论当承诺。';
    out.push({
      kind: '避坑',
      action: tip,
      basis: kongCount === 0
        ? `三传${ke.sanChuan.map((s) => s.zhi).join('/')}都不落旬空（${ke.flags.kongZhi.join('、')}空），四课上下也无单向压制。`
        : `三传${ke.sanChuan.map((s) => s.zhi).join('/')}里落旬空的只有 ${kongCount} 支（${ke.flags.kongZhi.join('、')}空），四课上下也无单向压制。`,
    });
  }

  return out;
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

/* ------------------------------------------------------------------ *
 * 课格：这张盘的「气象」
 *
 * ⚠️ 与「课体」不是一个维度，别混：
 *   课体（九宗门/结构课）回答「三传是怎么取出来的」——元首、涉害、伏吟……
 *   课格（这里）回答「这张盘整体长什么样」——成局、连茹、递生、得令、禄、六纯……
 *   所以课格**不改课体、不改分值**，只作盘面速览；分数仍由判读层按类神算。
 *   这样加宽判据也不会动到 `hepanCalibration` 那类分布锚点。
 * ------------------------------------------------------------------ */

export interface KeGeItem {
  /** 格名（页面直接当小标题） */
  name: string;
  /** 白话：这张盘的气象 */
  plain: string;
  /** 盘面依据（必须能被用户对着盘核） */
  basis: string;
}

/**
 * 三传成局五格：三合四局 + 稼穑。
 * 古法只认「三传全见此局三支」为成局，缺一支算半合、不论格。
 */
const JU_GE: Record<string, { name: string; plain: string }> = {
  木: { name: '曲直格', plain: '这条线是「往上长」的：一步一步长起来，急不来，但只要根还在就停不住。' },
  火: { name: '炎上格', plain: '这条线是「烧起来」的：起得快、蹿得也快，成不成看后面还有没有柴。' },
  金: { name: '从革格', plain: '这条线是「重铸」的：旧样子保不住，得改个形才成——不破不立。' },
  水: { name: '润下格', plain: '这条线是「往下流」的：顺着地势越走越顺，硬拦反而淤住。' },
  土: { name: '稼穑格', plain: '这条线是「盘整」的：来回搬、慢慢攒，没有大起落，靠的是耐性和存量。' },
};

const TU_ZHI = ['辰', '戌', '丑', '未'];

/**
 * 六亲的「人事短名」。课格不随主题变，措辞就不能带行业色彩——
 * 官鬼不能只写「职位」（问健康的盘上它是病），所以取一个两边都说得通的词。
 */
const QIN_SHORT: Record<string, string> = {
  父母: '人事与文书', 兄弟: '同辈与合力', 子孙: '产出与转机', 妻财: '钱与实物', 官鬼: '压力与位子',
};

const LV_SCORE: Record<string, number> = { 旺: 2, 相: 1.5, 休: -1, 囚: -1.5, 死: -2 };

/**
 * 盘面速览。每条都落在可核对的事实上，不出空话、不产分数。
 *
 * ⚠️ 每条 plain 都必须带这张盘的具体支／步位／旺衰。
 *    只写「这个格意味着什么」就是套话——换个盘一字不差（审计见 docs/daliuren.md §七）。
 * @returns 至少一条（贵人顺逆恒在），最多七条
 */
export function buildKeGe(ke: KeResult): KeGeItem[] {
  const out: KeGeItem[] = [];
  const [c, z, m] = ke.sanChuan;
  const zhis = ke.sanChuan.map((s) => s.zhi);
  const zhiText = zhis.join('/');
  const monthZhi = ke.dateInfo.monthGz[1];
  const dayGan = ke.dateInfo.dayGan;
  const iOf = (x: string) => DI_ZHI_ORDER.indexOf(x);
  const gap = (a: string, b: string) => ((iOf(b) - iOf(a)) % 12 + 12) % 12;
  const dir = (x: string) => ZHI_DIRECTION[x] || '';
  const qin = (x: string) => QIN_SHORT[liuQinOf(dayGan, x)] || liuQinOf(dayGan, x);

  // 三传旺衰：哪一步最有劲、哪一步最使不上力（成局、连茹、得令三处共用）
  const levels = ke.sanChuan.map((s) => wangShuaiOf(s.zhi, monthZhi).level);
  const scores = levels.map((l) => LV_SCORE[l] ?? 0);
  let hi = 0;
  let lo = 0;
  scores.forEach((v, i) => {
    if (v > scores[hi]) hi = i;
    if (v < scores[lo]) lo = i;
  });
  const flat = levels.every((l) => l === levels[0]);
  const juTail = flat
    ? `三支在${monthZhi}月同为「${levels[0]}」，整局一起快或一起慢，没有哪一步能抄近路。`
    : `三支里${zhis[hi]}在「${levels[hi]}」、${zhis[lo]}在「${levels[lo]}」——力气往${zhis[hi]}那一步放，${zhis[lo]}那一步别硬推。`;

  /* ① 三传成局 */
  const ju = SAN_HE_JU.find((j) => j.branches.every((b) => zhis.includes(b)));
  if (ju) {
    out.push({
      name: JU_GE[ju.wx].name,
      plain: `${JU_GE[ju.wx].plain}${juTail}`,
      basis: `三传${zhiText}恰成${ju.name}——三合全见，才论成局。`,
    });
  } else if (zhis.every((x) => TU_ZHI.includes(x))) {
    out.push({
      name: JU_GE.土.name,
      plain: `${JU_GE.土.plain}${juTail}`,
      basis: `三传${zhiText}皆土（辰戌丑未），无木火金水相杂。`,
    });
  }

  /* ② 三传连茹：三支在十二支上依次相连（顺为进、逆为退） */
  const d1 = gap(c.zhi, z.zhi);
  const d2 = gap(z.zhi, m.zhi);
  const rising = scores[0] < scores[1] && scores[1] < scores[2];
  const falling = scores[0] > scores[1] && scores[1] > scores[2];
  if (d1 === 1 && d2 === 1) {
    out.push({
      name: '进连茹',
      plain: `事情一格一格往前挪：${c.zhi}→${z.zhi}→${m.zhi}，慢，但每一步都算数。${
        rising ? '而且一步比一步有劲，后段才是你的发力点。'
          : falling ? '只是三步一步比一步薄，头一段最该抓紧。'
            : `三步的劲分别在${levels.join('/')}，快慢差不多，稳着走就行。`
      }`,
      basis: `三传${zhiText}在十二支上依次顺连（${c.zhi}→${z.zhi}→${m.zhi}）。`,
    });
  } else if (d1 === 11 && d2 === 11) {
    out.push({
      name: '退连茹',
      plain: `事情一格一格往回退：${c.zhi}→${z.zhi}→${m.zhi}，先收再谈，硬往前顶只会退得更多。${
        rising ? '好在越往回退越有劲，退到后面反而站得住。'
          : falling ? '而且一步比一步薄，越拖越没有本钱，早收手早省。'
            : `三步的劲分别在${levels.join('/')}，退得平，不必慌。`
      }`,
      basis: `三传${zhiText}在十二支上依次逆连（${c.zhi}→${z.zhi}→${m.zhi}）。`,
    });
  }

  /* ③ 三传递生 / 递克：气一路顺下去，或一路耗下去 */
  const shape = chuanShapeOf(ke.sanChuan);
  const wxText = zhis.map((x) => DZ_WX[x]).join('→');
  if (shape.diSheng) {
    out.push({
      name: '递生',
      plain: `起点${c.zhi}（${qin(c.zhi)}）→ 落点${m.zhi}（${qin(m.zhi)}）：前面花的功夫不会白费，它会在后面变成助力，你只管把第一段做扎实。`,
      basis: `三传${zhiText}的五行依次为${wxText}，一环生一环，贯到底。`,
    });
  } else if (shape.diKe) {
    out.push({
      name: '递克',
      plain: `起点${c.zhi}（${qin(c.zhi)}）→ 落点${m.zhi}（${qin(m.zhi)}）：每一段都在消耗上一段的成果，别指望滚雪球，收一段就落袋一段。`,
      basis: `三传${zhiText}的五行依次为${wxText}，一环克一环，越往后越薄。`,
    });
  }

  /* ④ 三传得令 / 失令（以月建为司令，只看三传整体，不管类神）
     ⚠️ 阈值不能定成「休囚死 ≥2」——十二支里旺相恒只占四支，那条判据几乎**每张盘都成立**，
        于是每盘都写「眼下只使得出一半」，把常态说成不利。这里取两端：
        旺相 ≥2 才算得令；三支**全部**休囚死才算失令；中间态（1 旺 2 衰）是常态，不出。 */
  const uniqZhi = (arr: string[]) => Array.from(new Set(arr));
  // ⚠️ 三传可能有重复支（伏吟/返吟），不去重会写出「寅、寅在亥月正当令」
  const strongZhis = uniqZhi(zhis.filter((_, i) => levels[i] === '旺' || levels[i] === '相'));
  const weakZhis = uniqZhi(zhis.filter((_, i) => levels[i] !== '旺' && levels[i] !== '相'));
  const strong = strongZhis.length;
  const weak = levels.filter((l) => l === '休' || l === '囚' || l === '死').length;
  if (strong >= 2) {
    out.push({
      name: '三传得令',
      plain: `${strongZhis.join('、')}在${monthZhi}月正当令——动这几步，力气不白花。${weakZhis.length > 0 ? `${weakZhis.join('、')}还没到时候，先放着。` : '三步都在令上，是少见的顺风。'}`,
      basis: `月建${monthZhi}，三传${zhiText}的旺衰为${levels.join('/')}，${strong} 支旺相。`,
    });
  } else if (weak === 3) {
    out.push({
      name: '三传失令',
      plain: `${zhiText}这三步在${monthZhi}月都是休囚死：不是事情不对，是月份还没轮到它们——先备料、别硬推，等月令走到再动。`,
      basis: `月建${monthZhi}，三传${zhiText}的旺衰为${levels.join('/')}，三支皆休囚死。`,
    });
  }

  /* ⑤ 干支上神的关系：断课时第一眼看的是「我这一头」与「事情那一头」对不对得上 */
  const woZhi = ke.siKe[0].upper;   // 日干上神（我）
  const shiZhi = ke.siKe[2].upper;  // 日支上神（事/对方）
  if (DZ_HE[woZhi] === shiZhi) {
    out.push({
      name: '干支上神相合',
      plain: `你这一头是${woZhi}（${qin(woZhi)}），对面是${shiZhi}（${qin(shiZhi)}）——两边合得上，现在缺的只是一句明话。`,
      basis: `日干上神${woZhi}与日支上神${shiZhi}为六合（${woZhi}${shiZhi}合）。`,
    });
  } else if (DZ_CHONG[woZhi] === shiZhi) {
    out.push({
      name: '干支上神相冲',
      plain: `你这一头是${woZhi}（${qin(woZhi)}），对面是${shiZhi}（${qin(shiZhi)}）——两边是顶着的，先别急着定调，给自己留半天再回话。`,
      basis: `日干上神${woZhi}与日支上神${shiZhi}相冲（${woZhi}${shiZhi}冲）。`,
    });
  }

  /* ⑥ 三传财官印俱全 —— 只有这一种六亲分布值得单出。
     ⚠️ 曾写「三传三类」与「三传同一类」，两条都被删掉：
        三传六亲三类全异是常态（约六成盘），写出来等于套话；
        而「六亲全同」只可能发生在「三传同五行」，那必然已经是成局格（三合或稼穑），
        再单出一条就是同一件事说两遍。 */
  const kins = ke.sanChuan.map((s) => s.liuQin);
  const uniqKins = Array.from(new Set(kins));
  if (uniqKins.length === 3 && ['妻财', '官鬼', '父母'].every((k) => uniqKins.includes(k))) {
    const at = (q: string) => {
      const i = kins.indexOf(q);
      return `${zhis[i]}（${ke.sanChuan[i].stage}）`;
    };
    out.push({
      name: '三传财官印全',
      plain: `钱看${at('妻财')}、位子看${at('官鬼')}、文书看${at('父母')}——三样各占一步，缺哪一步就先补哪一步。`,
      basis: `三传${zhiText}的六亲依次为${kins.join('/')}，财、官、印三类俱全。`,
    });
  }

  /* ⑦ 禄：日干的禄位落在哪一头。措辞不带行业色彩——同一张盘可能在问健康 */
  const luZhi = GAN_LU[dayGan] || '';
  const luIdx = luZhi ? zhis.indexOf(luZhi) : -1;
  if (luIdx >= 0) {
    out.push({
      name: '禄入三传',
      plain: `${luZhi}是你吃饭的本事，它落在${ke.sanChuan[luIdx].stage}——说明这件事本身就是你的本钱，不是额外捡来的好处。`,
      basis: `日干${dayGan}的禄在${luZhi}，正是${ke.sanChuan[luIdx].stage}。`,
    });
  } else if (luZhi && (ke.siKe[0].upper === luZhi || ke.siKe[2].upper === luZhi)) {
    out.push({
      name: '禄临日辰',
      plain: `${luZhi}正好压在${ke.siKe[0].upper === luZhi ? '你这一头' : '对方那一头'}上：能用的东西已经在手边，先把手头这些用足，比另开一条路快。`,
      basis: `日干${dayGan}的禄在${luZhi}，正好是${ke.siKe[0].upper === luZhi ? '日干上神' : '日支上神'}。`,
    });
  }

  /* ⑥ 六纯：四课上神 + 三传共七支全阳或全阴（罕见，有则出） */
  const allZhi = [...ke.siKe.map((k) => k.upper), ...zhis];
  if (allZhi.every((x) => isYangZhi(x))) {
    out.push({
      name: '六纯·纯阳',
      plain: `七支全阳（${allZhi.join('/')}），连${woZhi}和${shiZhi}都是阳支：事情摆在明处、推得动，两边也都硬，谁先软一步谁先得。`,
      basis: `四课上神与三传（${allZhi.join('/')}）全为阳支。`,
    });
  } else if (allZhi.every((x) => !isYangZhi(x))) {
    out.push({
      name: '六纯·纯阴',
      plain: `七支全阴（${allZhi.join('/')}），连${woZhi}和${shiZhi}都是阴支：在暗处酝酿，慢，但一旦成形就不好改，别指望临时翻盘。`,
      basis: `四课上神与三传（${allZhi.join('/')}）全为阴支。`,
    });
  }

  /* ⑦ 贵人顺逆：恒有一条，作这层的底 */
  out.push({
    name: ke.tianDiPan.forward ? '贵人顺布' : '贵人逆布',
    plain: ke.tianDiPan.forward
      ? `贵人落${ke.tianDiPan.guiRenZhi}、临${ke.tianDiPan.guiRenOnDi}，天将顺排：帮你的人在前面——往${dir(ke.tianDiPan.guiRenOnDi)}这一头、往新关系上找，别人牵线比自己去撞有效。`
      : `贵人落${ke.tianDiPan.guiRenZhi}、临${ke.tianDiPan.guiRenOnDi}，天将逆排：帮忙的人在后头——往${dir(ke.tianDiPan.guiRenOnDi)}这一头的旧关系里找，老同事、老上级比新面孔管用。`,
    basis: `贵人${ke.tianDiPan.guiRenZhi}临地盘${ke.tianDiPan.guiRenOnDi}，十二天将${ke.tianDiPan.forward ? '顺' : '逆'}布。`,
  });

  return out;
}

/** 地支顺序，页面画盘时对齐用（不要在页面另写一张） */
export { DI_ZHI_ORDER };