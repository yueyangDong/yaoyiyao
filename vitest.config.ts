import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

// @ziweijs/core 厂内修复版（五行局纳音计算修正，见 src/vendor/ziweijs-core/ 内注释）。
// 注意：必须同时写入根 resolve 与每个 project 的 resolve，
// 且 test.server.deps.inline 需内联该包——externalized 的 node_modules 依赖不走 alias。
const ziweiAlias = {
  '@ziweijs/core': fileURLToPath(new URL('./src/vendor/ziweijs-core/index.js', import.meta.url)),
};

export default defineConfig({
  resolve: { alias: ziweiAlias },
  test: {
    server: {
      deps: {
        inline: ['@ziweijs/core'],
      },
    },
    // environmentMatchGlobs 已弃用，改用 test.projects 按文件后缀拆分环境
    projects: [
      {
        resolve: { alias: ziweiAlias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/__tests__/**/*.test.ts'],
        },
      },
      {
        resolve: { alias: ziweiAlias },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.tsx'],
        },
      },
    ],
  },
});
