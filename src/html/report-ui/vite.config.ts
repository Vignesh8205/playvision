import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer()
      ]
    }
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
