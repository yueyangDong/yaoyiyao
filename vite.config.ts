import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => ({
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
