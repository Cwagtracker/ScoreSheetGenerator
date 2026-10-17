import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{pdf:['pdf-lib'],preview:['pdfjs-dist'],react:['react','react-dom']}}}}});
