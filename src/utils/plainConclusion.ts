// ========== 白话结论生成器 ==========
// 原则：结论先行、口语化、保留专业术语供 renderWithTerms 二次高亮

export interface BaziConclusionInput {
  dayGan: string;
  dayWx: string;
  level: string;          // '身强' | '身弱' | '中和' | '身极强' | '身极弱'
  yongShen: string[];     // 用神五行列表
  xiShen: string[];       // 喜神五行列表
  wxStrongest: string;    // 命局最强五行
  wxWeakest: string;      // 命局最弱五行
  dayunFirst: string | null; // 第一步大运干支
}

const STRENGTH_TRAIT: Record<string, string> = {
  '身极强': '能量非常旺盛，天生的领导者，但容易听不进别人意见',
  '身强': '底子厚、扛得住事，性格自信有主见',
  '中和': '五行平衡，性格稳当，遇事不慌',
  '身弱': '心思细腻、依赖环境，适合借力而行',
  '身极弱': '能量偏弱，更依赖贵人帮扶，切勿硬扛',
};

export function generateBaziPlainConclusion(input: BaziConclusionInput): string {
  const { dayGan, dayWx, level, yongShen, xiShen, wxStrongest, wxWeakest, dayunFirst } = input;
  const trait = STRENGTH_TRAIT[level] || STRENGTH_TRAIT['中和'];
  const yongText = [...yongShen, ...xiShen].filter(Boolean).join('、') || '五行平衡';
  const dayunText = dayunFirst ? `下一步大运是「${dayunFirst}」，运势会进入新阶段，值得期待。` : '';
  return (
    `你是「${dayGan}${dayWx}」命，八字属「${level}」——${trait}。` +
    `命局${wxStrongest}最旺、${wxWeakest}最弱，用神取「${yongText}」：` +
    `多亲近${yongText}属性的人事物（颜色、方位、行业），对你最有助力。${dayunText}`
  );
}

export function generateZiweiPlainConclusion(overall: string, highlight: string | null): string {
  const first = overall.split(/[。！!]/)[0] || overall;
  const hl = highlight ? `其中最亮眼的是：${highlight}。` : '';
  return `一句话总结你的命盘：${first}。${hl}记住，命盘是地图，路还是自己走。`;
}

export interface LiuyaoConclusion {
  verdict: '宜守' | '有变' | '大动';
  text: string;
}

export function generateLiuyaoPlainConclusion(
  guaName: string,
  dongYaoCount: number,
  hasZhiGua: boolean,
): LiuyaoConclusion {
  if (dongYaoCount === 0) {
    return {
      verdict: '宜守',
      text: `你起得「${guaName}」，卦象安静无动爻——事情短期内不会大变，现在不是冲动出手的时候，稳住现状、把手里的事做扎实就是最好的选择。`,
    };
  }
  if (dongYaoCount <= 2) {
    return {
      verdict: '有变',
      text: `你起得「${guaName}」，卦中有${dongYaoCount}个动爻${hasZhiGua ? '，且已变出新的卦象' : ''}——事情正在起变化，方向还不明朗，但转机已经在酝酿。近期多留意身边的新机会，顺势而为。`,
    };
  }
  return {
    verdict: '大动',
    text: `你起得「${guaName}」，卦中${dongYaoCount}个动爻齐动，是根本性的变化之象——这件事会迎来大转折，旧局面守不住了。与其抗拒变化，不如主动拥抱：把能控制的准备做好，剩下的交给时间。`,
  };
}

export function generateDailyPlainConclusion(
  jiShen: string[],
  xiongSha: string[],
  weatherDesc: string | null,
  temp: number | null,
): string {
  const parts: string[] = [];
  parts.push(`今天${weatherDesc ? `天气${weatherDesc}` : '天气平稳'}${temp !== null ? `（${temp}°C）` : ''}。`);
  if (jiShen.length > 0) parts.push(`宜：${jiShen.slice(0, 3).join('、')}。`);
  if (xiongSha.length > 0) parts.push(`忌：${xiongSha.slice(0, 3).join('、')}。`);
  parts.push('顺天应时，今天适合按黄历提示安排重要事情。');
  return parts.join('');
}
