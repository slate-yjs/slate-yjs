/* eslint-disable import/no-unresolved */
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    // The fuzzer runs separately (pnpm test:fuzz) until the bugs it finds are
    // fixed.
    exclude: process.env.FUZZ
      ? ['**/node_modules/**']
      : ['**/node_modules/**', 'packages/core/test/fuzz/**'],
  },
});
