// 每日一爻：幸运指南计算
import { Lunar } from 'lunar-typescript';

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const WUXING_COLORS: Record<string, string[]> = {
  '金': ['哑光银', '暖白'],
  '木': ['苔绿', '嫩绿'],
  '水': ['灰蓝', '墨黑'],
  '火': ['赭红', '暖橙'],
  '土': ['枯金黄', '棕色'],
};

const WUXING_NUMBERS: Record<string, number[]> = {
  '木': [3, 8],
  '火': [2, 7],
  '土': [5, 10],
  '金': [4, 9],
  '水': [1, 6],
};

const GAN_GUIREN: Record<string, string[]> = {
  '甲': ['牛', '羊'],
  '乙': ['鼠', '猴'],
  '丙': ['猪', '鸡'],
  '丁': ['猪', '鸡'],
  '戊': ['牛', '羊'],
  '己': ['鼠', '猴'],
  '庚': ['虎', '马'],
  '辛': ['虎', '马'],
  '壬': ['兔', '蛇'],
  '癸': ['兔', '蛇'],
};

const WUXING_LUCKY_ITEMS: Record<string, string> = {
  '金': '金属饰品 / 白色衣物',
  '木': '绿植 / 木质手串',
  '水': '黑曜石 / 蓝色配饰',
  '火': '红色饰品 / 蜡烛',
  '土': '黄水晶 / 陶瓷物件',
};

export interface LuckyGuide {
  luckyColors: string[];
  luckyNumbers: number[];
  luckyDirection: string;
  luckyDirectionDesc: string;
  guiRenZodiacs: string[];
  luckyItem: string;
  jiShen: string[];
  xiongSha: string[];
}

export function getLuckyGuide(): LuckyGuide {
  const lunar = Lunar.fromDate(new Date());

  const dayGan = lunar.getDayGan();
  const naYin = lunar.getDayNaYin();

  // 纳音取五行 → 颜色 → 数字
  let wxType = '木';
  for (const [gan, wx] of Object.entries(GAN_WUXING)) {
    if (dayGan === gan) { wxType = wx; break; }
  }

  const luckyColors = WUXING_COLORS[wxType] || ['苔绿', '暖白'];
  const luckyNumbers = WUXING_NUMBERS[wxType] || [3, 8];
  const luckyDirection = lunar.getDayPositionXi();
  const luckyDirectionDesc = lunar.getDayPositionXiDesc();
  const guiRenZodiacs = GAN_GUIREN[dayGan] || ['马'];
  const luckyItem = WUXING_LUCKY_ITEMS[wxType] || '绿植 / 木质手串';
  const jiShen = lunar.getDayJiShen();
  const xiongSha = lunar.getDayXiongSha();

  return {
    luckyColors, luckyNumbers, luckyDirection,
    luckyDirectionDesc, guiRenZodiacs, luckyItem,
    jiShen, xiongSha,
  };
}

export function getDayLuckyTime(lunar: Lunar): string {
  // 天神时辰中标记为吉的时辰
  const items = lunar.getDayTianShen();
  if (!items || items.length === 0) return '辰时(7-9)';

  for (const item of items) {
    if (item.includes('吉') || item.includes('天德') || item.includes('月德')) {
      return '辰时(7-9)'; // lunar-typescript 暂不直接返回吉时，默认辰时
    }
  }
  return '辰时(7-9)';
}

// 每日签：基于日干支+月干支+日期种子，限定在前10签（真实数据）
export function getDailyLotIndex(): number {
  const lunar = Lunar.fromDate(new Date());
  const dgz = lunar.getDayInGanZhi();
  const mgz = lunar.getMonthInGanZhi();
  let seed = 0;
  const s = dgz + mgz;
  for (let i = 0; i < s.length; i++) seed += s.charCodeAt(i);
  seed += new Date().getDate();
  return (seed % 10) + 1; // 1-10 真实签文
}

export interface TravelAdvice {
  text: string;
  level: 'good' | 'caution' | 'neutral';
}

export function getTravelAdvice(weatherCode: number, lunar: Lunar): TravelAdvice {
  const yi = lunar.getDayYi();
  const ji = lunar.getDayJi();
  const chong = lunar.getDayChong();
  const sha = lunar.getDaySha();

  const yiTravel = yi.some((s: string) => s.includes('出行'));
  const jiTravel = ji.some((s: string) => s.includes('出行'));

  const isGoodWeather = weatherCode >= 0 && weatherCode <= 2;
  const isBadWeather = weatherCode >= 60;

  if (isGoodWeather && yiTravel) {
    return { text: '今日宜出行，天气晴好，适合外出活动。', level: 'good' };
  }
  if (isBadWeather && jiTravel) {
    return { text: '今日不宜远行，且有雨，建议改期或选择室内活动。', level: 'caution' };
  }
  if (jiTravel) {
    return { text: '今日忌出行，建议减少外出或选择近处散步。', level: 'caution' };
  }
  if (isBadWeather) {
    return { text: '今日天气不佳，出行请注意携带雨具，避免远行。', level: 'neutral' };
  }

  let extra = '';
  if (sha) extra += `煞${sha}，避免向${sha}远行。`;
  if (chong) extra += `冲${chong}，属${chong}的朋友出行注意安全。`;

  return {
    text: `今日出行条件尚可。${extra}`,
    level: 'neutral',
  };
}
