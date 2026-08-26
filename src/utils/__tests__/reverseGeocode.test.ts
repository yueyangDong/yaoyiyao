import { describe, it, expect } from 'vitest';
import { reverseGeocode, formatCountyName } from '../weatherApi';

describe('reverseGeocode（县区级）', () => {
  it('北京天安门 → 东城区或西城区', async () => {
    const r = await reverseGeocode(39.9087, 116.3975);
    expect(r).toMatch(/东城区|西城区/);
  });

  it('上海外滩 → 黄浦区', async () => {
    const r = await reverseGeocode(31.24, 121.49);
    expect(r).toMatch(/黄浦区/);
  });

  it('成都天府广场 → 青羊区或锦江区', async () => {
    const r = await reverseGeocode(30.6575, 104.0661);
    expect(r).toMatch(/青羊区|锦江区/);
  });

  it('石家庄正定附近 → 返回省市区三级格式', async () => {
    const r = await reverseGeocode(38.143, 114.55);
    expect(r.split(',')).toHaveLength(3);
    expect(r).toMatch(/正定县|长安区|新乐市|无极县|行唐县|灵寿县|藁城区/); // 正定周边区县，以实际数据为准
  });

  it('海外坐标 → 未知', async () => {
    const r = await reverseGeocode(40.7128, -74.006);
    expect(r).toBe('未知');
  });
});

describe('formatCountyName', () => {
  it('普通地级市', () => {
    expect(formatCountyName('河北省,石家庄市,正定县')).toBe('石家庄·正定');
  });
  it('直辖市', () => {
    expect(formatCountyName('北京市,北京市,朝阳区')).toBe('北京·朝阳');
  });
  it('县级市', () => {
    expect(formatCountyName('江苏省,苏州市,昆山市')).toBe('苏州·昆山');
  });
  it('未知原样返回', () => {
    expect(formatCountyName('未知')).toBe('未知');
  });
  it('非法输入容错', () => {
    expect(formatCountyName('')).toBe('');
    expect(formatCountyName('北京市')).toBe('北京市');
  });
});
