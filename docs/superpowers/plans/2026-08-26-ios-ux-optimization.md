# 网站与 iOS 体验优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化网站加载性能与 iOS 交互体验：拆包减小主包、修复 iOS 输入聚焦缩放、字体非阻塞化、偶发白屏自动恢复、保存对比图 iOS 降级、触摸细节。

**Architecture:** 构建层（vite manualChunks 拆 vendor）与运行时层（index.html 启动诊断/字体链接、index.css 表单字号/触摸、ShareButton 平台分支）六处独立修改，各自可验证。

**Tech Stack:** Vite 5、React 18、antd 5、html2canvas

## Global Constraints

- **不引入新依赖**（拆包用 Vite 内置 manualChunks，字体用原生 link）
- **不动**：排盘 2.5s 推演动画、PWA/SW 策略、业务功能逻辑
- 文件 CRLF 行尾（git 自动转换）
- 提交信息用中文，按任务分次 commit
- 既有 52 个测试保持全绿
- 完成后 `npm run build` 对比 chunk 体积，并部署 gh-pages（`npm run build:gh && npm run deploy`）

---

### Task 1: vite 拆包（manualChunks）

**Files:**
- Modify: `vite.config.ts`（build.rollupOptions.output）

**Interfaces:**
- Produces: 主包拆分为 `react-vendor` / `antd-vendor` / `calendar-vendor` 三个 vendor chunk（Task 6 验证体积）

- [ ] **Step 1: 在 vite.config.ts 的 build 配置中加 manualChunks**

当前 `vite.config.ts` 的 `build` 配置：

```ts
  build: {
    // 保守目标：兼容较旧系统 WebView（Android 8/9 及未更新的 WebView）
    target: 'es2018',
  },
```

改为：

```ts
  build: {
    // 保守目标：兼容较旧系统 WebView（Android 8/9 及未更新的 WebView）
    target: 'es2018',
    rollupOptions: {
      output: {
        // 拆 vendor：框架/UI/日历数据分离，浏览器并行下载 + 长期缓存
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'calendar-vendor': ['lunar-typescript', '@ziweijs/core', 'cn-division'],
        },
      },
    },
  },
```

> 说明：`html2canvas` / `canvas-confetti` 不放入 vendor——它们只在 Profile 等懒加载页使用，随页面 chunk 拆分。

- [ ] **Step 2: 构建验证**

Run: `npx tsc --noEmit && npm run build`
Expected: 构建成功；`dist/assets` 出现 `react-vendor-*.js`、`antd-vendor-*.js`、`calendar-vendor-*.js`，`index-*.js` 显著小于 2.0MB

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build: vite manualChunks 拆包（react/antd/calendar 三组 vendor，减小主包）"
```

---

### Task 2: iOS 输入框聚焦缩放 + 触摸细节

**Files:**
- Modify: `src/index.css`（body 区 + 新增表单字号规则）

**Interfaces:**
- Produces: iOS Safari 输入控件聚焦不再整页放大；触摸双击缩放延迟消除

- [ ] **Step 1: body 加 touch-action**

在 `src/index.css` 的 `body` 规则中追加（找到 `body {` 块，加入属性）：

```css
  touch-action: manipulation; /* 消除双击缩放延迟（iOS 旧版） */
```

> 实现者先读 body 规则现状，把该属性加进现有 `body { }` 内（不要新建重复的 body 块）。

- [ ] **Step 2: 表单控件强制 16px 字号**

在 `src/index.css` 末尾追加：

```css
/* iOS Safari 输入控件聚焦自动放大修复：antd 默认 14px < 16px 会触发整页缩放 */
input, textarea, select {
  font-size: 16px !important;
}
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit && npm test`
Expected: 全绿

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: iOS 输入控件聚焦不缩放（16px）+ touch-action 消除双击延迟"
```

---

### Task 3: Google Fonts 非阻塞化

**Files:**
- Modify: `src/index.css`（移除 @import 行）
- Modify: `index.html`（head 加 preconnect + link）

**Interfaces:**
- Produces: 字体 CSS 不再串行阻塞样式表；preconnect 加速连接

- [ ] **Step 1: 移除 index.css 的 @import**

`src/index.css` 第 2 行：

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
```

整行删除（保留文件头注释）。

- [ ] **Step 2: index.html head 加字体 link**

在 `index.html` 的 `<head>` 中（`<link rel="icon" ...>` 附近）加入：

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit && npm run build`
Expected: 构建成功，页面样式不受影响（字体族变量沿用同一字体 URL）

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "perf: Google Fonts 由 CSS @import 改为 head link + preconnect（消除串行阻塞）"
```

---

### Task 4: 偶发白屏自动恢复

**Files:**
- Modify: `index.html`（boot-status 启动诊断脚本，约 18-44 行）

**Interfaces:**
- Produces: 5 秒空 → 自动 reload 一次（sessionStorage 防死循环）；仍空才显示诊断

- [ ] **Step 1: 改造启动诊断逻辑**

当前 `index.html` 中诊断脚本的 5 秒检测段：

```js
        setTimeout(function () {
          var root = document.getElementById('root');
          if (root && root.childElementCount > 0) {
            boot.style.display = 'none';
          } else {
            showBoot('5 秒后页面仍为空——JavaScript 未执行。\n可能原因：模块脚本加载被拦（CORS/MIME）、脚本语法错误，或 WebView 未正确加载。');
          }
        }, 5000);
```

改为：

```js
        setTimeout(function () {
          var root = document.getElementById('root');
          if (root && root.childElementCount > 0) {
            boot.style.display = 'none';
          } else if (!sessionStorage.getItem('yyy_boot_retried')) {
            // 偶发加载失败自动恢复：仅重试一次，避免死循环
            sessionStorage.setItem('yyy_boot_retried', '1');
            location.reload();
          } else {
            showBoot('5 秒后页面仍为空——JavaScript 未执行。\n可能原因：模块脚本加载被拦（CORS/MIME）、脚本语法错误，或 WebView 未正确加载。');
          }
        }, 5000);
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit && npm run build`
Expected: 构建成功；正常加载时 `yyy_boot_retried` 不产生（root 非空直接隐藏诊断）

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: 偶发白屏自动 reload 一次（boot-status 诊断增强，防死循环）"
```

---

### Task 5: 保存对比图 iOS 降级

**Files:**
- Modify: `src/components/ShareButton.tsx`（handleCapture，约 15-39 行）

**Interfaces:**
- Consumes: 无新接口
- Produces: iOS 下截图后新窗口打开图片供长按保存；失败引导提示

- [ ] **Step 1: 修改 handleCapture 加 iOS 分支**

`src/components/ShareButton.tsx` 的 `handleCapture` 中，`html2canvas` 成功回调改为：

```tsx
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#F7F5F0',
        scale: 2,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      // iOS Safari 不支持 dataURL 下载，改为新窗口打开供长按保存
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        window.open(dataUrl, '_blank');
        message.success('图片已生成，请在新页面长按保存');
      } else {
        const link = document.createElement('a');
        link.download = `${fileName}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        message.success('图片已保存');
      }
```

`catch` 分支提示改为：

```tsx
    } catch {
      message.error('导出失败。iOS 设备建议使用系统截图（电源键+音量加）。');
    }
```

> 说明：`navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1` 用于识别 iPadOS（Safari 上报 MacIntel 平台）。

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit && npm test`
Expected: 全绿

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareButton.tsx
git commit -m "fix: 保存对比图 iOS 降级——新窗口打开图片长按保存 + 失败引导"
```

---

### Task 6: 全量验证 + 体积对比 + 部署

**Files:**
- 验证与部署（无代码改动）

**Interfaces:**
- Consumes: Task 1-5 全部

- [ ] **Step 1: 全量测试 + 类型检查**

Run: `npm test && npx tsc --noEmit`
Expected: 52 passed、零错误

- [ ] **Step 2: 构建体积对比**

Run: `npm run build`
Expected: `dist/assets` 中 `index-*.js` 明显小于 2.0MB（目标 < 1.2MB），出现 `react-vendor-*` / `antd-vendor-*` / `calendar-vendor-*`

记录构建输出中最大的 3 个 chunk 体积（供汇报）。

- [ ] **Step 3: 部署 gh-pages**

Run: `git add -A && git commit -m "chore: 提交本次优化构建产物"`（如有未提交内容）→ `npm run build:gh && npm run deploy`
Expected: Published；线上 https://yueyangDong.github.io/yaoyiyao/ HTTP 200

- [ ] **Step 4: 汇报**

汇报：chunk 体积对比（优化前 index 2.0MB → 优化后各 chunk）、iOS 各优化点、白屏自动恢复说明。

---

## Self-Review

**1. Spec coverage:**
- 2.1 拆包 → Task 1 ✅
- 2.2 iOS 输入缩放 → Task 2 ✅
- 2.3 保存对比图 iOS 降级 → Task 5 ✅
- 2.4 字体非阻塞 → Task 3 ✅
- 2.5 白屏自动恢复 → Task 4 ✅
- 2.6 触摸细节 → Task 2 ✅
- 验证/部署/体积对比 → Task 6 ✅

**2. Placeholder scan:** 无 TBD/TODO；每步含真实代码与验证命令；Task 2 标注"读 body 现状加入属性"并给出明确落点。

**3. Type consistency:** 无跨任务接口依赖（各任务独立修改不同文件）；ShareButton 的 `isIOS` 判定、boot-status 的 `yyy_boot_retried` 标记均在各自任务内自洽。
