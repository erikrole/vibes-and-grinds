import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['functions/**/*.{test,spec}.js', 'tests/**/*.{test,spec}.js'],
    exclude: ['frontend/**', 'node_modules/**', 'shared/**/*.test.js'],
  },
});
