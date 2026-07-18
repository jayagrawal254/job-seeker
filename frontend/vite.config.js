import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /job-seeker/ — this ensures assets load correctly.
  // In dev mode (localhost) base defaults to '/' via env, so this is production-only.
  base: process.env.NODE_ENV === 'production' ? '/job-seeker/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
