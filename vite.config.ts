import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isDemoMode = process.env.VITE_DEMO_MODE === "true";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // In demo mode, redirect Tauri imports to browser-compatible mocks
  ...(isDemoMode
    ? {
        resolve: {
          alias: {
            "@tauri-apps/api/core": path.resolve(
              __dirname,
              "demo/mocks/tauri-core.ts"
            ),
            "@tauri-apps/api/event": path.resolve(
              __dirname,
              "demo/mocks/tauri-event.ts"
            ),
            "@tauri-apps/api/path": path.resolve(
              __dirname,
              "demo/mocks/tauri-path.ts"
            ),
            "@tauri-apps/plugin-dialog": path.resolve(
              __dirname,
              "demo/mocks/tauri-dialog.ts"
            ),
          },
        },
      }
    : {}),

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: isDemoMode ? 4173 : 1420,
    strictPort: !isDemoMode,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
