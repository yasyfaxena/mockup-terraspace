import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/server";

// testing.md §6 — tests use a fake network, never the real BE/, in this suite.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  // Not automatic here — this project doesn't run with `globals: true`, so
  // Testing Library can't detect a global afterEach to self-register with.
  cleanup();
});
afterAll(() => server.close());
