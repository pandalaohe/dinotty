import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

const monacoPlugin = (monacoEditorPlugin as any).default || monacoEditorPlugin

export default defineConfig({
  plugins: [
    vue(),
    monacoPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html'],
    }),
  ],
  server: {
    proxy: {
      '/ws': {
        target: 'http://127.0.0.1:8999',
        ws: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8999',
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      preserveEntrySignatures: 'exports-only',
      input: {
        index: new URL('./index.html', import.meta.url).pathname,
        'preview-bridge': new URL('./src/preview-bridge/index.ts', import.meta.url).pathname,
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'preview-bridge'
            ? 'assets/dinotty-preview-bridge.js'
            : 'assets/[name]-[hash].js',
        manualChunks: {
          xterm: [
            '@xterm/xterm',
            '@xterm/addon-fit',
            '@xterm/addon-unicode11',
            '@xterm/addon-webgl',
          ],
          chart: ['chart.js', 'vue-chartjs'],
          marked: ['marked', 'dompurify'],
        },
      },
    },
  },
})
