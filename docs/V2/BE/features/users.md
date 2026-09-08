# Users API

**Owns:** `users` (profile fields, role) · Conventions: [`README.md`](./README.md)

Authentication endpoints live in [`auth.md`](./auth.md). This feature covers the profile and admin user management.

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/me` | Customer |
| 2 | `PATCH` | `/me` | Customer |
| 3 | `GET` | `/admin/users` | Admin |
| 4 | `GET` | `/admin/users/:id` | Admin |
| 5 | `POST` | `/admin/users` | Admin |
| 6 | `PATCH` | `/admin/users/:id` | Admin |
| 7 | `DELETE` | `/admin/users/:id` | Admin |
| 8 | `POST` | `/admin/users/:id/ban` · `/unban` | Admin |

---

## 1. `GET /me`

The authenticated user's own profile. **Access:** Customer.

### Response `200`

```json
{
  "id": "usr_1",
  "email": "ana@example.com",
  "name": "Ana Putri",
  "phone": "+628110000000",
  "company": "Acme",
  "image": null,
  "emailVerified": true,
  "role": "customer",
  "createdAt": "2026-08-31T14:00:00.000Z",
  "stats": { "totalBookings": 12, "upcomingBookings": 2, "totalSpent": "1840000.00", "currency": "IDR" },
  "authMethods": [
    { "providerId": "credential", "linkedAt": "2026-08-31T14:00:00.000Z" },
    { "providerId": "google", "linkedAt": "2026-09-02T08:10:00.000Z" }
  ]
}
```

`authMethods` lists linked login methods so the account page can show "Connected with Google". It exposes **only** `providerId` and `linkedAt` — never `password`, `accessToken`, `refreshToken` or `idToken`, which must not leave the repository layer.

---

## 2. `PATCH /me`

Update own profile. **Access:** Customer.

### Request

```json
{ "name": "Ana Putri", "phone": "+628110000001", "company": "Acme Corp", "image": "https://…/me.jpg" }
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 1–150, trimmed |
| `phone` | string\|null | Max 30 |
| `company` | string\|null | Max 150 |
| `image` | string\|null | Valid URL |

All optional. Returns the object from endpoint 1.

### Not editable here

| Field | Why | Where instead |
|---|---|---|
| `email` | Requires re-verification | Better Auth change-email flow |
| `role` | Privilege escalation | `PATCH /admin/users/:id` |
| `banned` | — | `POST /admin/users/:id/ban` |
| `emailVerified` | Set by the verification flow only | — |

> The service must **allow-list** the four editable fields. Spreading the request body into a Prisma `update` would let a customer send `{"role":"admin"}` and promote themselves.

---

## 3. `GET /admin/users`

**Access:** Admin. Replaces `adminGetClients`.

### Query

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Search name, email, company |
| `role` | enum | — | `customer` · `staff` · `admin` |
| `banned` | boolean | — | |
| `sort` | enum | `createdAt` | `name` · `createdAt` · `totalSpent` · `totalBookings` |
| `order` | enum | `desc` | |
| `page` / `limit` | int | `1` / `20` | Max `100` |

### Response `200`

```json
{
  "data": [
    { "id": "usr_1", "email": "ana@example.com", "name": "Ana Putri",
      "phone": "+628110000000", "company": "Acme", "role": "customer",
      "emailVerified": true, "banned": false, "image": null,
      "totalBookings": 12, "totalSpent": "1840000.00", "lastBookingDate": "2026-09-15",
      "createdAt": "2026-08-31T14:00:00.000Z" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 248, "totalPages": 13 }
}
```

> **`totalBookings`, `totalSpent` and `lastBookingDate` are SQL aggregates.** The current `adminGetClients` returns **every** profile *and* **every** booking row so the browser can join and sum them (`customers.ts:74-104`). At a few hundred customers that is already a multi-megabyte response for a table showing twenty rows.

---

## 4. `GET /admin/users/:id`

**Access:** Admin.

Endpoint 3's object, plus:

```json
{
  "banReason": null,
  "banExpires": null,
  "updatedAt": "2026-09-02T08:10:00.000Z",
  "authMethods": [{ "providerId": "credential", "linkedAt": "…" }],
  "activeSessions": 2,
  "recentBookings": [
    { "id": "3fa85f64-…", "reference": "TS-8F3K2A", "bookingDate": "2026-09-15",
      "status": "confirmed", "totalAmount": "166500.00", "workspaceName": "Meeting Room A" }
  ]
}
```

`recentBookings` is capped at 10. For the rest use `GET /admin/bookings?userId=`.

---

## 5. `POST /admin/users`

Create a user from the console. **Access:** Admin.

### Request

```json
{
  "email": "staff@terraspace.com",
  "password": "temporary-password",
  "name": "Budi Santoso",
  "phone": "+628110000002",
  "company": null,
  "role": "staff",
  "sendWelcomeEmail": true
}
```

| Field | Type | Required | Default | Rules |
|---|---|:---:|---|---|
| `email` | string | ✔ | — | Valid, lowercased, unique |
| `password` | string | ✔ | — | Min 8 |
| `name` | string | ✔ | — | 1–150 |
| `phone` | string\|null | ✖ | `null` | |
| `company` | string\|null | ✖ | `null` | |
| `role` | enum | ✖ | `customer` | |
| `sendWelcomeEmail` | boolean | ✖ | `true` | |

### Response `201`

Endpoint 4's object.

### Errors

| Status | Code | When |
|---|---|---|
| 409 | `EMAIL_ALREADY_EXISTS` | Email in use |

### Rules

- Creation goes through **Better Auth's admin API**, not a direct Prisma insert — the password must be hashed by Better Auth and written to `accounts`. The current `adminCreateUser` calls `hashPassword()` from `src/lib/password-server.ts` and writes `users.passwordHash`; that column no longer exists.
- Admin-created users are `emailVerified: true` — an admin vouches for the address.

---

## 6. `PATCH /admin/users/:id`

**Access:** Admin.

### Request

```json
{ "name": "Budi Santoso", "phone": "+628110000002", "company": "Acme", "role": "admin", "email": "new@example.com" }
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `phone` | string\|null | |
| `company` | string\|null | |
| `role` | enum | **Privilege change — audit-logged with the actor** |
| `email` | string | Unique; sets `emailVerified = false` and triggers re-verification |

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such user |
| 409 | `EMAIL_ALREADY_EXISTS` | Email in use |
| 422 | `VALIDATION_FAILED` | Demoting the last remaining `admin` |

> **The last admin cannot be demoted.** Without this check an admin can remove their own privileges and lock everyone out of the console, recoverable only by direct database access.

---

## 7. `DELETE /admin/users/:id`

**Access:** Admin.

```json
{ "success": true }
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such user |
| 409 | `CONFLICT` | User has bookings — ban instead |
| 422 | `VALIDATION_FAILED` | Deleting the last `admin`, or yourself |

> **Behaviour change.** `adminDeleteUser` currently calls `db.user.delete()`, and `Booking.user` is `onDelete: Cascade` — so deleting one customer silently erases every booking they ever made from all revenue reports. V2's FK is `RESTRICT`: a user with bookings cannot be deleted. Use ban (endpoint 8), which blocks sign-in while preserving history.

Cascades that **do** apply: `sessions` and `accounts` — both disposable.

---

## 8. `POST /admin/users/:id/ban` · `/unban`

**Access:** Admin. The intended alternative to deletion.

### Ban request

```json
{ "reason": "Repeated no-shows", "expiresAt": "2026-12-31T00:00:00.000Z" }
```

| Field | Type | Required | Notes |
|---|---|:---:|---|
| `reason` | string | ✔ | Shown at sign-in and stored in `banReason` |
| `expiresAt` | ISO 8601 | ✖ | Omit for permanent |

### Response `200`

```json
{ "id": "usr_1", "banned": true, "banReason": "Repeated no-shows",
  "banExpires": "2026-12-31T00:00:00.000Z" }
```

`/unban` takes no body and clears all three fields.

### Rules

1. Banning **revokes all active sessions** immediately — otherwise a signed-in user keeps working until their cookie expires.
2. Existing bookings are untouched. Cancel them separately if that is intended.
3. Cannot ban yourself or the last remaining admin.
4. Handled by the Better Auth admin plugin.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such user |
| 422 | `VALIDATION_FAILED` | Self-ban, or last admin |
