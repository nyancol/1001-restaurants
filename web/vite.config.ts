import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  // Dev server only (ignored by `vite build`): proxy API calls to the backend
  // so `npm run dev:web` gets HMR while talking to the real API.
  server: {
    port: 5173,
    // Listen on LAN too (default is localhost-only, unreachable from
    // other machines on the homelab network). allowedHosts permits
    // *.local / Tailscale names in dev (never used for builds).
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.PORT ?? 3232}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
});
