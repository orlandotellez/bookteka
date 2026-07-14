import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Entorno DOM (necesario para Testing Library)
      environment: "jsdom",

      // Archivo de setup global que se ejecuta antes de cada test
      setupFiles: ["./src/__tests__/setup.ts"],

      // Patrones para incluir/excluir archivos de test
      include: ["src/**/*.test.{ts,tsx}"],

      // No tires los tests en node_modules
      exclude: ["node_modules", "dist"],

      // Muestra más detalles en la salida
      verbose: true,

      // Cuántos segundos esperar por test antes de timeout
      testTimeout: 10000,

      // Limpiar mocks entre tests
      clearMocks: true,

      // Resolver CSS modules (no intentar parsearlos como JS)
      css: {
        modules: {
          classNameStrategy: "non-scoped" as const,
        },
      },

      // Coverage (opcional, para futuro)
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.d.ts",
          "src/main.tsx",
          "src/__tests__/**",
        ],
      },
    },
  }),
);
