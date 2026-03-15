import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    headers: {
      // Requeridos para OPFS (SQLite persistente en browser)
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    // Proxy /api/* requests to backend en desarrollo
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Evita que Vite pre-bundle el WASM
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },

  build: {
    rollupOptions: {
      external: ['pg'],
    },
  },
})