# 网站与 iOS 体验优化设计文档

> **日期：** 2026-08-26
> **状态：** 已确认（用户批准）

## 1. 背景与目标

用户反馈网站响应与功能响应用户体验需优化，重点关注 iOS（Safari / 微信 WebView）。现状探索发现：

- **主 JS 包 2.0MB、六爻页 1.75MB**（未压缩）——iOS 网络加载慢、白屏久
- antd 输入控件默认字号 14px（< 16px）——**iOS Safari 聚焦输入框时整页自动放大**（经典痛点）
- `ShareButton` 用 `html2canvas` 截图 + `link.download` 下载——iOS Safari 对 dataURL 下载支持差，易失败且无降级
- Google Fonts 中文字体加载无 preconnect，阻塞首屏渲染
- 触摸细节未做优化（双击缩放延迟）

**目标：** 全面优化加载性能与 iOS 交互体验，不改变功能与视觉风格、不引入新依赖。

## 2. 优化项

### 2.1 构建拆包（A：加载性能）

`vite.config.ts` 的 `build.rollupOptions.output.manualChunks`：

| chunk | 包含 | 说明 |
|---|---|---|
| `react-vendor` | react, react-dom, react-router-dom, framer-motion | 首屏核心 |
| `antd-vendor` | antd, @ant-design/icons | UI 框架 |
| `calendar-vendor` | lunar-typescript, @ziweijs/core, cn-division | 日历/排盘数据与算法 |
| 其余 | html2canvas 等 | 随使用页面（Profile 懒加载）拆分 |

**效果：** 主包从 2.0MB 拆分为多个 vendor chunk，浏览器并行下载；vendor 内容不变时可**长期缓存**（后续改业务代码不重新下载框架）。

### 2.2 iOS 输入框聚焦缩放（B1）

**根因：** iOS Safari 对 `font-size < 16px` 的 input/textarea/select 聚焦时自动放大页面。

**方案：** `src/index.css` 增加：

```css
/* iOS 输入框聚焦不自动放大（antd 默认 14px < 16px） */
input, textarea, select {
  font-size: 16px !important;
}
```

不动 viewport（保留用户缩放能力）；antd 控件在移动端以 16px 显示，输入体验更稳。

### 2.3 保存对比图 iOS 降级（B2）

`src/components/ShareButton.tsx`：

- 截图成功后检测 iOS（`/iPhone|iPad|iPod/i.test(navigator.userAgent)` 或 `navigator.platform`）：
  - iOS：`window.open(canvas.toDataURL('image/png'))` 新窗口打开图片，提示「长按图片保存」→ 成功提示改为「图片已生成，请长按保存」
  - 非 iOS：保持现有 `link.download` 下载
- `catch` 分支：提示「导出失败，iOS 建议使用系统截图」

### 2.4 字体预连接 + 非阻塞化（B3）

**现状问题：** `src/index.css` 第 2 行 `@import url('https://fonts.googleapis.com/...')` 是 CSS 内联 @import——浏览器必须下载字体 CSS 才能继续应用后续全部规则（**串行阻塞**）。国内/微信环境下 fonts.googleapis.com 超时会阻塞整份样式表应用，出现"页面无样式"。

**方案：**
1. 移除 `index.css` 中的 `@import` 字体行
2. `index.html` `<head>` 增加（`display=swap` 保证文本先用 fallback 字体立即可见）：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

3. 保留原字体族变量（`--font-display` / `--font-title` / 默认字体），字体晚到不影响布局（fallback 字体替换）。

### 2.5 偶发白屏自动恢复（B5）

**根因：** 生产主包 index JS 约 2.0MB，iOS / 微信 WebView 弱网下偶发模块脚本下载失败 → `#root` 为空 → boot-status 显示「JS 未执行」诊断但**无自动恢复**。

**方案：** 增强 `index.html` 启动诊断逻辑：

```js
// 首次检测到空 → 自动刷新一次（sessionStorage 标记防死循环）；仍空才显示诊断
if (root && root.childElementCount > 0) {
  boot.style.display = 'none';
} else if (!sessionStorage.getItem('yyy_boot_retried')) {
  sessionStorage.setItem('yyy_boot_retried', '1');
  location.reload();
} else {
  showBoot('...'); // 保留原诊断文案
}
```

配合 2.1 拆包（主包显著变小），双保险：加载失败概率降低 + 偶发失败自动重试。

### 2.6 触摸细节（B4）

`src/index.css` body：

```css
touch-action: manipulation; /* 消除双击缩放延迟（iOS 旧版） */
```

`-webkit-tap-highlight-color: transparent` 已存在，保留。

## 3. 不做（范围外）

- 不改排盘 2.5s 推演动画（用户要求的仪式感）
- 不改 PWA / Service Worker 策略
- 不引入压缩插件等新依赖（GitHub Pages 自动协商 gzip）
- 不做图片懒加载（项目图片极少：logo + 水墨动画图）

## 4. 验证

- `npm run build` 前后对比 `dist/assets` chunk 体积（主包应显著下降）
- `npm test` 52 个测试全绿
- `npx tsc --noEmit` 零错误
- 部署 gh-pages 后 iOS 实测：输入框聚焦不缩放、保存对比图可长按保存

## 5. 验收标准

- [ ] 构建后主包（index chunk）体积较 2.0MB 明显下降，vendor chunk 分离
- [ ] iOS 输入框聚焦不再整页放大
- [ ] iOS 下保存对比图：新窗口打开图片可长按保存；失败有引导提示
- [ ] Google Fonts 不再以 `@import` 串行阻塞样式表（index.html link + preconnect）
- [ ] 偶发白屏自动恢复：5 秒空 → 自动 reload 一次（有防死循环标记），仍空才显示诊断
- [ ] 52/52 测试通过、tsc 零错误
- [ ] gh-pages 部署成功，线上可用
