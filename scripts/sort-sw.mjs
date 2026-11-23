/**
 * 把 PWA 生成的 sw.js 里 precacheAndRoute([…]) 的条目按 URL 排序，让产物可复现。
 *
 * 用法：node scripts/sort-sw.mjs [outDir]   （默认 dist；dist 里没有 sw.js 就静默跳过）
 *
 * ── 为什么需要这一步 ───────────────────────────────────────────────
 * workbox 扫描 dist 时用的是文件系统的 readdir 顺序，Linux（CI）与 Windows（本机）
 * 返回的顺序不同。实测同一份代码：两边都是 82 条、80 个唯一 URL、revision 逐条相同，
 * 只有排列顺序不同，于是 sw.js 的字节不同。
 *
 * 功能上没有任何影响——precache 就是个待抓取的 URL 列表，顺序无关。但它让
 * 「逐字节比对本地构建产物与线上产物」这件事失效，而那恰好是排查「本地与线上
 * 不一致」唯一可信的判据：本次排查里 43 个 chunk 的 hash 集体变化，靠肉眼无解，
 * 只能靠 cmp 一粒一粒排。排序之后，平台差异被压平，`diff -r dist 线上镜像`
 * 就能直接当验收命令，任何一行输出都是真问题。
 *
 * ── 为什么不是 vite.config.ts 里的 closeBundle ─────────────────────
 * vite-plugin-pwa 把 sw.js 的生成放在**它自己注入的末端插件**里，任何写在本项目
 * 配置里的 closeBundle 都会先于它执行——实测那一刻 sw.js 还不存在。所以只能做成
 * `vite build` 之后的独立一步（package.json 的 build 脚本已串上）。
 *
 * ── 安全边界 ───────────────────────────────────────────────────
 * 只改 `precacheAndRoute([` 之后那一个数组字面量的**顺序**，不动任何其他字符。
 * 找不到调用、括号不闭合、条目解析不出来时：**原样放过并告警，不写文件**。
 * 排序错了只是缓存顺序变化，写坏 sw.js 则是白屏级故障，两者不对称。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CALL = 'precacheAndRoute([';
const outDir = process.argv[2] ?? 'dist';
const swPath = join(outDir, 'sw.js');

if (!existsSync(swPath)) {
  // APK 构建（--mode android）关掉了 PWA，本来就没有 sw.js，属正常情况
  console.log(`[sort-sw] ${swPath} 不存在，跳过（PWA 未启用）`);
  process.exit(0);
}

const code = readFileSync(swPath, 'utf8');
const at = code.indexOf(CALL);

// ⚠️ 生成的是 `precacheAndRoute([…],{})` —— 数组后面还跟着选项对象，
//    所以不能用 /precacheAndRoute\(\[(.*?)\]\)/ 这种正则（末尾不是 `])`）。
if (at < 0) {
  console.warn('[sort-sw] 没找到 precacheAndRoute([，跳过排序（sw.js 保持原样）');
  process.exit(0);
}

const from = at + CALL.length;
let depth = 1;
let i = from;
for (; i < code.length; i += 1) {
  if (code[i] === '[') depth += 1;
  else if (code[i] === ']') {
    depth -= 1;
    if (depth === 0) break;
  }
}
if (depth !== 0) {
  console.warn('[sort-sw] precache 数组括号不闭合，跳过排序（sw.js 保持原样）');
  process.exit(0);
}

const body = code.slice(from, i);
const entries = body.match(/\{[^{}]*\}/g);
if (!entries || entries.length === 0) {
  console.warn('[sort-sw] precache 条目解析失败，跳过排序（sw.js 保持原样）');
  process.exit(0);
}

const keyed = entries.map((e) => {
  const u = e.match(/url:"([^"]*)"/);
  return { e, url: u ? u[1] : e };
});
// 按代码点比较，不用 localeCompare：后者随地区设置变，等于把不确定性换个地方藏
keyed.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

const sorted = keyed.map((k) => k.e).join(',');
const next = code.slice(0, from) + sorted + code.slice(i);
if (next === code) {
  console.log(`[sort-sw] 已是有序，${entries.length} 条，未改动`);
} else {
  writeFileSync(swPath, next);
  console.log(`[sort-sw] 已排序 ${entries.length} 条 precache 条目`);
}
