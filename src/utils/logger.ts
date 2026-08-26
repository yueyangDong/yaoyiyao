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
