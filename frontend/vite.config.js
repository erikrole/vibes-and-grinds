import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxies /api/* to `wrangler pages dev` running on :8788.
      // Start it from the repo root: npx wrangler pages dev frontend/dist --port 8788
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true
      }
    }
  }
})
