import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["tests/unit/**/*.test.js"],
          setupFiles: ["./tests/setup/unit-setup.js"],
        },
      },
      {
        test: {
          name: "integration",
          globals: true,
          environment: "node",
          include: ["tests/integration/**/*.test.js", "tests/regression/**/*.test.js"],
          globalSetup: ["./tests/setup/global-setup.js"],
          setupFiles: ["./tests/setup/integration-setup.js"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
    },
  },
});
