import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'packages/web',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
  preview: { host: '127.0.0.1', port: 5185, strictPort: true },
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
