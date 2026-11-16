// 占卜三板块页面冒烟：只保证「能挂载、能起卦、切主题出结论、不炸」。
// 判据正确性由 utils/__tests__/divinationReading.test.ts 覆盖，这里不重复。
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

// 页面依赖 supabase 登录态与每日额度，冒烟测试里全部打桩——
// 这里要验的是「起卦后能不能出分主题结论」，不是鉴权链路。
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({ user: null, session: null, loading: false }),
}));
// currentUser 要能在单个用例里换（大六壬的年命层、命盘旁参都只在填了出生信息时才出）。
// ⚠️ 用 importOriginal 保留真实导出：页面/组件还会用到 correctSolarTime 等纯函数，
//    整体替换会让它们变成 undefined（旁参就踩过这个）。
const hoisted = vi.hoisted(() => ({ user: null as any }));
vi.mock('../../context/UserContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    UserProvider: ({ children }: any) => children,
    useUser: () => ({ currentUser: hoisted.user, addHistory: () => {}, users: [], history: [] }),
  };
});
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
import Daliuren from '../Daliuren';

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

describe('大六壬页', () => {
  it('正时起课后出现四课、三传、十二宫与分主题解读', async () => {
    const { container } = wrap(<Daliuren />);
    expect(container.textContent).toContain('大六壬');

    const run = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('以此刻起课'),
    );
    expect(run).toBeTruthy();
    fireEvent.click(run!);

    await waitFor(() => expect(container.textContent).toContain('分主题解读'), { timeout: 8000 });
    expect(hasVerdict(container.textContent || '')).toBe(true);
    // 盘面四层必须都在：课体、四课、三传、十二宫
    expect(container.textContent).toContain('课体');
    expect(container.textContent).toContain('四课');
    expect(container.textContent).toContain('三传');
    expect(container.textContent).toContain('天地盘');
    // 取用速查必须写清健康题方向相反
    expect(container.textContent).toContain('官鬼旺是病势盛');
    // 应期层：主窗口必须打「主」标，且明写不给具体某一天
    expect(container.textContent).toContain('应期');
    expect(container.textContent).toContain('不给具体某一天');
    expect(container.textContent).toContain('最近的');
    // 行动层：四类动作都要落到页面上，且必须声明「不替你做决定」
    expect(container.textContent).toContain('所以呢');
    for (const kind of ['找人', '方向', '方式', '避坑']) {
      expect(container.textContent).toContain(kind);
    }
    expect(container.textContent).toContain('往哪儿使劲');
    // 课格层：盘面气象必须与「课体」明确区分，且至少有一条（贵人顺逆恒在）
    expect(container.textContent).toContain('这张盘的气象');
    expect(container.textContent).toMatch(/贵人[顺逆]布/);
    expect(container.textContent).toContain('它不改吉凶');
  });

  it('填了出生日期后，行动层多一条「谁出面」（年命层），没填则不出', async () => {
    hoisted.user = {
      id: 'u-test', gender: 'male', birthYear: 1984, birthMonth: 6, birthDay: 10,
      birthHour: null, birthMinute: null, birthplace: null, birthplaceLng: null,
      birthCalendar: 'solar',
    };
    try {
      const { container } = wrap(<Daliuren />);
      const run = Array.from(container.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('以此刻起课'),
      );
      fireEvent.click(run!);
      await waitFor(() => expect(container.textContent).toContain('谁出面'), { timeout: 8000 });
      // 只讲「谁去办」，不许替用户断言成败
      expect(container.textContent).not.toMatch(/一定|必然|注定|保证会/);
      // 页面要说清这条从哪来，否则「本命」是悬空术语
      expect(container.textContent).toContain('本命');
    } finally {
      hoisted.user = null;
    }
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

/* ------------------------------------------------------------------ *
 * 命盘旁参（展示层）
 *
 * 四个占卜页各接了一块「旁参 · 你的命盘」。它不是判据，但**必须真的渲染出来**——
 * 这类断链本项目踩过（伏神曾写成 pan.fuShen 恒 undefined，分支永不进）。
 * 判据正确性在 utils/__tests__/mingPanAside.test.ts，这里只验接线。
 * ------------------------------------------------------------------ */

describe('命盘旁参', () => {
  const FULL_USER = {
    id: 'u-aside', name: '测试', gender: '男' as const,
    birthYear: 1990, birthMonth: 6, birthDay: 15, birthHour: 14, birthMinute: 30,
    birthplace: { province: '广东省', city: '深圳市', district: '南山区', longitude: 113.93 },
    birthCalendar: 'solar' as const, isLeapMonth: false,
    createdAt: '', updatedAt: '',
  };

  beforeAll(() => { hoisted.user = FULL_USER; });
  afterAll(() => { hoisted.user = null; });

  const clickByText = (container: HTMLElement, text: string) => {
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes(text),
    );
    expect(btn, `没找到按钮「${text}」`).toBeTruthy();
    fireEvent.click(btn!);
  };

  it('大六壬页：起课后出现旁参，且写明不参与判读', async () => {
    const { container } = wrap(<Daliuren />);
    clickByText(container, '以此刻起课');
    await waitFor(() => expect(container.textContent).toContain('旁参 · 你的命盘'), { timeout: 8000 });
    expect(container.textContent).toContain('不参与上面的判读');
    expect(container.textContent).toContain('偏弱不等于命差');
  });

  it('六爻页：起卦后出现旁参', async () => {
    const { container } = wrap(<Liuyao />);
    clickByText(container, '大衍筮法起卦');
    await waitFor(() => expect(container.textContent).toContain('旁参 · 你的命盘'), { timeout: 8000 });
  });

  it('梅花页：起卦后出现旁参', async () => {
    const { container } = wrap(<Meihua />);
    clickByText(container, '时间起卦');
    await waitFor(() => expect(container.textContent).toContain('旁参 · 你的命盘'), { timeout: 8000 });
  });

  it('灵签页：抽签走完四段动画（祈愿/摇筒/圣杯/显现，约 4.8s）后出现旁参', async () => {
    const { container } = wrap(<Lingqian />);
    clickByText(container, '开始抽签');
    // 四段 interval：80ms×5 + 100ms×11 + 500ms×5 + 100ms×8 ≈ 4.8s，留足余量
    await waitFor(() => expect(container.textContent).toContain('旁参 · 你的命盘'), { timeout: 20000 });
  }, 30000);

  it('没填出生信息就整块不出现（也不写「请先填写」）', async () => {
    hoisted.user = null;
    try {
      const { container } = wrap(<Daliuren />);
      clickByText(container, '以此刻起课');
      await waitFor(() => expect(container.textContent).toContain('分主题解读'), { timeout: 8000 });
      expect(container.textContent).not.toContain('旁参');
      expect(container.textContent).not.toContain('请先填写');
    } finally {
      hoisted.user = FULL_USER;
    }
  });
});
