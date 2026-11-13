import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: '../public',
  server: { port: 5173 },
  // TalkingHead loads its lipsync/dynamic-bone modules at runtime by relative path,
  // so Vite must serve the package as-is instead of pre-bundling it.
  optimizeDeps: { exclude: ['@met4citizen/talkinghead'] },
});
