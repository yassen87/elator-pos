// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      minify: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      minify: false
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [tailwindcss(), react()],
    build: {
      sourcemap: false,
      minify: true,
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: void 0
          // Avoid many small chunks
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
