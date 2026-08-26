import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? '/yaoyiyao/' : '/',
  root: __dirname,
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
