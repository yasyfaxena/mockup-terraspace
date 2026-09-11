# TerraSpace — Testing (V2)

**Stack:** Vitest · Supertest · Testcontainers (PostgreSQL) · `@faker-js/faker` · nock

**Companion:** [`be-architecture.md`](./be-architecture.md) · [`linter.md`](./linter.md) · [`features/`](./features/)

---

## 1. Three suites, three jobs

| Suite           | Dependencies                   | Speed      | Answers                                             |
| --------------- | ------------------------------ | ---------- | --------------------------------------------------- |
| **Unit**        | None — repositories faked      | ~1 ms      | "Is the business rule correct?"                     |
| **Integration** | Real PostgreSQL + real Express | ~50–500 ms | "Does the whole path work, including the database?" |
| **Regression**  | Real PostgreSQL                | ~50–500 ms | "Has this specific bug come back?"                  |

Regression is separated from integration deliberately. An integration test describes _intended behaviour_; a regression test locks down _a defect that actually shipped_. Mixing them loses that history — and the reason a strange-looking assertion exists gets deleted by someone tidying up.

> **Deviation from this section, in force since Phase 1 and confirmed again in Phase 8.** In practice every `REG-XXX` check lives inside the feature integration/unit test file it's most related to, tagged `(REG-XXX)` in the `it(...)` name (or, where it's inline with the surrounding scenario, in a comment directly above it) — never in a standalone `tests/regression/` directory. The separate folder shown in §2's tree and referenced in §6's vitest config below was never built; the "separated deliberately" reasoning above still holds — the tag makes a regression test grep-discoverable (`grep -rn "REG-007" tests/`) and non-deletable-by-accident without needing its own directory. All 12 defects (REG-001 through REG-012) are tagged and covered as of Phase 8.

### What must be an integration test

Anything whose guarantee lives in PostgreSQL cannot be unit tested:

- **No double-booking** — a `gist` exclusion constraint
- **No double-charging** — a partial unique index
- `CHECK` constraints, `ON DELETE RESTRICT`, cascade behaviour

Mocking these proves the mock works.

---

## 2. Folder structure

`tests/` mirrors `src/` exactly. Given a source file, its test path is mechanical.

```text
tests/
├── unit/                                  mirrors src/ — no I/O
│   ├── features/
│   │   ├── bookings/
│   │   │   ├── bookings.service.test.js
│   │   │   ├── availability.service.test.js
│   │   │   ├── pricing.service.test.js
│   │   │   └── bookings.mapper.test.js
│   │   ├── payments/
│   │   │   ├── payments.service.test.js
│   │   │   ├── paybridge.signer.test.js        Ed25519 string-to-sign
│   │   │   ├── paybridge.verifier.test.js      webhook signature
│   │   │   └── money.test.js                   minor-unit conversion
│   │   ├── locations/   workspaces/   amenities/
│   │   ├── users/       settings/     reports/
│   └── shared/
│       ├── errors/error-handler.test.js
│       ├── middleware/validate.test.js
│       └── config/env.test.js
│
├── integration/                           real DB + real HTTP
│   ├── features/
│   │   ├── bookings/
│   │   │   ├── create-booking.test.js
│   │   │   ├── booking-overlap.test.js         ← the constraint
│   │   │   ├── cancel-booking.test.js
│   │   │   └── admin-bookings.test.js
│   │   ├── payments/
│   │   │   ├── create-charge.test.js
│   │   │   ├── webhook.test.js
│   │   │   └── refund.test.js
│   │   ├── auth/       users/      locations/
│   │   ├── workspaces/ amenities/  settings/   reports/
│   └── shared/
│       └── error-envelope.test.js              every error has the §3 shape
│
├── regression/                            one file per shipped defect
│   ├── REG-001-client-supplied-price.test.js
│   ├── REG-002-missing-availability-check.test.js
│   ├── REG-003-first-user-becomes-admin.test.js
│   ├── REG-004-empty-slug-collapse.test.js
│   ├── REG-005-slug-rename-orphans-workspaces.test.js
│   ├── REG-006-disabled-workspaces-zero-price.test.js
│   ├── REG-007-desk-vs-room-classification.test.js
│   ├── REG-008-user-delete-cascades-bookings.test.js
│   ├── REG-009-amenity-delete-dangling-labels.test.js
│   ├── REG-010-idr-minor-unit-conversion.test.js
│   ├── REG-011-webhook-duplicate-delivery.test.js
│   └── REG-012-webhook-body-reserialized.test.js
│
├── factories/                             typed builders
│   ├── user.factory.js        location.factory.js
│   ├── workspace.factory.js   booking.factory.js
│   ├── payment.factory.js     amenity.factory.js
│   └── index.js
│
├── helpers/
│   ├── app.js                 build the Express app for Supertest
│   ├── auth.js                authenticate as customer / staff / admin
│   ├── db.js                  truncate, seed, reset
│   ├── paybridge.js           fake PayBridge + test Ed25519 keypair
│   └── time.js                freeze / travel
│
└── setup/
    ├── global-setup.js        starts the PostgreSQL container ONCE
    ├── integration-setup.js   per-file DB connection + reset
    └── unit-setup.js          matchers only
```

### Naming

|             | Convention                 | Example                                 |
| ----------- | -------------------------- | --------------------------------------- |
| Unit        | `<source file>.test.js`    | `bookings.service.test.js`              |
| Integration | `<use case>.test.js`       | `create-booking.test.js`                |
| Regression  | `REG-<nnn>-<slug>.test.js` | `REG-001-client-supplied-price.test.js` |

> **This replaces the colocated `__tests__/` folders** shown in [`be-architecture.md`](./be-architecture.md) §3. A mirrored tree keeps `src/` free of test files, lets the three suites run independently with different setup costs, and makes "what covers this file?" a path transformation.

---

## 3. Unit tests

No database, no HTTP, no clock, no network. Repositories are plain fakes.

Awilix makes substitution a function call rather than module interception:

```js
// tests/unit/features/bookings/bookings.service.test.js
import { asValue } from "awilix";
import { container } from "@/shared/container";
import { buildWorkspace, buildSettings } from "@tests/factories";

function makeService(overrides = {}) {
  const scope = container.createScope();
  scope.register({
    bookingsRepository: asValue({
      create: vi.fn(),
      findOverlapping: vi.fn().mockResolvedValue([]),
    }),
    workspacesService: asValue({ getBookable: vi.fn().mockResolvedValue(buildWorkspace()) }),
    settingsService: asValue({
      get: vi.fn().mockResolvedValue(buildSettings({ taxPercent: "11.00" })),
    }),
    ...overrides,
  });
  return scope.resolve("bookingsService");
}

describe("bookingsService.create", () => {
  it("computes the total from the workspace price, ignoring any client value", async () => {
    const service = makeService();
    const result = await service.create(
      { workspaceId: "ws-1", bookingDate: "2026-09-15", startTime: "09:00", endTime: "12:00" },
      { id: "usr-1", role: "customer" },
    );

    expect(result.subtotalAmount).toBe("150.00"); // 50.00 × 3h
    expect(result.taxAmount).toBe("16.50"); // 11%
    expect(result.totalAmount).toBe("166.50");
  });

  it("rejects a booking beyond advanceBookingDays", async () => {
    const service = makeService({
      settingsService: asValue({
        get: vi.fn().mockResolvedValue(buildSettings({ advanceBookingDays: 30 })),
      }),
    });
    await expect(service.create({/* 60 days out */}, actor)).rejects.toBeInstanceOf(
      AdvanceBookingExceededError,
    );
  });
});
```

**Assert on the error class, not the message.** Messages are copy and will change; the class is the contract that maps to a status code and error code.

### What belongs in unit tests

| Covered                           | Example                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| Price and duration arithmetic     | `pricing.service.test.js`                                        |
| Cancellation-window logic         | Frozen clock, boundary either side                               |
| Advance-booking / past-date rules |                                                                  |
| Free-interval computation         | `availability.service.test.js` — pure function over booking rows |
| Minor-unit conversion             | **IDR exponent 0 vs USD exponent 2**                             |
| Ed25519 string-to-sign            | Exact byte layout, no network                                    |
| Mapper output                     | Decimal → string; secrets stripped                               |
| Error → status mapping            | `error-handler.test.js`                                          |

---

## 4. Integration tests

Real PostgreSQL, real Express app, real middleware chain.

```js
// tests/integration/features/bookings/create-booking.test.js
import request from "supertest";
import { buildApp } from "@tests/helpers/app";
import { asCustomer } from "@tests/helpers/auth";
import { seedWorkspace } from "@tests/factories";

describe("POST /api/v1/bookings", () => {
  it("creates a booking and returns a server-computed total", async () => {
    const workspace = await seedWorkspace({ pricePerHour: "50.00" });
    const agent = await asCustomer();

    const res = await request(buildApp())
      .post("/api/v1/bookings")
      .set("Cookie", agent.cookie)
      .send({
        workspaceId: workspace.id,
        bookingDate: "2026-09-15",
        startTime: "09:00",
        endTime: "12:00",
        paymentMethod: "card",
      });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe("166.50");
    expect(res.body.reference).toMatch(/^TS-[A-Z0-9]{6}$/);
  });

  it("returns 404, not 403, for another user's booking", async () => {
    const booking = await seedBooking({ userId: "usr-other" });
    const agent = await asCustomer();

    const res = await request(buildApp())
      .get(`/api/v1/bookings/${booking.reference}`)
      .set("Cookie", agent.cookie);

    expect(res.status).toBe(404); // 403 would confirm the reference exists
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
```

### The test that cannot be faked

```js
// tests/integration/features/bookings/booking-overlap.test.js
it("allows exactly one of two concurrent overlapping bookings", async () => {
  const workspace = await seedWorkspace();
  const payload = { workspaceId: workspace.id, bookingDate: "2026-09-15",
                    startTime: "09:00", endTime: "12:00", paymentMethod: "card" };

  // genuinely concurrent — separate connections, one flush
  const [first, second] = await Promise.all([
    request(buildApp()).post("/api/v1/bookings").set("Cookie", userA.cookie).send(payload),
    request(buildApp()).post("/api/v1/bookings").set("Cookie", userB.cookie).send(payload),
  ]);

  const statuses = [first.status, second.status].sort();
  expect(statuses).toEqual([201, 409]);

  const loser = [first, second].find((r) => r.status === 409);
  expect(loser!.body.error.code).toBe("BOOKING_SLOT_TAKEN");

  expect(await countBookings({ workspaceId: workspace.id, status: "confirmed" })).toBe(1);
});

it.each([
  ["09:00", "12:00", 409],   // identical
  ["10:00", "11:00", 409],   // contained
  ["08:00", "10:00", 409],   // overlaps start
  ["11:00", "13:00", 409],   // overlaps end
  ["12:00", "14:00", 201],   // starts exactly at end — '[)' bound, no clash
  ["07:00", "09:00", 201],   // ends exactly at start
])("%s–%s against an existing 09:00–12:00 → %i", async (start, end, expected) => { /* … */ });
```

The two `201` cases are the point of the half-open `'[)'` bound. An off-by-one there silently blocks back-to-back bookings — revenue lost with no error anywhere.

### Faking PayBridge

Never call the real API from tests. Generate a throwaway Ed25519 keypair and serve fake responses:

```js
// tests/helpers/paybridge.js
export const testKeys = generateKeyPairSync("ed25519");

export function mockCharge(overrides = {}) {
  return nock(env.PAYBRIDGE_BASE_URL)
    .post("/charges")
    .reply(201, { data: { id: "sess_1", orderId: "TSPC-1-3-abc",
                          checkoutUrl: "https://pay.test/checkout/sess_1", ...overrides } });
}

/** Sign a webhook exactly as PayBridge would, so verification is exercised for real. */
export function signWebhook(rawBody: string, path = "/webhooks/paybridge") {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const expiry = "300000";
  const hash = createHash("sha256").update(rawBody).digest("hex");
  const signed = [timestamp, nonce, "POST", path, hash, expiry].join("\n");
  return {
    "x-key-id": "test-platform-key",
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-request-expiry": expiry,
    "x-signature": sign(null, Buffer.from(signed), testKeys.privateKey).toString("hex"),
  };
}
```

Webhook tests must cover: valid signature, **tampered body**, wrong key, replayed nonce, duplicate `event`+`orderId`, unknown `orderId`, and **amount mismatch**.

---

## 5. Regression tests

One file per defect that reached the codebase. Each begins with a header stating what broke — so nobody deletes a strange-looking assertion later.

```js
/**
 * REG-001 — Client-supplied price
 *
 * Was: `POST /bookings` accepted `total` from the request body and wrote it
 *      unchecked (src/backend/api/bookings.ts:37,69). Any workspace could be
 *      booked for 0.
 * Fix: the amount is computed server-side; no amount field is accepted.
 */
it("ignores a client-supplied total and charges the catalog price", async () => {
  const workspace = await seedWorkspace({ pricePerHour: "50.00" });

  const res = await request(buildApp())
    .post("/api/v1/bookings")
    .set("Cookie", agent.cookie)
    .send({
      workspaceId: workspace.id,
      bookingDate: "2026-09-15",
      startTime: "09:00",
      endTime: "12:00",
      paymentMethod: "card",
      total: 0,
      totalAmount: "0.00",
      unitPrice: "0.00",
    }); // hostile

  expect(res.status).toBe(201);
  expect(res.body.totalAmount).toBe("166.50");
});
```

### The catalog

Each derives from a real defect found in `src/backend/api/` or `prisma/schema.prisma`.

| ID          | Defect                                                     | Asserts                                                                       |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **REG-001** | Client-supplied `total` written unchecked                  | Hostile amount fields are ignored                                             |
| **REG-002** | `createBooking` never checked availability                 | Two overlapping bookings cannot both succeed                                  |
| **REG-003** | First registered user became `admin`                       | The first sign-up is `customer`                                               |
| **REG-004** | Slug collapsed to `""` for punctuation-only input          | Rejected with `422`, never persisted                                          |
| **REG-005** | Renaming a location slug orphaned its workspaces           | Rename keeps every workspace attached (FK is `locationId`)                    |
| **REG-006** | Disabled workspaces made a location show `$0.00`           | `priceFrom` and counts reflect the full catalog                               |
| **REG-007** | Desk/room split inferred from `"desk"` in a free-text type | Classification follows the enum, not string matching                          |
| **REG-008** | Deleting a user cascade-deleted their bookings             | Delete returns `409`; bookings survive                                        |
| **REG-009** | Deleting an amenity left dangling labels                   | Delete returns `409 AMENITY_IN_USE`                                           |
| **REG-010** | Minor-unit conversion                                      | IDR `100000.00` → `100000`; USD `166.50` → `16650`                            |
| **REG-011** | Duplicate webhook delivery                                 | Second delivery is a no-op; booking confirmed once, one `payments` row `paid` |
| **REG-012** | Webhook body re-serialized before verification             | Signature verifies against raw bytes; whitespace-altered body → `401`         |

A regression test is **never deleted** when the code it guards is refactored. If it fails after a refactor, either the bug is back or the behaviour changed deliberately — and that decision deserves a conversation, not an edit to the test.

---

## 6. Database strategy

### One container per run

```js
// tests/setup/global-setup.js
export async function setup() {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync("npx prisma migrate deploy", { env: process.env }); // real migrations
  return async () => container.stop();
}
```

Running the **real migrations** rather than `db push` means the `btree_gist` extension, the generated `booking_period` column, the exclusion constraint and every `CHECK` are exactly what production has. A schema pushed from `schema.prisma` alone would have none of them, and the most important tests would silently pass against a weaker schema.

### Truncate between tests, do not wrap in a transaction

```js
// tests/helpers/db.js
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE payment_events, refunds, payments, bookings,
             workspace_amenities, location_amenities, workspaces, locations,
             amenities, sessions, accounts, verifications, users
    RESTART IDENTITY CASCADE
  `);
  await seedAdminSettings();
}
```

> **Why not the faster transaction-rollback trick?** Booking creation runs inside `prisma.$transaction`, and Prisma does not support nested transactions — a test-owned outer transaction breaks the code under test. Truncate is slower but correct. Never optimize a test harness into disagreeing with production behaviour.

`admin_settings` is re-seeded every time because it is a singleton the booking path depends on.

### Isolation

Integration files run **single-threaded** (`fileParallelism: false`) — they share one database. Unit tests run fully parallel; they touch nothing.

---

## 7. Factories

Builders with sensible defaults; every test overrides only what it is about.

```js
// tests/factories/booking.factory.js
import { BOOKING_STATUS } from "@/shared/constants/booking.js";

/** @param {Partial<import("@prisma/client").Booking>} [overrides] */
export function buildBooking(overrides = {}) {
  return {
    id: randomUUID(),
    bookingDate: "2026-09-15",
    startTime: "09:00",
    endTime: "12:00",
    unitPrice: "50.00",
    status: BOOKING_STATUS.confirmed,
    ...overrides,
  };
}

/** Persists, creating a workspace + location when not supplied. */
export async function seedBooking(overrides = {}) {
  /* … */
}
```

Prisma generates its own types, so a single JSDoc `@param` gives editor completion on `overrides` without any TypeScript syntax ([`linter.md`](./linter.md) §10).

`build*` returns an object; `seed*` writes it. Keeping them distinct stops unit tests from silently acquiring a database dependency.

Faker is seeded (`faker.seed(1234)`) so failures reproduce. Unseeded random data produces tests that fail once a month and never again.

---

## 8. Time

Deadline logic is untestable against a real clock.

```js
it("refuses cancellation inside the window", async () => {
  vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));   // 9h before a 09:00 booking
  const res = await request(buildApp()).patch(`/api/v1/bookings/${id}/cancel`)…;
  expect(res.body.error.code).toBe("BOOKING_CANCELLATION_WINDOW_CLOSED");
});
```

Test **both sides of every boundary** — one minute inside and one minute outside `cancellationWindowHours`, and the same for `advanceBookingDays` and the 30-minute minimum. Off-by-one on a boundary is the defect this catches.

---

## 9. Vitest configuration

```js
// vitest.config.js
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.js"],
          environment: "node",
          setupFiles: ["tests/setup/unit-setup.js"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.js", "tests/regression/**/*.test.js"],
          globalSetup: ["tests/setup/global-setup.js"],
          setupFiles: ["tests/setup/integration-setup.js"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000, // first run pulls the postgres image
        },
      },
    ],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
  resolve: { alias: { "@": "/src", "@tests": "/tests" } },
});
```

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:watch": "vitest --project unit",
    "test:coverage": "vitest run --coverage",
  },
}
```

`test:watch` runs **unit only** — a watch loop that starts a container is not a watch loop.

---

## 10. Coverage

Targets by layer, not one global number.

| Layer                                | Target          | Rationale                                              |
| ------------------------------------ | --------------- | ------------------------------------------------------ |
| `*.service.js`                       | **90%**         | Where the business rules live                          |
| `*.mapper.js`                        | 90%             | Cheap to test, and where secrets leak                  |
| `shared/errors`, `shared/middleware` | 90%             | Every request passes through                           |
| `*.controller.js`                    | 70%             | Thin by design                                         |
| `*.repository.js`                    | Via integration | Direct unit tests would only assert Prisma call shapes |
| `*.routes.js`                        | Via integration |                                                        |

A global gate of 80% is fine as a floor. Chasing 100% produces tests written to touch lines rather than to assert behaviour.

**Uncovered branches in a service are the ones to look at** — they are usually unhandled error paths.

---

## 11. What not to do

| Anti-pattern                                 | Instead                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| Mocking Prisma to test a repository          | Integration test against the real database                 |
| Asserting on error **messages**              | Assert the error class or `error.code`                     |
| One test asserting eight things              | One behaviour per test; the name states it                 |
| Sequential `await` for a concurrency test    | `Promise.all` — sequential calls prove nothing about races |
| `db push` in test setup                      | `migrate deploy` — constraints must match production       |
| Shared mutable state between tests           | `resetDb()` in `beforeEach`                                |
| Deleting a regression test during a refactor | Investigate the failure; the bug may be back               |
| Unseeded `faker`                             | `faker.seed()` — failures must reproduce                   |

---

## 12. CI

```bash
npm run check          # format, lint, types, knip  — fails in seconds
npm run test:unit      # ~5s,  no container
npm run test:integration   # ~2m, starts PostgreSQL
```

Unit tests run on every push. Integration runs on pull requests and on `main` — it needs Docker.

**Required to merge:** unit + integration + regression all green. Regression is never marked optional; a failure there means a defect that already cost the business once has returned.
