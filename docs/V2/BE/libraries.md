# TerraSpace — Backend Libraries (V2)

**Constraint:** Express stays. Nothing here replaces it — everything is chosen to work *with* Express rather than around it.

**Principle:** one library per purpose. Two libraries doing the same job is a maintenance cost, not a feature. Every entry below states what it replaces, so nothing overlaps.

---

## 1. Core runtime

| Purpose | Library | Why | Why not the alternative |
|---|---|---|---|
| HTTP framework | **`express`** (v5) | v5 is stable and **auto-forwards rejected promises to the error middleware** — async handlers no longer need a wrapper | v4 requires `express-async-errors` or a `catchAsync()` wrapper on every route. NestJS/Fastify/Hono would replace Express, which is out of scope |
| Language | **JavaScript** (ESM, Node 20+) | `"type": "module"` in `package.json`. No compiler, no build step | — |
| Dev runner | **`node --watch`** | Built into Node 20+ | `nodemon` is an extra dependency for what the runtime already does |
| Build | **None** | Node runs the source directly — nothing to transpile or bundle | `tsup`/`esbuild` would exist only to undo a compile step we do not have |
| Type checking | **`typescript`** (dev, optional) | `checkJs` type-checks `.js` via JSDoc — no `.ts` files, emits nothing. See [`linter.md`](./linter.md) §10 | Without it, Zod is the only thing verifying shapes at all |

> **Express 5 removes three dependencies.** `body-parser` is built in (`express.json()`), async errors are handled natively, and path-matching is stricter by default. Do not install `express-async-errors`.

```bash
npm i express
npm i -D typescript          # optional — checkJs only, never emits
```

> **No build pipeline is a real simplification.** `node --watch src/server.js` in development, `node src/server.js` in production. What runs in production is byte-for-byte what is in the repository, so a stack trace line number is the line you edit.

---

## 2. Authentication — Better Auth

| Package | Purpose |
|---|---|
| **`better-auth`** | Sessions, credential handling, email verification, password reset |
| `better-auth/plugins` → **`admin()`** | `users.role`, `banned`, impersonation — matches the V2 ERD |
| `@better-auth/cli` (dev) | Generates the Prisma models for `users` / `sessions` / `accounts` / `verifications` |

> **Web-only scope.** Sessions are carried by `httpOnly` cookies. The `bearer()` plugin is **not** installed — it exists for native clients that cannot rely on cookies, and TerraSpace has no native client. Add it only if a mobile app is approved later.

### 2.1 Google sign-in

**No additional library.** Google is a built-in social provider in Better Auth — configuration only:

```js
export const auth = betterAuth({
  emailAndPassword: { enabled: true, requireEmailVerification: true },

  socialProviders: {
    google: {
      clientId:     env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],   // ← read §2.2 before enabling
    },
  },

  plugins: [admin({ defaultRole: "customer", adminRoles: ["admin"] })],
});
```

**Zero schema change.** A Google sign-in inserts one row into `accounts` with `provider_id = 'google'`, `password = NULL`, and the OAuth token columns populated. This is exactly what the V2 ERD was shaped for — the credential password lives on `accounts`, not `users`, so a second login method is a row, not a migration.

What Google fills in automatically:

| Column | From Google |
|---|---|
| `users.name` | profile name |
| `users.image` | avatar URL |
| `users.email_verified` | `true` — Google has already verified it |
| `users.role` | `'customer'` via the admin plugin's `defaultRole` |

**Setup:** register the redirect URI `{BASE_URL}/api/auth/callback/google` in the Google Cloud Console, and add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to `shared/config/env.js` so a missing credential fails at boot.

### 2.2 Account linking — a security decision, not a toggle

If someone signs up with `ana@example.com` + password, then later signs in with Google using the same address, does that become **one account or two**?

| Setting | Behaviour | Risk |
|---|---|---|
| Linking disabled | Two separate users, same email — bookings split across both | Confusing, and `users.email` is `UNIQUE`, so the second sign-in **fails** |
| `trustedProviders: ["google"]` | Linked into one account | Safe **only** because Google verifies the email it returns |
| Trusting an unverified provider | Linked into one account | **Account takeover** — anyone who can assert that email owns the account |

Google is safe to trust for this. Never add a provider to `trustedProviders` unless it verifies email addresses.

**What Better Auth replaces — do not install these:**

| Library | Why not |
|---|---|
| `passport` + strategies | Better Auth covers credentials, OAuth, and sessions in one configured instance |
| `bcrypt` / `argon2` | Hashing is internal to Better Auth (scrypt); hashing yourself would corrupt `accounts.password` |
| `jsonwebtoken` | Sessions are database-backed rows, not JWTs |
| `express-session` / `connect-pg-simple` | Better Auth owns the `sessions` table |

```bash
npm i better-auth
npm i -D @better-auth/cli
```

---

## 3. Database

| Purpose | Library | Why | Why not |
|---|---|---|---|
| ORM | **`prisma`** / **`@prisma/client`** | Already the project's ORM; type-safe, first-class Better Auth adapter, migration history | Drizzle/TypeORM/Sequelize would mean rewriting the schema for no gain |
| Seeding | **`@faker-js/faker`** (dev) | Realistic catalog/booking seed data for dev and tests | Hand-written fixtures rot |

> **Raw SQL is required** for parts of the V2 ERD Prisma cannot express — the `booking_period` generated column and the `bookings_no_overlap` exclusion constraint. Use `prisma migrate dev --create-only` and hand-edit the SQL. No extra library needed; do **not** add Knex just for this.

```bash
npm i @prisma/client
npm i -D prisma @faker-js/faker
```

---

## 4. Dependency injection — Awilix

| Purpose | Library | Why |
|---|---|---|
| DI container | **`awilix`** | Wires controller → service → repository automatically, and gives **per-request scopes** — the cleanest solution to transaction threading |

### Why Awilix specifically

Awilix is not in the same category as the decorator-based containers:

| | Awilix | InversifyJS / tsyringe |
|---|---|---|
| Decorators | **None** | Required |
| `reflect-metadata` | **Not needed** | Required |
| Build step | **None** | Decorators need a compiler — **impossible in plain JavaScript** |
| Registration | Plain functions | Decorated classes + symbols |
| Request scoping | **First-class** | Bolted on |

> **This is decisive here, not a preference.** InversifyJS and tsyringe are built on decorators and `reflect-metadata`, both of which require a TypeScript (or Babel) compile step. With no build pipeline they are not an option at all. Awilix is the only one of the three that works in plain JavaScript.

Classes stay plain JavaScript with ordinary constructor parameters. Nothing in a service or repository imports Awilix — the container is confined to the composition root, so the code remains testable and portable without it.

### Registration lives with the feature

Each feature exports its own registration function, so adding a feature still touches only its own folder plus one mount point:

```js
// features/bookings/index.js
import { asClass } from "awilix";

/** @param {import("awilix").AwilixContainer} container */
export const registerBookings = (container) =>
  container.register({
    bookingsRepository: asClass(BookingsRepository).singleton(),
    bookingsService:    asClass(BookingsService).singleton(),
    bookingsController: asClass(BookingsController).singleton(),
  });
```

```js
// shared/container.js
export const container = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({ db: asValue(prisma), logger: asValue(logger) });
registerBookings(container);
registerLocations(container);
// ...
```

Classes declare what they need by name and receive it — no manual `new BookingsService(new BookingsRepository(prisma))` chains:

```js
export class BookingsService {
  /**
   * @param {{
   *   db: import("@prisma/client").PrismaClient,
   *   bookingsRepository: import("./bookings.repository.js").BookingsRepository,
   *   workspacesService: import("../workspaces/index.js").WorkspacesService,
   *   settingsService: import("../settings/index.js").SettingsService,
   * }} deps
   */
  constructor(deps) {
    this.deps = deps;
  }
}
```

The JSDoc is optional but worth writing: it is what makes `this.deps.bookingsRepository` autocomplete in the editor, and it is the only record of what a class needs — Awilix resolves by name at runtime, so a missing registration is otherwise a runtime failure.

### The real win: request scopes and transactions

A layered design requires repositories to accept an optional `tx` argument so a service can own the transaction boundary. That threading is tedious and easy to forget — one repository call that ignores the passed `tx` silently escapes the transaction.

A request scope removes the threading entirely. Register `db` as **scoped**, and a transaction can be bound to the scope so every repository resolved within it uses the same client:

```js
// per-request scope
app.use((req, _res, next) => {
  req.scope = container.createScope();
  req.scope.register({
    requestId: asValue(req.id),
    actor:     asValue(req.user ?? null),
  });
  next();
});
```

The same mechanism carries `requestId` and the authenticated actor down to any layer that needs them, without adding parameters to every signature.

### Honest trade-off

`InjectionMode.PROXY` resolves dependencies **by name**, so a registration typo becomes a runtime error rather than a compile error. Mitigate both ways:

- `strict: true` — fails fast on unresolved or mis-scoped registrations
- **Fail fast at boot:** after registering every feature, assert that each expected name resolves. A startup crash naming the missing registration beats a `500` on one rarely-hit route
- Keep the registration name identical to the constructor-parameter name, always — that convention *is* the wiring
- With `checkJs` ([`linter.md`](./linter.md) §10), a JSDoc `@typedef` for the cradle gives editor completion on resolved names

Also: use Awilix for wiring only. **Skip `awilix-express`'s `loadControllers` auto-discovery** — filesystem magic conflicts with the explicit feature routers in `be-architecture.md` §8, and "which file handles this route?" should stay greppable.

```bash
npm i awilix
```

---

## 5. Validation & API contract

| Purpose | Library | Why |
|---|---|---|
| Schema validation | **`zod`** (v4) | Already used across the project. **With no compiler, this is the only thing verifying request and response shapes** — so validate at every boundary, not just the obvious ones |
| OpenAPI generation | **`zod-openapi`** | Derives an OpenAPI document **from the Zod schemas you already wrote** — docs cannot drift from validation |
| Docs UI | **`@scalar/express-api-reference`** | Serves the OpenAPI spec as a readable reference page |

This pairing matters more than it looks: the API is a separate deployable from the web app, so frontend work consumes it without reading backend source. Generating docs from the validation schemas means one source of truth instead of a hand-maintained spec that goes stale in a fortnight.

**Not needed:** `joi`, `yup`, `class-validator`, `express-validator` — all duplicate Zod. `swagger-jsdoc` — hand-written JSDoc annotations drift from the code.

```bash
npm i zod zod-openapi @scalar/express-api-reference
```

---

## 6. Security

| Purpose | Library | Why | Notes |
|---|---|---|---|
| Security headers | **`helmet`** | CSP, HSTS, `X-Frame-Options`, MIME sniffing — one line | — |
| CORS | **`cors`** | The web origin must be allow-listed with `credentials: true`, or the session cookie is never sent | Must match Better Auth's `trustedOrigins`. Web-only means a short, static allow-list — no wildcard, no custom schemes |
| Rate limiting | **`express-rate-limit`** | Protects `/api/auth/*` from credential stuffing and booking endpoints from abuse | Add **`rate-limit-redis`** only once running more than one instance — the default memory store is per-process |

**Not needed:** `hpp` (Express 5's query parser no longer produces the array-pollution shape it defends against), `csurf` (deprecated; Better Auth handles CSRF for its own routes and the API is token/cookie-`SameSite` protected), `xss-clean` (unmaintained — escaping belongs at render time, not on input).

```bash
npm i helmet cors express-rate-limit

```

---

## 7. Logging & observability

| Purpose | Library | Why | Why not |
|---|---|---|---|
| Logger | **`pino`** | Fastest structured JSON logger; child loggers bind `requestId` per request | `winston` is slower and its transports add config surface |
| HTTP logging | **`pino-http`** | Auto-logs method, path, status, duration, request id | `morgan` writes unstructured text — unusable in a log aggregator. `pino-http` replaces it entirely |
| Pretty dev output | **`pino-pretty`** (dev) | Human-readable logs locally, JSON in production | — |
| Error tracking | **`@sentry/node`** | The web app already has error capture (`src/lib/error-capture.ts`); the API should report to the same place | — |

> **Redaction is mandatory, not optional.** Configure pino's `redact` for `req.headers.authorization`, `req.headers.cookie`, and anything under `password`. The `accounts` table must never appear in a log line.

Pair this with the Awilix request scope (§4): register a child logger per scope so every log line in a request carries the same `requestId` automatically.

```bash
npm i pino pino-http @sentry/node
npm i -D pino-pretty
```

---

## 8. Configuration

| Purpose | Approach | Why |
|---|---|---|
| Env loading | **Node's built-in `--env-file=.env`** (Node 20.6+) | No `dotenv` dependency needed |
| Env validation | **`zod`** in `shared/config/env.js` | A missing `DATABASE_URL` or `BETTER_AUTH_SECRET` fails at boot with a clear message, not at 2am on the first request that needs it |

**Not needed:** `dotenv` (built into Node), `config`/`convict` (Zod already does this and gives types for free).

---

## 9. Email

Better Auth with `requireEmailVerification: true` **cannot function without an email sender** — verification and password reset both depend on it. This is a hard requirement, not a nice-to-have.

| Purpose | Library | Why | Why not |
|---|---|---|---|
| Delivery | **`resend`** | Simple SDK, good deliverability, generous free tier | `nodemailer` needs your own SMTP credentials and reputation management |
| Templates | **`react-email`** | JSX templates, previewable in dev — the team already writes React | String-concatenated HTML is unmaintainable |

Booking confirmations, cancellations, and guest invitations use the same sender.

```bash
npm i resend
npm i -D react-email @react-email/components
```

---

## 10. Scheduled jobs

The V2 ERD implies three recurring tasks: prune expired `sessions`, prune expired `verifications`, and transition past bookings to `completed`.

| Need | Library | When |
|---|---|---|
| Simple cron | **`node-cron`** | Now — in-process, zero infrastructure |
| Durable queue | **`pg-boss`** | Later — when jobs must survive restarts or retry (payment webhooks, email fan-out). Uses PostgreSQL, so **no Redis required** |

Jobs resolve their services from the Awilix container, so a cron task runs the same service code as an HTTP request — no duplicated logic.

**Not needed yet:** `bullmq` (requires Redis — extra infrastructure for jobs `pg-boss` can run on the database already in use).

```bash
npm i node-cron

```

---

## 11. Dates & times

| Purpose | Library | Why |
|---|---|---|
| Date logic | **`date-fns`** | Already the project's choice — keep one date library across FE and BE |
| Timezones | **`date-fns-tz`** | **Genuinely required here.** `bookings` stores `DATE` + `TIME` in venue-local time, and locations span cities. Converting a local booking time to an absolute instant needs the venue's timezone |

> Consider adding a `timezone` column (IANA, e.g. `Asia/Jakarta`) to `locations`. Without it, cancellation windows and "is this booking active now?" cannot be computed correctly once venues span more than one zone.

**Not needed:** `moment` (legacy, mutable, large), `dayjs` (would duplicate date-fns).

```bash
npm i date-fns date-fns-tz
```

---

## 12. Small utilities

| Purpose | Library | Why |
|---|---|---|
| Booking reference / access code | **`nanoid`** | Custom alphabet gives short, unambiguous codes (`TS-8F3K2A`) — exclude `0/O/1/I` so codes can be read aloud |
| QR payload | **`qrcode`** | Already used in the web app; reuse it if the API generates pass images |

**Not needed:** `uuid` (PostgreSQL `gen_random_uuid()` and Better Auth handle id generation), `lodash` (modern JS covers it), `axios` (Node 18+ has native `fetch`), `slugify` for one-off use (a five-line helper is smaller than the dependency).

```bash
npm i nanoid
```

---

## 13. Testing

| Purpose | Library | Why | Why not |
|---|---|---|---|
| Test runner | **`vitest`** | Same config style as the Vite-based web app; fast, native TS/ESM | `jest` needs `ts-jest` or Babel and a second config philosophy |
| HTTP testing | **`supertest`** | Exercises the full Express middleware chain in-process — guards, validation, error handler | — |
| Test database | **`@testcontainers/postgresql`** | Spins up a **real** PostgreSQL per run | Essential here: the no-double-booking guarantee is a database exclusion constraint. A mock or SQLite cannot prove it |

Awilix pays for itself here: a unit test builds a container, re-registers one dependency with a fake, and resolves the service under test:

```js
const c = container.createScope();
c.register({ bookingsRepository: asValue(fakeRepo) });
const service = c.resolve("bookingsService");
```

No `vi.mock()` module interception, no import-order fragility — swapping a dependency is a normal function call.

> **The one test that cannot be mocked:** concurrent inserts into `bookings` for an overlapping interval, asserting exactly one succeeds. That behaviour lives in PostgreSQL, so the test needs PostgreSQL.

```bash
npm i -D vitest supertest @testcontainers/postgresql nock
```

---

## 14. Linting & boundaries

Reuse the ESLint 9 + Prettier setup from [`../../BE/linter-libraries.md`](../../BE/linter-libraries.md), plus one backend-specific addition:

| Purpose | Library | Why |
|---|---|---|
| Feature boundary enforcement | **`eslint-plugin-boundaries`** | Machine-enforces the import rules in [`be-architecture.md`](./be-architecture.md) §7 — a feature importing another feature's repository, or `shared/` importing from `features/`, fails CI instead of relying on code review |

Without this, feature-based structure decays quietly. One rushed import, approved on a Friday, and the boundary is gone.

```bash
npm i -D eslint-plugin-boundaries
```

---

## 15. Deferred — install only when the feature is approved

| Feature | Library | Trigger |
|---|---|---|
| ~~Payments~~ | ~~`midtrans-client` / `xendit-node` / `stripe`~~ | **Not needed.** Payments go through **PayBridge**, which fronts Xendit and Midtrans behind one signed REST API. Signing uses Node's built-in `crypto` (Ed25519) — **no new dependency**. See [`features/payments.md`](./features/payments.md) |
| Image uploads | `@aws-sdk/client-s3` (S3 / Cloudflare R2) | Admin image upload built |
| File parsing | `multer` | **Probably never** — prefer presigned direct-to-storage uploads; the file then never passes through the API |
| Redis | `ioredis` + `rate-limit-redis` | More than one API instance running |
| Native mobile app | `better-auth` → `bearer()` plugin | **Only if mobile is approved.** Out of scope today — see §2 |

---

## 16. Explicitly not using

| Library | Reason |
|---|---|
| `nestjs` | A framework replacement — the constraint is to stay on Express |
| `fastify` / `hono` | Same |
| `typeorm` / `sequelize` / `drizzle` | Prisma is already the ORM |
| `joi` / `yup` / `class-validator` / `express-validator` | Zod is already the validator |
| `passport` | Better Auth is already the auth layer |
| `bcrypt` / `jsonwebtoken` / `express-session` | Owned by Better Auth |
| `inversify` / `tsyringe` | Awilix (§4) covers DI without decorators or `reflect-metadata` |
| `awilix-express` (`loadControllers`) | Filesystem route auto-discovery conflicts with explicit feature routers; use Awilix core only |
| `winston` / `morgan` | pino + pino-http cover both |
| `moment` / `dayjs` | date-fns is already the date library |
| `body-parser` / `express-async-errors` | Built into Express 5 |
| `axios` | Native `fetch` |
| `lodash` | Modern JS |
| `csurf` / `xss-clean` | Deprecated / unmaintained |
| `bullmq` | Needs Redis; `pg-boss` runs on the existing database |

---

## 17. Full install

```bash
# runtime
npm i express better-auth @prisma/client zod awilix \
      helmet cors express-rate-limit \
      pino pino-http @sentry/node \
      resend node-cron date-fns date-fns-tz nanoid \
      zod-openapi @scalar/express-api-reference

# dev
npm i -D prisma @better-auth/cli \
         vitest supertest @testcontainers/postgresql nock \
         pino-pretty @faker-js/faker \
         react-email @react-email/components \
         eslint @eslint/js globals prettier eslint-config-prettier \
         eslint-plugin-sonarjs eslint-plugin-promise eslint-plugin-n \
         eslint-plugin-boundaries eslint-plugin-import \
         knip lint-staged husky \
         typescript                # optional: checkJs (linter.md §10)
```

No `@types/*` packages — those exist to give TypeScript declarations for JavaScript libraries, and are only needed when compiling TypeScript. With `checkJs`, Prisma and Zod already ship their own types and inference follows them.

**18 runtime dependencies.** Every one maps to a requirement in the ERD or the folder architecture — none is speculative.

---

## 18. Versioning

Follow the version philosophy already set in [`../../BE/linter-libraries.md`](../../BE/linter-libraries.md) §3: stable and ecosystem-supported over newest-on-npm, never RC/beta in production, pin exact versions for fast-moving packages.

Two notes specific to the backend:

- **`express` must be v5**, not v4. Half the "not needed" list in §16 depends on v5 behaviour.
- **`better-auth` should be pinned exactly.** It is pre-2.0 and ships frequently; a minor bump can change generated schema or plugin config. Upgrade deliberately, then re-run `@better-auth/cli generate` and diff the result against the ERD.

---

## 19. Summary

| Area | Choice |
|---|---|
| Framework | Express 5 |
| Auth | Better Auth — email+password, **Google OAuth**, `admin` plugin, cookie sessions |
| ORM | Prisma |
| DI | Awilix (PROXY mode, per-request scopes) |
| Validation | Zod → also generates OpenAPI |
| Security | helmet · cors · express-rate-limit |
| Logging | pino + pino-http · Sentry |
| Email | Resend + react-email |
| Jobs | node-cron → pg-boss when durability is needed |
| Dates | date-fns + date-fns-tz |
| Testing | Vitest + Supertest + Testcontainers |
| Boundaries | eslint-plugin-boundaries |

Four choices carry the most weight:

1. **Express 5** — native async error handling removes an entire category of boilerplate and three dependencies.
2. **Awilix request scopes** — transactions, `requestId`, and the authenticated actor stop being threaded through every method signature.
3. **Zod → OpenAPI** — the web client gets API documentation that structurally cannot drift from the validation.
4. **Testcontainers** — the double-booking guarantee lives in a PostgreSQL constraint, so the test that proves it needs a real PostgreSQL.
