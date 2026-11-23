import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 构建 base 的合法取值。三种部署形态各一个：GitHub Pages 子路径 / 根域 / Capacitor 本地。
 */
const ALLOWED_BUILD_BASES = ['/yaoyiyao/', '/', './'];

/**
 * 构建 base 闸门。
 *
 * ⚠️ 为什么需要它：Windows 的 Git Bash（MSYS2）会把**以 `/` 开头的命令行参数**
 *    当成 POSIX 路径，在交给 vite 之前自动改写成 Windows 路径。
 *    `npx vite build --base=/yaoyiyao/` 到 vite 手里就变成了
 *    `/workbuddy/resources/vendor/PortableGit/yaoyiyao/`（本机实测；标准安装下是
 *    `C:/Program Files/Git/yaoyiyao/`）。后果是 index.html 里**每一条**资源引用、
 *    `import.meta.env.BASE_URL`、PWA manifest 全部指向不存在的位置：
 *    图片 404、所有 chunk 名字集体变化，而构建过程**一句错都不报**，
 *    只能靠逐字节比对产物才发现（本地与线上 69 个 chunk 里 43 个 hash 不同）。
 *
 *    CI 在 Linux 上跑，不会触发；`npm run` 在 Windows 上走 cmd.exe，也不触发。
 *    只有「在本机用 Git Bash 直接敲 vite」才会踩——而那恰好是排查线上问题时最常做的事。
 *
 *    所以这里的选择是：**宁可构建失败**，也不要产出一个「本地能跑、线上 404」的包。
 *    真要在 Git Bash 里传 `--base`，加 `MSYS_NO_PATHCONV=1` 前缀即可。
 */
function assertBuildBase(): Plugin {
  return {
    name: 'assert-build-base',
    configResolved(cfg) {
      if (cfg.command !== 'build') return;
      if (!ALLOWED_BUILD_BASES.includes(cfg.base)) {
        throw new Error(
          `[base] 构建 base 异常：${cfg.base}\n`
          + `  合法值只有 ${ALLOWED_BUILD_BASES.join(' / ')}。\n`
          + '  若你在 Windows 的 Git Bash 里传了 --base=/…，那是 MSYS 把参数改写成路径了：\n'
          + '    改用 MSYS_NO_PATHCONV=1 前缀，或直接依赖 vite.config.ts 里的默认值。',
        );
      }
    },
  };
}

/**
 * PWA 的 precache 列表排序**不在这里做**。原因见 scripts/sort-sw.mjs 头部注释：
 * vite-plugin-pwa 在它自己注入的末端插件里写 sw.js，任何写在本配置里的
 * closeBundle 都会先于它执行（实测 sw.js 尚不存在）。所以排序是 `npm run build:*`
 * 里 `vite build` 之后的一步。
 */

export default defineConfig(({ command, mode }) => ({
  // ⚠️ 不要再给命令加 `--base=/…`：构建默认值已经在这里，且加参数会在 Windows
  //    Git Bash 里被 MSYS 改写（见 assertBuildBase 注释）。要换部署目标就改这里。
  base: command === 'build' ? '/yaoyiyao/' : '/',
  root: __dirname,
  // @ziweijs/core 厂内化：node_modules 原版五行局（纳音）计算有误（丙寅误判土五局），
  // 修复版见 src/vendor/ziweijs-core（见该目录内注释），此处全局重定向。
  // @ziweijs/i18n 同样厂内化，原因有二：
  //   1) core（厂内版）与 i18n 直接互相依赖，必须成对固定；
  //   2) 整个 @ziweijs/* scope 已被上游从 npm registry 撤下（404），
  //      继续作为 npm 依赖会让 `npm ci` 直接失败（CI 部署因此断过）。
  //      两个包均已不再出现在 package.json / lock 中，构建不再联网取它们。
  // 注意 tyme4ts 是厂内 core 的运行时依赖（原由 @ziweijs/core 传递声明），
  // 已在 package.json 提升为直接依赖并锁定 1.3.9。
  resolve: {
    alias: {
      '@ziweijs/core': fileURLToPath(new URL('./src/vendor/ziweijs-core/index.js', import.meta.url)),
      '@ziweijs/i18n': fileURLToPath(new URL('./src/vendor/ziweijs-i18n/index.js', import.meta.url)),
      // iching-shifa 厂内化：上游把《高岛易断》64 卦 ~620 KB 占例与排盘代码打进同一个
      // ESM 文件，且顶层 for 循环建索引（副作用），rollup 摇不掉——只 import 4 个排盘
      // 函数也会带出 1.5 MB。vendored 副本已剥离那段数据（六爻页 2.23 MB → 0.74 MB），
      // 等价性验证见 src/vendor/iching-shifa/index.js 头部注释。
      'iching-shifa': fileURLToPath(new URL('./src/vendor/iching-shifa/index.js', import.meta.url)),
    },
  },
  build: {
    // 保守目标：兼容较旧系统 WebView（Android 8/9 及未更新的 WebView）
    target: 'es2018',
    rollupOptions: {
      output: {
        // 拆 vendor：框架/UI/日历数据分离，浏览器并行下载 + 长期缓存。
        //
        // ⚠️ 日历这块必须**按用途拆开**，不能合成一个 calendar-vendor：
        //    合成后只要首屏碰到其中任何一个（比如只为显示一行农历），
        //    全国行政区划表（cn-division ~200 KB gzip）会跟着一起进首屏。
        //    拆开之后各自的加载时机才独立：
        //      lunar  → 首页那行农历 / 排盘页
        //      cn     → 只在保存档案、选定出生地时（Layout 里是动态 import）
        //      tyme   → 排盘底层（iching-shifa 与 @ziweijs/core 共用）
        //      ziwei  → 紫微页
        // ⚠️ manualChunks 用**对象式**（包名数组）会把该包**整个模块图**强行塞进一个 chunk，
        //    不管它有没有被首屏引用。写成 `'antd-vendor': ['antd']` 的后果是：
        //    懒加载页面才用到的 antd 组件（Table/DatePicker/Upload…）全被提前进首屏，
        //    antd-vendor 984 KB 里有一大半首屏根本用不上。
        //    改成函数式，只锁 react 一层（它必然首屏），其余交给 rollup 按**引用关系**拆：
        //    首屏实际用到的部分进 index/共享 chunk，页面独用的跟着页面 chunk 走。
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const p = id.replace(/\\/g, '/');
          // react 全家 + 动画库：首屏必经，单独立组最利于长期缓存
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|framer-motion|motion-dom|motion-utils)\//.test(p)) {
            return 'react-vendor';
          }
          // 其余（antd / rc-* / lunar-typescript / tyme4ts / cn-division …）不归组
          return undefined;
        },
      },
    },
  },
  plugins: [
    assertBuildBase(),
    react(),
    // APK 构建（--mode android）禁用 PWA/SW：Capacitor 内 Service Worker 是白屏隐患（陈旧缓存）
    ...(mode === 'android' ? [] : [VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['logo-192.png', 'logo-512.png'],
      manifest: {
        name: '爻一爻',
        short_name: '爻一爻',
        description: '八字排盘、紫微斗数、六爻占卜、灵签抽签、周公解梦',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/logo-192.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    })]),
  ],
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/NTUSER.DAT', '**/C:/Users/**'],
    },
  },
}));
