import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

/**
 * Starts a throwaway PostgreSQL container once for the whole integration
 * run and applies the real migrations against it — never against the dev
 * database (testing.md §6).
 */
export async function setup() {
  try {
    process.loadEnvFile();
  } catch {
    // No .env present (e.g. CI with real env vars already set) — ignore.
  }

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("terraspace_test")
    .withUsername("terraspace")
    .withPassword("terraspace")
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  execSync("npx prisma migrate deploy", { env: process.env, stdio: "inherit" });

  return async () => {
    await container.stop();
  };
}
