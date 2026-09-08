# TerraSpace — API Endpoints (V2)

One document per feature. Each lists every endpoint with its full request and response payload.

| Feature | Doc | Endpoints |
|---|---|---:|
| Auth | [`auth.md`](./auth.md) | 9 |
| Users | [`users.md`](./users.md) | 8 |
| Locations | [`locations.md`](./locations.md) | 6 |
| Workspaces | [`workspaces.md`](./workspaces.md) | 7 |
| Amenities | [`amenities.md`](./amenities.md) | 5 |
| Bookings | [`bookings.md`](./bookings.md) | 10 |
| **Payments** | [`payments.md`](./payments.md) | 7 |
| Settings | [`settings.md`](./settings.md) | 3 |
| Reports | [`reports.md`](./reports.md) | 6 |
| | | **61** |

**Related:** [`erd-spec.md`](../erd-spec.md) · [`be-architecture.md`](../be-architecture.md) · [`error-handling.md`](../error-handling.md) · [`libraries.md`](../libraries.md)

---

## 1. Conventions

| | |
|---|---|
| Base URL | `/api/v1` — except Better Auth, which owns `/api/auth/*` unversioned |
| Casing | **`camelCase`** in every request and response body |
| Content type | `application/json` |
| Auth | `httpOnly` session cookie (web-only — see [`libraries.md`](../libraries.md) §2) |
| Dates | `YYYY-MM-DD` |
| Times | `HH:mm` (24h) |
| Timestamps | ISO 8601 UTC — `2026-09-07T04:12:00.000Z` |
| Money | **String decimal** — `"150000.00"` |
| IDs | `users` → Better Auth string · everything else → UUID |

### Currency — IDR

The platform currency is **`IDR`**, and its **minor-unit exponent is `0`** — the rupiah *is* the smallest unit.

| | |
|---|---|
| Storage | `NUMERIC(14,2)` — two decimal places kept for arithmetic safety, always `.00` in practice |
| On the wire | Decimal string — `"166500.00"` |
| To PayBridge | Integer minor units — `166500` (**×1**, not ×100) |
| Display | `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })` |

> **The ×100 reflex is wrong here.** Most currencies have two decimal places, so "convert to minor units" usually means multiplying by 100. For IDR that overcharges by a factor of 100. The conversion is driven by a per-currency exponent table, which **throws** on an unknown currency rather than guessing ([`payments.md`](./payments.md) §3).

### Why money is a string

`NUMERIC` maps to Prisma `Decimal`. Serializing it as a JSON number reintroduces float error on the client (`0.1 + 0.2`), and the current implementation's `BigInt` requires manual conversion at every boundary. A string is exact, and the client formats it with `Intl.NumberFormat`.

### Why camelCase everywhere

The current implementation is inconsistent — `mapWorkspace()` returns `camelCase` while `bookings.ts` returns `snake_case`, and some payloads mix both in one object (`adminGetPaymentsDetailed` returns `total_amount` beside a nested `profiles.full_name`). V2 standardizes on `camelCase`, matching the Prisma client the repositories already return.

---

## 2. Pagination

Every list endpoint that can grow unbounded is paginated. **No endpoint returns an unbounded collection.**

**Query:** `?page=1&limit=20` — `limit` max `100`, default `20`.

```json
{
  "data": [ /* … */ ],
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

Endpoints returning a bounded set (locations, amenities, settings) return a bare array with no `meta`.

---

## 3. Error responses

Per [`error-handling.md`](../error-handling.md) §3:

```json
{
  "error": {
    "code": "BOOKING_SLOT_TAKEN",
    "message": "This time slot was just booked.",
    "requestId": "01JBXQ7H2K4M8N",
    "details": null
  }
}
```

Errors common to every endpoint, omitted from the per-endpoint tables:

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Protected endpoint, no valid session |
| 403 | `FORBIDDEN` | Authenticated, wrong role |
| 422 | `VALIDATION_FAILED` | Zod rejected the payload |
| 429 | `RATE_LIMITED` | Rate limiter tripped |
| 500 | `INTERNAL_ERROR` | Unmapped failure |

---

## 4. Access levels

| Level | Meaning |
|---|---|
| **Public** | No session required |
| **Customer** | Any authenticated user |
| **Staff** | `role` in (`staff`, `admin`) |
| **Admin** | `role` = `admin` only |

> **Change from current behaviour.** Today `requireAdmin()` accepts both `admin` and `staff` for *every* admin endpoint — there is no separation. V2 splits them: staff handle day-to-day operations (bookings, customers), while catalog, settings, users and reports are admin-only. Destructive and financial actions must not be available to every staff account.

---

## 5. Complete endpoint map

### Public

| Method | Path | Doc |
|---|---|---|
| `GET` | `/locations` | [locations](./locations.md) |
| `GET` | `/locations/:slug` | [locations](./locations.md) |
| `GET` | `/workspaces` | [workspaces](./workspaces.md) |
| `GET` | `/workspaces/:id` | [workspaces](./workspaces.md) |
| `GET` | `/workspaces/:id/availability` | [workspaces](./workspaces.md) |
| `GET` | `/amenities` | [amenities](./amenities.md) |
| `GET` | `/settings/public` | [settings](./settings.md) |
| `GET` | `/payment-methods` | [payments](./payments.md) |
| `POST` | `/webhooks/paybridge` | [payments](./payments.md) — signature-verified, not public in practice |

### Customer

| Method | Path | Doc |
|---|---|---|
| `GET` | `/me` | [users](./users.md) |
| `PATCH` | `/me` | [users](./users.md) |
| `POST` | `/bookings` | [bookings](./bookings.md) |
| `GET` | `/bookings` | [bookings](./bookings.md) |
| `GET` | `/bookings/:reference` | [bookings](./bookings.md) |
| `PATCH` | `/bookings/:id/cancel` | [bookings](./bookings.md) |
| `POST` | `/bookings/:id/payments` | [payments](./payments.md) |
| `GET` | `/bookings/:reference/payment` | [payments](./payments.md) |

### Staff

| Method | Path | Doc |
|---|---|---|
| `GET` | `/admin/bookings` | [bookings](./bookings.md) |
| `GET` | `/admin/bookings/:id` | [bookings](./bookings.md) |
| `POST` | `/admin/bookings` | [bookings](./bookings.md) |
| `PATCH` | `/admin/bookings/:id` | [bookings](./bookings.md) |
| `GET` | `/admin/bookings/calendar` | [bookings](./bookings.md) |
| `GET` | `/admin/reports/overview` | [reports](./reports.md) |
| `GET` | `/admin/activity` | [reports](./reports.md) |

### Admin

| Method | Path | Doc |
|---|---|---|
| `DELETE` | `/admin/bookings/:id` | [bookings](./bookings.md) |
| `GET` `POST` | `/admin/locations` | [locations](./locations.md) |
| `PATCH` `DELETE` | `/admin/locations/:id` | [locations](./locations.md) |
| `GET` `POST` | `/admin/workspaces` | [workspaces](./workspaces.md) |
| `PATCH` `DELETE` | `/admin/workspaces/:id` | [workspaces](./workspaces.md) |
| `GET` `POST` | `/admin/amenities` | [amenities](./amenities.md) |
| `PATCH` `DELETE` | `/admin/amenities/:id` | [amenities](./amenities.md) |
| `GET` `POST` | `/admin/users` | [users](./users.md) |
| `GET` `PATCH` `DELETE` | `/admin/users/:id` | [users](./users.md) |
| `POST` | `/admin/users/:id/ban` · `/unban` | [users](./users.md) |
| `GET` `PUT` | `/admin/settings` | [settings](./settings.md) |
| `GET` | `/admin/reports/revenue` | [reports](./reports.md) |
| `GET` | `/admin/reports/occupancy` | [reports](./reports.md) |
| `GET` | `/admin/payments` · `/admin/payments/:id` | [payments](./payments.md) |
| `POST` | `/admin/payments/:id/refund` | [payments](./payments.md) |
| `GET` | `/admin/reports/payments` | [reports](./reports.md) |

---

## 6. Migration from the current server functions

All 40 existing `createServerFn` handlers in `src/backend/api/`, mapped to their V2 endpoint.

| Current function | V2 endpoint | Note |
|---|---|---|
| `getCurrentUser` | `GET /api/auth/get-session` | Better Auth |
| `signInServer` | `POST /api/auth/sign-in/email` | Better Auth |
| `signUpServer` | `POST /api/auth/sign-up/email` | Better Auth. **Drops the first-user-becomes-admin rule** |
| `signOutServer` | `POST /api/auth/sign-out` | Better Auth |
| `getPublicCatalog` | `GET /locations` + `/workspaces` + `/amenities` | **Split.** One call returning the entire catalog is replaced by three filterable, paginated endpoints |
| `adminGetCatalog` | `GET /admin/locations` + `/workspaces` + `/amenities` | Split |
| `adminCreateLocation` | `POST /admin/locations` | |
| `adminUpdateLocation` | `PATCH /admin/locations/:id` | Slug-rename cascade no longer needed — FK is `locationId` |
| `adminDeleteLocation` | `DELETE /admin/locations/:id` | Now `409` if workspaces exist |
| `adminCreateWorkspace` | `POST /admin/workspaces` | |
| `adminUpdateWorkspace` | `PATCH /admin/workspaces/:id` | |
| `adminDeleteWorkspace` | `DELETE /admin/workspaces/:id` | |
| `adminCreateAmenity` | `POST /admin/amenities` | |
| `adminUpdateAmenity` | `PATCH /admin/amenities/:id` | |
| `adminDeleteAmenity` | `DELETE /admin/amenities/:id` | Now `409` if in use |
| `getBookingsForDate` | `GET /workspaces/:id/availability?date=` | **Was `POST` for a read.** Now `GET`, and returns free intervals rather than raw booking rows |
| `createBooking` | `POST /bookings` | **Price is now server-computed** — see below |
| `getUserBookings` | `GET /bookings` | Paginated |
| `cancelBooking` | `PATCH /bookings/:id/cancel` | |
| `adminCreateBooking` | `POST /admin/bookings` | |
| `adminUpdateBooking` | `PATCH /admin/bookings/:id` | |
| `adminDeleteBooking` | `DELETE /admin/bookings/:id` | Admin-only; prefer cancel |
| `adminGetBookings` | `GET /admin/bookings` | Paginated + filters |
| `adminGetDashboardBookings` | `GET /admin/bookings?limit=50` | **Merged** — was a duplicate |
| `adminGetCalendarBookings` | `GET /admin/bookings/calendar?from=&to=` | Date-ranged; was unbounded |
| `adminGetOverview` | `GET /admin/reports/overview?date=` | |
| `adminGetPayments` | `GET /admin/reports/payments` | **Merged** with the below |
| `adminGetPaymentsDetailed` | `GET /admin/reports/payments` | **Merged** — the two differed only in projection |
| `adminGetAnalytics` | `GET /admin/reports/revenue` + `/occupancy` | **Aggregated server-side.** Was shipping every booking row for the client to reduce |
| `adminGetNotifications` | `GET /admin/activity` | |
| `adminGetClients` | `GET /admin/users` | **Aggregated server-side.** Was shipping all profiles *and* all bookings for the client to join |
| `adminUpdateProfile` | `PATCH /admin/users/:id` | |
| `adminCreateUser` | `POST /admin/users` | Delegates to Better Auth |
| `adminDeleteUser` | `DELETE /admin/users/:id` | `409` if bookings exist — prefer ban |
| `adminGetGuests` | — | Deferred (ERD §16.1) |
| `adminCreateGuest` | — | Deferred |
| `adminUpdateGuest` | — | Deferred |
| `adminDeleteGuest` | — | Deferred |
| `adminGetSettings` | `GET /admin/settings` | |
| `adminUpdateSettings` | `PUT /admin/settings` | |

---

## 7. Defects in the current API that V2 fixes

Found while reading `src/backend/api/`. These are the reason several endpoints change shape rather than being ported as-is.

### 7.1 The client sets the price — **critical**

`bookings.ts:37` accepts `total` from the request body and writes it straight to the database:

```ts
.validator((data: { …; total: number; … }) => data)
// …
totalAmount: BigInt(data.total),
```

Nothing validates it against `workspace.price`. A crafted request books any workspace for `0`.

**V2:** `POST /bookings` does not accept an amount. The server computes `unitPrice × duration + tax` from `workspaces.pricePerHour` and `admin_settings.taxPercent`, and returns the total.

### 7.2 No availability check on create — **critical**

`createBooking` never queries existing bookings. Two users can book the same workspace, date and time, and both succeed.

**V2:** the `bookings_no_overlap` exclusion constraint (ERD §13) plus `23P01` → `BOOKING_SLOT_TAKEN`.

### 7.3 First registered user silently becomes admin

`auth-server.ts:161`:

```ts
const userCount = await db.user.count();
const role = userCount === 0 ? "admin" : "customer";
```

Convenient in a mockup; in production, whoever registers first on a fresh deploy owns the admin console.

**V2:** every sign-up is `customer` (`defaultRole` in the Better Auth admin plugin). The first admin is created by a seed script or promoted deliberately.

### 7.4 Unbounded list endpoints

`adminGetBookings`, `adminGetCalendarBookings`, `adminGetAnalytics`, `adminGetClients` and `getPublicCatalog` all return every matching row with no `take`. `adminGetAnalytics` returns every booking *and* every profile so the browser can aggregate them.

**V2:** pagination on all list endpoints; aggregation happens in SQL (see [reports](./reports.md)).

### 7.5 Three endpoints for one resource

`adminGetBookings`, `adminGetDashboardBookings` and `adminGetCalendarBookings` are the same query with different projections and sort orders. Likewise `adminGetPayments` and `adminGetPaymentsDetailed`.

**V2:** one endpoint per resource, shaped by query parameters.

### 7.6 Inconsistent response casing

`mapWorkspace()` returns `camelCase`; `bookings.ts` returns `snake_case`; `adminGetPaymentsDetailed` returns both in one object. Every client needs per-endpoint knowledge of which convention applies.

**V2:** `camelCase` everywhere.

### 7.7 A read operation using `POST`

`getBookingsForDate` is `POST` but only reads. It cannot be cached or linked.

**V2:** `GET /workspaces/:id/availability?date=`.

### 7.8 Staff and admin are not distinguished

`requireAdmin()` accepts `staff` for everything — including `adminDeleteUser`, `adminUpdateSettings` and `adminDeleteLocation`.

**V2:** see §4.
