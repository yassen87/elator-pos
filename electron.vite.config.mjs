import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false,
      minify: true
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false,
      minify: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [tailwindcss(), react()],
    build: {
      sourcemap: false,
      minify: true,
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: undefined // Avoid many small chunks
        }
      }
    }
  }
})
