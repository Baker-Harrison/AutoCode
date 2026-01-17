import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "renderer"),
  plugins: [react()],
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "renderer/src")
    }
  }
});
