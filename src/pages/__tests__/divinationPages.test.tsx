// 占卜三板块页面冒烟：只保证「能挂载、能起卦、切主题出结论、不炸」。
// 判据正确性由 utils/__tests__/divinationReading.test.ts 覆盖，这里不重复。
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

// 页面依赖 supabase 登录态与每日额度，冒烟测试里全部打桩——
// 这里要验的是「起卦后能不能出分主题结论」，不是鉴权链路。
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({ user: null, session: null, loading: false }),
}));
vi.mock('../../context/UserContext', () => ({
  UserProvider: ({ children }: any) => children,
  useUser: () => ({ currentUser: null, addHistory: () => {} }),
}));
vi.mock('../../hooks/useDailyQuota', () => ({
  useDailyQuota: () => ({ tryConsume: async () => true, quotaModal: null }),
}));
// jsdom 没有 canvas 上下文，彩带动画会抛 clearRect —— 冒烟测试里直接打空
vi.mock('canvas-confetti', () => ({ default: () => {} }));

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

import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { UserProvider } from '../../context/UserContext';
import Meihua from '../Meihua';
import Liuyao from '../Liuyao';
import Lingqian from '../Lingqian';

// 页面依赖 useDailyQuota → useAuth + useNavigate，必须给全 Provider 链
const wrap = (node: React.ReactNode) =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <UserProvider>{node}</UserProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

const VERDICTS = ['大吉', '吉', '平', '小凶', '凶'];

function hasVerdict(text: string): boolean {
  return VERDICTS.some((v) => text.includes(v));
}

describe('梅花易数页', () => {
  it('时间起卦后出现分主题解读，六个主题可切换且结论随之变化', async () => {
    const { container } = wrap(<Meihua />);
    expect(container.textContent).toContain('梅花易数');

    fireEvent.click(container.querySelector('button.ant-btn-primary')!);
    await waitFor(() => expect(container.textContent).toContain('分主题解读'));

    const before = container.textContent || '';
    expect(hasVerdict(before)).toBe(true);

    // 切到「爱情」
    const love = Array.from(container.querySelectorAll('.ant-segmented-item')).find((n) =>
      (n.textContent || '').trim() === '爱情',
    );
    expect(love).toBeTruthy();
    fireEvent.click(love!);
    await waitFor(() => {
      const after = container.textContent || '';
      expect(after).toContain('感情与婚恋');
    });

    // 外应层：方位 / 应期 / 观物取象，且必须明说不参与定吉凶
    await waitFor(() => expect(container.textContent).toContain('外应层'));
    expect(container.textContent).toContain('应期');
    expect(container.textContent).toContain('观物取象对照表');
    expect(container.textContent).toContain('不参与定吉凶');
    expect(container.textContent).toContain('不替你编造');
  });
});

describe('六爻页', () => {
  it('大衍起卦后出现分主题解读与判读依据', async () => {
    const { container } = wrap(<Liuyao />);
    expect(container.textContent).toContain('六爻大衍');

    const draw = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('大衍筮法起卦'),
    );
    expect(draw).toBeTruthy();
    fireEvent.click(draw!);

    await waitFor(() => expect(container.textContent).toContain('分主题解读'), { timeout: 8000 });
    await waitFor(() => expect(container.textContent).toContain('判读依据'));
    expect(hasVerdict(container.textContent || '')).toBe(true);
    // 取用速查必须说明健康题方向相反（否则用户会以为官鬼旺一律是好事）
    expect(container.textContent).toContain('官鬼旺是病势盛');
  });
});

describe('灵签页', () => {
  it('诸葛神数起签后出现分主题解读，且明示「未分级」为推定', async () => {
    const { container } = wrap(<Lingqian />);
    expect(container.textContent).toContain('灵签抽签');

    // 切到诸葛神数
    const tab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((n) =>
      (n.textContent || '').includes('诸葛神数'),
    );
    expect(tab).toBeTruthy();
    fireEvent.click(tab!);

    await waitFor(() => expect(container.textContent).toContain('请输入三个汉字'));

    const inputs = container.querySelectorAll('input.ant-input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    fireEvent.change(inputs[0], { target: { value: '天' } });
    fireEvent.change(inputs[1], { target: { value: '地' } });
    fireEvent.change(inputs[2], { target: { value: '人' } });

    const draw = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('开始抽签'),
    );
    fireEvent.click(draw!);

    await waitFor(() => expect(container.textContent).toContain('分主题解读'), { timeout: 8000 });
    expect(container.textContent).toContain('未分级');
    expect(hasVerdict(container.textContent || '')).toBe(true);
  });
});
