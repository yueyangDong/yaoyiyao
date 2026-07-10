// 诸葛神数 384签
import type { LotData } from './guandiLots';

export const ZHUGES_LOTS: LotData[] = Array.from({ length: 384 }, (_, i) => {
  const idx = i + 1;
  const levels: Array<'上上' | '上' | '中' | '下' | '下下'> = ['上上', '上', '中', '下', '下下'];
  const level = levels[idx % 5];
  const poems = [
    '天门一挂榜，预定夺标人。\n马嘶芳草地，秋高听鹿鸣。',
    '地有神灵气，人有巧妙思。\n一言参不透，万事总成痴。',
    '长安花满眼，走马为谁忙。\n贵人相指引，枯木再逢春。',
    '春花秋月两相宜，月到中秋分外奇。\n好景一年须记取，莫教辜负此良时。',
    '龙潜渊底待风雷，一旦飞腾上九垓。\n自有神明相助力，不须疑虑又徘徊。',
    '是非终日有，不听自然无。\n若能存善念，福气自相扶。',
    '一轮明月照清波，万里无云景致多。\n正是中秋逢此夜，举杯邀月赏银河。',
    '前程有路莫迟疑，努力前行正此时。\n若待白头空叹息，到头方悔少年痴。',
  ];
  const poem = poems[idx % poems.length];
  return {
    index: idx,
    name: `第${idx}签`,
    level,
    gongWei: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][idx % 12] + '宫',
    poem,
    explanation: `诸葛神数第${idx}签，${level}签。此签暗含天机，需结合所求之事综合参详。诸葛亮神机妙算之精髓，在于随机应变。`,
    interpretation: `事业：${level === '上上' || level === '上' ? '机遇来临，把握时机' : level === '中' ? '稳扎稳打，步步为营' : '暂时蛰伏，等待时机'}\n财运：${level === '上上' || level === '上' ? '财气上佳' : level === '中' ? '稳定增长' : '谨慎操作'}\n感情：${level === '上上' || level === '上' ? '良缘将近' : '耐心经营'}\n健康：保持良好作息，适当运动`,
    guide: { 家宅: '安康', 婚姻: level === '上上' || level === '上' ? '佳' : '待时', 求财: level === '上上' || level === '上' ? '有利' : '审慎', 自身: '修身自省', 公讼: '以和为贵', 疾病: '静养调理', 失物: '耐心寻找' },
    story: `诸葛神数第${idx}签，出自诸葛亮测字推演之术，代代口耳相传。每签暗含天机，需诚心求之。`,
  };
});

// 诸葛神数起卦算法：根据三字笔画数求签
export function getZhugeLotByStrokes(word1: string, word2: string, word3: string): { lotIndex: number; lot: typeof ZHUGES_LOTS[0] } {
  const getStrokeCount = (char: string): number => {
    // 简体中文笔画数映射（常用字）
    const strokeMap: Record<string, number> = {
      '一':1,'二':2,'三':3,'四':5,'五':4,'六':4,'七':2,'八':2,'九':2,'十':2,
      '人':2,'大':3,'天':4,'地':6,'日':4,'月':4,'水':4,'火':4,'木':4,'金':8,
      '土':3,'山':3,'石':5,'田':5,'米':6,'花':7,'草':9,'鸟':5,'鱼':8,'虫':6,
      '马':3,'牛':4,'羊':6,'鸡':7,'狗':8,'猪':11,'龙':5,'凤':4,'虎':8,'蛇':11,
      '爱':10,'恨':9,'喜':12,'怒':9,'哀':9,'乐':5,'好':6,'坏':7,'美':9,'丑':4,
      '男':7,'女':3,'父':4,'母':5,'子':3,'孙':6,'妻':8,'夫':4,'友':4,'朋':8,
      '学':8,'书':4,'写':5,'读':10,'说':9,'看':9,'听':7,'想':13,'问':6,'答':12,
      '门':3,'路':13,'车':4,'船':11,'风':4,'雨':8,'云':4,'雪':11,'雷':13,'电':5,
      '东':5,'南':9,'西':6,'北':5,'中':4,'上':3,'下':3,'左':5,'右':5,'前':9,
      '后':6,'心':4,'身':7,'头':5,'手':4,'足':7,'眼':11,'耳':6,'口':3,'鼻':14,
      '红':6,'白':5,'黑':12,'黄':11,'绿':14,'蓝':13,'紫':12,'青':8,'灰':6,
    };
    return strokeMap[char] || char.charCodeAt(0) % 10 + 1; // fallback
  };

  const countStrokes = (str: string): number => {
    let total = 0;
    for (const char of str) {
      total += getStrokeCount(char);
    }
    return total;
  };

  const s1 = countStrokes(word1) % 384;
  const s2 = countStrokes(word2) % 384;
  const s3 = countStrokes(word3) % 384;
  const idx = ((s1 + s2 + s3) % 384);
  const lotIndex = idx === 0 ? 384 : idx;

  return {
    lotIndex,
    lot: ZHUGES_LOTS[lotIndex - 1],
  };
}
