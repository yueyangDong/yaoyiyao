import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MD_BREAKPOINT, isNarrowViewport } from '../viewport';

describe('viewport：窄屏断点判据（唯一出口）', () => {
  it('判据是 `< 768`，必须与 antd 的 md（min-width: 768）互补', () => {
    expect(MD_BREAKPOINT).toBe(768);
    expect(isNarrowViewport(320)).toBe(true);
    expect(isNarrowViewport(390)).toBe(true);
    expect(isNarrowViewport(767)).toBe(true);
    // ⚠️ 这一格是本判据存在的唯一理由：antd 的 md 在 768 就已生效，
    // 容器必须同时切到 800，否则「容器是手机(480)、栅格是桌面」→ 卡片被压到 104px。
    expect(isNarrowViewport(768)).toBe(false);
    expect(isNarrowViewport(769)).toBe(false);
    expect(isNarrowViewport(1280)).toBe(false);
  });

  it('页面里不得再出现第二份 `innerWidth <= 768`（判据只此一处，避免口径再分叉）', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        if (full.replace(/\\/g, '/').endsWith('utils/viewport.ts')) continue; // 判据本体（注释里引用了旧写法）
        if (/\/__tests__\//.test(full.replace(/\\/g, '/'))) continue; // 测试文件：本用例标题里也引用了旧写法
        readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          if (/innerWidth\s*<=\s*768/.test(line)) offenders.push(`${full}:${i + 1}`);
        });
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });
});
