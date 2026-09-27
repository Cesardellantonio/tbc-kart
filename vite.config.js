// Relative asset paths so the build runs from any sub-path (e.g. a GitHub Pages project site).
// Two pages: the classic game (index.html) and TBC Kart NOVA (nova/index.html, <html data-edition="nova">).

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 800, // three.js is one ~600 kB chunk by design
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), nova: resolve(import.meta.dirname, 'nova/index.html') } },
  },
});
