import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Single .env at repo root — shared with the backend. */
const repoEnvDir = '..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoEnvDir, '');

  const devPort = Number(env.VITE_DEV_PORT) || 5173;
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

  return {
    envDir: repoEnvDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
