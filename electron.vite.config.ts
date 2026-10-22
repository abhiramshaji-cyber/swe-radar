import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: "electron/main.ts" } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: "electron/preload.ts" } },
  },
  renderer: {
    root: ".",
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    build: { rollupOptions: { input: path.resolve(__dirname, "index.html") } },
  },
});
