# TerraSpace — Frontend Folder Structure (V2)

**Organization:** Feature-based (vertical slices) — same principle as the backend
**Stack:** React 19 · TypeScript · TanStack Start / Router / Query · Tailwind CSS · Radix UI · React Hook Form · Zod

**Companion:** [`development-phases.md`](./development-phases.md) · [`state-map.md`](./state-map.md) · [`error-handling.md`](./error-handling.md) · [`linter.md`](./linter.md) · [`testing.md`](./testing.md) · [`features/`](./features/) · [BE `be-architecture.md`](../BE/be-architecture.md)

---

## 1. What changes from V1

The current app (`src/frontend/`, `src/backend/`, `docs/FE/frontend-spec.md`) is **layer-based** — `frontend/admin`, `frontend/site`, `frontend/ui` split by *who sees it*, and `backend/api/*.ts` are server functions that talk to Prisma directly. That direct-to-Prisma path disappears in V2: the web app becomes an **API client** of `BE/`, nothing more.

```text
❌ V1 — layer-based, direct DB access        ✅ V2 — feature-based, API client
   src/                                          src/
   ├── frontend/                                 ├── features/
   │   ├── admin/                                │   ├── bookings/
   │   ├── site/                                 │   ├── workspaces/
   │   └── ui/                                   │   └── ...
   ├── backend/api/*.ts  → Prisma directly       ├── components/ui/   (was frontend/ui)
   └── routes/                                   ├── routes/           (unchanged — TanStack Start)
                                                  └── lib/api-client.ts → BE/ over HTTP
```

Everything one feature needs (its API calls, query hooks, forms, feature-specific components) sits in one folder — the same rule as [BE `be-architecture.md`](../BE/be-architecture.md) §1. Adding a feature means adding a folder; deleting one means deleting a folder.

**What does not move:** `src/routes/` stays exactly where it is — TanStack Start requires it at that path ([`src/routes/README.md`](../../../src/routes/README.md)). Routes get thinner, not relocated.

---

## 2. Top level

```text
src/
├── features/          all business features — one folder each, mirrors BE/src/features/
├── components/
│   ├── ui/             generic, business-agnostic primitives (was frontend/ui/)
│   └── layout/          site-shell, admin-shell, headers/footers (was frontend/{site,admin} shells)
├── routes/             TanStack Start file-based routing — thin, unchanged path
├── shared/             cross-feature constants, i18n keys, formatting helpers
├── lib/                 API client, query client, auth client, framework glue
└── assets/

tests/                  mirrors src/ — see testing.md
```

`src/backend/` is deleted at cutover (V2 FE Phase 8, matching [BE `development-phases.md`](../BE/development-phases.md) Phase 8's "delete `src/backend/api/*`").

### The admin shell, specifically

V1's `frontend/admin/admin-layout.tsx` is one file combining a fixed sidebar, a mobile drawer, and a top bar. V2 splits it — `admin-shell.tsx` (top bar + content frame) and `admin-sidebar.tsx` (nav) — but the actual navigation content carries over unchanged: five groups, in this order —

```text
Operations   Dashboard · Bookings · Calendar
Inventory    Locations · Spaces · Amenities
Customers    Members · Guests
Finance      Payments
Insights     Analytics · Notifications · Settings
```

("Members"/"Guests" map to `features/users`; "Spaces" is the nav label for the `workspaces` feature — the label a user sees does not have to match the folder name.) A notification-count badge sits on the Notifications item; V1 hardcodes this from an in-memory feed (`admin-notifications.tsx`) rather than a real query — V2's version should be a real `features/reports` (or a dedicated small feature) query.

---

## 3. Feature folder anatomy

Every feature follows the same shape. Not all files are required — add them when needed.

```text
features/bookings/
├── bookings.api.ts           typed fetch calls to BE/api/v1/bookings/*
├── bookings.queries.ts       TanStack Query hooks — useBookings, useCreateBooking, ...
├── bookings.schema.ts        Zod schemas — client-side validation, mirrors BE's bookings.schema.js
├── bookings.types.ts         z.infer<> types + view-model types
├── bookings.mapper.ts        API DTO → view model (optional — only when the UI shape differs)
├── components/               feature-specific components (BookingCard, CancelDialog, ...)
│   ├── booking-card.tsx
│   └── cancel-booking-dialog.tsx
├── availability/              ← sub-feature (see §5)
│   ├── availability.queries.ts
│   └── availability-calendar.tsx
└── index.ts                   ← public surface of the feature
```

### The role of `index.ts`

Same rule as the backend — a feature exposes only what other features or routes may use:

```ts
// features/bookings/index.ts
export { useBookings, useBooking, useCreateBooking, useCancelBooking } from "./bookings.queries";
export { BookingCard } from "./components/booking-card";
export type { BookingDto, CreateBookingInput } from "./bookings.types";
// bookings.api.ts is NOT exported — it stays private to the feature
```

Other features and routes import from `features/bookings`, never from `features/bookings/bookings.api`.

---

## 4. Full tree

```text
src/
│
├── features/
│   │
│   ├── auth/                             sign in/up, session, guards
│   │   ├── auth.client.ts                    Better Auth client instance
│   │   ├── auth.hooks.ts                     useSession, useRequireRole
│   │   ├── auth.schema.ts                    sign-in/sign-up Zod schemas
│   │   ├── components/
│   │   │   ├── sign-in-form.tsx
│   │   │   └── sign-up-form.tsx
│   │   └── index.ts
│   │
│   ├── users/                            profile + admin user management
│   │   ├── users.api.ts   users.queries.ts   users.schema.ts   users.types.ts
│   │   ├── components/
│   │   │   ├── profile-form.tsx
│   │   │   └── admin-user-table.tsx
│   │   └── index.ts
│   │
│   ├── locations/                        browse + admin CRUD
│   │   ├── locations.api.ts   locations.queries.ts   locations.schema.ts   locations.types.ts
│   │   ├── components/
│   │   │   ├── location-card.tsx
│   │   │   ├── location-map.tsx
│   │   │   └── admin-location-form.tsx
│   │   └── index.ts
│   │
│   ├── workspaces/                       browse + admin CRUD
│   │   ├── workspaces.api.ts   workspaces.queries.ts   workspaces.schema.ts   workspaces.types.ts
│   │   ├── components/
│   │   │   ├── workspace-card.tsx
│   │   │   ├── availability-badge.tsx        4 states: available/limited/full/unavailable (was frontend/site/availability-badge.tsx)
│   │   │   ├── search-module.tsx             location + date/time + type search bar (was frontend/site/search-module.tsx)
│   │   │   ├── workspace-filters.tsx
│   │   │   └── admin-workspace-form.tsx
│   │   └── index.ts
│   │
│   ├── amenities/                        admin catalog + display chips
│   │   ├── amenities.api.ts   amenities.queries.ts   amenities.schema.ts   amenities.types.ts
│   │   ├── components/
│   │   │   ├── amenity-chip.tsx
│   │   │   ├── amenity-multi-select.tsx      exported via index.ts — locations/workspaces admin forms import this, not a copy (was frontend/admin/admin-form-fields.tsx's AmenityMultiSelect)
│   │   │   └── admin-amenity-table.tsx
│   │   └── index.ts
│   │
│   ├── bookings/                         ★ core feature
│   │   ├── bookings.api.ts   bookings.queries.ts   bookings.schema.ts   bookings.types.ts
│   │   ├── components/
│   │   │   ├── booking-review-form.tsx
│   │   │   ├── booking-card.tsx
│   │   │   ├── cancel-booking-dialog.tsx
│   │   │   ├── qr-pass.tsx                    booking confirmation's access-code QR (was frontend/site/qr-pass.tsx)
│   │   │   └── admin-calendar-view.tsx        day/week/month grid, real workspace columns (was frontend/admin/admin-calendar.tsx)
│   │   ├── availability/                 ← sub-feature (see §5)
│   │   │   ├── availability.queries.ts
│   │   │   └── availability-calendar.tsx
│   │   ├── pricing/                      ← sub-feature
│   │   │   └── use-booking-price.ts          display-only mirror of BE pricing.service.js
│   │   └── index.ts
│   │
│   ├── payments/                         checkout + admin refunds
│   │   ├── payments.api.ts   payments.queries.ts   payments.types.ts
│   │   ├── components/
│   │   │   ├── payment-method-picker.tsx
│   │   │   ├── checkout-redirect.tsx         hands off to PayBridge's checkoutUrl
│   │   │   ├── payment-status-poller.tsx     polls while awaiting the webhook
│   │   │   └── admin-refund-dialog.tsx
│   │   └── index.ts
│   │
│   ├── settings/                         admin settings form + public subset
│   │   ├── settings.api.ts   settings.queries.ts   settings.schema.ts   settings.types.ts
│   │   ├── components/admin-settings-form.tsx
│   │   └── index.ts
│   │
│   └── reports/                          admin dashboards, read-only
│       ├── reports.api.ts   reports.queries.ts   reports.types.ts
│       ├── components/
│       │   ├── overview-cards.tsx            daily KPI tiles (was frontend/admin/admin-dashboard.tsx's KPI section)
│       │   ├── revenue-chart.tsx
│       │   ├── occupancy-chart.tsx
│       │   ├── payment-report.tsx
│       │   ├── activity-table.tsx             replaces frontend/admin/admin-notifications.tsx's ad hoc feed
│       │   ├── report-filters.tsx
│       │   └── csv-export-button.tsx
│       └── index.ts
│
├── components/
│   ├── ui/                               generic Radix-wrapped primitives — no business logic
│   │   ├── accordion.tsx      button.tsx      checkbox.tsx   dropdown-menu.tsx
│   │   ├── input.tsx          label.tsx       radio-group.tsx select.tsx
│   │   ├── separator.tsx      sheet.tsx       skeleton.tsx   slider.tsx
│   │   ├── sonner.tsx         textarea.tsx
│   │   └── dialog.tsx  tabs.tsx  switch.tsx  data-table.tsx   ← do not exist yet, build these (frontend-spec.md §2)
│   ├── admin-fields/                     shared CRUD-form widgets used by 3+ admin features (was frontend/admin/admin-form-fields.tsx)
│   │   ├── image-field.tsx                   upload-or-paste-URL image input
│   │   └── db-select-field.tsx               "pick existing value, or add a new one" select
│   └── layout/
│       ├── site-shell.tsx   site-header.tsx   site-footer.tsx
│       └── admin-shell.tsx  admin-sidebar.tsx
│
├── routes/                                unchanged — see src/routes/README.md
│   ├── __root.tsx
│   ├── locations.$slug.tsx                imports from features/locations
│   ├── workspaces.$id.tsx                 imports from features/workspaces
│   ├── booking.review.tsx                 imports from features/bookings
│   ├── admin_.login.tsx
│   ├── admin.dashboard.tsx  admin.bookings.tsx  admin.calendar.tsx  ...   ← one route per admin section, not one admin.tsx (frontend-spec.md §5)
│   └── ...
│
├── shared/
│   ├── constants.ts                       business defaults NOT hardcoded per feature — see CODE_STRUCTURE.md's "No magic business values" rule
│   ├── i18n.tsx                           EN + ID — unchanged from V1
│   ├── query-keys.ts                      the one place every TanStack Query key is built — see state-map.md §2
│   └── format.ts                          money (Intl.NumberFormat "id-ID"), dates (date-fns)
│
├── lib/
│   ├── api-client.ts                      fetch wrapper — base URL, credentials, error envelope parsing
│   ├── query-client.ts                    QueryClient instance + default options
│   ├── auth-client.ts                     Better Auth React client (replaces auth-server.ts / auth-guards-server.ts)
│   └── error-capture.ts                   unchanged — Sentry browser SDK
│
├── router.tsx
├── start.ts
└── server.ts

tests/
├── unit/           mirrors src/ — see testing.md
├── integration/    route + MSW-mocked API
└── e2e/            Playwright against a running BE/
```

**Why `image-field.tsx`/`db-select-field.tsx` sit in `components/admin-fields/` but `amenity-multi-select.tsx` sits inside `features/amenities/`:** the first two are generic patterns with no opinion about *what* they select (any image, any list of existing values) — business-agnostic, like `components/ui/`. `amenity-multi-select.tsx` is inherently about amenities (it fetches and renders the amenity catalog), so it belongs to the feature that owns that data and is exported through `features/amenities/index.ts` for `locations`/`workspaces` to import — same rule as any other cross-feature reuse (§7).

---

## 5. When to add a sub-feature

Same trigger as the backend ([BE `be-architecture.md`](../BE/be-architecture.md) §5) — split a folder inside a feature when a slice grows its own logic, never by file type.

```text
✅ bookings/availability/        calendar + free-interval display, independently testable
✅ bookings/pricing/            duration → subtotal → tax → total, mirrored from the BE for optimistic display

❌ bookings/components/hooks/    re-creates layer-based structure inside a feature
❌ bookings/utils/               a bucket that becomes a dumping ground
```

Trigger: a file passes ~400 lines ([`CODE_STRUCTURE.md`](../../../CODE_STRUCTURE.md)'s guideline, kept from V1), or a slice grows more than one concept.

---

## 6. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Feature folder | plural, kebab-case | `bookings/`, `workspaces/` |
| API/query/schema file | `<feature>.<role>.ts` | `bookings.queries.ts` |
| Component file | kebab-case, `.tsx` | `booking-review-form.tsx` |
| Component name | PascalCase, matches file | `BookingReviewForm` |
| Query hook | `use<Verb><Noun>` | `useBookings`, `useCreateBooking`, `useCancelBooking` |
| Test | **Not in `src/`** — `tests/` mirrors this tree | See [`testing.md`](./testing.md) §2 |
| Export | named exports only | `export { useBookings }` |

Prefixing files with the feature name keeps editor tabs and search results unambiguous — the same reasoning as [BE `be-architecture.md`](../BE/be-architecture.md) §6.

---

## 7. Import rules

```text
     shared/  ───────────────────►  features/          allowed
     lib/     ───────────────────►  features/          allowed
     features/  ──────────────►  shared/, lib/          allowed
     features/a/  ───────────►  features/b (index.ts)  allowed
     features/a/  ─────X─────►  features/b/*.api        forbidden
     routes/  ───────────────►  features/ (index.ts)    allowed — routes never import a feature's internals
     shared/, lib/  ─────X──────────►  features/         forbidden
```

| Rule | Reason |
|---|---|
| A feature imports another only through its `index.ts` | The barrel is the contract; internals stay swappable |
| `*.api.ts` is never exported from `index.ts` | Fetch calls stay owned by the feature; other features consume query hooks, not raw HTTP |
| `shared/` and `lib/` never import from `features/` | Otherwise they are not shared — they are a feature |
| A route imports a feature only through its `index.ts` | Keeps "what does this page depend on" a one-line read |
| Business constants live in `shared/constants.ts`, not scattered literals | [`CODE_STRUCTURE.md`](../../../CODE_STRUCTURE.md) — carried over from V1 |

Enforce with ESLint `eslint-plugin-boundaries` — same tool, same rationale as [BE `linter.md`](../BE/linter.md) §8, configured against `src/features/*` instead of the backend's.

---

## 8. Route wiring

TanStack Start's file-based routing means there is no central "mount every feature" file the way [BE `be-architecture.md`](../BE/be-architecture.md) §8 has `shared/router.js` — the file **is** the mount point. The rule instead is what a route file is allowed to contain:

```tsx
// routes/workspaces.$id.tsx — thin: loader + guard + render
import { createFileRoute } from "@tanstack/react-router";
import { useWorkspace } from "@/features/workspaces";
import { WorkspaceDetail } from "@/features/workspaces/components/workspace-detail";

export const Route = createFileRoute("/workspaces/$id")({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(workspaceQueryOptions(params.id)),
  component: () => {
    const { id } = Route.useParams();
    const { data: workspace } = useWorkspace(id);
    return <WorkspaceDetail workspace={workspace} />;
  },
});
```

| A route file may contain | A route file must not contain |
|---|---|
| Route definition, params, search-param schema | Fetch calls (`fetch`, `axios`, raw `api-client` usage) |
| `loader` calling a feature's query options for prefetch | Business rules (pricing, cancellation-window checks) |
| Auth/role guard (`beforeLoad` calling `features/auth`) | Zod schemas — those live in the feature |
| Rendering the feature's top-level component | Multi-component compositions better owned by the feature |

This mirrors [BE `error-handling.md`](../BE/error-handling.md) §1's "no layer except X knows about Y" — here, no route file knows how a feature fetches its data.

---

## 9. Adding a feature

```text
1  mkdir src/features/<feature>
2  create <feature>.schema.ts        define the contract first — mirror the BE Zod schema's shape
3  create <feature>.api.ts           typed fetch calls, one per BE endpoint this feature needs
4  create <feature>.queries.ts       TanStack Query hooks wrapping the api calls
5  create components/                feature UI
6  create index.ts                   export hooks + components + types
7  wire into a route                 ← the only file outside the feature that changes
```

A feature the BE ERD defers (guests, membership) is simply not built — there is nothing to scaffold in advance, unlike the backend's empty folder placeholders, because a frontend feature with no API to call has no shape yet.
