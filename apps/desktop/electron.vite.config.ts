import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    entry: "src/main/main.ts",
  },
  preload: {
    input: {
      index: resolve(__dirname, "src/preload/preload.ts"),
    },
    // IMPORTANT: preload en CommonJS pour Electron (évite l'erreur "import outside module")
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
  },
});
