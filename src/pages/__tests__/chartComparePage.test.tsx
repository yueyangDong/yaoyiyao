// 对比页冒烟测试：只保证「能挂载、关键区块在、点了不炸」。
// 逻辑正确性由 utils/__tests__/chartCompare.test.ts 覆盖，这里不重复。
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

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
});

import ChartCompare from '../ChartCompare';

describe('命盘对比页', () => {
  it('挂载后显示标题、两个输入区与空态', () => {
    const { container } = render(<ChartCompare />);
    expect(container.textContent).toContain('命盘对比');
    expect(container.textContent).toContain('第一张盘');
    expect(container.textContent).toContain('第二张盘');
    expect(container.textContent).toContain('开始对比');
    expect(container.textContent).toContain('填好两组出生信息');
  });

  it('未填完就点「开始对比」→ 给出提示而不是崩溃', () => {
    const { container } = render(<ChartCompare />);
    const btn = container.querySelector('button.ant-btn-primary')!;
    expect(btn.textContent).toContain('开始对比');
    fireEvent.click(btn);
    expect(container.textContent).toContain('请先填写');
  });

  it('页面不出现旧口径措辞（神煞判相似不能只看"有没有"）', () => {
    const { container } = render(<ChartCompare />);
    const txt = container.textContent || '';
    expect(txt).not.toContain('信息不足');
    expect(txt).not.toContain('数据缺失');
    // 一定要说清判据把力量算进去了
    expect(txt).toContain('实际发力');
  });
});
