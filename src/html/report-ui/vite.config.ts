import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    modulePreload: false,
    assetsInlineLimit: 100000000, // Inline everything
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: './dist',
    emptyOutDir: true,
  },
});
