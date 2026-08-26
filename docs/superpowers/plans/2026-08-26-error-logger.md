# 系统日志（错误记录）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 捕获运行时错误（window error / unhandledrejection / ErrorBoundary）并持久化到 localStorage，Profile 页提供查看、复制、清除入口。

**Architecture:** 独立 `logger.ts` 模块负责存储（localStorage 环形缓冲 100 条）与全局监听注册；`LogModal.tsx` 纯展示组件消费 `getLogs()`；接入点最小侵入（main.tsx 注册监听、ErrorBoundary 补一行、Profile 加入口）。

**Tech Stack:** React 18、antd 5、TypeScript 5、vitest（node 环境 + stub localStorage/window）

## Global Constraints

- **仅错误类**：不记录用户操作，不拦截 console.log/warn
- **仅本地存储**：不接 Supabase、不接第三方 SDK
- **localStorage key：`yyy_error_logs`，环形保留 100 条**
- **既有 console.error 调用点一律不改**（日志为旁路记录）
- **index.html 的 boot-status 启动诊断保留不动**
- 文件 CRLF 行尾（write_file 写 LF，git 自动转换，无需手动处理）
- 提交信息用中文，按任务分次 commit
- 既有 30 个测试保持全绿

---

### Task 1: logger.ts 核心模块（TDD）

**Files:**
- Create: `src/utils/logger.ts`
- Test: `src/utils/__tests__/logger.test.ts`

**Interfaces:**
- Produces（Task 2/3 依赖，签名锁定）:
  - `export interface LogEntry { id: string; ts: number; level: 'error'; message: string; module?: string; stack?: string; url?: string }`
  - `export function logError(message: string, meta?: { module?: string; stack?: string; url?: string }): void`
  - `export function getLogs(): LogEntry[]`
  - `export function clearLogs(): void`
  - `export function initErrorLogger(): void`（幂等）

- [ ] **Step 1: 写测试** `src/utils/__tests__/logger.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logError, getLogs, clearLogs, initErrorLogger } from '../logger';

// ---- stub 全局（node 环境无 window/localStorage）----
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
});

type Listener = (e: any) => void;
const listeners: Record<string, Listener[]> = {};
const addEventListener = vi.fn((type: string, cb: Listener) => {
  (listeners[type] ??= []).push(cb);
});
vi.stubGlobal('window', { addEventListener });

function trigger(type: string, event: any) {
  for (const cb of listeners[type] ?? []) cb(event);
}

beforeEach(() => {
  store.clear();
  listeners.error = [];
  listeners.unhandledrejection = [];
  addEventListener.mockClear();
  vi.resetModules();
});

describe('logError / getLogs', () => {
  it('写入后可读回，字段完整', () => {
    logError('boom', { module: 'bazi', stack: 'at fn (x.js:1:2)' });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('boom');
    expect(logs[0].module).toBe('bazi');
    expect(logs[0].stack).toContain('x.js');
    expect(logs[0].level).toBe('error');
    expect(typeof logs[0].id).toBe('string');
    expect(typeof logs[0].ts).toBe('number');
  });

  it('环形缓冲：写入 105 条只保留最近 100 条', () => {
    for (let i = 0; i < 105; i++) logError(`err-${i}`);
    const logs = getLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0].message).toBe('err-5');   // 最旧的 5 条被裁剪
    expect(logs[99].message).toBe('err-104');
  });

  it('clearLogs 清空', () => {
    logError('x');
    clearLogs();
    expect(getLogs()).toHaveLength(0);
  });

  it('localStorage 内容损坏时不抛错、返回空数组', () => {
    store.set('yyy_error_logs', '{broken json!!');
    expect(getLogs()).toEqual([]);
  });

  it('空 message 不写入', () => {
    logError('');
    expect(getLogs()).toHaveLength(0);
  });
});

describe('initErrorLogger', () => {
  it('幂等：重复调用不重复注册监听', () => {
    initErrorLogger();
    initErrorLogger();
    // error + unhandledrejection 各一次，共 2 次
    expect(addEventListener).toHaveBeenCalledTimes(2);
  });

  it('window error 事件被捕获并写入日志', () => {
    initErrorLogger();
    trigger('error', { message: 'runtime boom', filename: 'app.js', error: new Error('runtime boom') });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('runtime boom');
    expect(logs[0].url).toBe('app.js');
  });

  it('资源加载错误（event.target 为元素）记录为资源失败', () => {
    initErrorLogger();
    trigger('error', { target: { tagName: 'IMG', src: 'https://x/img.png' } });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('资源加载失败');
    expect(logs[0].message).toContain('img.png');
  });

  it('unhandledrejection 被捕获并写入日志', () => {
    initErrorLogger();
    trigger('unhandledrejection', { reason: new Error('promise boom') });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('promise boom');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/__tests__/logger.test.ts`
Expected: FAIL（模块不存在 / import 报错）

- [ ] **Step 3: 实现** `src/utils/logger.ts`

```ts
export interface LogEntry {
  id: string;
  ts: number;
  level: 'error';
  message: string;
  module?: string;
  stack?: string;
  url?: string;
}

const STORAGE_KEY = 'yyy_error_logs';
const MAX_LOGS = 100;
let initialized = false;

function readLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: LogEntry[]): void {
  const trimmed = logs.slice(-MAX_LOGS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // 配额满：裁剪一半再试一次，仍失败则放弃（不影响主流程）
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed.slice(-Math.floor(MAX_LOGS / 2))));
    } catch { /* ignore */ }
  }
}

export function logError(message: string, meta?: { module?: string; stack?: string; url?: string }): void {
  if (!message) return;
  const entry: LogEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    level: 'error',
    message: String(message),
    ...meta,
  };
  const logs = readLogs();
  logs.push(entry);
  writeLogs(logs);
}

export function getLogs(): LogEntry[] {
  return readLogs();
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/** 注册全局错误监听（幂等）。React 挂载前调用，捕获 window 级错误。 */
export function initErrorLogger(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName) {
      // 资源加载错误（img/script/link 等）：无 message/stack
      const res = (target as HTMLImageElement).src || (target as HTMLLinkElement).href || target.tagName.toLowerCase();
      logError(`资源加载失败: ${target.tagName.toLowerCase()} ${res}`);
    } else {
      logError(event.message || 'Unknown error', {
        stack: event.error && event.error.stack ? String(event.error.stack) : undefined,
        url: event.filename,
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : (() => { try { return JSON.stringify(reason) || 'Unknown rejection'; } catch { return 'Unknown rejection'; } })();
    logError(`未处理的 Promise 异常: ${message}`, {
      stack: reason instanceof Error && reason.stack ? String(reason.stack) : undefined,
    });
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/__tests__/logger.test.ts`
Expected: 9 passed（8 个用例 + 幂等用例，以实际输出为准，全部绿）

- [ ] **Step 5: Commit**

```bash
git add src/utils/logger.ts src/utils/__tests__/logger.test.ts
git commit -m "feat: 系统日志模块 logger.ts（localStorage 环形 100 条 + 全局错误监听）"
```

---

### Task 2: LogModal 组件

**Files:**
- Create: `src/components/LogModal.tsx`

**Interfaces:**
- Consumes: `getLogs(): LogEntry[]`、`clearLogs(): void`、`LogEntry`（Task 1）
- Produces: `export default function LogModal({ open, onClose }: { open: boolean; onClose: () => void })`（Task 3 使用）

- [ ] **Step 1: 实现** `src/components/LogModal.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Modal, Button, List, Typography, Empty, ModalFuncProps } from 'antd';
import { getLogs, clearLogs, type LogEntry } from '../utils/logger';

const { Text } = Typography;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => { /* 降级在下方 try 已覆盖 */ });
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function serializeLogs(logs: LogEntry[]): string {
  return logs.map(l => {
    const head = `[${formatTime(l.ts)}]${l.module ? ` [${l.module}]` : ''} ${l.message}`;
    return l.stack ? `${head}\n${l.stack}` : head;
  }).join('\n\n');
}

export default function LogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setLogs(getLogs());
  }, [open]);

  const handleCopy = () => {
    copyToClipboard(serializeLogs(logs));
  };

  const handleClear = () => {
    Modal.confirm({
      title: '清空系统日志',
      content: '确定清空全部错误日志吗？此操作不可恢复。',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => { clearLogs(); setLogs([]); },
    } as ModalFuncProps);
  };

  return (
    <Modal
      title={`系统日志（${logs.length} 条）`}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button danger disabled={logs.length === 0} onClick={handleClear}>清空</Button>
          <div>
            <Button onClick={onClose} style={{ marginRight: 8 }}>关闭</Button>
            <Button type="primary" disabled={logs.length === 0} onClick={handleCopy}>复制全部</Button>
          </div>
        </div>
      }
      width={560}
    >
      {logs.length === 0 ? (
        <Empty description="暂无错误记录" style={{ padding: '32px 0' }} />
      ) : (
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <List
            size="small"
            dataSource={logs}
            renderItem={(l) => (
              <List.Item
                style={{ padding: '8px 0', alignItems: 'flex-start' }}
                onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
              >
                <div style={{ width: '100%', minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(l.ts)}</Text>
                  {l.module && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>[{l.module}]</Text>}
                  <div style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--text-primary)' }}>{l.message}</div>
                  {expandedId === l.id && l.stack && (
                    <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '6px 0 0', color: 'var(--text-secondary)', background: 'var(--bg-warm)', padding: 8, borderRadius: 8 }}>{l.stack}</pre>
                  )}
                  {expandedId === l.id && l.url && !l.stack && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{l.url}</Text>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
```

> 说明：`copyToClipboard` 直接走 textarea + execCommand 降级路径（WebView 中 clipboard API 常不可用），返回 boolean 但当前调用处不依赖返回值；`Modal.confirm` 的 `as ModalFuncProps` 为类型收窄，antd 5 中 confirm 返回类型为 `ModalFunc`，如类型报错可去掉该断言改用 `{ ... }` 对象字面量直接传参。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/LogModal.tsx
git commit -m "feat: 系统日志查看弹窗 LogModal（复制/清空/展开堆栈）"
```

---

### Task 3: 接入（main.tsx + ErrorBoundary + Profile）

**Files:**
- Modify: `src/main.tsx`（createRoot 之前）
- Modify: `src/components/ErrorBoundary.tsx:24-26`（componentDidCatch）
- Modify: `src/pages/Profile.tsx`（加入口按钮 + LogModal）

**Interfaces:**
- Consumes: `initErrorLogger()`、`logError()`（Task 1）、`LogModal`（Task 2）

- [ ] **Step 1: main.tsx 注册全局监听**

在 `src/main.tsx` 的 `createRoot(...)` 之前（import 区之后）加：

```tsx
import { initErrorLogger } from './utils/logger';

initErrorLogger();
```

先读 `src/main.tsx` 现有 import 结构，把 `initErrorLogger` 调用放在 `ReactDOM.createRoot` 之前。

- [ ] **Step 2: ErrorBoundary 记录错误**

`src/components/ErrorBoundary.tsx` 的 `componentDidCatch` 改为：

```tsx
import { logError } from '../utils/logger';

componentDidCatch(error: Error, info: ErrorInfo) {
  console.error(`[ErrorBoundary${this.props.moduleName ? `-${this.props.moduleName}` : ''}]`, error, info);
  logError(error.message || String(error), {
    module: this.props.moduleName ? `ErrorBoundary-${this.props.moduleName}` : 'ErrorBoundary',
    stack: error.stack,
  });
}
```

- [ ] **Step 3: Profile 页加入口**

先读 `src/pages/Profile.tsx` 的结构（找合适的位置，如"个人档案"信息区底部或操作按钮区），加：

```tsx
import { useState } from 'react';
import { Bug } from 'lucide-react';  // 若 Profile 已从 lucide-react 引入图标则合并 import
import LogModal from '../components/LogModal';

// 组件内：
const [logOpen, setLogOpen] = useState(false);
```

在操作区加按钮（样式对齐 Profile 页现有按钮）：

```tsx
<Button icon={<Bug size={14} />} onClick={() => setLogOpen(true)}>
  系统日志
</Button>
<LogModal open={logOpen} onClose={() => setLogOpen(false)} />
```

> 实现者以 Profile.tsx 实际布局为准放置：按钮放入现有操作按钮组（若有），否则在页面底部加一个普通按钮；确保不破坏现有布局。

- [ ] **Step 4: 构建 + 全量测试验证**

Run: `npx tsc --noEmit`
Expected: 无错误

Run: `npm test`
Expected: 全部通过（既有 30 + 新增 logger 9 = 39 左右）

- [ ] **Step 5: 手动验证（可选）**

Run: `npm run dev`
Expected: 打开页面后在控制台执行 `setTimeout(() => { throw new Error('manual-test') })`，进 Profile → 系统日志可见该条（含时间、堆栈）；复制按钮输出包含该条；清空后为空；刷新页面日志仍在。

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/components/ErrorBoundary.tsx src/pages/Profile.tsx
git commit -m "feat: 系统日志接入（全局监听 + ErrorBoundary + Profile 入口）"
```

---

## Self-Review

**1. Spec coverage:**
- logger.ts 存储/监听/环形 100 条 → Task 1 ✅
- LogModal 查看/复制/清除/展开堆栈 → Task 2 ✅
- main.tsx / ErrorBoundary / Profile 接入 → Task 3 ✅
- 测试（往返、环形、clear、损坏容错、幂等、事件捕获）→ Task 1 Step 1 ✅
- 不拦截 console.log/warn、不改既有 console.error → 约束声明 + Task 3 Step 2 保留原 console.error ✅
- boot-status 保留不动 → 未触碰 index.html ✅

**2. Placeholder scan:** 无 TBD/TODO；Profile 接入处标注"以实际布局为准"并给出两种放置策略（有明确回退）。

**3. Type consistency:** `LogEntry { id/ts/level/message/module?/stack?/url? }` 在 Task 1 定义、Task 2 消费（serializeLogs/展开）、Task 1 测试断言一致；`initErrorLogger()` 无参、`logError(message, meta?)` 签名在 Task 1 定义、Task 3 使用一致；`LogModal({ open, onClose })` 在 Task 2 定义、Task 3 使用一致。
