import { describe, it, expect } from 'vitest';
import {
  getStarBrightness, getChangsheng12, getBoshi12, getSuiqian12, getJiangqian12,
  getMingZhu, getShenZhu, getLiuNianAges, getXiaoXianAges, getAuxiliaryStars, enrichGongData,
} from '../ziweiPalaceData';

describe('星曜亮度查表（iztro 权威表）', () => {
  it('十四主星典型亮度', () => {
    expect(getStarBrightness('紫微', '申')).toBe('旺');
    expect(getStarBrightness('武曲', '辰')).toBe('庙');
    expect(getStarBrightness('太阳', '亥')).toBe('陷');
    expect(getStarBrightness('太阴', '酉')).toBe('旺');
    expect(getStarBrightness('天府', '丑')).toBe('庙');
    expect(getStarBrightness('七杀', '午')).toBe('旺');
  });

  it('辅星亮度（iztro 通用表）', () => {
    expect(getStarBrightness('擎羊', '卯')).toBe('陷');
    expect(getStarBrightness('擎羊', '子')).toBe('陷');
    expect(getStarBrightness('陀罗', '丑')).toBe('庙');
    expect(getStarBrightness('文昌', '巳')).toBe('庙');
    expect(getStarBrightness('文昌', '亥')).toBe('利');
    // 无亮度数据的星
    expect(getStarBrightness('禄存', '寅')).toBe('');
    expect(getStarBrightness('左辅', '辰')).toBe('');
  });
});

describe('长生十二神', () => {
  it('金四局：长生起巳顺行（文墨照片案例：命宫寅=绝）', () => {
    const m = getChangsheng12('金四局');
    expect(m['巳']).toBe('长生');
    expect(m['午']).toBe('沐浴');
    expect(m['未']).toBe('冠带');
    expect(m['申']).toBe('临官');
    expect(m['酉']).toBe('帝旺');
    expect(m['丑']).toBe('墓');
    expect(m['寅']).toBe('绝');
  });

  it('水二局：长生起申（水土同宫：土五局亦起申）', () => {
    expect(getChangsheng12('水二局')['申']).toBe('长生');
    expect(getChangsheng12('土五局')['申']).toBe('长生');
    expect(getChangsheng12('木三局')['亥']).toBe('长生');
    expect(getChangsheng12('火六局')['寅']).toBe('长生');
  });

  it('方向按性别：阴男逆行、阴女顺行（与博士十二神同规则）', () => {
    // 金四局巳起长生；乙为阴干 → 阴男逆：辰=沐浴、卯=冠带
    const yinMale = getChangsheng12('金四局', { yearGan: '乙', gender: 'male' });
    expect(yinMale['巳']).toBe('长生');
    expect(yinMale['辰']).toBe('沐浴');
    expect(yinMale['卯']).toBe('冠带');
    // 阴女顺：午=沐浴
    expect(getChangsheng12('金四局', { yearGan: '乙', gender: 'female' })['午']).toBe('沐浴');
    // 阳男顺、阳女逆
    expect(getChangsheng12('金四局', { yearGan: '壬', gender: 'male' })['午']).toBe('沐浴');
    expect(getChangsheng12('金四局', { yearGan: '壬', gender: 'female' })['辰']).toBe('沐浴');
  });

  it('不传性别时保持顺行（独立调用兼容）', () => {
    expect(getChangsheng12('金四局')['午']).toBe('沐浴');
  });
});

describe('博士十二神（禄存起，阳男阴女顺、阴男阳女逆）', () => {
  it('壬年阳男：禄存子起博士顺行', () => {
    const m = getBoshi12('壬', 'male');
    expect(m['子']).toBe('博士');
    expect(m['丑']).toBe('力士');
    expect(m['卯']).toBe('小耗');
    expect(m['辰']).toBe('将军');
  });

  it('乙年阴男：禄存卯起博士逆行', () => {
    const m = getBoshi12('乙', 'male');
    expect(m['卯']).toBe('博士');
    expect(m['寅']).toBe('力士');
    expect(m['丑']).toBe('青龙');
  });

  it('癸年阴女：禄存亥起博士顺行', () => {
    const m = getBoshi12('癸', 'female');
    expect(m['亥']).toBe('博士');
    expect(m['子']).toBe('力士');
  });

  it('庚年阳女：禄存申起博士逆行', () => {
    const m = getBoshi12('庚', 'female');
    expect(m['申']).toBe('博士');
    expect(m['未']).toBe('力士');
  });
});

describe('岁前十二神与将前十二神', () => {
  it('壬午年：岁建起午顺行、将星在午', () => {
    const sui = getSuiqian12('午');
    expect(sui['午']).toBe('岁建');
    expect(sui['未']).toBe('晦气');
    expect(sui['寅']).toBe('白虎');
    const jiang = getJiangqian12('午');
    expect(jiang['午']).toBe('将星');
    expect(jiang['寅']).toBe('指背');
    expect(jiang['卯']).toBe('咸池');
  });

  it('申子辰年将星在子', () => {
    expect(getJiangqian12('子')['子']).toBe('将星');
    expect(getJiangqian12('辰')['子']).toBe('将星');
  });
});

describe('命主与身主', () => {
  it('寅命宫命主禄存、午年生人身主火星（文墨照片案例）', () => {
    expect(getMingZhu('寅')).toBe('禄存');
    expect(getShenZhu('午')).toBe('火星');
    expect(getMingZhu('子')).toBe('贪狼');
    expect(getShenZhu('卯')).toBe('天同');
  });
});

describe('流年与小限虚岁（文墨照片案例：壬午年男命宫在寅）', () => {
  it('流年：命宫寅 9,21,33,45,57', () => {
    expect(getLiuNianAges('午', '寅')).toEqual([9, 21, 33, 45, 57]);
  });

  it('流年：生年支宫（午）为 1,13,25', () => {
    expect(getLiuNianAges('午', '午')[0]).toBe(1);
    expect(getLiuNianAges('午', '午')[1]).toBe(13);
  });

  it('小限：阳男起辰顺行，寅宫 11,23,35,47,59', () => {
    expect(getXiaoXianAges('午', '寅', '壬', 'male')).toEqual([11, 23, 35, 47, 59]);
  });

  it('小限：起宫辰自身虚岁1起', () => {
    expect(getXiaoXianAges('午', '辰', '壬', 'male')[0]).toBe(1);
  });

  it('小限：阴男同样顺行（男顺女逆，不分阴阳）', () => {
    // 《紫微斗数全书》口诀「小限一年一度逢，男顺女逆不相同」——只看性别，不看年干阴阳。
    // ⚠️ 旧用例钉的是「乙卯阴男逆行」（寅=1、丑=2），那是把大限/博士十二神的
    //    「阳男阴女顺」误套到小限上，属于通行误记；此处按全书原文改为顺行。
    expect(getXiaoXianAges('卯', '寅', '乙', 'male')[0]).toBe(1);
    expect(getXiaoXianAges('卯', '卯', '乙', 'male')[0]).toBe(2);
    // 同年女命逆行：寅=1、丑=2
    expect(getXiaoXianAges('卯', '寅', '乙', 'female')[0]).toBe(1);
    expect(getXiaoXianAges('卯', '丑', '乙', 'female')[0]).toBe(2);
  });
});

describe('enrichGongData 集成', () => {
  const gongData: any[] = [
    { name: '命宫', branch: '寅', stem: '壬', majorStars: [{ name: '七杀', sihua: null, sihuaSelf: null }], minorStarDetails: [{ name: '左辅', sihua: '科', sihuaSelf: null }] },
    { name: '福德', branch: '辰', stem: '甲', majorStars: [{ name: '武曲', sihua: '忌', sihuaSelf: '科' }], minorStarDetails: [] },
  ];

  it('补全亮度/十二神/流年小限/命主身主', () => {
    const { mingZhu, shenZhu } = enrichGongData(gongData, {
      fiveElementName: '金四局', yearGan: '壬', yearZhi: '午', gender: 'male',
      hourZhi: '午', monthNum: 7,
    });
    expect(mingZhu).toBe('禄存');
    expect(shenZhu).toBe('火星');
    // 命宫寅
    expect(gongData[0].majorStars[0].brightness).toBe('庙'); // 七杀在寅=庙
    expect(gongData[0].minorStarDetails[0].brightness).toBe(''); // 左辅无亮度
    expect(gongData[0].changsheng).toBe('绝'); // 金四局寅=绝（照片吻合）
    expect(gongData[0].boshi).toBe('青龙'); // 壬男顺行寅=青龙
    expect(gongData[0].suiqian).toBe('白虎');
    expect(gongData[0].jiangqian).toBe('指背');
    expect(gongData[0].liunianAges).toEqual([9, 21, 33, 45, 57]);
    expect(gongData[0].xiaoxianAges).toEqual([11, 23, 35, 47, 59]);
    // 福德辰
    expect(gongData[1].majorStars[0].brightness).toBe('庙'); // 武曲在辰=庙
    expect(gongData[1].changsheng).toBe('养'); // 金局巳起顺行：辰=养
  });
});
