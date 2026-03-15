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
  },

  // Evita que Vite pre-bundle el WASM (lo maneja él mismo)
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
})