import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envModule = pathToFileURL(path.resolve(__dirname, "../src/shared/config/env.js")).href;

/**
 * Boots a throwaway Node process that only imports env.js, with a chosen
 * environment. Importing env.js is enough to trigger validation — nothing
 * else in the app needs to run for this to prove boot-time failure.
 */
function runWithEnv(envOverrides) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", `import "${envModule}";`], {
    env: { ...process.env, ...envOverrides },
    encoding: "utf8",
  });
}

describe("env validation fails at boot", () => {
  it("exits non-zero immediately when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _drop, ...rest } = process.env;
    const result = runWithEnv({
      ...rest,
      DATABASE_URL: undefined,
      BETTER_AUTH_SECRET: "x".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      TRUSTED_ORIGINS: "http://localhost:5173",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Invalid environment variables/);
  });

  it("exits non-zero when BETTER_AUTH_SECRET is too short", () => {
    const result = runWithEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      BETTER_AUTH_SECRET: "too-short",
      BETTER_AUTH_URL: "http://localhost:3000",
      TRUSTED_ORIGINS: "http://localhost:5173",
    });

    expect(result.status).not.toBe(0);
  });

  it("boots cleanly (exit 0) when all required vars are present and valid", () => {
    const result = runWithEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      BETTER_AUTH_SECRET: "x".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      TRUSTED_ORIGINS: "http://localhost:5173",
    });

    expect(result.status).toBe(0);
  });
});
