import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-expect-error process is a nodejs global
  const host = process.env.TAURI_DEV_HOST;
  const env = loadEnv(mode, process.cwd(), "");
  const backendHost = env.BACKEND_HOST || "http://localhost:3000";

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "text-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/__tests__/**", "src/test/**", "src-tauri/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      // 3. Proxy same-origin para el backend.
      //
      //    En Android la WebView corre en `http://tauri.localhost` (o
      //    `http://localhost:1420` en desktop), mientras que la API vive en
      //    `BACKEND_HOST` (ej. `http://192.168.0.10:3000`). Las peticiones
      //    cross-site NO llevan la cookie de sesión (SameSite=Lax) porque
      //    origin y target son sitios distintos → `get-session` nunca ve la
      //    sesión y la app rebota a /auth/login.
      //
      //    Proxyando `/api` desde el propio Vite, el navegador/WebView habla
      //    SIEMPRE con su mismo origin: la cookie se guarda para
      //    tauri.localhost y viaja en cada request. Por eso el frontend usa
      //    URLs relativas (`/api`, `/api/auth`).
      proxy: {
        "/api": {
          target: backendHost,
          changeOrigin: true,
        },
      },
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 4. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
