import { setupServer } from "msw/node";
import { settingsHandlers } from "./handlers/settings.handlers";

// One composed server for every integration test (testing.md §6) — a test
// that needs a different response for a given endpoint calls
// `server.use(...)` for that one case; `afterEach` in integration-setup.ts
// resets back to these defaults.
export const server = setupServer(...settingsHandlers);
