import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      // Proxy a la API local en desarrollo (evita problemas de CORS)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy a OpenAI (legado del prototipo)
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa Chart.js a su propio chunk (cargado bajo demanda)
          // Chart.js se carga via CDN en index.html — este split aplicaria
          // si en el futuro se mueve a npm package
        }
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true,
  }
});
