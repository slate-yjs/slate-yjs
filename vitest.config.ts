/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    // The fuzzer runs separately (pnpm test:fuzz, and in CI). Set FUZZ_RUNS,
    // FUZZ_SEED or FUZZ_CENSUS to change how it runs.
    exclude: process.env.FUZZ
      ? ['**/node_modules/**']
      : ['**/node_modules/**', 'packages/core/test/fuzz/**'],
  },
});
