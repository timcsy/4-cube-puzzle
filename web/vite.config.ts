import { defineConfig } from 'vite';

// 以相對路徑 base 讓 build 後可直接用 file:// 或任何子路徑部署（如 GitHub Pages）
export default defineConfig({
  base: './',
  server: { open: true },
});
