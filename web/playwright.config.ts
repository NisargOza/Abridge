import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "uv run --project ../engine python ../scripts/mock_llm.py",
      url: "http://127.0.0.1:8091/health",
      reuseExistingServer: false,
    },
    {
      command:
        "uv run --project ../engine uvicorn abridge.api.main:app --host 127.0.0.1 --port 8001 --no-access-log",
      url: "http://127.0.0.1:8001/api/health",
      reuseExistingServer: false,
      env: { LLM_BASE_URL: "http://127.0.0.1:8091" },
    },
    {
      command: "../scripts/pnpm.sh dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
