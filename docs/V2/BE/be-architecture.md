# TerraSpace — Backend Folder Structure (V2)

**Organization:** Feature-based (vertical slices)
**Stack:** JavaScript (ESM, Node 20+) · Express 5 · Prisma · Zod · Better Auth · Awilix

**Companion:** [`linter.md`](./linter.md) · [`testing.md`](./testing.md) · [`docker.md`](./docker.md) · [`features/`](./features/)

---

## 1. Principle

Group by **feature**, not by technical role.

```text
❌ Layer-based                    ✅ Feature-based
   src/                              src/
   ├── controllers/                  └── features/
   │   ├── booking.controller.js         ├── bookings/
   │   ├── location.controller.js        │   ├── bookings.routes.js
   │   └── workspace.controller.js       │   ├── bookings.controller.js
   ├── services/                         │   ├── bookings.service.js
   │   ├── booking.service.js            │   └── bookings.repository.js
   │   ├── location.service.js           ├── locations/
   │   └── workspace.service.js          └── workspaces/
   └── repositories/
       └── ...
```

Everything one feature needs sits in one folder. Adding a feature means adding a folder; deleting one means deleting a folder.

---

## 2. Top level

```text
src/
├── features/          all business features — one folder each
├── shared/            used by 2+ features
├── app.js             express app: middleware + feature router mounting
└── server.js          listen, graceful shutdown

tests/                 mirrors src/ — see testing.md
```

---

## 3. Feature folder anatomy

Every feature follows the same shape. Not all files are required — add them when needed.

```text
features/bookings/
├── bookings.routes.js        Express Router — paths, guards, validation
├── bookings.controller.js    req/res handling only
├── bookings.service.js       business rules, transactions
├── bookings.repository.js    Prisma queries only
├── bookings.schema.js        Zod request/response schemas
├── bookings.mapper.js        Prisma row → DTO
├── bookings.types.js         JSDoc typedefs for the feature
├── bookings.errors.js        feature-specific errors (optional)
├── bookings.container.js     Awilix registrations for this feature
└── index.js                  ← public surface of the feature
```

### The role of `index.js`

This is the rule that makes feature-based work. A feature exposes only what other features may use:

```js
// features/bookings/index.js
export { bookingsRouter } from "./bookings.routes.js";
export { bookingsService } from "./bookings.service.js";
export { registerBookings } from "./bookings.container.js";
// repository is NOT exported — it stays private to the feature
```

> **ESM needs the file extension.** `from "./bookings.routes"` throws `ERR_MODULE_NOT_FOUND` at runtime — there is no bundler to resolve it. `n/no-missing-import` ([`linter.md`](./linter.md) §7) catches this at lint time rather than on first request.

Other features import from `features/bookings`, never from `features/bookings/bookings.repository`.

---

## 4. Full tree

```text
src/
│
├── features/
│   │
│   ├── auth/                             users · sessions · accounts · verifications
│   │   ├── auth.routes.js                    mounts Better Auth handler
│   │   ├── auth.guards.js                    requireAuth, requireRole
│   │   ├── auth.config.js                    Better Auth instance
│   │   └── index.js
│   │
│   ├── users/                            profile + admin user management
│   │   ├── users.routes.js
│   │   ├── users.controller.js
│   │   ├── users.service.js
│   │   ├── users.repository.js
│   │   ├── users.schema.js
│   │   ├── users.mapper.js
│   │   ├── users.types.js
│   │   └── index.js
│   │
│   ├── locations/                        locations + location_amenities
│   │   ├── locations.routes.js
│   │   ├── locations.controller.js
│   │   ├── locations.service.js
│   │   ├── locations.repository.js
│   │   ├── locations.schema.js
│   │   ├── locations.mapper.js
│   │   ├── locations.types.js
│   │   └── index.js
│   │
│   ├── workspaces/                       workspaces + workspace_amenities
│   │   ├── workspaces.routes.js
│   │   ├── workspaces.controller.js
│   │   ├── workspaces.service.js
│   │   ├── workspaces.repository.js
│   │   ├── workspaces.schema.js
│   │   ├── workspaces.mapper.js
│   │   ├── workspaces.types.js
│   │   └── index.js
│   │
│   ├── amenities/                        amenities master catalog
│   │   ├── amenities.routes.js
│   │   ├── amenities.controller.js
│   │   ├── amenities.service.js
│   │   ├── amenities.repository.js
│   │   ├── amenities.schema.js
│   │   ├── amenities.mapper.js
│   │   ├── amenities.types.js
│   │   └── index.js
│   │
│   ├── bookings/                         ★ core feature
│   │   ├── bookings.routes.js
│   │   ├── bookings.controller.js
│   │   ├── bookings.service.js
│   │   ├── bookings.repository.js
│   │   ├── bookings.schema.js
│   │   ├── bookings.mapper.js
│   │   ├── bookings.types.js
│   │   ├── bookings.errors.js            SlotTakenError, CancellationWindowError
│   │   ├── availability/                 ← sub-feature (see §5)
│   │   │   ├── availability.service.js
│   │   │   ├── availability.repository.js
│   │   │   └── availability.types.js
│   │   ├── pricing/                      ← sub-feature
│   │   │   └── pricing.service.js            duration, subtotal, tax, total
│   │   └── index.js
│   │
│   ├── settings/                         admin_settings singleton
│   │   ├── settings.routes.js
│   │   ├── settings.controller.js
│   │   ├── settings.service.js
│   │   ├── settings.repository.js
│   │   ├── settings.schema.js
│   │   ├── settings.types.js
│   │   └── index.js
│   │
│   └── reports/                          read-only, cross-feature aggregates
│       ├── reports.routes.js
│       ├── reports.controller.js
│       ├── reports.service.js
│       ├── reports.repository.js             raw aggregate SQL
│       ├── reports.schema.js
│       ├── reports.types.js
│       └── index.js
│
├── shared/
│   │
│   ├── middleware/
│   │   ├── validate.js                   Zod body/query/params validation
│   │   ├── error-handler.js              the single error exit point
│   │   ├── request-context.js            request id + bound logger
│   │   └── not-found.js                  404 fallback
│   │
│   ├── errors/
│   │   ├── app-error.js                  base class
│   │   ├── http-errors.js                NotFound, Forbidden, Conflict, Validation
│   │   └── index.js
│   │
│   ├── database/
│   │   ├── client.js                     Prisma singleton
│   │   └── transaction.js                tx helper
│   │
│   ├── config/
│   │   └── env.js                        Zod-validated process.env
│   │
│   ├── lib/
│   │   ├── logger.js
│   │   ├── money.js                      Decimal ↔ JSON
│   │   └── reference.js                  booking reference / access code
│   │
│   ├── types/
│   │   ├── express.jsdoc.js              req.user typedef
│   │   └── pagination.js                 shared JSDoc typedefs
│   │
│   └── router.js                         assembles all feature routers
│
├── app.js
└── server.js

prisma/
├── schema.prisma
├── migrations/
└── seed.js
```

---

## 5. When to add a sub-feature

Split a folder inside a feature when a slice grows its own logic — never by file type.

```text
✅ bookings/availability/        a cohesive slice with its own rules
✅ bookings/pricing/            calculation logic, independently testable

❌ bookings/services/           re-creates layer-based structure inside a feature
❌ bookings/utils/              a bucket that becomes a dumping ground
```

Trigger: a file passes ~400 lines, or a slice grows more than one concept.

---

## 6. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Feature folder | plural, kebab-case | `bookings/`, `workspaces/` |
| File | `<feature>.<role>.js` | `bookings.service.js` |
| Sub-feature file | `<sub-feature>.<role>.js` | `availability.service.js` |
| Test | **Not in `src/`** — `tests/` mirrors this tree | See [`testing.md`](./testing.md) §2 |
| Export | named exports only | `export { bookingsService }` |
| Documentation | **JSDoc** on services, repositories, mappers | See [`linter.md`](./linter.md) §11 |

Prefixing files with the feature name keeps editor tabs and search results unambiguous — twelve open tabs named `service.js` is not navigable.

---

## 7. Import rules

```text
     shared/  ───────────────────►  features/          allowed
     features/  ──────────────►  shared/               allowed
     features/a/  ───────────►  features/b (index.js)  allowed
     features/a/  ─────X─────►  features/b/*.repository  forbidden
     shared/  ─────X──────────►  features/              forbidden
```

| Rule | Reason |
|---|---|
| A feature imports another only through its `index.js` | The barrel is the contract; internals stay swappable |
| Repositories are never exported from `index.js` | Data access stays owned by its feature |
| `shared/` never imports from `features/` | Otherwise it is not shared — it is a feature |
| Prisma is imported only inside a `*.repository.js` | Keeps queries in one layer per feature |
| `process.env` is read only in `shared/config/env.js` | Fails fast at boot; one source of truth |

Enforce with ESLint `no-restricted-imports`, so the boundaries fail in CI rather than in review.

---

## 8. Router assembly

Each feature owns its router; `shared/router.js` mounts them. Adding a feature touches exactly one shared file.

```js
// shared/router.js
import { locationsRouter } from "../features/locations";
import { bookingsRouter }  from "../features/bookings";
// ...

export const apiRouter = Router();

apiRouter.use("/locations",  locationsRouter);
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/amenities",  amenitiesRouter);
apiRouter.use("/bookings",   bookingsRouter);
apiRouter.use("/me",         usersRouter);

// admin branch — role gate applied once, at mount
apiRouter.use("/admin", requireRole("admin"), adminRouter);
```

```js
// app.js — order matters
app.use(cors({ origin: env.TRUSTED_ORIGINS, credentials: true }));
app.use(requestContext);

app.all("/api/auth/*", authHandler);   // ← BEFORE express.json()
app.use(express.json());

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);                 // ← always last
```

---

## 9. Adding a feature

```text
1  mkdir src/features/<feature>
2  create <feature>.schema.js        define the contract first
3  create <feature>.repository.js    Prisma access
4  create <feature>.service.js       business rules
5  create <feature>.controller.js    req/res
6  create <feature>.routes.js        paths + guards + validate()
7  create index.js                   export router + service + types
8  mount in shared/router.js         ← the only file outside the feature that changes
```

Deferred features from the ERD drop straight in as new folders, touching nothing existing:

```text
features/guests/
features/payments/
features/membership/
```
