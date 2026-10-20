import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

// El frame puede tener un WebView antiguo. El build moderno apunta a Chrome 64
// (Android 8.1) y plugin-legacy genera una variante para WebViews aún más viejos.
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["chrome >= 64", "safari >= 12"],
      modernTargets: ["chrome >= 64", "safari >= 12"],
      modernPolyfills: true,
    }),
  ],
  build: {
    cssTarget: "chrome64",
    outDir: "dist",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
