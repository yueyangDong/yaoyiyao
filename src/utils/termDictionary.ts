export interface TermEntry {
  term: string;
  explain: string;
  analogy?: string;
}

// 命理高频术语词典：term=术语，explain=一句话人话解释，analogy=可选生活化类比
export const TERM_DICTIONARY: TermEntry[] = [
  { term: '日主', explain: '出生那一天的天干，代表你自己', analogy: '好比你的「本命角色」' },
  { term: '四柱', explain: '年柱、月柱、日柱、时柱，合称八字', analogy: '四个时间坐标拼出你的命盘' },
  { term: '身强', explain: '日主力量旺盛，扛得住克泄，性格通常自信有主见', analogy: '像一棵根深的大树，风吹不倒' },
  { term: '身弱', explain: '日主力量偏弱，需要帮扶，性格通常温和、依赖环境', analogy: '像小树苗，需要阳光雨露' },
  { term: '中和', explain: '日主强弱平衡，是比较理想的命局状态', analogy: '像一杯不浓不淡的茶，刚刚好' },
  { term: '用神', explain: '对你命局最有利的五行，是调和的「药」', analogy: '像身体的补药，用对了就顺' },
  { term: '喜神', explain: '与用神同阵营、同样有帮助的五行', analogy: '用神的好帮手' },
  { term: '忌神', explain: '对你命局不利的五行，要尽量避开', analogy: '像不适合你的食物，少吃为妙' },
  { term: '十神', explain: '八字中代表六亲与人事关系的十种称谓（正官、七杀、正财等）', analogy: '命理里的「人物关系表」' },
  { term: '正官', explain: '代表约束、规则与贵人，也代表事业与名声', analogy: '像单位的领导，管着你也在提拔你' },
  { term: '七杀', explain: '代表压力、竞争与魄力，也是「偏官」', analogy: '像严厉的教官，压力大但练出真本事' },
  { term: '正财', explain: '代表稳定的收入与正当钱财，也代表妻子（男命）', analogy: '像每月到账的工资' },
  { term: '偏财', explain: '代表意外之财、投资与大方人缘', analogy: '像捡到红包或投资收益' },
  { term: '食神', explain: '代表才华、口福与享受，性格乐观', analogy: '像天生的美食家和艺术家' },
  { term: '伤官', explain: '代表聪明叛逆、表达欲强，也主才华外露', analogy: '像口才好的辩论手，爱表现' },
  { term: '比肩', explain: '代表同辈、朋友与自己，也代表竞争', analogy: '像和你并肩的同学同事' },
  { term: '劫财', explain: '代表争夺、合伙，也代表行动力强', analogy: '像抢球的人，有冲劲也有竞争' },
  { term: '正印', explain: '代表母亲、文凭、靠山与庇护', analogy: '像家里长辈的关爱' },
  { term: '偏印', explain: '代表偏门学问、直觉与孤独感', analogy: '像冷门高手，想法独特' },
  { term: '桃花', explain: '代表异性缘与魅力，也指感情机遇', analogy: '像人群中的吸引力光环' },
  { term: '驿马', explain: '代表走动、出差、迁移与变动', analogy: '像脚下生风，适合往外闯' },
  { term: '文昌', explain: '代表学业、文书与聪明才智', analogy: '像读书考试的好运星' },
  { term: '天乙贵人', explain: '最有力的贵人星，遇事有人帮', analogy: '像关键时刻总有人拉你一把' },
  { term: '羊刃', explain: '极旺的劫财，性格刚烈冲动，也主魄力', analogy: '像一把双刃剑，能成事也易伤人' },
  { term: '空亡', explain: '某柱落空，主该柱所代表的人事易有「落空感」', analogy: '像约好了人却临时爽约' },
  { term: '纳音', explain: '干支组合对应的五行音律称谓，如「海中金」', analogy: '像给每个年份起的小名' },
  { term: '大运', explain: '每十年一换的人生运势阶段', analogy: '像人生的「季节」，十年一个气候' },
  { term: '流年', explain: '每一年的运势，也称太岁', analogy: '像每年翻一页的天气预报' },
  { term: '起运', explain: '从几岁开始走第一步大运', analogy: '像赛跑的发令枪响' },
  { term: '月令', explain: '出生月份的地支，是八字里力量最大的位置', analogy: '像皇帝坐镇的朝廷' },
  { term: '得令', explain: '日主在月令得到生扶，力量增强', analogy: '像正赶上好时节' },
  { term: '失令', explain: '日主在月令被克泄，力量减弱', analogy: '像逆风而行' },
  { term: '天干', explain: '甲乙丙丁戊己庚辛壬癸，共十个，代表天之气', analogy: '像天空的十个符号' },
  { term: '地支', explain: '子丑寅卯辰巳午未申酉戌亥，共十二个，代表地之气', analogy: '像大地的十二个坐标' },
  { term: '干支', explain: '天干地支合称，干支相配共六十个组合', analogy: '像年月日的「编号系统」' },
  { term: '五行', explain: '金木水火土，相生相克，是命理的底层逻辑', analogy: '像五种能量，互相推动也互相制约' },
  { term: '相生', explain: '五行之间相互滋养的关系（木生火、火生土、土生金、金生水、水生木）', analogy: '像接力赛，一环传一环' },
  { term: '相克', explain: '五行之间相互制约的关系（木克土、土克水、水克火、火克金、金克木）', analogy: '像石头压住草，互相管束' },
  { term: '格局', explain: '八字整体呈现的典型结构，如正官格、七杀格', analogy: '像一个人的「职业画像」' },
  { term: '从格', explain: '日主极弱而顺从旺势的格局', analogy: '像小船顺着大流走' },
  { term: '化格', explain: '天干五合而化的特殊格局', analogy: '像两种材料融合成新物质' },
  { term: '合', explain: '干支之间相互吸引、结合的关系', analogy: '像磁铁相吸' },
  { term: '冲', explain: '地支之间正对面的冲突关系', analogy: '像针尖对麦芒' },
  { term: '刑', explain: '地支之间相互伤害的关系', analogy: '像摩擦起火的隐患' },
  { term: '害', explain: '地支之间暗中损耗的关系', analogy: '像背后捅刀子的小人' },
  { term: '藏干', explain: '地支里暗藏的五行天干', analogy: '像抽屉里藏着的小物件' },
  { term: '透干', explain: '藏干出现在天干上，力量显现', analogy: '像藏的东西终于摆到台面上' },
  { term: '通根', explain: '天干在地支有同类的根，力量扎实', analogy: '像大树扎了根' },
  { term: '墓库', explain: '辰戌丑未四库，主收藏与积蓄', analogy: '像仓库，收放都有讲究' },
  { term: '长生', explain: '十二长生之一，主新生与起步', analogy: '像刚发芽的种子' },
  { term: '帝旺', explain: '十二长生之一，主最鼎盛的状态', analogy: '像正午的太阳' },
  { term: '墓', explain: '十二长生之一，主收藏收敛', analogy: '像果实归仓' },
  { term: '绝', explain: '十二长生之一，主绝处逢生的转折点', analogy: '像冬天，之后就是春天' },
  { term: '胎', explain: '十二长生之一，主孕育与萌芽', analogy: '像还在娘胎里的宝宝' },
  { term: '养', explain: '十二长生之一，主休养准备', analogy: '像充电待机' },
  { term: '命宫', explain: '紫微斗数里代表你一生的「总司令部」', analogy: '像房子的主梁' },
  { term: '身宫', explain: '紫微斗数里代表后天努力与成就的宫位', analogy: '像后天装修的风格' },
  { term: '三方四正', explain: '命宫及对宫、三合宫的总称，看事情要看全局', analogy: '像看一个人要看他的朋友圈' },
  { term: '四化', explain: '化禄、化权、化科、化忌，代表吉凶变化的四种力量', analogy: '像四季轮换的天气系统' },
  { term: '化禄', explain: '主财禄与福气，是四化中最吉的', analogy: '像天上掉馅饼' },
  { term: '化权', explain: '主权力与掌控力', analogy: '像拿到指挥棒' },
  { term: '化科', explain: '主名声与考试运', analogy: '像被点名表扬' },
  { term: '化忌', explain: '主烦恼与阻碍，是四化中最需要留意的', analogy: '像走路踩到水坑' },
  { term: '紫微星', explain: '十四主星之首，帝王之星，主尊贵与领导力', analogy: '像天上的皇帝' },
  { term: '天府星', explain: '南斗主星，库星，主稳重与聚财', analogy: '像大管家，守得住家业' },
  { term: '七杀星', explain: '将军之星，主魄力与闯劲', analogy: '像冲锋陷阵的将军' },
  { term: '破军星', explain: '先锋之星，主破旧立新', analogy: '像拆迁队，拆了才能建' },
  { term: '贪狼星', explain: '欲望之星，主才华、交际与桃花', analogy: '像交际花，多才多艺' },
  { term: '天机星', explain: '智慧之星，主谋略与变动', analogy: '像军师，点子多' },
  { term: '太阴星', explain: '月亮之星，主温柔、内敛与财富', analogy: '像月光，柔和而持久' },
  { term: '太阳星', explain: '光明之星，主热情、付出与名声', analogy: '像阳光，照亮别人' },
  { term: '武曲星', explain: '财星，主刚毅与实干', analogy: '像将军理财，硬气又务实' },
  { term: '天同星', explain: '福星，主安逸与好命', analogy: '像躺赢的福气宝宝' },
  { term: '廉贞星', explain: '次桃花星，主才华与是非', analogy: '像带刺的玫瑰' },
  { term: '天相星', explain: '辅佐之星，主稳重与协调', analogy: '像得力的秘书' },
  { term: '巨门星', explain: '口舌之星，主口才与是非', analogy: '像广播喇叭，能说会道' },
  { term: '禄存星', explain: '财星，主稳定财源', analogy: '像稳稳的存款' },
  { term: '左辅右弼', explain: '贵人辅星，主助力与朋友', analogy: '像左右手，帮忙的人多' },
  { term: '文昌文曲', explain: '文星，主才华与考试', analogy: '像学霸光环' },
  { term: '天魁天钺', explain: '贵人星，主机遇与提携', analogy: '像天上掉下来的伯乐' },
  { term: '铃星', explain: '煞星之一，主突发状况', analogy: '像半夜响起的闹铃' },
  { term: '火星', explain: '煞星之一，主急躁与爆发', analogy: '像一点就着的炮仗' },
  { term: '地空', explain: '空亡之星，主波折与失落感', analogy: '像计划落空' },
  { term: '地劫', explain: '劫难之星，主损失与破财', analogy: '像钱袋破了个洞' },
  { term: '本卦', explain: '起卦得到的最初之卦，代表事情现状', analogy: '像事情现在的照片' },
  { term: '变卦', explain: '动爻变化后得到的卦，代表事情的结果走向', analogy: '像事情未来的照片' },
  { term: '互卦', explain: '本卦中间四爻重组之卦，代表事情中间过程', analogy: '像事情的发展过程' },
  { term: '动爻', explain: '卦中发生变化的那一爻，是断卦的关键', analogy: '像钥匙孔，转动就有变化' },
  { term: '静卦', explain: '没有动爻的卦，主事情维持现状', analogy: '像一潭静水' },
  { term: '世爻', explain: '代表你自己的一爻', analogy: '像棋盘上代表你的那颗子' },
  { term: '应爻', explain: '代表对方或所问之事的一爻', analogy: '像棋盘上代表对方的那颗子' },
  { term: '卦辞', explain: '整个卦的总体判断文字', analogy: '像故事的标题和梗概' },
  { term: '爻辞', explain: '每一爻的具体判断文字', analogy: '像故事每一章的剧情' },
  { term: '六亲', explain: '六爻中以五行生克定出的父母、兄弟、子孙、妻财、官鬼', analogy: '像卦里的家庭成员' },
  { term: '用神', explain: '六爻占卜中所问之事的代表爻', analogy: '像查案时的关键线索' },
  { term: '太岁', explain: '当年的地支，也指流年运势', analogy: '像当年的「年度主题」' },
  { term: '刑冲合害', explain: '地支之间的四种作用关系，吉凶由此推断', analogy: '像人际间的亲密、冲突与暗算' },
  { term: '合婚', explain: '看两人八字是否相配', analogy: '像给两个人做「适配度测试」' },
  { term: '断语', explain: '命理师下的判断结论', analogy: '像医生的诊断结论' },
  { term: '喜用', explain: '喜神与用神合称，对你有利的五行', analogy: '像对你口味的好菜' },
  { term: '忌仇', explain: '忌神与仇神合称，对你不利的五行', analogy: '像你过敏的食物' },
  { term: '流月', explain: '每个月的运势', analogy: '像按月更新的天气预报' },
];

// 按术语长度降序匹配（长词优先，避免「天乙贵人」被拆成「贵人」）
export function findTermsInText(text: string): TermEntry[] {
  const sorted = [...TERM_DICTIONARY].sort((a, b) => b.term.length - a.term.length);
  const found: TermEntry[] = [];
  const seen = new Set<string>();
  for (const entry of sorted) {
    if (entry.term.length < 2) continue; // 跳过单字条目，避免「适合」→「合」、「冲动」→「冲」等误匹配
    if (seen.has(entry.term)) continue;
    if (text.includes(entry.term)) {
      found.push(entry);
      seen.add(entry.term);
    }
  }
  return found;
}
