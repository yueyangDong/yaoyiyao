import { describe, it, expect, vi } from 'vitest';

// UserContext 依赖 supabase（import.meta.env 在 vitest 下无注入），mock 掉以隔离被测纯函数
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import { getCityLng } from '../UserContext';

describe('getCityLng', () => {
  it('编码三级匹配：河北省石家庄市长安区', () => {
    expect(getCityLng('13', '1301', '130102')).toBe(114.52);
  });
  it('编码二级匹配（无区）', () => {
    expect(getCityLng('13', '1301')).toBe(114.52);
  });
  it('名称输入兼容（原契约）', () => {
    expect(getCityLng('陕西省', '西安市', '长安区')).toBe(108.94);
  });
  it('未知编码回退 120', () => {
    expect(getCityLng('99', '9999')).toBe(120);
  });
});
