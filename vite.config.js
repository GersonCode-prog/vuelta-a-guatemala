import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';

// base relativa: funciona igual en GitHub Pages y dentro de una app con Capacitor.
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {target: 'es2020', chunkSizeWarningLimit: 1200},
});
