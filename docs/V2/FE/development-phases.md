# TerraSpace V2 Frontend — Development Phases

Implementation plan derived from the V2/FE specification. Phased to track [BE `development-phases.md`](../BE/development-phases.md) one-to-one — each FE phase consumes the API surface the matching BE phase just published.

**Specs:** [`fe-architecture.md`](./fe-architecture.md) · [`state-map.md`](./state-map.md) · [`features/`](./features/) · [`error-handling.md`](./error-handling.md) · [`libraries.md`](./libraries.md) · [`linter.md`](./linter.md) · [`testing.md`](./testing.md)

---

## 0. Decisions

| # | Decision | Blocks | Status |
|---|---|---|---|
| 1 | Cutover strategy | Phase 0 | ✅ **Superseded — separate app, mirrors `BE/`.** The in-app `VITE_API_MODE` flag below was the original plan; Phase 0 instead stood up `FE/` as a wholly new TanStack Start app (own `package.json`, own `src/`), the same shape as `BE/` relative to the old root app. It has no legacy code to flag against, so there is no runtime switch — cutover means deploying `FE/` instead of the root app, once it's ready, exactly like `BE/`'s story replacing `src/backend/api/*` |
| 2 | Where Zod schemas live | Phase 0 | ✅ **Hand-mirrored, not shared as a package.** BE and FE are separate deployables ([BE `libraries.md`](../BE/libraries.md) §5) — importing BE's schema would couple the builds. A schema drift is caught by contract tests (§7), not the type system |
| 3 | Capacitor / mobile shell | Phase 1 | ⏳ **Deferred, not decided here.** [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §4 flags this as unresolved between "web-only" and `MOBILE-README.md`. V2 FE architecture does not block either outcome — `features/` has no knowledge of Capacitor either way |
| 4 | Design system source | Phase 1 | ✅ `components/ui/` relocates `frontend/ui/`'s 14 existing files as-is — no new component *library* adopted, though a handful of primitives (`dialog`, `tabs`, `switch`, data-table) get built fresh since they never existed as files. Visual identity (colors, fonts, gradients) is documented in [`frontend-spec.md`](./frontend-spec.md) §2, pulled from the real `styles.css`, not invented |
| 5 | Currency & locale | Phase 3 | ✅ **IDR**, `Intl.NumberFormat("id-ID")`, matching [BE `development-phases.md`](../BE/development-phases.md) decision #1 |
| 6 | Admin routing | Phase 4 | ✅ V1's single `/admin` route + client-side tab state is replaced with real per-page routes (`/admin/bookings`, `/admin/locations`, …) — a deliberate improvement (deep-linkable, independently guardable), not a like-for-like port. See [`frontend-spec.md`](./frontend-spec.md) §5 |

### Decided — #1, cutover strategy

**Original plan (superseded):** every feature built once, against the V2 API, behind a flag read at `lib/api-client.ts`'s module boundary — not per-component `if` branches. When a BE phase lands, the matching FE phase flips its own features to `v2` in review; `legacy` for everything else keeps the site working end-to-end throughout the migration. Phase 8 deletes the flag along with `src/backend/api/*`.

**What actually shipped in Phase 0:** `FE/` is a new, independent app rather than an in-place rewrite of the root app's `src/`. There is no `legacy`/`v2` branch inside it — every feature it builds only ever talks to `BE/`. The root app (`src/frontend/`, `src/backend/api/*`) keeps running unchanged until `FE/` is feature-complete enough to replace it wholesale; there is no per-feature flip. Phase 8's "delete `src/backend/api/*`" line item becomes "retire the root app," not "delete a flag branch."

---

## 1. Phase map

```text
 P0  Scaffold ──┬─► P1  Design system ──┬─► P2  Auth ──┬─► P3  Catalog read ──► P4  Catalog write
                │                       │              │                              │
                │                       │              └──────────────┐               │
                │                       └──────────────────────────┐  │               │
                │                                                  ▼  ▼               │
                │                                           P5  Bookings ◄────────────┘
                │                                                  │
                │                                                  ▼
                │                                           P6  Payments
                │                                                  │
                │                                                  ▼
                └──────────────────────────────────► P7  Settings & Reports UI
                                                                   │
                                                                   ▼
                                                            P8  Hardening & cutover
```

| Phase | Scope | Size | Depends on |
|---|---|:---:|---|
| **P0** | API client, query client, error envelope types, flag | S | [BE P0](../BE/development-phases.md#phase-0--scaffold) |
| **P1** | Design system relocation, route shells | S | — |
| **P2** | Sign in/up, session, guards | M | [BE P2](../BE/development-phases.md#phase-2--auth) |
| **P3** | Catalog read — locations, workspaces, amenities browse | M | [BE P3](../BE/development-phases.md#phase-3--catalog-read) |
| **P4** | Catalog write — admin CRUD screens | S | P3, [BE P4](../BE/development-phases.md#phase-4--catalog-write) |
| **P5** | **Booking flow — core** | **L** | P2, P3, [BE P5](../BE/development-phases.md#phase-5--bookings-core) |
| **P6** | Payment flow — PayBridge checkout | L | P5, [BE P6](../BE/development-phases.md#phase-6--payments-paybridge) |
| **P7** | Settings & reports UI | M | P5, P6, [BE P7](../BE/development-phases.md#phase-7--settings--reports) |
| **P8** | Hardening, flag removal, cutover | M | all, [BE P8](../BE/development-phases.md#phase-8--hardening--cutover) |

**Parallelizable:** P3 and P4 build against the OpenAPI spec BE publishes at the end of its own P3/P4 ([BE `development-phases.md`](../BE/development-phases.md) §3 risk table) — FE does not wait for BE to be "done," only for that phase's spec. P1 has no BE dependency and can run first, in parallel with BE P0/P1.

**Critical path:** P0 → P2 → P5 → P6 → P8, same shape as the backend's.

---

## Phase 0 — Scaffold ✅ done

**Goal:** an app that can talk to `BE/` for one request, with the error envelope typed.

**What shipped:** `FE/` — a standalone TanStack Start app (own `package.json`, pinned to the same major dependency versions as the root app's V1 stack: React 19, `@tanstack/react-router` 1.170.18, `@tanstack/react-start` 1.168.32, `@tanstack/react-query` 5, Tailwind v4, `zod` ^4 to match `BE/`'s major per [`libraries.md`](./libraries.md) §10). No `VITE_API_MODE` flag — see decision #1 above for why.

### Build

| Area | Files |
|---|---|
| API client | `FE/src/lib/api-client.ts` — base URL from `VITE_API_BASE_URL`, `credentials: "include"`, parses [BE `error-handling.md`](../BE/error-handling.md) §3's envelope into `ApiError` |
| Query client | `FE/src/lib/query-client.ts` — default `staleTime`, global `QueryCache`/`MutationCache` `onError` → `sonner` toast |
| Error types | `FE/src/shared/error-codes.ts` — the `ERROR_CODE` catalog, hand-mirrored from [BE `error-handling.md`](../BE/error-handling.md) §7 |
| Query keys | `FE/src/shared/query-keys.ts` — the one factory every feature imports (see [`state-map.md`](./state-map.md) §2) |
| App shell | `FE/src/router.tsx`, `FE/src/routes/__root.tsx`, `FE/src/routes/index.tsx` — minimal TanStack Start harness; `index.tsx` is the Phase 0 proof, querying `GET /health` through the api client |

### Exit criteria

- [x] `lib/api-client.ts` against `BE/`'s `GET /health` returns typed success — verified against a real running `BE/` (dev server + `curl`), not just a mock
- [x] A deliberately triggered `404` renders through the same error path a `422` does — one envelope parser, not one per endpoint (`FE/tests/unit/lib/api-client.test.ts`)
- [x] `npm run check` passes on the new files (format, lint, types all clean)
- [ ] ~~`VITE_API_MODE=legacy` still serves the app unchanged~~ — N/A, no flag exists; see decision #1

> **Do the error envelope parsing in Phase 0, not later** — same reasoning as [BE `development-phases.md`](../BE/development-phases.md) Phase 0. Every later phase's `*.queries.ts` throws through it.

---

## Phase 1 — Design system

**Goal:** `components/ui/` and `components/layout/` exist independently of any feature, so P2 onward has somewhere to render into.

### Build

- Rename `frontend/ui/*` → `components/ui/*` — the 14 files that exist today (`accordion`, `button`, `checkbox`, `dropdown-menu`, `input`, `label`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `textarea`) are relocated, not rewritten (`frontend-spec.md` §2)
- Build the primitives that don't exist yet but are needed from Phase 2 onward: `dialog.tsx`, `tabs.tsx`, `switch.tsx`, a real data-table — their Radix packages are already dependencies, the files are not
- Rename `frontend/site/site-shell.tsx` → `components/layout/site-shell.tsx` (unchanged)
- Split `frontend/admin/admin-layout.tsx` into `components/layout/admin-shell.tsx` (top bar + content frame) and `admin-sidebar.tsx` (the 5-group nav — see `fe-architecture.md` §2) — a deliberate decomposition, not a straight rename
- Confirm no `components/ui/*` file imports a feature — this is the one invariant Phase 1 exists to establish

### Exit criteria

- [ ] `frontend/` is empty and deleted
- [ ] `components/ui/*` has zero imports from `features/` or `routes/` (enforced by [`linter.md`](./linter.md) §7 boundaries from this point on)
- [ ] Every route still renders — this phase changes no behavior for the 14 relocated primitives; `dialog`/`tabs`/`switch`/data-table are genuinely new and may change how existing modals/toggles are built once later phases adopt them

---

## Phase 2 — Auth

**Goal:** sign up, sign in, session-aware routing — against Better Auth once [BE Phase 2](../BE/development-phases.md#phase-2--auth) lands.

### Build

| Area | Files |
|---|---|
| Client | `lib/auth-client.ts` — Better Auth's browser client, cookie-based |
| Hooks | `features/auth/auth.hooks.ts` — `useSession`, `useRequireRole` |
| Forms | `features/auth/components/{sign-in-form,sign-up-form}.tsx` |
| Guards | Route `beforeLoad` calling `useRequireRole` — see [`features/auth.md`](./features/auth.md) §3 |

### Exit criteria

- [ ] Sign up → sign in → an authenticated route renders the session's name
- [ ] `requireRole("admin")` redirects a customer to `/`, and an anonymous visitor to `/login`, with the correct one of the two — never the same redirect for both (mirrors [BE `error-handling.md`](../BE/error-handling.md) §5's 401-vs-403 distinction)
- [ ] `src/lib/auth-server.ts`, `src/lib/auth-guards-server.ts`, `src/lib/password-server.ts` deleted — same files [BE `development-phases.md`](../BE/development-phases.md) Phase 2 names for removal
- [ ] No component reads a cookie or token directly — only `auth-client.ts` does

---

## Phase 3 — Catalog (read)

**Goal:** the public site browses locations, workspaces and amenities from the V2 API.

### Build

`features/locations/`, `features/workspaces/`, `features/amenities/` — read paths only, per [`features/locations.md`](./features/locations.md), [`features/workspaces.md`](./features/workspaces.md), [`features/amenities.md`](./features/amenities.md).

### Exit criteria

- [ ] `/locations` and `/workspaces` render paginated results — no client-side "load everything and filter in JS" left over from `getPublicCatalog`
- [ ] Money renders via `shared/format.ts`'s `Intl.NumberFormat("id-ID")` — never a raw string concatenation with "Rp"
- [ ] Availability calendar reads free/busy intervals from `GET /workspaces/:id/availability` — no booking id, reference or customer name ever reaches a component prop (matches the BE's own leak check in [BE `development-phases.md`](../BE/development-phases.md) Phase 3)
- [ ] Every list view has a loading skeleton and an empty state — not a blank screen

---

## Phase 4 — Catalog (write)

**Goal:** the admin console manages the catalog through the V2 API.

### Build

Admin CRUD screens across the three features, replacing `frontend/admin/admin-{locations,workspaces,amenities}.tsx`. All three forms share widgets today living in one legacy file, `frontend/admin/admin-form-fields.tsx` — this phase splits it: `image-field.tsx` and `db-select-field.tsx` (business-agnostic) move to `components/admin-fields/`, while `AmenityMultiSelect` moves into `features/amenities/components/amenity-multi-select.tsx` and is exported through that feature's `index.ts` for the other two to import (see [`fe-architecture.md`](./fe-architecture.md) §2/§7 for why the split lands there).

### Exit criteria

- [ ] Deleting a location with workspaces shows the `409` message from the API, not a generic failure toast
- [ ] Renaming a location slug does not require re-selecting workspaces in the UI — confirms the FK-by-id fix from [BE `erd-spec.md`](../BE/erd-spec.md) §9 reached the client
- [ ] Amenity multi-select writes `amenityIds`, matching the junction-table contract in [`features/amenities.md`](./features/amenities.md) — and is a single component imported by three features, not three copies
- [ ] The workspace/location image field still accepts either a pasted URL or a local file (converted to a `data:` URI client-side) — V2 has no multipart upload endpoint, so this client-side conversion is not a shortcut to remove (see [`features/workspaces.md`](./features/workspaces.md) §4)

---

## Phase 5 — Bookings (core)

**The critical phase**, same as the backend's. Everything before it is groundwork.

### Build

| Slice | Responsibility |
|---|---|
| `bookings/pricing/` | **Display-only** mirror of the BE's calculation — shows a live total as the user picks a time; the server total is still authoritative on submit |
| `bookings/availability/` | Calendar/picker consuming Phase 3's availability endpoint |
| `bookings.queries.ts` | `useCreateBooking`, optimistic-free (see below), `useCancelBooking` |
| Customer screens | Review, confirmation, "my bookings" list, cancel |
| Staff screens | Calendar view, create-for-customer, list with filters |
| `bookings/components/admin-calendar-view.tsx` | Replaces `frontend/admin/admin-calendar.tsx` — keep the day/week/month grid, **fix** the room-column lookup: V1 matches a booking to a column by substring-matching two hardcoded room names, V2 must key off the real workspace list the calendar endpoint returns |

### Exit criteria

- [ ] **The booking review screen never sends a price to the server.** `bookings.schema.ts`'s create input has no amount field — matching [BE `development-phases.md`](../BE/development-phases.md) Phase 5's "accepts no amount field," enforced on both ends
- [ ] `BOOKING_SLOT_TAKEN` re-fetches availability and shows the real conflict — never a generic "something went wrong" (see [`error-handling.md`](./error-handling.md) §4)
- [ ] No optimistic update on booking creation — a slot can lose the race server-side, and showing a booking that then disappears is worse than a spinner
- [ ] Cancellation window closed shows the exact reopening time, computed client-side only for display — the `403` from the server is what actually blocks it
- [ ] "My bookings" pagination matches the API's `meta.totalPages` — no client-side slicing of an unbounded fetch

> The FE cannot fix either defect this phase exists to close on the backend ([BE `development-phases.md`](../BE/development-phases.md) Phase 5) — but it can reintroduce them by caching a client-computed price and sending it back. **Never round-trip a price the server already returned as a "current price" back to a create/update call.**

---

## Phase 6 — Payments (PayBridge)

**Prerequisite:** [BE Phase 6](../BE/development-phases.md#phase-6--payments-paybridge) live — `checkoutUrl` exists to redirect to.

### Build

| Slice | Responsibility |
|---|---|
| `payments/components/checkout-redirect.tsx` | Redirects to PayBridge's `checkoutUrl`; no payment form is built in-house |
| `payments/components/payment-status-poller.tsx` | Polls `GET /bookings/:reference/payment` while the user is back on the confirmation screen, since the webhook lands asynchronously |
| `payments/components/admin-refund-dialog.tsx` | Staff-initiated refund, full or partial |

### Exit criteria

- [ ] Returning from PayBridge to the confirmation screen shows `pending` → `paid` without a manual refresh — the poller, not a static render, owns this
- [ ] A payment stuck `pending` past a reasonable window shows a retry action calling `POST /bookings/:id/payments` again, handling `PAYMENT_ALREADY_PENDING` by reusing the returned `checkoutUrl`
- [ ] No component ever reads or stores a PayBridge key, signature, or webhook payload — that boundary is server-only, full stop
- [ ] Partial refund UI enforces the remaining-balance cap client-side for UX, but the `422 REFUND_EXCEEDS_REMAINDER` from the server is the real guard

---

## Phase 7 — Settings & Reports UI

### Build

`features/settings/` (admin form, reads/writes `admin_settings`), `features/reports/` (overview, revenue, occupancy, payments, activity dashboards + CSV export button). The reports feature also absorbs three legacy files that don't map to a BE report 1:1: `admin-dashboard.tsx`'s KPI tiles/quick-actions/recent-activity become `overview-cards.tsx` + `activity-table.tsx`; `admin-analytics.tsx`'s hand-rolled bar charts become `revenue-chart.tsx`/`occupancy-chart.tsx` built on a real chart library; `admin-notifications.tsx`'s standalone feed is retired in favor of the one `activity-table.tsx` (see [`features/reports.md`](./features/reports.md) §2).

### Exit criteria

- [ ] `admin_settings` form fields are exactly [BE `features/settings.md`](../BE/features/settings.md)'s shape — no client-only field invented, no server field silently dropped
- [ ] The currency field is a real, editable select — not a select disabled and locked to `USD` the way `frontend/admin/admin-settings.tsx` ships today; V2's platform currency is IDR and `PUT /admin/settings` genuinely accepts any BE-supported currency (see [`features/settings.md`](./features/settings.md) §5)
- [ ] Currency and tax fields reject a currency with no known minor-unit exponent client-side too, mirroring [BE `development-phases.md`](../BE/development-phases.md) Phase 7 — not a substitute for the server check, a faster failure for the admin
- [ ] There is exactly one activity feed (`activity-table.tsx`, backed by `GET /admin/activity`) — not a dashboard feed and a separate notifications panel disagreeing with each other
- [ ] Every report chart renders the API's pre-aggregated numbers — no client-side reduction over raw rows, since the API no longer ships them
- [ ] CSV export triggers a direct download from the streamed endpoint — not a client-side CSV built from an already-fetched JSON array
- [ ] Report day-bucketing displays in the **venue's** timezone label returned by the API, not the browser's local zone

---

## Phase 8 — Hardening & cutover

### Build

- Remove `VITE_API_MODE` — every feature is `v2`; delete the `legacy` branch in `lib/api-client.ts`
- Delete `src/backend/api/*` (matches [BE `development-phases.md`](../BE/development-phases.md) Phase 8 exactly — this is the FE side of that same line item)
- Error boundaries per route group (site vs. admin), each reporting to `error-capture.ts`
- Full EN/ID coverage for every `ERROR_CODE` in [`error-handling.md`](./error-handling.md) §3 — a code with no translation is a review-blocking finding, not a shipped fallback
- Playwright regression suite for the FE-observable half of [BE `testing.md`](../BE/testing.md) §5's REG catalog (a UI cannot reproduce REG-011/012, which are webhook-only — see [`testing.md`](./testing.md) §5)
- Accessibility pass: every form field has a label, every error has `aria-live`, keyboard nav through the booking flow

### Exit criteria

- [ ] `src/backend/`, `src/frontend/` no longer exist in the tree
- [ ] `npm run check` clean: lint, types, format
- [ ] Lighthouse accessibility ≥ 90 on the booking review screen
- [ ] Every toast-producing `ERROR_CODE` has both an EN and ID string
- [ ] E2E suite green against a real (non-mocked) `BE/` instance in CI

---

## 2. Definition of done — every phase

| | |
|---|---|
| Lint | `npm run check` clean, zero warnings |
| Tests | Unit for hooks/mappers, integration (MSW) for the route + data flow; regression when closing a known defect |
| Types | No `any` introduced; API response shapes come from `bookings.types.ts`, not inline |
| Errors | Every mutation's error path is handled by [`error-handling.md`](./error-handling.md) §2 — no bare `catch {}` |
| Boundaries | No cross-feature `*.api.ts` import; `eslint-plugin-boundaries` passes |
| Loading/empty states | Every query-backed view has both, not just the happy path |
| Docs | Any UI deviation from a `features/*.md` spec is written back in the same PR |

---

## 3. Risks

| Risk | Phase | Mitigation |
|---|---|---|
| FE built against a BE phase that then changes shape before merge | P2–P7 | Build against the OpenAPI spec published at the end of each BE phase ([BE `development-phases.md`](../BE/development-phases.md) §3 risk table), not against BE source directly |
| Hand-mirrored Zod schemas drift from the BE's | Every phase | Contract tests in [`testing.md`](./testing.md) §7 run FE schemas against real API responses in CI |
| Optimistic UI reintroduces the "client sets the price" class of bug | P5 | Explicit rule in Phase 5 exit criteria; code review checklist item |
| Two payment UIs (legacy inline form vs. PayBridge redirect) both live during the flag period | P6 | Feature-flagged per booking, not per component — a booking created under `legacy` is paid under `legacy` end-to-end |
| Cutover discovers a shape mismatch the OpenAPI spec did not catch | P8 | Contract tests (§7) run continuously from P2 onward, not only at P8 |

---

## 4. Suggested first week

1. Stand up `lib/api-client.ts` against BE's `/health` — the flag exists before any feature uses it
2. Phase 1 relocation — it has no BE dependency and de-risks nothing else, so do it while waiting on BE P1/P2
3. Wire `shared/query-keys.ts` and `shared/error-codes.ts` — every later phase imports both
4. Once BE P2 lands, build `features/auth/` against real sessions, not a mock
5. Start P3 the moment BE publishes its P3 OpenAPI spec, in parallel with BE building P4/P5

Step 4 is the real milestone — once a real session survives a page reload, every later phase's guards and per-role screens are ordinary application code.
