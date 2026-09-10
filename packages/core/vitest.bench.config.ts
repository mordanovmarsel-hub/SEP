import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/bench-pareto.ts'],
    testTimeout: 180_000,
    disableConsoleIntercept: true,
  },
});
