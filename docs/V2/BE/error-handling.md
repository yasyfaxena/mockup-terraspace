# TerraSpace — Error Handling (V2)

**Companion:** [`be-architecture.md`](./be-architecture.md) · [`libraries.md`](./libraries.md)

---

## 1. Principle

> **Services throw domain errors. One middleware turns them into HTTP responses.**

No layer except the error middleware knows about status codes.

```text
   Repository ──┐
   Service    ──┼── throws AppError ──► Controller: next(err) ──► errorHandler ──► HTTP
   Middleware ──┘                                                      │
                                                                       ├── logs
                                                                       └── shapes response
```

| Layer | Error responsibility |
|---|---|
| **Repository** | Lets Prisma errors bubble. Does not throw HTTP errors |
| **Service** | Throws domain errors (`SlotTakenError`, `NotFoundError`). Translates storage errors that carry business meaning |
| **Controller** | `next(err)` — nothing else. Never builds an error response |
| **Middleware** | The single place that maps error → status → JSON, and logs |

Three rules that follow:

- `res.status(500).json(...)` appears **nowhere** inside a feature.
- A service never imports `express`.
- Every error leaving the API has the same shape (§3).

---

## 2. Folder layout

```text
src/
├── shared/
│   ├── errors/
│   │   ├── app-error.js          base class
│   │   ├── http-errors.js        the 7 generic errors
│   │   ├── error-codes.js        machine-readable code catalog
│   │   ├── prisma-mapper.js      Prisma / PostgreSQL → AppError
│   │   └── index.js
│   └── middleware/
│       ├── error-handler.js      ← the single exit point
│       └── not-found.js
└── features/
    └── bookings/
        └── bookings.errors.js    feature-specific, extends the generics
```

Generic errors live in `shared/`. Errors that only one feature can throw live **with that feature** — `SlotTakenError` belongs to `bookings`, not to `shared`.

---

## 3. Response shape

Every error response, without exception:

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "This time slot was just booked.",
    "requestId": "01JBXQ7H2K4M8N",
    "details": null
  }
}
```

| Field | Purpose |
|---|---|
| `code` | **Stable machine-readable identifier.** The client switches on this |
| `message` | Human-readable English fallback. **Not for display logic** |
| `requestId` | Correlates the response with server logs — put it in support tickets |
| `details` | Field-level errors for `422`, otherwise `null` |

`details` for a validation failure:

```json
"details": [
  { "path": "startTime", "message": "Required" },
  { "path": "bookingDate", "message": "Must not be in the past" }
]
```

> **Why `code` and not `message`:** the app is bilingual (`src/lib/i18n.tsx`, EN + ID). The frontend maps `code` → localized string. If the client parses `message`, changing an English word breaks Indonesian users.

---

## 4. Base class

```js
// shared/errors/app-error.js
export class AppError extends Error {
  /** HTTP status — set by each subclass as a class field. */
  status = 500;

  /** Machine-readable code from ERROR_CODE. */
  code = "INTERNAL_ERROR";

  /** true = expected business outcome; false = a bug. */
  isOperational = true;

  /**
   * @param {string} message
   * @param {{ details?: Array<{ path: string, message: string }>, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.details = options.details;
    Error.captureStackTrace(this, new.target);
  }
}
```

> **Class-field ordering is what makes this work in plain JavaScript.** Fields initialize after `super()` returns, innermost last — so `SlotTakenError` extending `ConflictError` gets `status = 409` from the parent and then overwrites `code`. The base values above are defaults, never the final answer for a subclass.

### `isOperational` is the important field

| | Operational | Non-operational |
|---|---|---|
| Meaning | Expected outcome — slot taken, not found, forbidden | A bug — null dereference, bad config, unmapped error |
| Log level | `warn` / `info` | `error` with full stack |
| Sent to Sentry | No | **Yes** |
| Message to client | The real message | Generic "Something went wrong" |

Without this split, either your alerting drowns in "user typed a bad date", or real bugs return 200-shaped noise nobody notices.

---

## 5. Generic errors

```js
// shared/errors/error-codes.js — frozen catalog, per linter.md §5
export const ERROR_CODE = Object.freeze({
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED:   "UNAUTHENTICATED",
  FORBIDDEN:         "FORBIDDEN",
  NOT_FOUND:         "NOT_FOUND",
  CONFLICT:          "CONFLICT",
  RATE_LIMITED:      "RATE_LIMITED",
  INTERNAL_ERROR:    "INTERNAL_ERROR",
  PROVIDER_ERROR:    "PROVIDER_ERROR",
  PROVIDER_TIMEOUT:  "PROVIDER_TIMEOUT",
  // …every code in §7
});
```

```js
// shared/errors/http-errors.js
import { AppError } from "./app-error.js";
import { ERROR_CODE } from "./error-codes.js";

export class ValidationError   extends AppError { status = 422; code = ERROR_CODE.VALIDATION_FAILED; }
export class UnauthorizedError extends AppError { status = 401; code = ERROR_CODE.UNAUTHENTICATED; }
export class ForbiddenError    extends AppError { status = 403; code = ERROR_CODE.FORBIDDEN; }
export class NotFoundError     extends AppError { status = 404; code = ERROR_CODE.NOT_FOUND; }
export class ConflictError     extends AppError { status = 409; code = ERROR_CODE.CONFLICT; }
export class RateLimitError    extends AppError { status = 429; code = ERROR_CODE.RATE_LIMITED; }
export class InternalError     extends AppError {
  status = 500; code = ERROR_CODE.INTERNAL_ERROR; isOperational = false;
}

// External provider failures — ours to report, not ours to fix
export class ProviderError     extends AppError { status = 502; code = ERROR_CODE.PROVIDER_ERROR; }
export class ProviderTimeout   extends AppError { status = 504; code = ERROR_CODE.PROVIDER_TIMEOUT; }
```

Every code is a `ERROR_CODE` member, never a bare string. Without a compiler, a frozen object is the only thing that turns a typo into a detectable failure instead of a `500` with a code the client has never heard of.

### `502` / `504` are operational, but still alerted

A PayBridge outage is an expected external condition, not a bug in our code — so `isOperational` stays `true` and the client gets a real message ("payment provider unavailable, please retry"). But unlike a `409`, it needs someone woken up: **route `5xx` to Sentry regardless of `isOperational`**. The flag governs the *client message*; the status code governs *alerting*.

### 401 vs 403 — get this right

| Status | Meaning | Example |
|---|---|---|
| **401** | No valid session — *who are you?* | Cookie missing or expired |
| **403** | Valid session, insufficient rights — *I know who you are, no* | Customer calling an admin route; cancelling someone else's booking |

Returning 401 for an authorization failure makes clients log the user out unnecessarily.

---

## 6. Feature errors

Extend a generic error so the status is inherited and only the code and message change:

```js
// features/bookings/bookings.errors.js
import { ConflictError, ForbiddenError, ValidationError } from "../../shared/errors/index.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class SlotTakenError extends ConflictError {
  code = ERROR_CODE.BOOKING_SLOT_TAKEN;
  constructor() { super("This time slot was just booked."); }
}

export class CancellationWindowClosedError extends ForbiddenError {
  code = ERROR_CODE.BOOKING_CANCELLATION_WINDOW_CLOSED;
  /** @param {number} hours */
  constructor(hours) {
    super(`Bookings can only be cancelled at least ${hours} hours in advance.`);
  }
}

export class WorkspaceNotBookableError extends ConflictError {
  code = ERROR_CODE.WORKSPACE_NOT_BOOKABLE;
}

export class AdvanceBookingExceededError extends ValidationError {
  code = ERROR_CODE.BOOKING_TOO_FAR_AHEAD;
}
```

Naming: `FEATURE_CONDITION` in SCREAMING_SNAKE_CASE. Prefixing with the feature keeps the catalog readable as it grows.

---

## 7. Error code catalog

Codes are a **public contract**. Adding one is safe; renaming or removing one is a breaking change.

| Code | Status | Raised when |
|---|---|---|
| `VALIDATION_FAILED` | 422 | Zod rejects the request body/query/params |
| `UNAUTHENTICATED` | 401 | No valid session |
| `SESSION_EXPIRED` | 401 | Session existed but `expires_at` has passed |
| `FORBIDDEN` | 403 | Authenticated, insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist, or is not visible to this caller |
| `CONFLICT` | 409 | Generic state conflict |
| `RATE_LIMITED` | 429 | Rate limiter tripped |
| `INTERNAL_ERROR` | 500 | Anything unmapped |
| **`BOOKING_SLOT_TAKEN`** | 409 | Exclusion constraint rejected the insert |
| `BOOKING_TOO_FAR_AHEAD` | 422 | Beyond `admin_settings.advance_booking_days` |
| `BOOKING_IN_PAST` | 422 | `booking_date` + `start_time` already passed |
| `BOOKING_MIN_DURATION` | 422 | Shorter than 30 minutes |
| `BOOKING_CANCELLATION_WINDOW_CLOSED` | 403 | Inside `cancellation_window_hours` |
| `BOOKING_ALREADY_CANCELLED` | 409 | Cancelling a cancelled booking |
| `WORKSPACE_NOT_BOOKABLE` | 409 | `availability` is `disabled` / `maintenance` / `full` |
| `LOCATION_INACTIVE` | 409 | Booking against an inactive location |
| `AMENITY_IN_USE` | 409 | Deleting an amenity referenced by a junction row |
| `EMAIL_ALREADY_EXISTS` | 409 | Unique violation on `users.email` |
| `PAYMENT_ALREADY_PAID` | 409 | Booking already has a `paid` payment |
| `PAYMENT_ALREADY_PENDING` | 409 | A live checkout session exists — return its `checkoutUrl` |
| `PAYMENT_NOT_REFUNDABLE` | 409 | Refunding a payment that is not `paid` |
| `PAYMENT_CUSTOMER_INCOMPLETE` | 422 | User has no `phone` — PayBridge requires name, email **and** mobile |
| `REFUND_EXCEEDS_REMAINDER` | 422 | Refund above the unrefunded balance |
| `PAYMENT_PROVIDER_ERROR` | 502 | PayBridge unreachable or returned `5xx` |
| `PAYMENT_PROVIDER_TIMEOUT` | 504 | No response from PayBridge in time |

---

## 8. Mapping storage errors

Prisma and PostgreSQL errors must **never** reach the client — their messages leak table and column names.

```js
// shared/errors/prisma-mapper.js
/**
 * @param {unknown} err
 * @returns {AppError | null} null when unrecognized — the handler wraps it
 */
export function mapPrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": return new ConflictError("A record with these values already exists.");
      case "P2025": return new NotFoundError("Resource not found.");
      case "P2003": return new ConflictError("Related record is missing or still in use.");
      case "P2000": return new ValidationError("A value is too long for its field.");
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new InternalError("Invalid database query.");   // a bug, not user input
  }
  return null;   // unrecognized → InternalError in the handler
}
```

### Raw PostgreSQL codes

Reached via `err.meta?.code` on a `P2010`, or from `$queryRaw`:

| SQLSTATE | Meaning | Map to |
|---|---|---|
| `23505` | Unique violation | `ConflictError` |
| `23503` | Foreign key violation | `ConflictError` |
| `23514` | CHECK constraint violation | `ValidationError` |
| **`23P01`** | **Exclusion violation** | **`SlotTakenError`** |

### Who translates what

| Error | Translated by | Why |
|---|---|---|
| `23P01` on `bookings` | **The bookings service** | Only the service knows this means "slot taken" rather than a generic conflict |
| `P2002` on `users.email` | The users service | Only it knows this means `EMAIL_ALREADY_EXISTS` |
| Everything else | The central mapper | Generic fallback, no domain knowledge required |

```js
// features/bookings/bookings.service.js
try {
  return await this.deps.bookingsRepository.create(data);
} catch (err) {
  if (isExclusionViolation(err)) throw new SlotTakenError();   // 23P01
  throw err;
}
```

> This is the one place where a database error is a **business outcome**, not a failure. The exclusion constraint is the authority on availability (`erd-spec.md` §13); catching `23P01` is how that authority reaches the user.

---

## 9. The middleware

```js
// shared/middleware/error-handler.js
/** @type {import("express").ErrorRequestHandler} */
export const errorHandler = (err, req, res, _next) => {
  // Express has already started writing — let it abort the connection
  if (res.headersSent) return _next(err);

  const mapped =
    err instanceof AppError            ? err
    : err instanceof ZodError          ? toValidationError(err)
    : mapPrismaError(err)              ?? new InternalError("Unexpected error.", { cause: err });

  const log = req.log ?? logger;
  if (mapped.isOperational) {
    log.warn({ code: mapped.code, status: mapped.status }, mapped.message);
  } else {
    log.error({ err, code: mapped.code }, "Unhandled error");
    Sentry.captureException(err);
  }

  res.status(mapped.status).json({
    error: {
      code:    mapped.code,
      message: mapped.isOperational ? mapped.message : "Something went wrong.",
      requestId: req.id,
      details: mapped.details ?? null,
      ...(env.NODE_ENV !== "production" && !mapped.isOperational
        ? { stack: err instanceof Error ? err.stack : undefined }
        : {}),
    },
  });
};
```

### Three gotchas

1. **Four arguments are mandatory.** Express identifies error middleware by arity. Writing `(err, req, res)` silently registers it as normal middleware and it never runs. Keep `_next` even when unused.
2. **Register last**, after all routes and after the 404 handler.
3. **Check `res.headersSent`.** If a response has already begun streaming, you cannot set a status — delegate to Express's default handler.

### Registration order

```js
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);   // 404 — must come after routes
app.use(errorHandler);      // ← always last
```

```js
// shared/middleware/not-found.js
/** @type {import("express").RequestHandler} */
export const notFoundHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} does not exist.`));
};
```

Routing 404s through the same error path means one response shape for every failure.

---

## 10. Validation errors

Zod errors become `422` with per-field detail:

```js
/** @param {import("zod").ZodError} err */
function toValidationError(err) {
  return new ValidationError("Request validation failed.", {
    details: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}
```

The `validate()` middleware (`libraries.md` §5) throws; it does not respond. Every error still exits through one place.

---

## 11. Better Auth routes

`/api/auth/*` is handled by Better Auth and **does not pass through this middleware**. Its error shape is its own.

| | `/api/auth/*` | `/api/v1/*` |
|---|---|---|
| Error shape | Better Auth's | The envelope in §3 |
| Handled by | Better Auth | `errorHandler` |

### `POST /webhooks/paybridge` is also an exception

The webhook is called by PayBridge, not by our clients, so it does **not** use the §3 envelope either. It answers with status codes only:

| Status | When |
|---|---|
| `200` | Processed, or already processed — both are success |
| `401` | Signature verification failed |

**Never return `4xx`/`5xx` for anything we cannot fix by retrying** — an unknown `orderId` or a duplicate delivery returns `200`, because PayBridge retries at 5s, 30s and 5min and then dead-letters. Retrying an unrecognized event just burns the retry budget on something that will never succeed. Record it, alert, and acknowledge ([payments](./features/payments.md) §7).

Do not try to normalize it — wrapping the handler risks breaking the OAuth callback and session flows. Instead, the frontend's auth client handles auth errors separately from its API client. **Document this difference** so it isn't discovered during integration.

---

## 12. What must never leak

| Never in a response | Why |
|---|---|
| Stack traces (in production) | Reveals file paths and dependency versions |
| Prisma/SQL messages | Contain table and column names |
| `accounts` fields | Password hashes, OAuth tokens |
| Whether an email is registered | Enables account enumeration — sign-up and password-reset must respond identically for known and unknown addresses |
| Another user's resource existence | Return **404**, not 403, when a booking belongs to someone else |

> **404-over-403 for other people's rows.** Returning 403 confirms the record exists — enough to enumerate booking references. `NotFoundError` is the correct response for a row the caller may not see.

---

## 13. Logging

Aligned with `libraries.md` §7 (pino):

| Class | Level | Sentry |
|---|---|---|
| `4xx` operational | `warn` | No |
| `401` / `403` | `warn` with `userId` | No — but alert on volume spikes |
| `5xx` / non-operational | `error` with stack | **Yes** |

Every line carries `requestId` (the Awilix request scope binds it), so a user reporting `01JBXQ7H2K4M8N` gives you the exact request.

Mandatory pino redaction:

```js
redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.accessToken"]
```

---

## 14. Process-level failures

Express 5 catches rejected promises **in route handlers**. It does not catch errors in timers, event emitters, or `node-cron` jobs.

```js
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  Sentry.captureException(reason);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  Sentry.captureException(err);
  shutdown(1);   // stop accepting, drain in-flight, exit
});
```

After an `uncaughtException` the process state is unreliable — **exit and let the orchestrator restart**. Continuing is how corrupt data gets written.

Wrap every scheduled job in its own try/catch: one failing cron run must not take down the API.

---

## 15. Frontend contract

```js
// the client switches on code, never on message
switch (error.code) {
  case "BOOKING_SLOT_TAKEN":
    toast.error(t("booking.slotTaken"));
    refetchAvailability();          // the code tells you what to *do*, not just what to say
    break;
  case "BOOKING_CANCELLATION_WINDOW_CLOSED":
    toast.error(t("booking.cancellationClosed"));
    break;
  case "VALIDATION_FAILED":
    error.details?.forEach((d) => form.setError(d.path, { message: d.message }));
    break;
  case "UNAUTHENTICATED":
    redirectToLogin();
    break;
  default:
    toast.error(t("common.somethingWentWrong"));
}
```

Every code in §7 needs an i18n key in both EN and ID. A code with no translation falls back to the generic message — acceptable, but it should be caught in review.

---

## 16. Testing

| What | How |
|---|---|
| Each domain error → correct status + code | Service unit test asserting the thrown class |
| Validation → 422 with `details` | Supertest against the real middleware chain |
| Unmapped error → 500, no stack in production | Force a throw with `NODE_ENV=production` |
| **`23P01` → `BOOKING_SLOT_TAKEN`** | **Testcontainers** — concurrent inserts, assert one 201 and one 409 |
| No leakage | Assert responses never match `/password|prisma|SELECT|at .*\.js:/` |

The `23P01` test is the one that cannot be faked. The behaviour lives in a PostgreSQL constraint, so proving it needs PostgreSQL.

---

## 17. Summary

| Rule | |
|---|---|
| Services throw domain errors | Never HTTP status codes |
| Controllers call `next(err)` | Never build error responses |
| One middleware maps everything | Registered last, four arguments |
| `isOperational` splits bugs from outcomes | Drives log level and Sentry |
| `code` is the contract | `message` is a fallback; the client is bilingual |
| Storage errors never reach the client | Mapped centrally; `23P01` mapped by the bookings service |
| 404, not 403, for other users' rows | Prevents enumeration |
| `/api/auth/*` has its own shape | Better Auth owns it — documented, not normalized |
