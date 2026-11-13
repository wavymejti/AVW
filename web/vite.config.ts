import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: '../public',
  server: {
    port: 5173,
    // Same-origin calls from the page; no CORS needed in development.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/tts': { target: 'http://127.0.0.1:8882', rewrite: (p) => p.replace(/^\/tts/, '') },
    },
  },
  // TalkingHead loads its lipsync/dynamic-bone modules at runtime by relative path,
  // so Vite must serve the package as-is instead of pre-bundling it.
  optimizeDeps: { exclude: ['@met4citizen/talkinghead'] },
});
