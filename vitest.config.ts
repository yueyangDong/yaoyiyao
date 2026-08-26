import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // environmentMatchGlobs 已弃用，改用 test.projects 按文件后缀拆分环境
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/__tests__/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.tsx'],
        },
      },
    ],
  },
});
