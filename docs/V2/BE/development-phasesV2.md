# TerraSpace V2 Backend — Development Phases

Implementation plan derived from the V2/BE specification.

**Specs:** [`erd-spec.md`](./erd-spec.md) · [`be-architecture.md`](./be-architecture.md) · [`features/`](./features/) · [`error-handling.md`](./error-handling.md) · [`libraries.md`](./libraries.md) · [`linter.md`](./linter.md) · [`testing.md`](./testing.md) · [`docker.md`](./docker.md)

---

## 0. Decisions

| # | Decision | Blocks | Status |
|---|---|---|---|
| 1 | Currency | Phase 1 | ✅ **USD** — minor-unit exponent `2`. Conversion to PayBridge is **×100, not ×1** |
| 2 | Guests in scope | Phase 5 | ✅ **Not in scope** — see below |
| 3 | `locations.timezone` | Phase 1 | ✅ **Added** — `VARCHAR(64)`, IANA, default `Asia/Kuala_Lumpur` |
| 4 | PayBridge onboarding | Phase 6 | ✅ Env keys are placeholders in `.env.example`; real values before Phase 6 |
| 5 | Staff vs admin split | Phase 2 | ✅ **Confirmed** — staff run operations; admin owns catalog, settings, users, money |

### Decided — #2, guests

**Not in scope.** `booking_guests` (additional people a booker invites onto *their* booking, not registered users, needing door access for a time window) is dropped entirely. `src/backend/api/guest-crud.ts`, the admin guests page, and the guest input on booking review are **deleted**. Phase 5 shrinks accordingly — no `features/guests/` slice is built.

### What decisions 1 and 3 changed

| Doc | Change |
|---|---|
| [`erd-spec.md`](./erd-spec.md) | `admin_settings.currency` and `bookings.currency` default `'USD'`; `locations.timezone` added |
| [`features/README.md`](./features/README.md) | Currency section — USD, exponent `2`, the ×1 trap |
| [`features/locations.md`](./features/locations.md) | `timezone` in responses and the create/update field table |
| [`features/settings.md`](./features/settings.md) | `currency: "USD"`, `currencyExponent: 2` |
| All feature docs | Money examples restated in US dollars — `$50.00`/hour, `$166.50` total |

---

## 1. Phase map

```text
 P0  Scaffold ──┬─► P1  Schema ──┬─► P2  Auth ──┬─► P3  Catalog read ──► P4  Catalog write
                │                │              │                              │
                │                │              └──────────────┐               │
                │                └──────────────────────────┐  │               │
                │                                           ▼  ▼               │
                │                                    P5  Bookings ◄────────────┘
                │                                           │
                │                                           ▼
                │                                    P6  Payments
                │                                           │
                │                                           ▼
                └──────────────────────────────────► P7  Settings & Reports
                                                            │
                                                            ▼
                                                     P8  Hardening & cutover
```

| Phase | Scope | Size | Depends on |
|---|---|:---:|---|
| **P0** | Scaffold, tooling, Docker, error handling | S | — |
| **P1** | Prisma schema, migrations, constraints, seed | M | P0 |
| **P2** | Better Auth, guards, users feature | M | P1 |
| **P3** | Catalog read — locations, workspaces, amenities | M | P1 |
| **P4** | Catalog write — admin CRUD | S | P3, P2 |
| **P5** | **Bookings — core** | **L** | P2, P3 |
| **P6** | Payments — PayBridge | L | P5 |
| **P7** | Settings & reports | M | P5, P6 |
| **P8** | Hardening, OpenAPI, cutover | M | all |

**Parallelizable:** P3 can start as soon as P1 lands, alongside P2 — they touch different features and share only `shared/`. P7's settings half can be pulled forward; its reports half cannot.

**Critical path:** P0 → P1 → P2 → P5 → P6 → P8. Everything else fits around it.

Sizes are relative, not calendar estimates — absolute duration depends on team size.

---

## Phase 0 — Scaffold

**Goal:** an empty API that boots, lints, and connects to a database.

### Build

| Area | Files |
|---|---|
| Project | `package.json` (`"type": "module"`), `.env.example`, `.gitignore` |
| Docker | `compose.yaml`, `docker/postgres/init/01-extensions.sql` ([`docker.md`](./docker.md)) |
| Config | `shared/config/env.js` — Zod-validated, fails at boot |
| Errors | `shared/errors/{app-error,http-errors,error-codes,prisma-mapper,index}.js` |
| Middleware | `shared/middleware/{error-handler,not-found,request-context,validate}.js` |
| Infra | `shared/database/client.js`, `shared/lib/logger.js`, `shared/container.js` |
| Entry | `app.js`, `server.js` (with the `SIGTERM` handler) |
| Health | `GET /health` — `200`/`503`, checks the DB with `SELECT 1` |
| Tooling | `eslint.config.js`, `.prettierrc`, `knip.json`, `jsconfig.json`, `vitest.config.js` |

### Exit criteria

- [ ] `docker compose up -d` → PostgreSQL healthy with `btree_gist` present
- [ ] `npm run dev` boots; `GET /health` returns `200`
- [ ] A deliberately thrown `NotFoundError` produces the §3 error envelope with a `requestId`
- [ ] `npm run check` passes (format, lint, types, knip) on an empty project
- [ ] Deleting `DATABASE_URL` from `.env` fails at **boot**, not on first request

> **Do the error handler in Phase 0, not later.** Every phase after this throws domain errors. Retrofitting the envelope means touching every service you have already written.

---

## Phase 1 — Schema

**Goal:** the full V2 ERD in PostgreSQL, with every constraint that carries a guarantee.

### Order matters here

1. **Run `npx @better-auth/cli generate` FIRST.** It writes the `User`, `Session`, `Account` and `Verification` models into `schema.prisma`. Hand-writing `users` and running the CLI afterwards produces a conflict you then reconcile by hand.
2. Add the domain models around them — `Location`, `Workspace`, `Amenity`, junctions, `Booking`, `AdminSettings`, and the payment tables.
3. `prisma migrate dev --create-only`, then **hand-edit the SQL** for what Prisma cannot express.

### The hand-written SQL

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD COLUMN booking_period tsrange
  GENERATED ALWAYS AS (tsrange(booking_date + start_time, booking_date + end_time, '[)')) STORED;

ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (workspace_id WITH =, booking_period WITH &&)
  WHERE (status IN ('pending', 'confirmed'));

CREATE UNIQUE INDEX payments_one_paid_per_booking
  ON payments (booking_id) WHERE status = 'paid';
```

Plus every `CHECK` from [`erd-spec.md`](./erd-spec.md) §10–§15.

### Exit criteria

- [ ] `prisma migrate deploy` runs clean on an empty database
- [ ] **The exclusion constraint is proven by an integration test** — two concurrent overlapping inserts, exactly one succeeds
- [ ] `'[)'` boundary verified: 09:00–12:00 and 12:00–14:00 both succeed
- [ ] Cancelling a booking releases the slot (the partial `WHERE` works)
- [ ] Every `CHECK` has a test that violates it
- [ ] `prisma/seed.js` produces a working dataset: 1 admin, 1 staff, 2 customers, 2 locations (each with an explicit `timezone`), ~10 workspaces, amenities, sample bookings
- [ ] `admin_settings` seeded with `currency = USD`, `tax_percent = 8.00` (Malaysia SST rate for services)

> **Prove the exclusion constraint in Phase 1, not Phase 5.** It is the single load-bearing guarantee of the whole design. If it does not behave as specified, the booking model changes — and finding that out four phases later means rewriting the booking service, not just a migration.

---

## Phase 2 — Auth

**Goal:** sign up, verify, sign in, and route guards that actually gate.

### Build

| Area | Files |
|---|---|
| Better Auth | `features/auth/auth.config.js` — admin plugin, Google, `trustedOrigins` |
| Mount | `features/auth/auth.routes.js` — **before `express.json()`** |
| Guards | `features/auth/auth.guards.js` — `requireAuth`, `requireRole` |
| Email | Resend + react-email templates; Mailpit locally |
| Users | Full `features/users/` — `/me`, admin CRUD, ban/unban |

### Exit criteria

- [ ] Sign up → verification email in Mailpit → verify → sign in → session cookie set
- [ ] Google OAuth completes and writes an `accounts` row with `providerId = 'google'`
- [ ] Account linking: password user + Google on the same verified email → **one** user
- [ ] `requireRole("admin")` returns `403` for a customer, `401` for anonymous
- [ ] Password never appears on `users` — only `accounts.password`
- [ ] **No API response or log line contains an `accounts` field**
- [ ] Sign-up does **not** grant admin, regardless of user count
- [ ] Deleting a user with bookings returns `409`; ban works instead
- [ ] Demoting the last admin is refused

### Delete on landing

`src/lib/auth-server.ts`, `src/lib/auth-guards-server.ts`, `src/lib/password-server.ts`.

> **Order trap:** if `express.json()` is mounted before the Better Auth handler, every sign-in fails with an opaque error that looks like bad credentials ([`libraries.md`](./libraries.md) §2).

---

## Phase 3 — Catalog (read)

**Goal:** the public site can browse.

### Build

`features/locations/`, `features/workspaces/`, `features/amenities/` — read paths only. Junction tables, mappers, pagination helper in `shared/`.

Endpoints: [`locations.md`](./features/locations.md) 1–2, [`workspaces.md`](./features/workspaces.md) 1–3, [`amenities.md`](./features/amenities.md) 1.

### Exit criteria

- [ ] `GET /locations` returns SQL-computed `stats` — **no per-workspace fan-out**
- [ ] Disabled workspaces still count toward `priceFrom` and totals (the `catalog.ts:106` fix)
- [ ] `GET /workspaces/:id/availability?date=` returns computed free intervals, **not raw booking rows**
- [ ] Availability leaks no booking ids, references or customer names
- [ ] Every list endpoint is paginated; none can return an unbounded set
- [ ] Money is a decimal **string** everywhere; no `Decimal` object reaches JSON

> `availability` lands here, before bookings, because Phase 5 depends on it and it is pure logic over rows — the easiest thing in the system to unit test thoroughly.

---

## Phase 4 — Catalog (write)

**Goal:** the admin console can manage the catalog.

Admin CRUD across the three features. Slug generation with the empty-result rejection, `RESTRICT` delete behaviour, `amenityIds` junction writes.

### Exit criteria

- [ ] Punctuation-only slug input is rejected with `422`, never persisted
- [ ] **Renaming a location slug keeps every workspace attached** — no cascade needed, the FK is `locationId`
- [ ] Deleting a location with workspaces → `409`
- [ ] Deleting a workspace with active bookings → `409`
- [ ] Deleting an amenity in use → `409 AMENITY_IN_USE`
- [ ] Renaming an amenity propagates everywhere immediately
- [ ] `scripts/fix-orphaned-workspaces.mjs` is **deleted** — the bug class no longer exists

---

## Phase 5 — Bookings (core)

**The critical phase.** Everything before it is groundwork.

### Build

| Slice | Responsibility |
|---|---|
| `bookings/pricing/` | duration → subtotal → tax → total; snapshots `unitPrice` + `currency` |
| `bookings/availability/` | free/busy intervals (shared with Phase 3) |
| `bookings.service.js` | rules, transaction, `23P01` → `SlotTakenError` |
| `bookings.repository.js` | Prisma, accepts an optional `tx` |
| Customer endpoints | create, list, detail, cancel |
| Staff endpoints | list, detail, create, update, calendar |
| Admin endpoint | delete |

### Exit criteria

- [ ] **`POST /bookings` accepts no amount field.** Hostile `total`/`totalAmount`/`unitPrice` in the body are ignored
- [ ] Two concurrent overlapping requests → one `201`, one `409 BOOKING_SLOT_TAKEN`
- [ ] `unitPrice` and `currency` are snapshotted; repricing a workspace does not alter existing bookings
- [ ] Cancellation window enforced on both sides of the boundary (one minute either way)
- [ ] `advanceBookingDays` enforced for customers, **waived for staff**
- [ ] `BOOKING_SLOT_TAKEN` is **never** waived, including for staff
- [ ] Cancel sets `status` + `cancelledAt`; **no `DELETE` path exists** outside the admin endpoint
- [ ] Another user's booking returns **`404`, not `403`**
- [ ] Changing a booking's time recomputes the amounts — `totalAmount` is not writable
- [ ] `bookings.workspaceName` and `locationSlug` are gone; joins replace them
- [ ] Calendar range capped at 92 days

> The two defects this phase exists to close are `bookings.ts:37` (client sets the price) and the complete absence of an availability check on create. Both are in the regression suite as REG-001 and REG-002 ([`testing.md`](./testing.md) §5).

---

## Phase 6 — Payments (PayBridge)

**Prerequisite:** onboarding from decision #4 complete — Key ID and private key in hand.

### Build

| Slice | Responsibility |
|---|---|
| `payments/paybridge.client.js` | signed requests: charges, refunds, payment-methods |
| `payments/paybridge.signer.js` | Ed25519 string-to-sign (Node `crypto`, no library) |
| `payments/paybridge.verifier.js` | webhook signature verification |
| `payments/payments.service.js` | charge creation, webhook processing, refunds |
| `shared/lib/money.js` | **minor-unit conversion** |
| Webhook route | `express.raw()` **before** `express.json()` |
| Jobs | stale-pending sweep, failed-event replay, reconciliation |

### Exit criteria

- [ ] `POST /bookings/:id/payments` returns a `checkoutUrl`; the `payments` row is written **before** the response
- [ ] USD `100.00` → `10000`; unknown currency **throws**
- [ ] Valid webhook → booking `confirmed`, payment `paid`
- [ ] **Tampered body → `401`**, nothing processed
- [ ] Replayed nonce → `200`, no state change
- [ ] Duplicate `event`+`orderId` → `200`, no double-confirm
- [ ] Unknown `orderId` → **`200`** + alert (never `4xx` — it burns the retry budget)
- [ ] **Amount mismatch → never marked paid**
- [ ] Two concurrent `payment_succeeded` deliveries → one `paid` row (partial unique index holds)
- [ ] `payment_expired` cancels the booking and releases the slot
- [ ] Refund is synchronous; partial refund sets `partially_refunded`
- [ ] Stale-pending sweep cancels abandoned checkouts after 30 minutes
- [ ] `PAYBRIDGE_PRIVATE_KEY` and `x-signature` never reach a log line

> **The webhook body must be verified before parsing.** Re-serializing changes whitespace and breaks the SHA-256 hash. This is the second place middleware order is load-bearing, and it fails looking like a credentials problem.

---

## Phase 7 — Settings & Reports

### Build

`features/settings/` (public subset + admin), `features/reports/` (overview, revenue, occupancy, payments, activity, CSV export).

### Exit criteria

- [ ] `GET /settings/public` serves `taxPercent`, `advanceBookingDays`, `cancellationWindowHours` — **`src/shared/constants.ts` no longer hardcodes them**
- [ ] `admin_settings` is seeded; the endpoint never returns `null`
- [ ] A currency with no known minor-unit exponent is **rejected** at `PUT /admin/settings`
- [ ] Every report aggregate is computed in SQL — no endpoint ships rows for the client to reduce
- [ ] Revenue counts `paymentStatus = 'paid'` only; `netRevenue` subtracts succeeded refunds
- [ ] Amounts are grouped per currency, never summed across
- [ ] Every ranged report caps its window (366 days; calendar 92)
- [ ] CSV export **streams**, is not buffered
- [ ] Report day-bucketing uses each venue's `locations.timezone`, not the server zone

> This phase replaces `adminGetAnalytics` and `adminGetClients`, which ship every booking and every profile to the browser. The correctness win is separate: `adminGetPayments` currently infers payment status from `booking.status`, so its numbers were never real.

---

## Phase 8 — Hardening & cutover

### Build

- OpenAPI generated from the Zod schemas + Scalar docs page
- `helmet`, `cors`, `express-rate-limit` — especially on `/api/auth/*`
- Sentry wired to the non-operational error path
- Cron: expired sessions, expired verifications, bookings → `completed`
- Complete the REG-001…REG-012 regression suite
- Point the web app at the API; delete `src/backend/api/*`

### Exit criteria

- [ ] OpenAPI spec covers all 61 endpoints and is generated, not hand-written
- [ ] Auth endpoints rate-limited; `forget-password` returns `200` for unknown emails
- [ ] All 12 regression tests pass
- [ ] No response matches `/password|prisma|SELECT|at .*\.js:/`
- [ ] `npm run check` clean: format, lint, types, **knip reports no dead files or unused deps**
- [ ] Coverage: services ≥ 90%
- [ ] Web app no longer imports `src/backend/api/*`; those files are deleted

---

## 2. Definition of done — every phase

Applied per phase, not deferred to P8:

| | |
|---|---|
| Lint | `npm run check` clean, zero warnings |
| Tests | Unit for services, integration for endpoints; regression when closing a known defect |
| JSDoc | On every exported service, repository and mapper function, with `@throws` ([`linter.md`](./linter.md) §11) |
| Errors | Domain errors only; no `res.status(...)` inside a feature |
| Boundaries | No cross-feature repository import; `eslint-plugin-boundaries` passes |
| Validation | Zod at the route edge; services trust their input |
| Secrets | Nothing sensitive in responses or logs |
| Docs | Any spec deviation is written back into `features/` **in the same PR** |

> The last row matters most. A spec that drifts from the code is worse than no spec — the next person trusts it and is wrong.

---

## 3. Risks

| Risk | Phase | Mitigation |
|---|---|---|
| Exclusion constraint behaves unexpectedly | P1 | **Test it in P1.** Discovering it in P5 means rewriting the booking service |
| PayBridge onboarding delays P6 | P6 | Submit during P0; build against the fake client and replayed webhooks meanwhile |
| Webhooks unreachable from localhost | P6 | Signed-replay script for daily work; tunnel only for final verification |
| Better Auth CLI conflicts with hand-written models | P1 | Run the CLI **first**, then add domain models |
| Timezone not captured on new venues | P1 | `locations.timezone` is NOT NULL with a default; seed and admin forms must set it deliberately, not rely on the default |
| Money precision bugs | P5, P6 | `Decimal` throughout; strings on the wire; minor-unit conversion unit-tested per currency |
| Frontend cutover discovers shape mismatches | P8 | Publish the OpenAPI spec at the end of each phase, not only at P8 |

---

## 4. Suggested first week

Sequence, not schedule:

1. Submit PayBridge onboarding (decision #4) — it is waiting on someone else
2. Settle decisions #1 and #3 — both are Phase 1 schema
3. Phase 0 scaffold: Docker + env + error handling + `/health`
4. Better Auth CLI generate, then the domain models
5. Write the migration, hand-add the exclusion constraint
6. **Write the concurrent-booking integration test and watch it pass**

Step 6 is the real milestone. Once the database refuses to double-book under concurrency, the hardest guarantee in the system is banked and everything after it is ordinary application code.