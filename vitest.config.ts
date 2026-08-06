import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
  },
});
