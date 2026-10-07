import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ส่งทุกคำขอที่ขึ้นต้นด้วย /api ไปยัง Node.js backend (พอร์ต 5000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
