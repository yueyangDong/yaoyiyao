# 系统日志（错误记录）设计文档

> **日期：** 2026-08-26
> **状态：** 已确认（用户批准）

## 1. 背景与目标

App 运行时错误（JS 异常、未处理的 Promise rejection、模块加载失败）目前只输出到 console 或临时显示在页面上（index.html 的 boot-status 启动诊断），没有持久化记录。用户遇到 bug 后无法方便地把错误信息提供给开发者。

**目标：** 捕获运行时错误并持久化到本地（localStorage），用户可在「个人档案」页查看错误列表、一键复制导出、清空。纯本地、游客可用、零第三方依赖。

**非目标：**
- 不上报远端（不接 Supabase、不接第三方 SDK）
- 不记录用户操作行为（仅错误类）
- 不拦截 `console.log` / `console.warn`（仅错误）
- 不改动既有 `console.error` 调用点（日志为旁路记录）

## 2. 架构

三个单元，各自单一职责：

### 2.1 `src/utils/logger.ts` — 核心日志模块（纯函数 + 全局监听）

**数据模型：**

```ts
export interface LogEntry {
  id: string;          // 唯一 ID（时间戳 + 随机后缀）
  ts: number;          // 时间戳（毫秒）
  level: 'error';      // 预留扩展位，当前仅 error
  message: string;     // 错误信息（error.message 或 String(error)）
  module?: string;     // 来源模块名（如 'bazi'、'ErrorBoundary-home'）
  stack?: string;      // 堆栈（存在时）
  url?: string;        // 出错文件 URL（window error 事件提供）
}
```

**存储：** localStorage 单 key（`yyy_error_logs`），JSON 数组。**环形缓冲保留最近 100 条**，追加时超出即裁剪最旧的。

**API：**

```ts
export function logError(message: string, meta?: { module?: string; stack?: string; url?: string }): void;
export function getLogs(): LogEntry[];
export function clearLogs(): void;
export function initErrorLogger(): void;  // 注册全局监听，幂等
```

**全局监听（initErrorLogger 注册）：**
- `window.addEventListener('error')` — 捕获未捕获的运行时错误（含资源加载错误，通过 `event.target` 区分，仅记录 message/url）
- `window.addEventListener('unhandledrejection')` — 捕获未处理的 Promise rejection，提取 `reason.message` / 序列化 reason

**降级策略（全部 try/catch 包裹，绝不影响主流程）：**
- localStorage 不可用（隐私模式/被禁用）→ 静默跳过，日志仅内存存活（或直接丢弃）
- 存储内容损坏（JSON.parse 失败）→ 重置为空数组
- 写入超配额 → 尝试裁剪一半后重写，仍失败则丢弃本次

### 2.2 `src/components/LogModal.tsx` — 查看弹窗

- Props：`{ open: boolean; onClose: () => void }`
- 内容：
  - 顶部操作栏：「复制全部」「清空」（清空需 `Modal.confirm` 二次确认）、关闭
  - 列表：每条显示格式化时间（`YYYY-MM-DD HH:mm:ss`）、模块标签、错误信息；stack 可展开（antd `Collapse` 或展开按钮）
  - 空态：无日志时显示「暂无错误记录」
- 复制实现：`navigator.clipboard.writeText`，`try/catch` 失败降级为隐藏 `textarea` + `document.execCommand('copy')`（兼容 WebView）
- 样式：沿用项目现有 antd Modal + 设计令牌（`var(--bg-warm)` 等），移动端适配（列表 item 可换行、字号 13px）

### 2.3 接入点（最小侵入）

| 位置 | 改动 |
|---|---|
| `src/main.tsx` | 模块加载早期调用 `initErrorLogger()` |
| `src/components/ErrorBoundary.tsx` | `componentDidCatch` 内追加 `logError(error.message, { module: this.props.moduleName, stack: error.stack })` |
| `src/pages/Profile.tsx` | 增加「系统日志」入口按钮（icon 建议 `Bug`，lucide 已有），点击打开 LogModal |

**与 boot-status 的关系：** index.html 的启动诊断（`#boot-status`）负责「JS 未执行/启动白屏」场景（此时 React 未挂载、localStorage 模块可能不可加载），保留不动；本功能负责 React 运行期错误。两者职责互补、互不干扰。

## 3. 数据流

```
window error / unhandledrejection / ErrorBoundary.componentDidCatch
        │  logError(message, meta)
        ▼
logger.ts ──写入──▶ localStorage['yyy_error_logs']（≤100 条）
        │
        ▼
Profile 页「系统日志」──▶ LogModal（getLogs 读取）──▶ 复制/清空
```

## 4. 测试（vitest，node 环境 + localStorage mock）

`src/utils/__tests__/logger.test.ts`：

1. `logError` 写入后 `getLogs` 可读取往返（字段完整）
2. 写入 105 条后仅保留最近 100 条（最旧被裁剪）
3. `clearLogs` 清空数组
4. localStorage 内容损坏（预置非法 JSON）时读取不抛错、返回空
5. `initErrorLogger` 幂等（重复调用不重复注册监听；用 `vi.fn` 断言 addEventListener 调用次数）
6. `initErrorLogger` 注册的 error 处理器能捕获全局错误并写入日志（触发一次 mock 事件验证）

## 5. 验收标准

- [ ] `npm test` 全绿（新增 logger 测试 + 既有 30 个测试）
- [ ] `npm run build` 无类型错误
- [ ] 手动验证：`npm run dev` 中触发一次未捕获错误（如控制台 `setTimeout(() => { throw new Error('test') })`），Profile → 系统日志可见该条，含时间与堆栈；复制按钮可复制全部；清空后列表为空
- [ ] 页面刷新后日志仍在（localStorage 持久化）

## 6. 范围外（后续可选）

- 定位功能精确到县区（本次检查确认仅 23 个主要城市近似反查，需另行设计：第三方逆地理编码 API 或内置区县经纬度数据库）
- 日志远端上报（需后端与隐私策略）
- 非错误级日志
