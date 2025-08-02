import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* TESTING PURPOSES ONLY - CHANGE TO PRODUCTION SERVER LATER */
  server: {
    proxy: {
        '/api': 'http://backend:8000',
    },
  }
});