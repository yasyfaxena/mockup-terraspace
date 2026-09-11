# TerraSpace FE — Locations (V2)

**Feature:** `src/features/locations/` · **Consumes:** [BE `features/locations.md`](../../BE/features/locations.md) (6 endpoints) — `GET /locations`, `GET /locations/:slug`, `GET/POST /admin/locations`, `PATCH/DELETE /admin/locations/:id`

**Companion:** [`fe-architecture.md`](../fe-architecture.md) · [`features/workspaces.md`](./workspaces.md) · [`features/amenities.md`](./amenities.md)

---

## 1. Screens

| Screen | Kind | Route | Access |
|---|---|---|---|
| Locations list | Page | `locations.index.tsx` | Public |
| Location detail | Page | `locations.$slug.tsx` | Public |
| Admin locations panel | Panel | inside `admin.tsx` | Admin |

---

## 2. Components

| Component | Purpose |
|---|---|
| `location-card.tsx` | Catalog card — name, city, `priceFrom`, amenity chips |
| `location-map.tsx` | A read-only Google Maps **iframe embed** built from `latitude`/`longitude` (`maps.google.com/maps?...&output=embed` — no JS SDK, no API key), fixed height, rounded border, plus an "Open in Google Maps" overlay link — carried over from `frontend/site/location-map.tsx` unchanged |
| `admin-location-form.tsx` | Create/edit — name/slug/address/city/hours, `location-coords-field.tsx` (lat/long), `image-field.tsx`, access-radius, description, 24/7 checkbox, `amenity-multi-select.tsx` (from `features/amenities`, §7 of `fe-architecture.md`), and the `timezone` field ([BE `erd-spec.md`](../../BE/erd-spec.md) §8) as a searchable `Intl.supportedValuesOf("timeZone")` select, not a free-text input |

---

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useLocations(params)` | `GET /locations` | `locations.list(params)` |
| `useLocation(slug)` | `GET /locations/:slug` | `locations.detail(slug)` |
| `useAdminLocations(params)` | `GET /admin/locations` | `locations.list(params)` — same key space, admin view includes inactive locations |
| `useCreateLocation()` | `POST /admin/locations` | invalidates `locations.list(*)` |
| `useUpdateLocation()` | `PATCH /admin/locations/:id` | invalidates `locations.detail(slug)`, `locations.list(*)` |
| `useDeleteLocation()` | `DELETE /admin/locations/:id` | invalidates `locations.list(*)` |

`stats` (workspace counts, `priceFrom`) on the list response is SQL-computed server-side ([BE `development-phases.md`](../../BE/development-phases.md) Phase 3 exit criterion) — `location-card.tsx` renders it directly, it never re-derives a price range from a fetched workspace list.

---

## 4. Forms & validation

`locations.schema.ts` mirrors the BE's create/update field table, including `timezone` (required, IANA) and the coordinate bounds check (`latitude` −90…90, `longitude` −180…180) from [BE `erd-spec.md`](../../BE/erd-spec.md) §8 — validated client-side for fast feedback, enforced server-side regardless.

---

## 5. States & edge cases

| Case | Behavior |
|---|---|
| Slug field on create | Auto-generated from `name`, editable; punctuation-only input is rejected client-side too, matching [BE `development-phases.md`](../../BE/development-phases.md) Phase 4's `422` rule — but the server check is still the real guard |
| Renaming a slug | No workspace re-linking step in the UI — the FK is `locationId`, so nothing needs re-attaching (this is the FE-visible proof that [BE `erd-spec.md`](../../BE/erd-spec.md) §9's fix landed) |
| Deleting a location with workspaces | `409` shown as "Remove or reassign its workspaces first," not a generic error |
| Inactive location | Still resolvable at `/locations/:slug` for an admin preview link, but excluded from the public list by the API — the FE does not filter it client-side |

---

## 6. Notes

`admin-location-form.tsx` is the one place `location-coords-field.tsx` (carried over from V1) is used. **Correction — there is no geocoding lookup to carry over.** The real V1 widget is two plain number inputs plus a "look it up on Google Maps and paste it here" helper link; it does not call any geocoding API. V2 may add real geocoding later, but should not assume `src/lib/geocoding.ts` already exists or is being ported — it would be new functionality, not a migration of existing behavior.
