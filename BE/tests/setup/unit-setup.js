// Loads .env before any test file imports app code, so env.js validation
// sees the same variables `npm run dev`/`start` would provide.
try {
  process.loadEnvFile();
} catch {
  // No .env present (e.g. CI with real env vars already set) — ignore.
}
