import { config } from "dotenv";

// Loads .env before any test file imports app code, so env.js validation
// sees the same variables `npm run dev`/`start` would provide.
// `dotenv`, not `process.loadEnvFile` — the latter is still experimental
// below Node 22.21/24.10, and this repo's floor is Node 20 (package.json
// engines).
config({ quiet: true });
