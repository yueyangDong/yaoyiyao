import { describe, it, expect, vi, beforeEach } from 'vitest';

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

/** 重新加载 logger 模块，隔离模块级 initialized 状态 */
async function freshLogger() {
  vi.resetModules();
  return await import('../logger');
}

beforeEach(() => {
  store.clear();
  listeners.error = [];
  listeners.unhandledrejection = [];
  addEventListener.mockClear();
});

describe('logError / getLogs', () => {
  it('写入后可读回，字段完整', async () => {
    const { logError, getLogs } = await freshLogger();
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

  it('环形缓冲：写入 105 条只保留最近 100 条', async () => {
    const { logError, getLogs } = await freshLogger();
    for (let i = 0; i < 105; i++) logError(`err-${i}`);
    const logs = getLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0].message).toBe('err-5'); // 最旧的 5 条被裁剪
    expect(logs[99].message).toBe('err-104');
  });

  it('clearLogs 清空', async () => {
    const { logError, getLogs, clearLogs } = await freshLogger();
    logError('x');
    clearLogs();
    expect(getLogs()).toHaveLength(0);
  });

  it('localStorage 内容损坏时不抛错、返回空数组', async () => {
    store.set('yyy_error_logs', '{broken json!!');
    const { getLogs } = await freshLogger();
    expect(getLogs()).toEqual([]);
  });

  it('空 message 不写入', async () => {
    const { logError, getLogs } = await freshLogger();
    logError('');
    expect(getLogs()).toHaveLength(0);
  });
});

describe('initErrorLogger', () => {
  it('幂等：重复调用不重复注册监听', async () => {
    const { initErrorLogger } = await freshLogger();
    initErrorLogger();
    initErrorLogger();
    // error + unhandledrejection 各一次，共 2 次
    expect(addEventListener).toHaveBeenCalledTimes(2);
  });

  it('window error 事件被捕获并写入日志', async () => {
    const { initErrorLogger, getLogs } = await freshLogger();
    initErrorLogger();
    trigger('error', { message: 'runtime boom', filename: 'app.js', error: new Error('runtime boom') });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('runtime boom');
    expect(logs[0].url).toBe('app.js');
  });

  it('资源加载错误（event.target 为元素）记录为资源失败', async () => {
    const { initErrorLogger, getLogs } = await freshLogger();
    initErrorLogger();
    trigger('error', { target: { tagName: 'IMG', src: 'https://x/img.png' } });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('资源加载失败');
    expect(logs[0].message).toContain('img.png');
  });

  it('unhandledrejection 被捕获并写入日志', async () => {
    const { initErrorLogger, getLogs } = await freshLogger();
    initErrorLogger();
    trigger('unhandledrejection', { reason: new Error('promise boom') });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('promise boom');
  });
});
