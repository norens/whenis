import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@whenis/booking': resolve(__dirname, '../booking/src/index.ts'),
      '@whenis/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
