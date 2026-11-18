import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// As specs que semeiam dados criam uma conta DESCARTÁVEL com as chaves do
// .env.local (o mesmo de `npm run test:rls`). Sem o arquivo, elas se pulam
// e as de rota pública rodam normalmente.
loadEnv({ path: path.resolve(__dirname, ".env.local"), quiet: true });

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
