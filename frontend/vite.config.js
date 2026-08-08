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
  }
})
