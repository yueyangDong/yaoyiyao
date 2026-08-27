// ========== 紫微斗数格局判定 ==========
// 主星格 + 杂耀格；严格成格：组合成立 + 吉星会照 + 四化引动 + 无破格
export interface ZiweiGeResult {
  geNames: string[];
  reasons: string[];
  breakReasons: string[];
}

const JI_STARS = ['文昌', '文曲', '左辅', '右弼', '天魁', '天钺'];
const SHA_STARS = ['擎羊', '陀罗', '火星', '铃星'];
const KONG_STARS = ['地空', '地劫'];

/** 三方四正：命宫 + 财帛宫 + 官禄宫 + 迁移宫 */
const SIFANG = ['命宫', '财帛宫', '官禄宫', '迁移宫'];

function starsOf(gongData: any[], names: string[]): { name: string; sihua?: string | null }[] {
  const out: { name: string; sihua?: string | null }[] = [];
  for (const g of gongData) {
    if (names.includes(g.name)) {
      for (const s of g.majorStars || []) out.push({ name: s.name, sihua: s.sihua });
      for (const s of g.minorStars || []) out.push({ name: s });
    }
  }
  return out;
}

export function analyzeZiweiGe(gongData: any[]): ZiweiGeResult {
  const geNames: string[] = [];
  const reasons: string[] = [];
  const breakReasons: string[] = [];

  const ming = gongData.find(g => g.name === '命宫');
  const sifangStars = starsOf(gongData, SIFANG);
  const majorNames = sifangStars.filter(s => !SHA_STARS.includes(s.name) && !KONG_STARS.includes(s.name)).map(s => s.name);
  const minorNames = sifangStars.map(s => s.name);

  // 破格检查（三方四正）
  const hasJi = sifangStars.some(s => s.sihua === '忌');
  const shaCount = minorNames.filter(n => SHA_STARS.includes(n)).length;
  const kongCount = minorNames.filter(n => KONG_STARS.includes(n)).length;
  if (hasJi) breakReasons.push('命宫三方四正出现生年化忌，格局易被破坏');
  if (shaCount >= 2) breakReasons.push(`煞星（擎羊陀罗火星铃星）达 ${shaCount} 颗，格局受破`);
  if (kongCount >= 2) breakReasons.push(`空亡星（地空地劫）达 ${kongCount} 颗，格局受破`);

  // 吉星会照 + 四化引动
  const jiHui = minorNames.filter(n => JI_STARS.includes(n));
  const sihuaYin = sifangStars.some(s => s.sihua === '禄' || s.sihua === '权' || s.sihua === '科');

  // ---- 主星格判定 ----
  const tryGe = (name: string, condition: boolean, needJi = true) => {
    if (!condition) return;
    if (!jiHui.length && needJi) { breakReasons.push(`${name}：缺少吉星会照（昌曲左右魁钺）`); return; }
    if (!sihuaYin) { breakReasons.push(`${name}：缺少四化引动（禄/权/科）`); return; }
    geNames.push(name);
    reasons.push(`${name}：主星组合成立，吉星${jiHui.join('、')}会照，四化引动，无破格`);
  };

  tryGe('机月同梁格', ['天机', '太阴', '天同', '天梁'].every(n => majorNames.includes(n)));
  tryGe('杀破狼格', ['七杀', '破军', '贪狼'].filter(n => majorNames.includes(n)).length >= 2);

  if (ming) {
    const mingStars = (ming.majorStars || []).map((s: any) => s.name);
    tryGe('紫府同宫格', mingStars.includes('紫微') && mingStars.includes('天府'));
    tryGe('日月并明格', mingStars.includes('太阳') && mingStars.includes('太阴'));
    tryGe('廉贞贪狼格', mingStars.includes('廉贞') && mingStars.includes('贪狼'));
  }
  // 府相朝垣：天府与天相分居两宫
  {
    const fuGong = gongData.find(g => (g.majorStars || []).some((s: any) => s.name === '天府'));
    const xiangGong = gongData.find(g => (g.majorStars || []).some((s: any) => s.name === '天相'));
    tryGe('府相朝垣格', !!fuGong && !!xiangGong && fuGong.name !== xiangGong.name);
  }

  // ---- 杂耀格（命宫夹宫：前后两宫） ----
  if (ming) {
    const mingIdx = gongData.findIndex(g => g.name === '命宫');
    if (mingIdx >= 0 && gongData.length > 2) {
      const left = gongData[(mingIdx - 1 + gongData.length) % gongData.length];
      const right = gongData[(mingIdx + 1) % gongData.length];
      const allMinor = [...(left.minorStars || []), ...(right.minorStars || [])];
      const tryJiaGe = (name: string, a: string, b: string) => {
        if (!(allMinor.includes(a) && allMinor.includes(b))) return;
        if (!sihuaYin) { breakReasons.push(`${name}：缺少四化引动`); return; }
        geNames.push(name);
        reasons.push(`${name}：${a}${b}分居命宫两侧，且四化引动`);
      };
      tryJiaGe('昌曲夹命格', '文昌', '文曲');
      tryJiaGe('魁钺夹命格', '天魁', '天钺');
      tryJiaGe('左右夹命格', '左辅', '右弼');
    }
  }

  return { geNames, reasons, breakReasons };
}
