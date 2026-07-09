// 面相分析规则库
// 至少10种特征组合规则

export type FaceShape = '圆脸' | '方脸' | '长脸' | '瓜子脸' | '国字脸';
export type Forehead = '宽阔饱满' | '窄小' | '适中';
export type Eyebrow = '浓眉' | '淡眉' | '剑眉' | '柳叶眉' | '八字眉';
export type Eye = '大眼' | '小眼' | '丹凤眼' | '桃花眼' | '三角眼';
export type Nose = '高挺' | '扁平' | '蒜头鼻' | '鹰钩鼻' | '圆润';
export type Mouth = '大嘴' | '小嘴' | '厚唇' | '薄唇' | '适中';
export type Chin = '圆润' | '尖窄' | '方宽' | '双下巴';

export interface FaceInput {
  faceShape: FaceShape;
  forehead: Forehead;
  eyebrow: Eyebrow;
  eye: Eye;
  nose: Nose;
  mouth: Mouth;
  chin: Chin;
}

export interface FaceResult {
  personality: string;
  fortune: string;
  career: string;
  relationship: string;
  health: string;
  summary: string;
}

interface FaceRule {
  condition: Partial<FaceInput>;
  result: FaceResult;
}

const RULES: FaceRule[] = [
  {
    condition: { faceShape: '圆脸', forehead: '宽阔饱满' },
    result: {
      personality: '为人圆融通达，性格开朗乐观，待人真诚，亲和力强。',
      fortune: '中年运势较旺，35岁后财运稳步上升，晚年安享富贵。',
      career: '适合从事与人打交道的工作，如销售、公关、教育等行业。',
      relationship: '桃花运旺盛，但需注意烂桃花，宜晚婚。',
      health: '需注意饮食控制，预防肥胖相关疾病。',
      summary: '圆脸饱满，福相之基，一生衣食无忧，贵人运佳。',
    },
  },
  {
    condition: { faceShape: '方脸', forehead: '宽阔饱满' },
    result: {
      personality: '性格刚毅果敢，做事有原则，重信守诺，领导力强。',
      fortune: '早年需奋斗，中年事业有成，财运亨通。',
      career: '适合管理岗位、军警、工程等需要决断力的职业。',
      relationship: '感情专一但表达较为内敛，需多主动沟通。',
      health: '骨骼强健，注意关节和胃肠问题。',
      summary: '方脸刚毅，刚柔并济方为上，宜培养柔和的处事方式。',
    },
  },
  {
    condition: { faceShape: '瓜子脸' },
    result: {
      personality: '心思细腻，审美独到，追求完美，有艺术天赋。',
      fortune: '青年运势较好，易得贵人提携，但中年需谨慎理财。',
      career: '适合艺术、设计、演艺、写作等创意行业。',
      relationship: '对感情要求较高，宁缺毋滥，晚婚更幸福。',
      health: '注意神经系统和睡眠质量，避免过度思虑。',
      summary: '瓜子脸型，才情出众，但需脚踏实地，方能行稳致远。',
    },
  },
  {
    condition: { eye: '丹凤眼' },
    result: {
      personality: '智慧超群，洞察力强，善于察言观色，心思缜密。',
      fortune: '少年得志，学业事业均有成就，财运平稳持久。',
      career: '适合研究、咨询、金融、政法等需要分析能力的职业。',
      relationship: '眼光较高，对伴侣要求严格，需包容与理解。',
      health: '注意用眼卫生，防范视力问题。',
      summary: '丹凤眼为贵相，聪慧过人，宜修身养性，方能厚德载物。',
    },
  },
  {
    condition: { eye: '桃花眼' },
    result: {
      personality: '魅力四射，善于社交，情感丰富，有艺术气质。',
      fortune: '财运起伏较大，需注意守财，避免因感情破财。',
      career: '适合演艺、娱乐、销售、服务业等需要人际交往的行业。',
      relationship: '桃花运极其旺盛，需慎重选择伴侣，防范情感纠纷。',
      health: '注意肾脏和泌尿系统保养。',
      summary: '桃花眼主情缘丰富，但情多则乱，宜修身养性以定心神。',
    },
  },
  {
    condition: { nose: '高挺' },
    result: {
      personality: '自信满满，意志坚定，有领导才能，自尊心强。',
      fortune: '财运亨通，中年时期财富积累最为迅速。',
      career: '适合创业当老板，或担任管理岗位。',
      relationship: '对伴侣要求较高，婚姻中占主导地位。',
      health: '注意心脏和血压问题，避免过度劳累。',
      summary: '鼻为财星，高挺有力，主富贵双全，但需戒骄戒躁。',
    },
  },
  {
    condition: { nose: '蒜头鼻' },
    result: {
      personality: '为人忠厚老实，心地善良，不善言辞但值得信赖。',
      fortune: '财运稳中有升，虽不大富大贵，但衣食无忧。',
      career: '适合技术型工作，踏实肯干，易得上级信任。',
      relationship: '对家庭忠诚负责，是可靠的伴侣。',
      health: '注意呼吸系统保养。',
      summary: '蒜头鼻为忠厚之相，虽不显赫但安稳踏实，后福绵长。',
    },
  },
  {
    condition: { eyebrow: '剑眉' },
    result: {
      personality: '英气逼人，做事雷厉风行，正义感强，不惧挑战。',
      fortune: '青年时期多磨砺，30岁后事业上升迅速。',
      career: '适合军队、警察、律师、创业者等需要魄力的职业。',
      relationship: '感情强烈但表达直接，需学习温柔待人。',
      health: '身体强健，注意肝火旺盛和情绪管理。',
      summary: '剑眉主威，有将帅之才，但锋芒过露易招是非，宜韬光养晦。',
    },
  },
  {
    condition: { eyebrow: '柳叶眉' },
    result: {
      personality: '性情温和，善解人意，心思细腻，有文学艺术天赋。',
      fortune: '一生平顺，少有大起大落，晚年福气深厚。',
      career: '适合文职、教育、艺术、护理等行业。',
      relationship: '感情细腻浪漫，婚姻和谐美满。',
      health: '体质偏柔弱，注意调理气血。',
      summary: '柳叶眉主清贵，才情与福气兼具，是难得的好相。',
    },
  },
  {
    condition: { mouth: '厚唇' },
    result: {
      personality: '重情重义，感情丰富，口才出众，善于交际。',
      fortune: '财运不错，但花销也大，需注意理财规划。',
      career: '适合演讲、销售、法律、演艺等需要口才的行业。',
      relationship: '对感情投入很深，重视家庭和亲情。',
      health: '注意消化系统和饮食健康。',
      summary: '厚唇主情义，一生人缘佳，但需节制口腹之欲。',
    },
  },
  {
    condition: { forehead: '宽阔饱满' },
    result: {
      personality: '天资聪颖，记忆力强，学习能力出众，心胸开阔。',
      fortune: '早年运势佳，学业顺利，易得长辈和贵人相助。',
      career: '适合科研、学术、管理等高知识含量的工作。',
      relationship: '理智大于情感，择偶标准较高。',
      health: '注意头痛和用脑过度。',
      summary: '天庭饱满，少年得志之相，智慧是最大财富。',
    },
  },
  {
    condition: { chin: '圆润' },
    result: {
      personality: '性格坚韧，做事有始有终，晚年运势佳。',
      fortune: '晚年财运旺盛，老有所养，安享天伦之乐。',
      career: '适合需要耐心和毅力的长期项目或事业。',
      relationship: '家庭和睦，子女孝顺。',
      health: '体质较好，注意牙齿和骨骼健康。',
      summary: '地阁方圆，晚景荣华之相，晚年福泽深厚。',
    },
  },
  {
    condition: { chin: '尖窄' },
    result: {
      personality: '思维敏捷，反应迅速，善于应变，但有时缺乏耐心。',
      fortune: '早年运势佳，中年后需注意守成和理财。',
      career: '适合快节奏行业，如互联网、金融交易等。',
      relationship: '感情多变，需稳定心性方可获得长久幸福。',
      health: '注意消化系统和营养吸收。',
      summary: '下巴尖窄，少年得志却晚景需守，宜早作人生规划。',
    },
  },
  {
    condition: { forehead: '窄小' },
    result: {
      personality: '为人实在，勤劳务实，不善投机取巧，做事脚踏实地。',
      fortune: '早年多劳苦，中年后逐渐好转，晚年安逸。',
      career: '适合实业、技术、农业等需要踏实肯干的行业。',
      relationship: '感情较为保守传统，婚姻稳定。',
      health: '体质较佳，注意劳逸结合。',
      summary: '额头窄小，早年辛苦晚年福，勤能补拙是正道。',
    },
  },
];

export function analyzeFace(input: FaceInput): FaceResult {
  const matchedRules: FaceRule[] = [];

  for (const rule of RULES) {
    const conditions = rule.condition;
    let match = true;
    for (const [key, value] of Object.entries(conditions)) {
      if (input[key as keyof FaceInput] !== value) {
        match = false;
        break;
      }
    }
    if (match) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    // 没有完全匹配的规则，用默认综合结果
    return {
      personality: '性情中和，为人处世灵活变通，适应力强。',
      fortune: '一生运势平稳，偶有小波折，但总体安顺。',
      career: '适合多元化发展，根据自身兴趣和专长选择职业道路。',
      relationship: '感情顺其自然即可，真诚待人必有好报。',
      health: '注意作息规律，保持适度运动。',
      summary: '面相平和，乃中庸之相，虽无大富大贵，但一生平安顺遂。',
    };
  }

  // 合并所有匹配规则的结果
  const merged: FaceResult = {
    personality: '',
    fortune: '',
    career: '',
    relationship: '',
    health: '',
    summary: '',
  };

  for (const r of matchedRules) {
    merged.personality += r.result.personality + ' ';
    merged.fortune += r.result.fortune + ' ';
    merged.career += r.result.career + ' ';
    merged.relationship += r.result.relationship + ' ';
    merged.health += r.result.health + ' ';
    merged.summary += r.result.summary + ' ';
  }

  return merged;
}
