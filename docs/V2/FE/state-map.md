# TerraSpace — State Map (V2)

**Server state:** TanStack Query · **Client state:** React state / URL search params · **Forms:** React Hook Form + Zod

> This is the frontend's analogue to [BE `erd-spec.md`](../BE/erd-spec.md) — instead of tables and foreign keys, it maps **where each piece of data lives** and **what invalidates what**. Read it before adding a query key or a mutation.

---

## 1. Three kinds of state, and where each belongs

| Kind | Owned by | Example | Never do this |
|---|---|---|---|
| **Server state** | TanStack Query | Locations, workspaces, bookings, the current user | Copy a query's data into `useState` — it goes stale silently |
| **URL state** | Route search params (TanStack Router) | Catalog filters, pagination `page`, report date range | Store filters in `useState` — the back button and shared links break |
| **Local UI state** | `useState` / `useReducer` | Modal open, active tab, form step | Put a modal's open flag in a Query cache or in global state |
| **Form state** | React Hook Form | In-progress booking review, admin edit forms | Mirror form fields into TanStack Query — RHF already owns this |

[`frontend-spec.md`](./frontend-spec.md) §7 already set this rule for V1; V2 keeps it and adds the query-key discipline below because there is now a real, versioned API to key against instead of ad hoc `createServerFn` calls.

---

## 2. Query key structure

One factory, `shared/query-keys.ts`, builds every key used in the app. No feature hand-writes an array literal key — the same discipline as [BE `linter.md`](../BE/linter.md) §5's frozen constants for magic strings, applied to cache keys instead of enum strings.

```ts
// shared/query-keys.ts
export const queryKeys = {
  locations: {
    all: () => ["locations"] as const,
    list: (params: LocationListParams) => ["locations", "list", params] as const,
    detail: (slug: string) => ["locations", "detail", slug] as const,
  },
  workspaces: {
    all: () => ["workspaces"] as const,
    list: (params: WorkspaceListParams) => ["workspaces", "list", params] as const,
    detail: (id: string) => ["workspaces", "detail", id] as const,
    availability: (id: string, date: string) => ["workspaces", id, "availability", date] as const,
  },
  bookings: {
    all: () => ["bookings"] as const,
    list: (params: BookingListParams) => ["bookings", "list", params] as const,
    detail: (reference: string) => ["bookings", "detail", reference] as const,
    adminCalendar: (range: DateRange) => ["bookings", "admin-calendar", range] as const,
  },
  payments: {
    forBooking: (reference: string) => ["payments", "for-booking", reference] as const,
  },
  // ... one entry per feature, see features/*.md §"Data" for the full per-feature list
} as const;
```

| Rule | Reason |
|---|---|
| The array's first segment is always the feature name | Enables `invalidateQueries({ queryKey: ["bookings"] })` to hit every booking query at once |
| List keys include every param that changes the result (`page`, filters) | Two different filter sets must not share a cache entry |
| Detail keys use the same identifier the URL uses (`slug`, `reference`, `id`) | The route param *is* the cache key — no separate lookup table |
| A feature only ever calls its own `queryKeys.<feature>` | Matches the import-boundary rule in [`fe-architecture.md`](./fe-architecture.md) §7 |

---

## 3. Cache invalidation map

The frontend equivalent of [BE `erd-spec.md`](../BE/erd-spec.md) §2's referential actions — what a mutation must invalidate, and why. This is a manually maintained table because TanStack Query cannot infer it from a schema the way a `FOREIGN KEY` lets PostgreSQL infer `ON DELETE`.

| Mutation | Invalidates | Reason |
|---|---|---|
| `useCreateBooking` | `bookings.list(*)`, `workspaces.availability(workspaceId, date)` | A new booking changes both "my bookings" and that workspace's free intervals |
| `useCancelBooking` | `bookings.detail(reference)`, `bookings.list(*)`, `workspaces.availability(workspaceId, date)` | Cancelling releases the slot — the availability calendar must reflect it immediately, not after a refetch interval |
| `useCreateLocation` / `useUpdateLocation` | `locations.list(*)`, `locations.detail(slug)` | |
| `useDeleteLocation` | `locations.list(*)` | The detail query for a deleted slug is left to 404 naturally rather than being pre-emptively removed |
| `useUpdateWorkspace` (price change) | `workspaces.detail(id)`, `workspaces.list(*)` | **Never** `bookings.*` — [BE `erd-spec.md`](../BE/erd-spec.md) §13 snapshots `unitPrice` on the booking row; existing bookings must not appear to change price on screen either |
| `useCreatePayment` | `payments.forBooking(reference)`, `bookings.detail(reference)` | `bookings.paymentStatus` is derived server-side ([BE `erd-spec.md`](../BE/erd-spec.md) §13) — refetch the booking, don't hand-patch its status client-side |
| `useRefund` (admin) | `payments.forBooking(reference)`, `bookings.detail(reference)`, `reports.*` | A refund changes revenue reports already in view |
| `useUpdateSettings` (admin) | `settings.admin()`, `settings.public()` | Public settings (tax, cancellation window) affect every customer's pricing display |
| `useBanUser` / `useUnbanUser` | `users.list(*)`, `users.detail(id)` | |

> **Prefer targeted invalidation over `queryClient.invalidateQueries()` with no key.** A blanket invalidation re-fetches the entire app's server state on every mutation, which masks a missing entry in this table instead of surfacing it.

---

## 4. Optimistic updates — where they are and are not used

| Mutation | Optimistic? | Why |
|---|---|---|
| `useCancelBooking` | **Yes** | Failure mode is a stale "still confirmed" row the user can retry; low cost |
| `useUpdateSettings` | **Yes** | Single admin, low contention, instant form feedback matters |
| `useCreateBooking` | **No** — see [`development-phases.md`](./development-phases.md) Phase 5 | The exclusion constraint can reject it; showing a booking that then disappears is a worse experience than a spinner + the real result |
| `useCreatePayment` | **No** | The `checkoutUrl` redirect makes an optimistic local state meaningless — the user leaves the page |
| Admin catalog CRUD (`useCreateWorkspace`, etc.) | **No** | Low frequency; a round trip is imperceptible, and a `409`-on-delete needs the real response to show which relation blocked it |

---

## 5. Derived / computed client state

Some state is neither fetched nor locally owned — it is computed from a query's data on every render, memoized with `useMemo`. Listed here so it is not mistaken for a missing query:

| Computed value | Derived from | Lives in |
|---|---|---|
| Live booking total while picking a time | `workspace.pricePerHour` + `settings.public().taxPercent` | `features/bookings/pricing/use-booking-price.ts` — **display only**, see [`development-phases.md`](./development-phases.md) Phase 5 |
| "Can cancel until" timestamp | `booking.bookingDate/startTime` + `settings.public().cancellationWindowHours` + the location's `timezone` | `features/bookings/` — mirrors [BE `erd-spec.md`](../BE/erd-spec.md) §8's timezone note; never computed against the browser's local zone |
| Free/busy calendar cells | `GET .../availability` response | `features/bookings/availability/` |
| Form validity | RHF + the feature's Zod schema | Not a query at all |

---

## 6. Server-state entity map

Mirrors [BE `erd-spec.md`](../BE/erd-spec.md) §1 one level up — not tables, but which feature's queries read/write which BE resource.

```text
 features/locations   ──reads/writes──►  GET|POST|PATCH|DELETE /locations, /admin/locations
 features/workspaces  ──reads/writes──►  .../workspaces, .../availability
 features/amenities   ──reads/writes──►  .../amenities
 features/bookings    ──reads/writes──►  .../bookings              ★ core — see features/bookings.md
 features/payments    ──reads/writes──►  .../payments, /webhooks/paybridge (server-only, FE never calls it)
 features/users       ──reads/writes──►  /me, /admin/users
 features/settings    ──reads/writes──►  /settings/public, /admin/settings
 features/reports     ──reads only───►  /admin/reports/*                  (no mutations — see features/reports.md)
 features/auth        ──reads/writes──►  /api/auth/*                       (Better Auth, not the versioned API)
```

Every arrow corresponds to exactly one `*.api.ts` file — see [`fe-architecture.md`](./fe-architecture.md) §3. No feature calls another feature's endpoint group directly; a screen that needs both bookings and payments imports both features' hooks from their `index.ts`.

---

## 7. What is not modelled here

| Concern | Lives in |
|---|---|
| The actual TypeScript response shapes | `<feature>.types.ts`, one file per feature |
| HTTP request/response payloads per endpoint | [BE `features/*.md`](../BE/features/) — the FE types are hand-mirrored from these, per [`development-phases.md`](./development-phases.md) decision #2 |
| Error → UI mapping | [`error-handling.md`](./error-handling.md) |
| Which screens exist per feature | [`features/`](./features/) |
