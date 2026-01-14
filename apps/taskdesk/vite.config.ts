import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: Number(process.env.TASKDESK_DEV_SERVER_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? 5173),
    strictPort: true,
  },
});
