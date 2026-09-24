// Relative asset paths so the build runs from any sub-path (e.g. a GitHub Pages project site).

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 }, // three.js is one ~600 kB chunk by design
});
