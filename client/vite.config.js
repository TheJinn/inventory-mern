import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    proxy: {
      '/api': process.env.VITE_API_URL,
      '/uploads': process.env.VITE_API_URL
    }
  }
});
