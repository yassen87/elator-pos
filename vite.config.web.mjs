
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src/renderer',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  plugins: [tailwindcss(), react()],
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
