import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup-env.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
    },
  },
});
