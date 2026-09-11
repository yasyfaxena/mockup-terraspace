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

- Copy `src/frontend/ui/*` → `FE/src/components/ui/*` — the 14 files (`accordion`, `button`, `checkbox`, `dropdown-menu`, `input`, `label`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `textarea`) carried over byte-for-byte, only `@/lib/utils` re-created in the new app (`frontend-spec.md` §2)
- Build the primitives that don't exist yet: `dialog.tsx`, `tabs.tsx`, `switch.tsx` (their Radix packages are already dependencies, the files were not), plus `table.tsx` + `data-table.tsx` on `@tanstack/react-table` — the real `<table>`-based grid replacing V1's CSS-grid fake tables
- Copy `site-shell.tsx`/`site-header.tsx`/`site-footer.tsx` → `components/layout/` (unchanged markup/behavior), plus `shared/i18n.tsx` (self-contained, no route dependency) — `useAuth()` is temporarily swapped for a local `lib/auth-placeholder.ts` since Better Auth doesn't exist until Phase 2
- Copy the real `src/styles.css` design tokens into `FE/src/styles.css` (was a Phase-0 placeholder) — this is what "Design system" phase is actually for
- Split `frontend/admin/admin-layout.tsx` into `components/layout/admin-shell.tsx` (top bar + content frame) and `admin-sidebar.tsx` (the 5-group nav — see `fe-architecture.md` §2) — a deliberate decomposition, not a straight rename; `activeTab`/`onTabChange` props kept as-is (Phase 4 wires real per-page routes)
- 11 thin stub routes so header/footer `Link`s type-check: `workspaces.index`, `locations.index`, `amenities`, `dashboard`, `login`, `signup` (real content lands in their owning phase) and `pricing`, `how-it-works`, `help`, `terms`, `privacy` (static pages — V1's real copy is not yet ported, still open)
- Confirm no `components/ui/*` file imports a feature — this is the one invariant Phase 1 exists to establish

### Exit criteria

- [x] ~~`frontend/` is empty and deleted~~ — N/A under the separate-app architecture (decision #1): `src/frontend/` stays untouched in the root app until full cutover, since that app is still live. `FE/src/components/ui/` now has its own faithful copies instead
- [x] `components/ui/*` has zero imports from `features/` or `routes/` (verified by grep; `eslint-plugin-boundaries` enforcement itself is still open — no `features/` exist yet to write real boundary rules against)
- [x] Every route still renders — verified against a real running `BE/`: dev server + `curl` on `/`, `/workspaces`, `/pricing`, `/dashboard` (200) and a nonexistent path (404); production build also succeeds
- [ ] Full static-page content (pricing/how-it-works/help/terms/privacy) — still just placeholders, not ported from `src/routes/*.tsx`

---

## Phase 2 — Auth ✅ done

**Goal:** sign up, sign in, session-aware routing — against Better Auth once [BE Phase 2](../BE/development-phases.md#phase-2--auth) lands.

**What shipped:** `FE/src/lib/auth-client.ts` (Better Auth's `createAuthClient` from `better-auth/react` + `adminClient()` plugin, pointed at `BE/`'s real `/api/auth/*`), `FE/src/features/auth/` (`auth.types.ts`, `auth.schema.ts`, `auth.hooks.ts`, `components/{sign-in-form,sign-up-form}.tsx`, `index.ts`), real forms wired into `login.tsx`/`signup.tsx`, an auth-required `dashboard.tsx`, and two new guarded routes proving the guard end to end: `admin_.login.tsx` (same `SignInForm`, per [`features/auth.md`](./features/auth.md) §6) and a minimal `admin.tsx` gated by `requireRole("admin")`. `site-header.tsx`/`admin-sidebar.tsx` now call the real `useSession()`/`authClient.signOut()` — Phase 1's `lib/auth-placeholder.ts` is deleted.

**Two deviations from this section as originally written, both discovered while actually building it:**

1. **`requireRole`/`requireAuth`, not `useRequireRole`.** `beforeLoad` runs outside a component render; naming the guard with a `use` prefix trips `eslint-plugin-react-hooks`' rules-of-hooks check the moment it's called from `beforeLoad`. Behavior is unchanged — anonymous → `/login`, wrong role → `/`, never the same redirect for both.
2. **SSR needs the browser's cookie forwarded by hand.** `beforeLoad` also runs during SSR, where `authClient.getSession()`'s fetch is a real cross-process HTTP call to `BE/` that starts with no cookies at all — every hard-refresh/direct-link load looked signed-out until the incoming request's `Cookie` header is explicitly forwarded. `@tanstack/react-start/server`'s `getRequestHeader` can't just be imported directly into `auth.hooks.ts`, though — Start's build statically forbids a server-only import reaching a file also used client-side (`site-header.tsx` imports the same module for `useSession()`). The fix is `createIsomorphicFn().client(...).server(...)`, which the Start compiler is actually built to split per-environment.

**Known rough edge, not fixed this phase:** `site-header.tsx`'s `useSession()` still renders the signed-out state during the SSR pass for an already-authenticated visitor (it corrects after client hydration in a real browser) — only `dashboard.tsx` was fixed for this, by reading the already-resolved session off `beforeLoad`'s route context instead of calling `useSession()` a second time. Doing the same for the header would mean every route (not just guarded ones) pays for a session fetch in its `beforeLoad`, which is a bigger call than Phase 2 asked for.

### Exit criteria

- [x] Sign up → sign in → an authenticated route renders the session's name — verified against a real running `BE/`: signed up via `POST /api/auth/sign-up/email`, flipped `emailVerified` via Prisma (mirrors `BE/tests/helpers/auth.js`'s own approach — no inbox access to click a real verification link), signed in, then `curl`'d `/dashboard` and got back `Signed in as Verify Check.`
- [x] `requireRole("admin")` redirects a customer to `/`, and an anonymous visitor to `/login` — verified all three cases by `curl`: anonymous → `/login` (307), signed-in customer → `/` (307), promoted to `admin` role → `200` with the real page. Also covered by 9 passing unit tests (`tests/unit/features/auth/auth.hooks.test.ts`) mocking `authClient.getSession`
- [x] ~~`src/lib/auth-server.ts`, `src/lib/auth-guards-server.ts`, `src/lib/password-server.ts` deleted~~ — N/A under the separate-app architecture (decision #1): those are root-app files: the root app is still live and untouched until full cutover. `FE/` never had them to begin with — it only ever talks to Better Auth through `lib/auth-client.ts`
- [x] No component reads a cookie or token directly — only `lib/auth-client.ts` (and, for the SSR-only cookie-forwarding case, `auth.hooks.ts`'s `createIsomorphicFn` server branch) touch anything cookie-shaped

---

## Phase 3 — Catalog (read) ✅ done

**Goal:** the public site browses locations, workspaces and amenities from the V2 API.

**What shipped:** `features/locations/`, `features/workspaces/`, `features/amenities/` — each with `*.types.ts` mirroring the real BE DTOs (pulled straight from `locations.mapper.js`/`workspaces.mapper.js`/`amenities.mapper.js`, not guessed), `*.api.ts`, `*.queries.ts` (exporting both `use*` hooks and `*QueryOptions` factories — see below), and real components (`location-card.tsx`, `location-map.tsx`, `workspace-card.tsx`, `availability-badge.tsx` extended to the real 5-state workspace enum plus locations' 3-state computed stat, `search-module.tsx` trimmed to the two filters that map to real query params, `amenity-chip.tsx`, `availability-calendar.tsx`). `shared/format.ts`, `shared/query-string.ts` (repeated-key query strings, matching BE's `repeatableQueryParam`), and `shared/geocoding.ts` (ported from `src/lib/geocoding.ts`) added. Wired into real routes: `/`, `/locations`, `/locations/$slug`, `/workspaces`, `/workspaces/$id`, `/amenities` all replace their Phase 1 placeholders with live data.

**A gap found only by testing against a real browser-shaped request, not by reading the docs:** every route above rendered nothing but its loading skeleton over SSR/`curl` at first — `useQuery` alone never has data yet on the server, since nothing had prefetched it. Fixed by having each feature's `*.queries.ts` also export a `*QueryOptions()` factory (via `queryOptions()`) that both the `use*` hook and the owning route's `loader` call with `queryClient.ensureQueryData(...)`, exactly as `fe-architecture.md` §8 already specified — Phase 3 is what actually exercises that pattern for the first time. A related fix: a BE `404 NOT_FOUND` from a loader was surfacing as an unhandled SSR `500`, not the router's `notFoundComponent` — `locations.$slug.tsx`/`workspaces.$id.tsx` now catch `ApiError` with `code === "NOT_FOUND"` and `throw notFound()` instead (`error-handling.md` §5), and `__root.tsx` gained a real `notFoundComponent` (Phase 1 never added one).

**Scope actually delivered vs. what a literal reading might imply:**
- Locations has no pagination on the BE at all (`listPublic` returns `{ data }`, no `meta` — few locations exist by design). Only `/workspaces` is truly paginated (`page`/`limit`/`meta.totalPages`); "no load-everything-and-filter-in-JS" is satisfied for both (locations' filters — `city`/`q`/`amenityId` — are real server-side query params too), but only one of them has pages to turn.
- The workspace detail page's availability calendar is a real, working hour-grid (dynamic opening-hours bounds from the API response, not V1's hardcoded 8am–5pm) but simpler than V1's pixel-precise Google-Calendar-style rendering — booking-slot selection and the booking form itself are Phase 5, not this phase.
- The 5 static marketing pages (pricing/how-it-works/help/terms/privacy) are still Phase 1's placeholders — untouched here, still open.
- The homepage got a real hero + `SearchModule` + a 3-location teaser, not the full ~380-line marketing page V1 ships — same "design system vs. content" scope line drawn in Phase 1.

### Exit criteria

- [x] `/locations` and `/workspaces` render paginated results — no client-side "load everything and filter in JS" left over from `getPublicCatalog`. Verified against a real running `BE/` (3 seeded locations, 11 workspaces): `curl` on every route shows real names/prices/addresses server-rendered, not skeletons
- [x] Money renders via `shared/format.ts`'s `Intl.NumberFormat("id-ID")` — never a raw string concatenation with "Rp"
- [x] Availability calendar reads free/busy intervals from `GET /workspaces/:id/availability` — no booking id, reference or customer name ever reaches a component prop. Structurally guaranteed, not just by convention: the BE endpoint's `busy`/`available` arrays are `{ from, to }` only, and `workspaces.types.ts`'s `AvailabilityInterval` type has no other fields to leak
- [x] Every list view has a loading skeleton and an empty state — not a blank screen (all three catalog list views, including a `/amenities` empty-state that wasn't there in the first pass)

---

## Phase 4 — Catalog (write) ✅ done

**Goal:** the admin console manages the catalog through the V2 API.

**What shipped:** admin CRUD across all three catalog features — `*.schema.ts` (form-side Zod, mirroring BE's create/update schemas, deliberately without `.default()`: see the in-code comment on why that trips `useForm<T>`'s single generic against `zodResolver`), admin API functions and mutations (`useCreate*`/`useUpdate*`/`useDelete*`, each invalidating that feature's whole query namespace on success), and per-feature `admin-*-table.tsx` (V1's flat list, kept — not the sortable/filterable case `data-table.tsx` exists for) + `admin-*-form.tsx` (a real `Dialog`, not V1's hand-rolled `fixed inset-0` overlay div). The shared widgets split out of the one legacy `admin-form-fields.tsx` exactly as planned: `components/admin-fields/{image-field,db-select-field}.tsx` (business-agnostic) and `features/amenities/components/amenity-multi-select.tsx` (owns real amenity data, exported through that feature's `index.ts` for `locations`/`workspaces` to import).

**Decision #6 — real per-page admin routes — actually implemented here, not deferred further:** `admin.tsx` is now a layout route (`AdminShell` + `<Outlet/>`) instead of a single page holding `activeTab` state; `admin.locations.tsx`, `admin.workspaces.tsx`, `admin.amenities.tsx` nest under it with real CRUD, and the other 8 sidebar items (`dashboard`, `bookings`, `calendar`, `members`, `payments`, `analytics`, `notifications`, `settings`) got thin placeholder routes so the *entire* sidebar is real, clickable, deep-linkable navigation — not just the three feature areas this phase owns. `AdminSidebar` and `AdminShell` no longer take `activeTab`/`onTabChange` props at all: active-state comes from `Link`'s own `activeProps` matching, and the top-bar page label is read off the current pathname. "Guests" is dropped from the nav entirely (no V2 destination, per `features/README.md`); "Members" (`features/users`) has no FE phase assigned in this plan yet and is called out as such in its own placeholder rather than silently invented.

**The same SSR-cookie gap Phase 2 found, but general this time:** Phase 2 fixed `authClient.getSession()`; this phase found the same problem in the plain `apiClient` itself — every admin loader hit BE's `requireAuth` middleware and got `401 UNAUTHENTICATED` ("Sign in required.") during SSR, because `lib/api-client.ts`'s `fetch()` had no cookie to forward (`credentials: "include"` only matters for a real browser's cookie jar; SSR's `fetch` runs in Node with no ambient cookies at all). The Phase 2 fix was duplicated inside `auth.hooks.ts` only, which was never going to scale — pulled out into `shared/forwarded-headers.ts` and applied in `lib/api-client.ts` itself, so *every* current and future authenticated loader (bookings, payments, settings, reports included) gets this for free instead of rediscovering it phase by phase.

### Exit criteria

- [x] Deleting a location with workspaces shows the `409` message from the API, not a generic failure toast — verified directly against `BE/`: `DELETE /api/v1/admin/locations/:id` on TerraSpace Jakarta (5 workspaces) returns `409 CONFLICT — "Location still has workspaces."`; the admin table's delete handler doesn't catch-and-replace this, so the query-client's global `onError` toasts the real message verbatim
- [x] Renaming a location slug does not require re-selecting workspaces in the UI — structural, not just tested: the workspace form's location field is a `Select` keyed on `locationId` (a real UUID), never `locationSlug` — there is no slug anywhere in the write path for this to break on
- [x] Amenity multi-select writes `amenityIds`, matching the junction-table contract — and is a single component imported by three features, not three copies. Fixed along the way: V1's version matched by amenity **name**; `amenity-multi-select.tsx` selects by **id**, since name-matching silently breaks the moment two amenities share a name
- [x] The workspace/location image field still accepts either a pasted URL or a local file (converted to a `data:` URI client-side) — ported byte-for-byte from `admin-form-fields.tsx`'s `ImageField`, unchanged behavior

Verified against a real running `BE/` with real seeded data: signed in as a promoted admin test user, confirmed `/admin` redirects to `/admin/dashboard`, all three CRUD pages render real rows via `curl` (not skeletons — same loader-prefetch pattern as Phase 3), the anonymous guard still redirects to `/login`, and a direct `POST /api/v1/admin/amenities` round-trip matches the exact payload shape `amenityFormSchema` produces. `npm run check` clean, production build succeeds, all 9 unit tests still pass.

---

## Phase 5 — Bookings (core) ✅ done

**The critical phase**, same as the backend's. Everything before it is groundwork.

**What shipped:** `features/bookings/` — DTOs mirroring `bookings.mapper.js` exactly (list/detail/cancel/admin-list/admin-detail/calendar), `bookings/pricing/use-booking-price.ts` (a line-for-line port of BE `pricing.js`'s `computeBookingAmounts`, unit-tested against a real BE-created booking's actual numbers, not just the formula in isolation), `bookings.time.ts` (a **browser-local approximation** of BE's venue-timezone cancellation cutoff — the booking DTOs never expose the workspace's IANA timezone, only its city name, so this is a deliberate, documented simplification, not an oversight). `features/settings/` also landed early (public-settings read only) since the pricing mirror and cancellation display both need `taxPercent`/`cancellationWindowHours` — Phase 7 owns the admin write side.

Customer flow: `workspaces.$id.tsx` grew a `BookingSlotPicker` (date/time inputs + live price, replacing V1's page that had **no slot picker at all** — V1's `booking.review.tsx` only ever read start/end from URL params some earlier, unbuilt page was supposed to set) feeding a real `/booking/review` (price summary, `BOOKING_SLOT_TAKEN` handling) and `/booking/confirmation` (real `QrPass` using BE's actual `accessCode`, not V1's client-fabricated pseudo-payload string). `/dashboard` is a real scope-tabbed (`upcoming`/`past`/`all`), server-paginated list — V1 loaded every booking once and split it into two arrays client-side; that's exactly the pattern Phase 3 and this phase both explicitly rule out. Cancel uses `cancel-booking-dialog.tsx` (a real `Dialog`, not V1's bare button with no confirmation at all).

Staff: `admin.calendar.tsx` + `admin-calendar-view.tsx` (the required room-column fix — see below), `admin.bookings.tsx` (real list, status filter, inline status change, delete). **Deliberately not built:** "create booking for a customer" — `POST /admin/bookings` is `staff`-or-`admin`, but `GET /admin/users` (the only way to look up a customer's id) is `admin`-only. There is no way for a staff user to find the `userId` this form would need without walking around that boundary, so a genuinely usable version of this screen isn't buildable against the real API as it stands — flagged here rather than shipped as a raw userId text box pretending to be a real feature.

**V1's hardcoded room-column bug — fixed, not carried over:** `admin-calendar.tsx` matched a booking to a column via `workspace_name.includes("Prambanan")`-style substring checks against two hardcoded room names, in four separate places. `admin-calendar-view.tsx` derives its columns from the real `workspaceId`/`workspaceName` pairs the `GET /admin/bookings/calendar` response actually returns, and matches bookings to columns by `workspaceId` — works for any number of rooms at any location, not just two.

**Two real bugs found only by testing this phase, not by reading the docs:**
1. **A genuine SSR cross-request cache leak, sitting undetected since Phase 0.** `lib/query-client.ts` exported `queryClient` as a module-level singleton; `router.tsx`'s `getRouter()` (called once per SSR request by Start) imported and reused that same instance every time. Every request in the same Node process shared one cache — invisible while all the data being fetched was near-static catalog content, but it surfaced immediately once two different bookings needed two different real answers within the same process lifetime (the admin calendar kept showing an earlier request's now-stale empty result). Fixed by turning the export into `createQueryClient()`, called fresh inside `getRouter()` — the standard, correct TanStack Query SSR pattern, which nothing before this phase had exercised enough to expose the gap.
2. `dashboard.tsx`'s cancellation-cutoff display depends on `usePublicSettings()`, which nothing was prefetching — same "loader must prefetch everything the page reads" gap Phase 3 already found and fixed elsewhere, just missed here originally.

### Exit criteria

- [x] **The booking review screen never sends a price to the server.** `bookings.schema.ts`'s `createBookingSchema` has no amount field, matching BE's exactly — verified for real: created a booking via the API with `unitPrice 12000 × 2h`, and the server's own total (`26640.00`) matches what `useBookingPrice` independently computes client-side from the same inputs, confirming the mirror is accurate without the server ever being told a price
- [x] `BOOKING_SLOT_TAKEN` re-fetches availability and shows the real conflict — verified against a real double-booking attempt (`409`, `"This time slot was just booked."`); the review page's `catch` checks `error.code === "BOOKING_SLOT_TAKEN"` specifically to invalidate that date's availability query, and the message itself (never generic) comes from the query-client's existing global handler doing `toast.error(error.message)` for any `ApiError`
- [x] No optimistic update on booking creation — `useCreateBooking` only invalidates on success; the review page's button stays disabled and says "Processing…" until the real response comes back
- [x] Cancellation window closed shows the exact (browser-local-approximated) cutoff time, computed client-side only for display — the `403` from the server is what actually blocks it; verified against a real booking BE genuinely refused to cancel (`"Bookings can only be cancelled at least 24 hours in advance."`)
- [x] "My bookings" pagination matches the API's `meta.totalPages` — no client-side slicing of an unbounded fetch; `useBookings({ scope, page })` is server-paginated per scope tab, not one big fetch split in the browser

Verified against a real running `BE/`: created, viewed, and attempted to cancel a real booking end to end (signup → verify → sign-in → book → confirmation → dashboard), triggered a real slot conflict and a real cancellation-window rejection, and confirmed the admin calendar renders a real booking under its real workspace column. `npm run check` clean, production build succeeds, all 12 unit tests pass (3 new, covering the pricing mirror against BE's actual numbers).

> The FE cannot fix either defect this phase exists to close on the backend ([BE `development-phases.md`](../BE/development-phases.md) Phase 5) — but it can reintroduce them by caching a client-computed price and sending it back. **Never round-trip a price the server already returned as a "current price" back to a create/update call.**

---

## Phase 6 — Payments (PayBridge) ✅ done

**Prerequisite:** [BE Phase 6](../BE/development-phases.md#phase-6--payments-paybridge) live — `checkoutUrl` exists to redirect to.

**What shipped:** `features/payments/` — DTOs mirroring `payments.mapper.js` exactly, `checkout-redirect.tsx`, `payment-status-poller.tsx` (`refetchInterval` stops itself the moment `status` leaves a pending state — not a fixed-count poll), `admin-refund-dialog.tsx`, and `admin-payment-table.tsx` (one `STATUS_LABELS` map for the real 7-state `payment_state` enum, replacing V1's per-screen invented prose like "Successful"/"Failed"). A new `/booking/checkout` route sits between `/booking/review` and `/booking/confirmation` — `booking.review.tsx`'s "Confirm & book" now creates the booking then hands off to `CheckoutRedirect`, instead of going straight to confirmation the way it did at the end of Phase 5.

**`PAYMENT_ALREADY_PENDING`'s real shape, found only by reading the actual error class:** the doc's exit criteria said "reusing the returned `checkoutUrl`" as if the `409` carried it. It doesn't — `payments.errors.js`'s `PaymentAlreadyPendingError` is a bare message, no `details`. Recovering the existing session's real `checkoutUrl` needs a second call, to `GET /bookings/:reference/payment` (which does return `checkoutUrl` while a payment is still pending). Both `checkout-redirect.tsx` (automatic, on first load) and `payment-status-poller.tsx`'s "Resume checkout" button (customer-triggered, after `payment.status` stays `pending` for 60s) go through this same catch → re-fetch → redirect path.

**A real, environmental limitation, not a gap in the implementation:** this sandbox's PayBridge credentials return `401` on every real call (`GET /payment-methods`, `POST /bookings/:id/payments`, and refund all confirmed this directly against a live `BE/`) — so the actual "redirect to a real PayBridge-hosted checkout page and pay" round trip could not be exercised end-to-end here. Verified everything on either side of that gap instead: the checkout page's real error-handling path (confirmed the exact `PAYMENT_PROVIDER_ERROR` BE returns), and the rest of the flow — payment status display, the poller's `pending`/`paid` rendering, the admin list, and the refund dialog's remaining-balance math — against a `Payment` row seeded directly via Prisma (mirroring how `BE/tests/helpers/auth.js` seeds fixtures rather than going through the thing that's broken in this environment), plus BE's own real `422 REFUND_EXCEEDS_REMAINDER` rejection for an over-large amount, confirming the client-side cap's math agrees with the server's.

### Exit criteria

- [x] Returning from PayBridge to the confirmation screen shows `pending` → `paid` without a manual refresh — verified with a real `Payment` row: `curl`ing `/booking/confirmation` with a `status: "paid"` row renders "Payment confirmed" straight from the (loader-prefetched) query, no refresh needed. A related gap fixed along the way: `usePaymentStatus` wasn't being prefetched at all, so the poller silently rendered nothing during SSR until this route's loader was updated to prefetch it (best-effort — a booking with no payment yet, e.g. a bookmarked confirmation URL, doesn't block the rest of the page on that 404)
- [x] A payment stuck `pending` past a reasonable window shows a retry action calling `POST /bookings/:id/payments` again, handling `PAYMENT_ALREADY_PENDING` by reusing the real `checkoutUrl` fetched from `GET /bookings/:reference/payment` — see the finding above
- [x] No component ever reads or stores a PayBridge key, signature, or webhook payload — `payments.types.ts` has no such fields to begin with; the webhook route is BE-only and was never a candidate for FE code
- [x] Partial refund UI enforces the remaining-balance cap client-side for UX, but the `422 REFUND_EXCEEDS_REMAINDER` from the server is the real guard — verified both sides agree: the dialog computes `remaining` from the same detail DTO already on screen, and a real over-large refund request against `BE/` was rejected with the exact same error the dialog exists to prevent

Verified against a real running `BE/` throughout (health checks, real bookings, a real sign-up/verify/sign-in cycle, real 401/422/404 responses), with the one gap above called out rather than silently skipped. `npm run check` clean, production build succeeds, all 12 unit tests still pass.

---

## Phase 7 — Settings & Reports UI ✅ done

**What shipped:** `features/settings/` grew its admin read/write side — `AdminSettingsDto`, `getAdminSettings`/`updateAdminSettings`, and `admin-settings-form.tsx`: a genuinely editable currency `Select` restricted to BE's real `CURRENCY_EXPONENT` keys (`IDR`/`JPY`/`USD`/`SGD`/`MYR`/`EUR`), not V1's disabled/`USD`-locked field. `taxPercent` is validated client-side to ≤2 decimal places (`Number.isInteger(value * 100)`, the exact check `settings.schema.js` runs server-side) before it ever reaches `PUT /admin/settings`. `features/reports/` is new: `overview-cards.tsx` + `schedule-table.tsx` + `activity-feed.tsx` (dashboard), `revenue-report.tsx` + `occupancy-report.tsx` (built on `recharts`, replacing V1's hand-rolled `Bar` component), `payments-report-table.tsx`, and `export-report-button.tsx` (a real browser navigation to the streamed CSV endpoint, never a `fetch`+buffer). `admin.dashboard.tsx` now renders real overview KPIs, today's schedule, and the activity feed; `admin.analytics.tsx` is a three-tab page (Revenue/Occupancy/Payments) with date-range/location/workspace-type filters and per-tab CSV export; `admin.settings.tsx` renders the real form. `admin.notifications.tsx` — V1's separate panel with its own unread-badge and auto-mark-read-on-mount — now redirects to `/admin/dashboard` and its nav entry is gone; the one activity feed lives there instead (`features/reports.md` §2).

**A real backend bug, found only by calling the endpoint for real, not by reading the code path in isolation:** `GET /admin/reports/occupancy` with no `locationId` threw a raw `PrismaClientKnownRequestError` ("Expected: 3, actual: 2") every time. `reports.repository.js`'s `byWorkspace` query hardcoded `$2`/`$3` for `from`/`to` assuming `locationId` always occupies `$1`, but when it's absent the bound values shift down by one with nothing filling `$1`. Every existing integration test for this endpoint happened to always pass a `locationId`, so this had shipped undetected. Fixed in BE (`reports.repository.js`: `from`/`to` are now always `$1`/`$2`, `locationId` — when present — is `$3`), with a new regression test added (`occupancy.test.js`: "succeeds without a locationId filter") covering the exact case that was broken. Disclosed here rather than routed around from the FE side, since no FE workaround exists for a raw SQL parameter mismatch.

**The venue-timezone exit criterion, reconsidered against what the API actually returns:** the plan's wording ("displays in the venue's timezone label returned by the API") assumes the API returns a timezone label per report. It doesn't, by design — `reports.repository.js`'s own comment confirms `bookings.booking_date` is a bare `DATE` and `startTime`/`endTime` are bare `@db.Time` columns representing the venue's wall-clock day/time *already*, with no `AT TIME ZONE` conversion needed or a timezone string to hand back (the one real conversion, `overview`'s `newCustomersToday`, uses a hardcoded `DEFAULT_REPORT_TIMEZONE` that never reaches the response DTO at all). The correct FE behavior — and what's actually implemented — is to treat every `period`/`bookingDate`/`startTime`/`endTime` field as an opaque local string and render it as-is, never round-tripping it through `new Date(...)` for display (which would reinterpret it in the browser's zone and could shift the calendar day). `schedule-table.tsx`'s doc comment states this explicitly.

**A second SSR-prefetch gap, same class as Phase 5/6's:** `admin.analytics.tsx`'s loader only prefetched the revenue/occupancy tabs; the Payments tab rendered "Loading…" forever during SSR because nothing was calling `paymentsReportQueryOptions`. Found by curling the page with `?tab=payments`, not by code review. Fixed by extending the loader to prefetch whichever tab is actually active — verified via curl before and after.

**Known, minor, and left as-is:** `admin-settings-form.tsx` follows the same `reset()`-inside-`useEffect` pattern as `admin-workspace-form.tsx` (Phase 4) to populate a `react-hook-form` form from fetched data. Unlike that dialog-only form, this one is the page's primary SSR content, so the very first server-rendered paint shows empty inputs before client hydration runs `reset()` — confirmed by curling `/admin/settings` and seeing `value=""` in the raw HTML even though `adminSettingsQueryOptions()` is loader-prefetched and the real values are in the SSR-embedded query cache. This is a sub-frame flash on hydration, not a data-loading bug (the real values render correctly once React takes over), and it's the same tradeoff every RHF-driven edit form in this codebase already makes.

### Exit criteria

- [x] `admin_settings` form fields are exactly [BE `features/settings.md`](../BE/features/settings.md)'s shape — `AdminSettingsDto`/`updateSettingsSchema` mirror `settings.mapper.js`/`settings.schema.js` field-for-field; verified with a real `PUT /admin/settings` round trip
- [x] The currency field is a real, editable select — not a select disabled and locked to `USD`; verified the `Select` lists exactly BE's six `CURRENCY_EXPONENT` keys
- [x] Currency and tax fields reject a currency with no known minor-unit exponent, and a tax percent with more than 2 decimal places, client-side too — `settings.schema.ts` runs the identical `.refine()` checks as BE before submit
- [x] There is exactly one activity feed (`activity-feed.tsx`, backed by `GET /admin/activity`) — `admin.notifications.tsx` redirects to the dashboard instead of duplicating it, and its sidebar entry is removed
- [x] Every report chart renders the API's pre-aggregated numbers — `revenue-report.tsx`/`occupancy-report.tsx` render `totals`/`series`/`byLocation`/`byWorkspaceType`/`byWorkspace` exactly as returned; no raw booking/payment row is ever fetched by the FE for these screens
- [x] CSV export triggers a direct download from the streamed endpoint — `export-report-button.tsx` sets `window.location.href` to the BE URL; verified the response is real `text/csv` with a `Content-Disposition: attachment` header via curl
- [x] Report day-bucketing never reinterprets a date/time field in the browser's local zone — see the reconsidered finding above; there is no separate venue-timezone label to display because the underlying columns are venue-local by construction, and every date/time field is rendered as the literal string the API returns

Verified against a real running `BE/`: signed up a real admin test user (verified/role-flipped via the same Prisma one-off script this session has used since Phase 5), exercised every new endpoint directly with curl (`admin/settings` GET+PUT, `reports/overview`, `reports/revenue`, `reports/occupancy` with and without `locationId`, `reports/payments`, `admin/activity`, `reports/export`), created one real paid booking via Prisma to confirm the overview KPIs/schedule and the revenue chart/breakdowns render real non-zero numbers (not just empty states), then cleaned up both. `npm run check` clean on FE, production build succeeds, all 12 FE unit tests still pass. On BE: `npm run test:unit` (158 passed) and `npm run test:integration -- reports` (37 passed, including the new regression test) both green after the repository fix.

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
