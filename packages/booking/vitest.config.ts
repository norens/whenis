import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
  resolve: {
    alias: {
      '@whenis/locale-uk': path.resolve(__dirname, '../locale-uk/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
