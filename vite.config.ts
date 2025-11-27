import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  base: '/redday/',
  server: {
    port: 8888,
    strictPort: true,
  },
});
