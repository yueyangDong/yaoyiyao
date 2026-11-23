import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { dirname, resolve, relative, join, sep } from 'path';
import { fileURLToPath } from 'url';

/**
 * 架构分层守卫。
 *
 * 为什么要有这个文件：分层规则写在文档里没人守，三个月后必然失效
 * （本仓已经踩过一次——14 个判据模块从 `pages/Bazi.tsx` 导入 `PillarData`，
 *  直到做启动优化时才发现判据层反向依赖页面）。
 *
 * 依赖方向（箭头指向"可以被依赖"）：
 *
 *   types  ←  data  ←  utils(判据)  ←  components(排版)  ←  pages
 *                            ↑                              ↑
 *                           lib / hooks / context  ─────────┘
 *
 * 两条硬边界：
 *   1) utils 不知道 pages / components 的存在（判据层可脱离 React 单独跑）；
 *   2) 首屏静态闭包里不能出现重库与页面（首屏体积＝用户感知的启动速度）。
 */

const SRC = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');

/** 递归列出 src 下所有 ts/tsx（跳过 __tests__ 之外的产物目录） */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
}

const ALL_FILES = walk(SRC);

/**
 * 抽静态 import / export-from 的模块说明符。
 * `import(` 之后不跟空白，因此动态 import 不会被误抓——这正是我们要区分的两种东西。
 */
function staticSpecs(code: string): string[] {
  const specs: string[] = [];
  const re = /^[ \t]*(?:import|export)\s+(?:type\s+)?(?:[^'"();]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) specs.push(m[1]);
  return specs;
}

const rel = (p: string) => relative(SRC, p).replace(/\\/g, '/');

/** 把相对说明符解析成真实文件路径；解析不到返回 null（外部包） */
function resolveSpec(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

describe('架构分层', () => {
  it('utils(判据层) 不得依赖 pages / components', () => {
    // 唯一豁免：renderWithTerms.tsx 是"把术语渲染成 ReactNode"的黏合层，
    // 本质属渲染层，但被判据层多处调用。待它迁出 utils 后应删掉这条豁免。
    const ALLOW: string[] = ['utils/renderWithTerms.tsx'];

    const bad: string[] = [];
    for (const f of ALL_FILES) {
      const r = rel(f);
      if (!r.startsWith('utils/') || r.includes('__tests__')) continue;
      if (ALLOW.includes(r)) continue;
      for (const spec of staticSpecs(readFileSync(f, 'utf8'))) {
        if (/^\.\.\/(pages|components)\//.test(spec)) bad.push(`${r} → ${spec}`);
      }
    }
    expect(bad, `判据层不得反向依赖 UI 层：\n${bad.join('\n')}`).toEqual([]);
  });

  it('data(静态数据层) 不得依赖任何上层', () => {
    const bad: string[] = [];
    for (const f of ALL_FILES) {
      const r = rel(f);
      if (!r.startsWith('data/')) continue;
      for (const spec of staticSpecs(readFileSync(f, 'utf8'))) {
        if (/^\.\.\/(utils|pages|components|context|hooks|lib)\//.test(spec)) bad.push(`${r} → ${spec}`);
      }
    }
    expect(bad, `数据层不得依赖上层：\n${bad.join('\n')}`).toEqual([]);
  });

  it('components 不得依赖 pages', () => {
    const bad: string[] = [];
    for (const f of ALL_FILES) {
      const r = rel(f);
      if (!r.startsWith('components/')) continue;
      for (const spec of staticSpecs(readFileSync(f, 'utf8'))) {
        if (/^\.\.\/pages\//.test(spec)) bad.push(`${r} → ${spec}`);
      }
    }
    expect(bad, `组件层不得依赖页面：\n${bad.join('\n')}`).toEqual([]);
  });

  /**
   * 首屏静态闭包：从 main.tsx 顺着**静态** import 能走到的全部文件。
   * 这些文件会被打进首屏 chunk，用户的第一次渲染必须等它们下载+解析。
   */
  function firstScreenClosure(): Map<string, string[]> {
    const seen = new Map<string, string[]>();
    const start = resolve(SRC, 'main.tsx');
    const queue = [start];
    while (queue.length) {
      const f = queue.pop()!;
      const r = rel(f);
      if (seen.has(r)) continue;
      const specs = staticSpecs(readFileSync(f, 'utf8'));
      seen.set(r, specs);
      for (const s of specs) {
        const next = resolveSpec(f, s);
        if (next && !seen.has(rel(next))) queue.push(next);
      }
    }
    return seen;
  }

  const closure = firstScreenClosure();
  const closureFiles = [...closure.keys()];

  it('首屏闭包只允许 Home 这一个页面', () => {
    const pages = closureFiles.filter((f) => f.startsWith('pages/') && f !== 'pages/Home.tsx');
    expect(
      pages,
      `除落地页 Home 外，页面必须走 React.lazy（否则整页连同它的 antd 组件进首屏）：\n${pages.join('\n')}`,
    ).toEqual([]);
  });

  it('首屏闭包不得静态引入重库（只能动态 import）', () => {
    // 这些包单拎出来都在 50 KB gzip 以上，且首屏用不到：
    //   cn-division     全国区划表，只在保存出生地时需要
    //   lunar-typescript 农历数据，首页只要一行"农历X月X日"
    //   tyme4ts / iching-shifa / @ziweijs/core  排盘内核，只在排盘页
    const HEAVY = ['cn-division', 'lunar-typescript', 'tyme4ts', 'iching-shifa', '@ziweijs/core', '@ziweijs/i18n'];
    const bad: string[] = [];
    for (const [file, specs] of closure) {
      for (const s of specs) {
        if (HEAVY.includes(s)) bad.push(`${file} → ${s}`);
      }
    }
    expect(
      bad,
      `首屏不得静态引入重库，改用 await import()：\n${bad.join('\n')}`,
    ).toEqual([]);
  });

  it('首屏闭包不含整份 iching 占例数据（高岛易断已剥离）', () => {
    // 与 vendorBundle.test.ts 互补：那边测文件本身，这边测"有没有被首屏摸到"。
    expect(closureFiles.some((f) => f.includes('iching-shifa'))).toBe(false);
  });
});
