// ========== 四柱神煞计算（修正扩充版） ==========
// 规则依据：《三命通会》《渊海子平》通行查法，并对照 GitHub 开源命理排盘项目
// （6tail/lunar-javascript、SylarLong/iztro 等生态中的通行神煞表）校对。
//
// 修正记录（相对旧版 Bazi.tsx 内置 calcShenSha）：
// 1. 空亡：旧表只按日支查、忽略天干（癸酉日误作午未空）→ 改为按日柱干支推旬空
// 2. 金神：旧版缺失 → 补充（日柱或时柱见乙丑/己巳/癸酉）
// 3. 天德贵人：旧版只查天干 → 补查地支（卯月申/午月亥/子月巳/酉月寅）
// 4. 国印贵人：旧表错误 → 改为禄前九位（甲戌、乙亥、丙丑、丁寅、戊丑、己寅、庚辰、辛巳、壬未、癸申）
// 5. 福星贵人：旧表错误 → 改为通行口诀表（甲丙寅/子、乙癸丑/卯、戊申、己未、丁亥、庚午、辛巳、壬辰）
// 6. 魁罡：旧版误含壬戌 → 改为庚辰、庚戌、壬辰、戊戌，且仅日柱论
// 7. 贵人类神煞（天乙/文昌/太极/国印/福星/学堂/词馆）改为年干或日干双查
// 8. 羊刃仅论阳干，阴干同位另标"阴刃"（平）
// 9. 新增：天赦、天医、红艳、阴差阳错、孤鸾煞、十恶大败、四废

export interface ShenShaItem {
  name: string;
  pillar: string;
  desc: string;
  type: '吉' | '凶' | '平';
}

export interface ShenShaPillarInput {
  tianGan: string;
  diZhi: string;
  ganZhi: string;
}

export const SHENSHA_PLAIN: Record<string, string> = {
  '天乙贵人': '最尊贵的吉神。命带天乙贵人，一生有贵人相助，遇难成祥、逢凶化吉。走到哪里都有人帮你，天生好运气。',
  '文昌': '主学业、文采、考试运。学习能力强，适合读书深造、写作、文化事业。考试运比一般人好。',
  '学堂': '与文昌类似，代表学习能力和求知欲。天生爱学习，学新东西比别人快，有学术天赋。',
  '桃花': '主人缘、异性缘、艺术气质。桃花旺的人有魅力，容貌气质佳，但也需注意感情纠葛。',
  '红鸾': '正桃花星，主婚姻喜事、良好姻缘。单身者遇到红鸾是恋爱结婚的信号，已婚者需守心。',
  '天喜': '主喜事、怀孕、添丁。遇到天喜流年，家中常有好事发生，人心情愉悦。',
  '驿马': '主奔波、流动、出行。命带驿马，适合外出发展、动态职业（销售、物流），不适合长期宅家。',
  '羊刃': '一把双刃剑——代表极强的个性和行动力。用得好是领袖气质，用不好容易冲动惹事、伤身。',
  '阴刃': '阴干之刃。个性内敛但韧劲十足，爆发力藏在细节里，注意别积压成内伤。',
  '将星': '主领导才能、统御能力。有当领导的潜质，能独当一面做决策，性格果断不犹豫。',
  '华盖': '主孤独、清高、玄学天赋。喜欢独处思考，对宗教、哲学、命理、艺术有天生的兴趣。',
  '禄神': '代表食禄、俸禄、财富。命中带禄，吃喝不愁，有稳定的收入来源，衣食无忧。',
  '天德': '上天庇佑之吉星，能化解一切凶险。是"保命星"，遇到重大困难时总有转机。',
  '天德贵人': '上天庇佑之吉星，能化解一切凶险。是"保命星"，遇到重大困难时总有转机。',
  '月德': '与天德类似，女性得此星更吉。能逢凶化吉，家庭和睦，人际关系好。',
  '月德贵人': '与天德类似，女性得此星更吉。能逢凶化吉，家庭和睦，人际关系好。',
  '金舆': '富贵之车，代表财富和地位。命带金舆者往往能享受优质生活，出行有好的交通工具。',
  '天医': '代表医术、健康方面的缘分。适合从事医疗养生行业，或自身身体自愈能力强。',
  '魁罡': '主聪明果断，但也刚强固执。有很强的个性，不随波逐流。但需注意不要太自我中心。',
  '太极贵人': '主智慧、玄学、哲学天赋。对神秘事物有浓厚兴趣，适合研究传统文化和命理。',
  '福星贵人': '一生福气多，少灾少难。不一定大富大贵，但生活安稳，知足常乐。',
  '国印贵人': '主诚信、权威、公章之权。适合从政或在大型机构工作，有官方背景的贵人相助。',
  '天厨贵人': '主饮食、享受。命带天厨，爱吃会吃，也可能从事餐饮行业，生活有口福。',
  '词馆': '主文学、口才、学术成就。命带词馆，妙笔生花、口若悬河，适合文职和学术。',
  '金神': '刚毅果决、才华外露之神——日柱或时柱见乙丑、己巳、癸酉即为命带金神。金神喜火炼，行火运发达显贵，忌金水运。适合技术、军警、竞技类领域，性格刚强需防过刚易折。',
  '天赦': '逢凶化吉的"百事解灾"之星。春季生人见戊寅、夏季见甲午、秋季见戊申、冬季见甲子（日柱），一生少大灾大难，遇险常能化解。',
  '红艳': '魅力桃花星。气质出众、异性缘旺，社交场合受欢迎，自带吸引力。已婚者需把握分寸。',
  '阴差阳错': '主感情婚姻容易"错位"——常在关键时刻阴差阳错，错过对的人或与另一半家庭有隔阂。顺其自然、多做沟通为佳。',
  '孤鸾煞': '婚姻感情中的"孤鸾"提示——感情路上容易孤独或聚少离多，晚婚反而更稳，择偶宜重内在契合。',
  '十恶大败': '禄入空亡之日。传统认为此日出生者不宜冒险投机、孤注一掷，宜踏实积累、稳中求进。',
  '四废': '季节休囚之日。主体质偏弱、做事易有始无终，宜选择专精领域深耕，并注重作息养生。',
  '劫煞': '主破财、意外、小人是非。命带劫煞需注意保管财物，不宜做高风险投资。',
  '灾煞': '主灾祸、疾病、横祸。命带灾煞者需格外注意安全，避免危险活动和冒险。',
  '孤辰': '主孤独。男命尤忌，容易性格孤僻、不合群，婚姻来得晚或夫妻聚少离多。',
  '寡宿': '主孤独。女命尤忌，容易独守空房或性格清冷，但利于修行和研究型工作。',
  '空亡': '空亡不是说没有，而是"有名无实"——像水中月、镜中花。凡事多等待时机才能落实。',
};

const TG_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZ_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 三合局组 → 目标地支（桃花/驿马/华盖/将星/劫煞/灾煞通用查法） */
function sanHeTarget(branch: string, map: Record<string, string>): string | undefined {
  return map[branch];
}

/** 通行：申子辰见X、寅午戌见X、巳酉丑见X、亥卯未见X */
function buildSanHeMap(t: [string, string, string, string]): Record<string, string> {
  return {
    申: t[0], 子: t[0], 辰: t[0],
    寅: t[1], 午: t[1], 戌: t[1],
    巳: t[2], 酉: t[2], 丑: t[2],
    亥: t[3], 卯: t[3], 未: t[3],
  };
}

/** 按日柱干支推空亡（正确公式：旬首地支前两位） */
export function getKongWang(dayGanZhi: string): string[] {
  const g = TG_ORDER.indexOf(dayGanZhi[0]);
  const z = DZ_ORDER.indexOf(dayGanZhi[1]);
  if (g < 0 || z < 0) return [];
  const start = (z - g + 10) % 12; // 旬首地支前移两位即空亡起点
  return [DZ_ORDER[start], DZ_ORDER[(start + 1) % 12]];
}

export function calcShenSha(pillars: ShenShaPillarInput[]): ShenShaItem[] {
  const results: ShenShaItem[] = [];
  const seen = new Set<string>();
  const push = (name: string, pillar: string, type: '吉' | '凶' | '平') => {
    const key = `${name}|${pillar}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ name, pillar, desc: SHENSHA_PLAIN[name] || '', type });
  };

  const PL = ['年柱', '月柱', '日柱', '时柱'];
  const tg = pillars.map((p) => p.tianGan);
  const dz = pillars.map((p) => p.diZhi);
  const gz = pillars.map((p) => p.ganZhi);

  const riGan = tg[2]; // 日干
  const nianGan = tg[0]; // 年干
  const monthZhi = dz[1]; // 月支

  // 贵人类神煞的查法天干集合（年干或日干）
  const guiGans = Array.from(new Set([nianGan, riGan].filter(Boolean)));

  for (let i = 0; i < 4; i++) {
    const pi = PL[i];

    // --- 天乙贵人（年干或日干查地支）---
    const tianYiMap: Record<string, string[]> = {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['巳', '卯'], '癸': ['巳', '卯'],
      '辛': ['午', '寅'],
    };
    for (const g of guiGans) {
      if (tianYiMap[g]?.includes(dz[i])) {
        push('天乙贵人', pi, '吉');
        break;
      }
    }

    // --- 文昌（年干或日干查地支）---
    const wenchangMap: Record<string, string> = {
      '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
      '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
    };
    if (guiGans.some((g) => wenchangMap[g] === dz[i])) {
      push('文昌', pi, '吉');
    }

    // --- 禄神（日干查地支）---
    const luMap: Record<string, string> = {
      '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
      '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
    };
    if (luMap[riGan] === dz[i]) {
      push('禄神', pi, '吉');
    }

    // --- 羊刃（阳干）/ 阴刃（阴干）（日干查地支）---
    const yangRenMap: Record<string, string> = {
      '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子',
    };
    const yinRenMap: Record<string, string> = {
      '乙': '寅', '丁': '巳', '己': '巳', '辛': '申', '癸': '亥',
    };
    if (yangRenMap[riGan] === dz[i]) {
      push('羊刃', pi, '凶');
    } else if (yinRenMap[riGan] === dz[i]) {
      push('阴刃', pi, '平');
    }

    // --- 桃花（年支/日支三合局查桃花位）---
    const taoHuaMap = buildSanHeMap(['酉', '卯', '午', '子']);
    if (sanHeTarget(dz[0], taoHuaMap) === dz[i] || sanHeTarget(dz[2], taoHuaMap) === dz[i]) {
      push('桃花', pi, '平');
    }

    // --- 驿马（年支/日支三合局查驿马位）---
    const yiMaMap = buildSanHeMap(['寅', '申', '亥', '巳']);
    if (sanHeTarget(dz[0], yiMaMap) === dz[i] || sanHeTarget(dz[2], yiMaMap) === dz[i]) {
      push('驿马', pi, '平');
    }

    // --- 华盖（年支/日支三合局查华盖位）---
    const huaGaiMap = buildSanHeMap(['辰', '戌', '丑', '未']);
    if (sanHeTarget(dz[0], huaGaiMap) === dz[i] || sanHeTarget(dz[2], huaGaiMap) === dz[i]) {
      push('华盖', pi, '吉');
    }

    // --- 将星（年支/日支三合局查将星位）---
    const jiangXingMap = buildSanHeMap(['子', '午', '酉', '卯']);
    if (sanHeTarget(dz[0], jiangXingMap) === dz[i] || sanHeTarget(dz[2], jiangXingMap) === dz[i]) {
      push('将星', pi, '吉');
    }

    // --- 劫煞（年支/日支三合局查劫煞位）---
    const jieShaMap = buildSanHeMap(['巳', '申', '亥', '寅']);
    if (sanHeTarget(dz[0], jieShaMap) === dz[i] || sanHeTarget(dz[2], jieShaMap) === dz[i]) {
      push('劫煞', pi, '凶');
    }

    // --- 灾煞（年支/日支三合局查灾煞位）---
    const zaiShaMap = buildSanHeMap(['午', '子', '卯', '酉']);
    if (sanHeTarget(dz[0], zaiShaMap) === dz[i] || sanHeTarget(dz[2], zaiShaMap) === dz[i]) {
      push('灾煞', pi, '凶');
    }

    // --- 魁罡（仅日柱：庚辰、庚戌、壬辰、戊戌）---
    if (i === 2 && ['庚辰', '庚戌', '壬辰', '戊戌'].includes(gz[i])) {
      push('魁罡', pi, '平');
    }

    // --- 金神（日柱或时柱：乙丑、己巳、癸酉）---
    if ((i === 2 || i === 3) && ['乙丑', '己巳', '癸酉'].includes(gz[i])) {
      push('金神', pi, '平');
    }

    // --- 天赦（日柱：春戊寅、夏甲午、秋戊申、冬甲子）---
    if (i === 2) {
      const seasonOf: Record<string, string> = {
        寅: '寅卯辰', 卯: '寅卯辰', 辰: '寅卯辰',
        巳: '巳午未', 午: '巳午未', 未: '巳午未',
        申: '申酉戌', 酉: '申酉戌', 戌: '申酉戌',
        亥: '亥子丑', 子: '亥子丑', 丑: '亥子丑',
      };
      const tianSheBySeason: Record<string, string> = {
        '寅卯辰': '戊寅', '巳午未': '甲午', '申酉戌': '戊申', '亥子丑': '甲子',
      };
      const sKey = seasonOf[monthZhi];
      if (sKey && tianSheBySeason[sKey] === gz[i]) {
        push('天赦', pi, '吉');
      }
    }

    // --- 四废（日柱：春庚申辛酉、夏壬子癸亥、秋甲寅乙卯、冬丙午丁巳）---
    if (i === 2) {
      const siFei: Record<string, string[]> = {
        '寅卯辰': ['庚申', '辛酉'],
        '巳午未': ['壬子', '癸亥'],
        '申酉戌': ['甲寅', '乙卯'],
        '亥子丑': ['丙午', '丁巳'],
      };
      const seasonOf: Record<string, string> = {
        寅: '寅卯辰', 卯: '寅卯辰', 辰: '寅卯辰',
        巳: '巳午未', 午: '巳午未', 未: '巳午未',
        申: '申酉戌', 酉: '申酉戌', 戌: '申酉戌',
        亥: '亥子丑', 子: '亥子丑', 丑: '亥子丑',
      };
      const sFei = seasonOf[monthZhi];
      if (sFei && siFei[sFei]?.includes(gz[i])) {
        push('四废', pi, '凶');
      }
    }

    // --- 十恶大败（日柱）---
    if (i === 2 && ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'].includes(gz[i])) {
      push('十恶大败', pi, '凶');
    }

    // --- 阴差阳错（日柱）---
    if (i === 2 && ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'].includes(gz[i])) {
      push('阴差阳错', pi, '平');
    }

    // --- 孤鸾煞（日柱）---
    if (i === 2 && ['乙巳', '丁巳', '辛亥', '戊申', '壬寅', '戊午', '壬子', '丙午'].includes(gz[i])) {
      push('孤鸾煞', pi, '平');
    }

    // --- 红艳（日干查地支）---
    const hongYanMap: Record<string, string> = {
      '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰',
      '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申',
    };
    if (hongYanMap[riGan] === dz[i]) {
      push('红艳', pi, '平');
    }

    // --- 金舆（日干查地支）---
    const jinYuMap: Record<string, string> = {
      '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
      '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅',
    };
    if (jinYuMap[riGan] === dz[i]) {
      push('金舆', pi, '吉');
    }

    // --- 学堂（年干或日干查地支）---
    const xueTangMap: Record<string, string> = {
      '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
      '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
    };
    if (guiGans.some((g) => xueTangMap[g] === dz[i])) {
      push('学堂', pi, '吉');
    }

    // --- 词馆（年干或日干查地支）---
    const ciGuanMap: Record<string, string> = {
      '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
      '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
    };
    if (guiGans.some((g) => ciGuanMap[g] === dz[i])) {
      push('词馆', pi, '吉');
    }

    // --- 太极贵人（年干或日干查地支）---
    const taiJiMap: Record<string, string[]> = {
      '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'],
      '戊': ['丑', '未', '辰', '戌'], '己': ['丑', '未', '辰', '戌'],
      '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'],
    };
    if (guiGans.some((g) => taiJiMap[g]?.includes(dz[i]))) {
      push('太极贵人', pi, '吉');
    }

    // --- 福星贵人（年干或日干查地支，通行口诀表）---
    const fuXingMap: Record<string, string[]> = {
      '甲': ['寅', '子'], '丙': ['寅', '子'],
      '乙': ['丑', '卯'], '癸': ['丑', '卯'],
      '戊': ['申'], '己': ['未'], '丁': ['亥'],
      '庚': ['午'], '辛': ['巳'], '壬': ['辰'],
    };
    if (guiGans.some((g) => fuXingMap[g]?.includes(dz[i]))) {
      push('福星贵人', pi, '吉');
    }

    // --- 国印贵人（年干或日干查地支：禄前九位）---
    const guoYinMap: Record<string, string> = {
      '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅', '戊': '丑',
      '己': '寅', '庚': '辰', '辛': '巳', '壬': '未', '癸': '申',
    };
    if (guiGans.some((g) => guoYinMap[g] === dz[i])) {
      push('国印贵人', pi, '吉');
    }

    // --- 天厨贵人（日干查地支）---
    const tianChuMap: Record<string, string> = {
      '甲': '巳', '乙': '午', '丙': '巳', '丁': '午', '戊': '申',
      '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
    };
    if (tianChuMap[riGan] === dz[i]) {
      push('天厨贵人', pi, '吉');
    }

    // --- 红鸾（年支查地支）---
    const hongLuanMap: Record<string, string> = {
      '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
      '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
    };
    if (hongLuanMap[dz[0]] === dz[i]) {
      push('红鸾', pi, '吉');
    }

    // --- 天喜（年支查地支）---
    const tianXiMap: Record<string, string> = {
      '子': '酉', '丑': '申', '寅': '未', '卯': '午', '辰': '巳', '巳': '辰',
      '午': '卯', '未': '寅', '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
    };
    if (tianXiMap[dz[0]] === dz[i]) {
      push('天喜', pi, '吉');
    }

    // --- 天德贵人（月支查天干或地支）---
    const tianDeMap: Record<string, string> = {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
      '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
    };
    const tianDeVal = tianDeMap[monthZhi];
    if (tianDeVal && (tianDeVal === tg[i] || tianDeVal === dz[i])) {
      push('天德贵人', pi, '吉');
    }

    // --- 月德贵人（月支查天干）---
    const yueDeMap: Record<string, string> = {
      '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚', '午': '丙', '未': '甲',
      '申': '壬', '酉': '庚', '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚',
    };
    if (yueDeMap[monthZhi] === tg[i]) {
      push('月德贵人', pi, '吉');
    }

    // --- 天医（月支前一位）---
    const monthIdx = DZ_ORDER.indexOf(monthZhi);
    const tianYiZhi = DZ_ORDER[(monthIdx + 11) % 12];
    if (dz[i] === tianYiZhi) {
      push('天医', pi, '吉');
    }

    // --- 孤辰（年支查地支）---
    const guChenMap: Record<string, string> = {
      '子': '寅', '丑': '寅', '寅': '巳', '卯': '巳',
      '辰': '巳', '巳': '申', '午': '申', '未': '申',
      '申': '亥', '酉': '亥', '戌': '亥', '亥': '寅',
    };
    if (guChenMap[dz[0]] === dz[i]) {
      push('孤辰', pi, '平');
    }

    // --- 寡宿（年支查地支）---
    const guaXiuMap: Record<string, string> = {
      '子': '戌', '丑': '戌', '寅': '丑', '卯': '丑',
      '辰': '丑', '巳': '辰', '午': '辰', '未': '辰',
      '申': '未', '酉': '未', '戌': '未', '亥': '戌',
    };
    if (guaXiuMap[dz[0]] === dz[i]) {
      push('寡宿', pi, '平');
    }

    // --- 空亡（日柱推旬，年/月/时支见者为空）---
    const kongWang = getKongWang(gz[2]);
    if (kongWang.includes(dz[i])) {
      push('空亡', pi, '平');
    }
  }

  return results;
}
