import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.mjs'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
