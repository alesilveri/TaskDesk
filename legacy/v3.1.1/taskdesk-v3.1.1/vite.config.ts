import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist-web' },
  server: { port: 5173, strictPort: true },
});
