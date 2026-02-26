import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  splitting: false,
  sourcemap: false,
  dts: false,
  // Don't bundle node_modules — let Node resolve them at runtime
  noExternal: [],
  external: [
    /node_modules/,
    'playwright',
    'playwright-core',
    'chromium-bidi',
    'sharp',
    'commander',
    '@google/genai',
  ],
});
