# TerraSpace — Frontend Libraries (V2)

**Constraint:** the V1 stack stays. V2 is a folder-structure and data-source change ([`fe-architecture.md`](./fe-architecture.md)), not a framework migration — nothing here replaces React, Vite or TanStack Start.

**Principle:** same as [BE `libraries.md`](../BE/libraries.md) §0 — one library per purpose, every entry states what it replaces.

---

## 1. Core runtime — unchanged from V1

| Purpose | Library | Why | Why not the alternative |
|---|---|---|---|
| UI | **`react`** 19 / `react-dom` | Already the stack | — |
| Language | **TypeScript**, strict | Type-safe end-to-end with Prisma on the BE side and Zod on both — see [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §1 | The backend dropped TypeScript ([BE `linter.md`](../BE/linter.md) header); the frontend has no such constraint and keeps it |
| Build / dev server | **Vite** | Already the stack | — |
| Routing + SSR/data loading | **TanStack Start & Router** | File-based, type-safe params, already the stack | — |

No change here — V2 does not touch this layer. What changes is what these tools talk to (§2).

```bash
# unchanged — see package.json
```

---

## 2. Data access — the actual V2 change

| Purpose | Library | Why | Why not |
|---|---|---|---|
| Server state | **`@tanstack/react-query`** | Already the stack; now the **only** way a component reaches data — `src/backend/api/*` direct-Prisma calls are gone by [`development-phases.md`](./development-phases.md) Phase 8 | Redux/Zustand for server data — TanStack Query already owns caching, dedup and invalidation |
| HTTP | **Native `fetch`**, wrapped once in `lib/api-client.ts` | Node/browser-native; the wrapper is where [BE `error-handling.md`](../BE/error-handling.md)'s envelope gets parsed into `ApiError` (see [`error-handling.md`](./error-handling.md) §2) | `axios` — one more dependency for what `fetch` + a 30-line wrapper already does, matching [BE `libraries.md`](../BE/libraries.md) §12's own reasoning for the same call |

> **This is the load-bearing decision in this document.** Every other library here is unchanged from V1; this row is the reason a V2 FE spec exists at all — the data layer moves from "component calls a `createServerFn` that touches Prisma" to "component calls a query hook that calls `BE/`'s versioned REST API."

```bash
# already installed — no new dependency
```

---

## 3. Validation & forms — unchanged, new role

| Purpose | Library | Why |
|---|---|---|
| Schema validation | **`zod`** | Already the stack. In V2 it validates client-side **and** is the source for `*.types.ts` via `z.infer` — same pattern as [BE `libraries.md`](../BE/libraries.md) §5, one level up |
| Forms | **`react-hook-form`** + `@hookform/resolvers` | Already the stack | 

**Zod version must match the BE's major**, per [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §4's recommendation to move both to v4 together — a v3/v4 mismatch between the hand-mirrored FE schema and the BE's is exactly the kind of drift [`state-map.md`](./state-map.md) §7 and [`testing.md`](./testing.md) §7 exist to catch, and matching majors removes one whole class of it.

---

## 4. UI & styling — unchanged

| Purpose | Library | Why |
|---|---|---|
| Styling | **Tailwind CSS** | Already the stack |
| Primitives | **Radix UI** | Headless, accessible — already the stack |
| Icons | **`lucide-react`** | Already the stack |
| Notifications | **`sonner`** | Already the stack — now also the delivery mechanism for [`error-handling.md`](./error-handling.md) §3's global toast |

No V2-specific change. `components/ui/` (the V2 name for `frontend/ui/`, [`fe-architecture.md`](./fe-architecture.md) §4) contains exactly the same components, relocated.

---

## 5. API contract — deferred, not adopted yet

| Purpose | Library | Status |
|---|---|---|
| Typed client generated from OpenAPI | `openapi-fetch` / `orval` | **Deferred.** [BE `libraries.md`](../BE/libraries.md) §5 generates an OpenAPI document from its Zod schemas starting Phase 3, published progressively ([BE `development-phases.md`](../BE/development-phases.md) §3). Once that spec is stable, generating `*.types.ts` and the thin `*.api.ts` wrappers from it replaces the hand-mirrored schemas in [`development-phases.md`](./development-phases.md) decision #2 |

**Why not adopt it from Phase 0:** the spec does not exist until BE Phase 3 publishes one, and hand-mirroring unblocks FE work starting Phase 2. Revisit once BE `libraries.md` §5's OpenAPI output is available for two consecutive phases without a breaking shape change.

---

## 6. Testing — additions

| Purpose | Library | Why | Why not |
|---|---|---|---|
| Test runner | **`vitest`** | Same config family as Vite. **Not installed today** — V1 has zero frontend tests (no `vitest`, no test files, nothing in `package.json`); this whole section is a V2 proposal, not an existing setup | `jest` needs its own transform config on top of Vite's |
| Component testing | **`@testing-library/react`** | Tests behavior, not implementation details — queries by role/label like a user would | Enzyme — unmaintained, encourages implementation-detail assertions |
| API mocking | **`msw`** (Mock Service Worker) | Intercepts `fetch` at the network layer, so `lib/api-client.ts` is exercised for real — the same reasoning as [BE `libraries.md`](../BE/libraries.md) §13 choosing Supertest over mocking the framework | `nock`-equivalents for the browser fetch layer are less maintained; MSW is also usable in Storybook/dev if that's ever adopted |
| E2E | **`@playwright/test`** | Already the closest thing to a standard for TanStack Start apps; drives the real browser through the booking flow against a real `BE/` | Cypress — Playwright's multi-browser + trace-viewer story is stronger for a booking flow with redirects (PayBridge checkout) |

```bash
npm i -D vitest @testing-library/react @testing-library/user-event msw @playwright/test
```

---

## 7. Observability — not Sentry today, and not yet decided for V2

`src/lib/error-capture.ts` is **not** the Sentry SDK — there is no error-tracking service wired into the frontend at all today. It's a small SSR-only utility: it wraps `console.error` to expand `Error`/`cause`-chain detail that h3 would otherwise strip, and records the last captured error for `server.ts` to recover a real stack trace when h3 has already flattened a throw into a generic 500 response. It stays, unchanged, regardless of what V2 decides below.

The BE adopted Sentry in Phase 8 ([BE `libraries.md`](../BE/libraries.md), `sentry.js`). Whether the FE also gets a browser Sentry SDK (so the global query/mutation error handler in [`error-handling.md`](./error-handling.md) §3 can report non-`ApiError` failures somewhere, mirroring [BE `error-handling.md`](../BE/error-handling.md) §4's `isOperational` split) is **not decided** — it's a net-new dependency, not a relocation, and is out of scope until a phase explicitly picks it up.

---

## 8. Linting & boundaries — one addition

| Purpose | Library | Why |
|---|---|---|
| Feature boundary enforcement | **`eslint-plugin-boundaries`** | Same tool the backend uses ([BE `libraries.md`](../BE/libraries.md) §14), configured against `src/features/*` — see [`linter.md`](./linter.md) §7 |

```bash
npm i -D eslint-plugin-boundaries
```

---

## 9. Explicitly not using

| Library | Reason |
|---|---|
| `redux` / `zustand` / `jotai` | TanStack Query owns server state; [`state-map.md`](./state-map.md) §1 keeps local UI state in plain `useState`. No cross-cutting client state has appeared that needs a store |
| `axios` | Native `fetch`, wrapped once — see §2 |
| `swr` | TanStack Query is already the stack; installing both is exactly the "two libraries, one job" [BE `libraries.md`](../BE/libraries.md) header warns against |
| `formik` | React Hook Form is already the stack |
| `yup` / `joi` | Zod is already the stack, and shared with the BE's validation approach |
| `moment` / `dayjs` | `date-fns` is already the stack — same reasoning as [BE `libraries.md`](../BE/libraries.md) §11 |
| A generated API client (today) | See §5 — deferred until BE's OpenAPI output is stable |

---

## 10. Versioning

Follow [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §3's philosophy, already the project's standard: stable and ecosystem-supported over newest-on-npm, no RC/beta in production, pin exact versions for the fast-moving TanStack packages.

The one V2-specific note: **keep `zod`'s major version identical between `BE/package.json` and the root `package.json`.** They are separate deployables and separate dependency trees, but a hand-mirrored schema drifting across a major Zod version is a silent contract break that only [`testing.md`](./testing.md) §7's contract tests would catch — matching majors removes the need to rely on that safety net for something this basic.

See [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §4 for the current mockup-vs-recommended version audit (Prisma, Zod, Nitro, TanStack pins) — that audit applies to this project's root `package.json` unchanged by V2.

---

## 11. Summary

| Area | Choice | Change from V1 |
|---|---|---|
| Framework | React 19 + TanStack Start/Router | None |
| Server state | TanStack Query | None in library, **new role**: only path to data |
| HTTP | `fetch` + `lib/api-client.ts` | **New** — replaces direct-Prisma server functions |
| Validation | Zod | None in library; schemas now hand-mirror the BE's |
| Forms | React Hook Form | None |
| UI | Tailwind + Radix | None, relocated to `components/ui/` |
| Testing | Vitest + Testing Library + MSW + Playwright | **MSW and Playwright are new** — needed because there is now a real network boundary to mock/drive |
| Boundaries | `eslint-plugin-boundaries` | **New** — enforces `fe-architecture.md` §7 |
| Observability | `error-capture.ts` (SSR stack recovery, not Sentry) unchanged; a browser Sentry SDK is undecided | Undecided — not a relocation |

Two choices carry the most weight:

1. **The `fetch` wrapper in `lib/api-client.ts`** — every later phase's error handling, contract testing, and the legacy/v2 flag all hinge on this one file being the sole place HTTP happens.
2. **MSW for integration tests** — it is what lets [`testing.md`](./testing.md) exercise the real query hooks and the real error-handling path without a running `BE/`, the same value Supertest gives the backend one layer down.
