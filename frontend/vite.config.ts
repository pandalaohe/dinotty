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
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
})
