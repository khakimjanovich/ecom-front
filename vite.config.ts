import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The dev server proxies /api to the ecom app, so the browser talks to one origin and no CORS setup is needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5180,
      strictPort: true,
      proxy: { '/api': env.API_TARGET || 'http://localhost:8080' },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
