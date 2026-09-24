import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    // A suíte roda em UTC, como o servidor da Vercel -- NÃO no fuso da
    // máquina de quem desenvolve. Sem isto, um teste de data passa em
    // Brasília e concorda com o bug que só aparece em produção.
    env: { TZ: "UTC" },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "tests/rls/**", "node_modules", ".next"],
  },
});
