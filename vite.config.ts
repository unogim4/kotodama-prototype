import { defineConfig } from 'vite';

export default defineConfig({
  // 상대 경로로 빌드해야 나중에 Electron/itch.io 등에 그대로 올릴 수 있다
  base: './',
  server: { port: 5173 },
  // Phaser 자체가 약 1.5MB라 기본 경고 한도(500kB)를 넘는다
  build: { chunkSizeWarningLimit: 2000 },
});
