import { defineConfig } from 'vite';

// Relative asset URLs, so the built twin works from any folder or static host.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
});
