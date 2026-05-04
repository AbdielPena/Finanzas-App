import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000/api/v1';

  return {
    root: '.',
    publicDir: 'public',
    define: {
      // Inyecta la URL del API directamente en el build (compile-time)
      __API_BASE__: JSON.stringify(apiUrl),
      // Version desde package.json (compile-time) para el update-checker
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      port: 5173,
      strictPort: true,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
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
    },
    preview: {
      port: 4173,
      strictPort: true,
    }
  };
});
