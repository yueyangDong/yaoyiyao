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
import { DZ_WX, SAN_HE_JU } from './diZhiRelations';
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
