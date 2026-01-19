import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // 开启局域网访问，设置为 '0.0.0.0' 允许所有网络接口访问
    host: host || '0.0.0.0',
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : {
          // 当 host 为 '0.0.0.0' 时，HMR 也需要配置为局域网可访问
          protocol: "ws",
          host: '0.0.0.0',
          port: 1421,
        },
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
