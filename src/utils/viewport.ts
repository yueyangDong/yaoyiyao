/**
 * 视口断点判据**唯一出口**。不要在页面里再写 `window.innerWidth <= 768`。
 *
 * ⚠️ 为什么必须收口 —— 本项目有两套断点，且它们必须在 768 这一点上**互补**：
 *   · JS 侧（`Layout` 决定内容容器宽度）：窄屏给 480px 容器 + 更紧的内边距，宽屏给 800px；
 *   · CSS 侧（antd 栅格）：`md` = `min-width: 768px`。
 *
 * 原来 JS 侧写的是 `<= 768`，于是 **768 这一点上两套判据正好相反**：
 *   JS 认为 768 是手机 → 容器 480px；antd 认为 768 是桌面 → `md={6}/{8}/{12}/{16}` 全部生效。
 * 结果就是「容器是手机、栅格是桌面」的错配，768px 视口（正好是 iPad 竖屏）实测：
 * Bazi 的神煞/流年卡被压到 **104px**（手机端反而有 162px）、日主强弱两栏压到 211px，
 * 页面溢出元素从 39 飙升到 **116**。
 *
 * 改成 `< 768`（与 antd `md` 互补）后，这个错配在数学上不可能发生：
 *   浏览器里 `window.innerWidth >= 媒体查询看到的视口宽度`，
 *   故 `innerWidth < 768 ⟹ 媒体查询宽度 < 768 ⟹ md 不生效`。
 *   反之用 `<= 768` 时，视口恰为 768（且无纵向滚动条）就会踩中——这正是被踩中的那一格。
 */
export const MD_BREAKPOINT = 768;

/**
 * 是否走「窄屏容器」档（`Layout` → 480px 容器 + `16px 8px 24px` 内边距）。
 *
 * ⚠️ 判据必须是 `<`（见上面推导），不要改回 `<=`。
 * @param width 注入视口宽度，便于测试；缺省取 `window.innerWidth`
 */
export function isNarrowViewport(width: number = window.innerWidth): boolean {
  return width < MD_BREAKPOINT;
}
