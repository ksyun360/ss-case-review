import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/postgres/**/*.test.ts'],
    allowOnly: false,
    passWithNoTests: false,
    testTimeout: 10_000,
    hookTimeout: 45_000,
    maxWorkers: 1,
  },
});
