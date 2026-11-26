/* eslint-disable import/no-unresolved */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  // Test fixtures build Slate trees with slate-hyperscript's `jsx` through a
  // `/** @jsx jsx */` pragma, which needs the classic JSX runtime.
  oxc: {
    jsx: { runtime: 'classic' },
  },
  resolve: {
    // Tests run against source, so @slate-yjs/react's tests use the current
    // core without building it first.
    alias: {
      '@slate-yjs/core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    // The fuzzer runs separately (pnpm test:fuzz, and in CI). Set FUZZ_RUNS,
    // FUZZ_SEED or FUZZ_CENSUS to change how it runs.
    exclude: process.env.FUZZ
      ? ['**/node_modules/**']
      : ['**/node_modules/**', 'packages/core/test/fuzz/**'],
  },
});
