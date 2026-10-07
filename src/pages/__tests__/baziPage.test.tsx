// 八字页冒烟测试：只保证「能挂载、填完能排盘、排出来的四柱对」。
// 四柱口径本身由 utils/__tests__/personChart.test.ts 覆盖，这里不重复推导，只验证**页面接线**：
//   Bazi.tsx 已改为调用 personChart.buildRawChart（全站唯一四柱入口），若接线断了本用例会红。
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));

// antd 的 Grid/响应式组件依赖 matchMedia 与 ResizeObserver，jsdom 没有内置
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  (globalThis as any).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} });
  (Element.prototype as any).scrollIntoView = () => {};
});

import Bazi from '../Bazi';

/** 按 DOM 顺序取表单里的数字输入框：[年, 月, 日, 时, 分] */
function numberInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('.ant-input-number-input'));
}

describe('八字排盘页', () => {
  it('挂载后显示标题与「排盘」按钮，且含晚子时流派开关', () => {
    const { container } = render(<MemoryRouter><Bazi /></MemoryRouter>);
    const txt = container.textContent || '';
    expect(txt).toContain('八字');
    expect(txt).toContain('排盘');
    expect(txt).toContain('晚子时流派');
    // 默认口吻必须说清是哪一派，避免用户看不出差别
    expect(txt).toContain('日柱算当天');
    expect(txt).toContain('日柱算次日');
  });

  it('填写 2002-12-31 20:30 男 → 排出壬午 壬子 癸酉 壬戌（页面接线到 buildRawChart 的端到端校验）', async () => {
    const { container } = render(<MemoryRouter><Bazi /></MemoryRouter>);

    const inputs = numberInputs(container);
    expect(inputs.length).toBeGreaterThanOrEqual(5);
    const [y, mo, d, h, mi] = inputs;
    fireEvent.change(y, { target: { value: '2002' } });
    fireEvent.change(mo, { target: { value: '12' } });
    fireEvent.change(d, { target: { value: '31' } });
    fireEvent.change(h, { target: { value: '20' } });
    fireEvent.change(mi, { target: { value: '30' } });

    // 性别选「男」
    const maleBtn = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes('男')
      && (l.closest('.ant-radio-group')?.textContent || '').includes('女'));
    expect(maleBtn).toBeTruthy();
    fireEvent.click(maleBtn!);

    // 点「排盘」（页面有 2.5s 推演动画，故超时给足）
    // ⚠️ antd 会给两个汉字的按钮自动插空格（"排 盘"），故按去空白后比较
    const calcBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').replace(/\s/g, '') === '排盘');
    expect(calcBtn).toBeTruthy();
    fireEvent.click(calcBtn!);

    // 等结果区出现。⚠️ 不能拿"含某个干支"当完成判据——推演遮罩期间会随机跳干支，会误判成功；
    // 也不能用"日主"（表单里那句「日主与格局依然准确」也有）。「命格分析」是结果区独有区块。
    await waitFor(() => {
      expect(container.textContent).toContain('命格分析');
    }, { timeout: 12000, interval: 200 });

    const txt = container.textContent || '';
    // 四柱齐出（页面把每一柱的干支都渲染在表格里）
    for (const gz of ['壬午', '壬子', '癸酉', '壬戌']) {
      expect(txt).toContain(gz);
    }
    expect(txt).toContain('日主：');
  }, 30000);
});
