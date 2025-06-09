import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test-config/test-setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/': './src/',
      '@test/': './tests/',
    },
  },
});