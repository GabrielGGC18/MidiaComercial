import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Em dev, /api e /admin vão para o Django (mesma origem para a SPA: sem CORS, cookie de sessão funciona)
const API = process.env.VITE_API_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { chunkSizeWarningLimit: 600 },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API },
      "/admin": { target: API },
      "/static": { target: API },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
