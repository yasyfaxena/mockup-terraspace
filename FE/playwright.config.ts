import { defineConfig, devices } from "@playwright/test";

// testing.md §5/§9 — real BE/, real browser. `webServer` is left unset
// deliberately: this config assumes `FE/` (and `BE/`) are already running
// locally (`npm run dev` in each), the same setup this whole project's
// manual verification has used since Phase 5. Wiring a `webServer` entry
// (build + start, spun up by CI) and a matching workflow is Phase 8's
// documented follow-up, not attempted in this pass.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env["E2E_FE_URL"] ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
