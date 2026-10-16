import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: Object.fromEntries(
    [['disciplinas', 8001], ['solicitacoes', 8002], ['processamento', 8003]].map(([name, port]) => [
      `/api/${name}`, { target: `http://127.0.0.1:${port}`, changeOrigin: true,
        rewrite: path => path.replace(`/api/${name}`, ''),
        configure: proxy => proxy.on('proxyReq', req => req.removeHeader('x-service-token')) },
    ])) },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js' },
});
