import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development React runs on :5173 and Express on :3000. The proxy forwards
// API and auth calls to Express so the browser sees a single origin, just like
// production where Express serves the built React app itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
