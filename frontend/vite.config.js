import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'read-only-production-data',
      configureServer(server) {
        if (process.env.VITE_PROXY_READ_ONLY !== 'true') return;
        server.middlewares.use('/api', (request, response, next) => {
          if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
          response.statusCode = 403;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Production data is read-only in this local preview.' }));
        });
      },
    },
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (!path.includes('/node_modules/') || path.endsWith('.css')) return;

          if (
            path.includes('/node_modules/leaflet/') ||
            path.includes('/node_modules/react-leaflet/') ||
            path.includes('/node_modules/@react-leaflet/')
          ) {
            return 'map';
          }

          if (
            path.includes('/node_modules/recharts/') ||
            path.includes('/node_modules/victory-vendor/')
          ) {
            return 'charts';
          }

          // Keep React out of the map chunk. Otherwise Rollup parks the shared
          // runtime there and the entry preloads Leaflet on every page.
          if (
            path.includes('/node_modules/react/') ||
            path.includes('/node_modules/react-dom/') ||
            path.includes('/node_modules/scheduler/')
          ) {
            return 'react';
          }
        },
      },
    },
  },
})
