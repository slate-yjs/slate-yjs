/* eslint-disable import/no-default-export */
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'node24',
    // Keep node: imports; node:sqlite has no unprefixed form.
    removeNodeProtocol: false,
    splitting: false,
    bundle: true,
    sourcemap: false,
    dts: false,
    clean: true,
  },
]);
