import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { config } from "dotenv";

/**
 * Starts a throwaway PostgreSQL container once for the whole integration
 * run and applies the real migrations against it — never against the dev
 * database (testing.md §6).
 */
export async function setup() {
  // `dotenv`, not `process.loadEnvFile` — the latter is still experimental
  // below Node 22.21/24.10, and this repo's floor is Node 20 (package.json
  // engines). No-ops if .env is missing (e.g. CI with real env vars set).
  config({ quiet: true });

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("terraspace_test")
    .withUsername("terraspace")
    .withPassword("terraspace")
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  // eslint-disable-next-line sonarjs/no-os-command-from-path -- fixed literal command, test/CI-only, standard npx invocation
  execSync("npx prisma migrate deploy", { env: process.env, stdio: "inherit" });

  return async () => {
    await container.stop();
  };
}
