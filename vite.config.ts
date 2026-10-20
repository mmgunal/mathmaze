import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode app` emits one self-contained index.html (code, styles, fonts inlined)
// for the offline WebView of the mobile app in ./mobile.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'app' ? [viteSingleFile()] : [],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    outDir: mode === 'app' ? 'dist-app' : 'dist',
    assetsInlineLimit: mode === 'app' ? 100_000_000 : 4096,
  },
}));
