// CollapsibleCard 展开高度回归。
//
// 旧实现把 max-height 写成「点开那一刻的 scrollHeight」：
//   maxHeight: open ? (contentRef.current?.scrollHeight || 2000) + 'px' : '0px'
// 那个值只在切换的那一次 render 里算一遍，之后内容再长高也不会重算，而外层是
// overflow:hidden —— 内容被**永久截断**。手机端最容易踩到（中文字体异步加载完成
// 后行高变化、十个流年卡片数据后到、地址栏收放导致重排），症状就是「流年只看得到一半」。
//
// 这里用可控的 ResizeObserver + offsetHeight 复现"内容变高"的场景，
// 钉住「展开高度跟着内容走」这个行为。jsdom 没有真实布局，所以必须 mock 高度。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import CollapsibleCard from '../CollapsibleCard';

/** 被测组件读到的"内容高度" */
let fakeHeight = 300;
/** 组件注册的 ResizeObserver 回调——手动调用以模拟内容变化 */
let roCallback: (() => void) | null = null;
let origOffsetHeight: PropertyDescriptor | undefined;

beforeAll(() => {
  origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() { return fakeHeight; },
  });
  (globalThis as any).ResizeObserver = class {
    constructor(cb: () => void) { roCallback = cb; }
    observe() { /* 手动触发 */ }
    unobserve() {}
    disconnect() {}
  };
  (Element.prototype as any).scrollIntoView = () => {};
});

afterAll(() => {
  if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origOffsetHeight);
  delete (globalThis as any).ResizeObserver;
});

/** 折叠容器：根节点 .collapsible-card 的最后一个子 div */
function contentEl(container: HTMLElement): HTMLElement {
  return container.querySelector('.collapsible-card > div:last-child') as HTMLElement;
}
function headerEl(container: HTMLElement): HTMLElement {
  return container.querySelector('.collapsible-card-header') as HTMLElement;
}

describe('CollapsibleCard', () => {
  it('折叠时为 0，展开后按实测内容高度放行（不是写死的 2000）', () => {
    fakeHeight = 300;
    const { container } = render(
      <CollapsibleCard title="运势节奏"><div>内容</div></CollapsibleCard>,
    );
    const content = contentEl(container);
    expect(content.style.maxHeight).toBe('0px');

    fireEvent.click(headerEl(container));
    expect(content.style.maxHeight).toBe('300px');
  });

  it('内容变高后 max-height 跟着放宽 —— 旧实现就卡死在这里', () => {
    fakeHeight = 300;
    const { container } = render(
      <CollapsibleCard title="运势节奏"><div>内容</div></CollapsibleCard>,
    );
    const content = contentEl(container);
    fireEvent.click(headerEl(container));
    expect(content.style.maxHeight).toBe('300px');

    // 模拟：字体加载完成 / 十个流年卡片后到 / 屏幕重排 → 内容真实高度涨到 1200
    fakeHeight = 1200;
    act(() => { roCallback?.(); });
    expect(content.style.maxHeight).toBe('1200px');
  });

  it('量不到高度时（无 ResizeObserver 且 offsetHeight 为 0）宁可丢动画也不截断', () => {
    const saved = (globalThis as any).ResizeObserver;
    (globalThis as any).ResizeObserver = undefined;
    fakeHeight = 0;
    const { container } = render(
      <CollapsibleCard title="x"><div>内容</div></CollapsibleCard>,
    );
    const content = contentEl(container);
    fireEvent.click(headerEl(container));
    expect(content.style.maxHeight).toBe('none');
    (globalThis as any).ResizeObserver = saved;
  });

  it('折叠态与展开态可反复切换，不会残留上一次的高度', () => {
    fakeHeight = 500;
    const { container } = render(
      <CollapsibleCard title="x"><div>内容</div></CollapsibleCard>,
    );
    const content = contentEl(container);
    const header = headerEl(container);
    fireEvent.click(header);
    expect(content.style.maxHeight).toBe('500px');
    fireEvent.click(header);
    expect(content.style.maxHeight).toBe('0px');
    fakeHeight = 700;
    act(() => { roCallback?.(); });
    fireEvent.click(header);
    expect(content.style.maxHeight).toBe('700px');
  });
});
