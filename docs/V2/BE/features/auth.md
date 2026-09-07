# Auth API

**Owns:** `users`, `sessions`, `accounts`, `verifications` · Conventions: [`README.md`](./README.md)

> **These endpoints are implemented by Better Auth, not by us.** They are mounted at `/api/auth/*` — **unversioned**, outside `/api/v1` — and documented here because clients must call them. Do not re-implement or wrap them.
>
> **Their error shape is Better Auth's, not the envelope in [`error-handling.md`](../error-handling.md) §3.** The frontend auth client must handle these separately from the API client ([`error-handling.md`](../error-handling.md) §11).

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `POST` | `/api/auth/sign-up/email` | Public |
| 2 | `POST` | `/api/auth/sign-in/email` | Public |
| 3 | `GET` | `/api/auth/sign-in/social` | Public |
| 4 | `GET` | `/api/auth/callback/google` | Public |
| 5 | `POST` | `/api/auth/sign-out` | Customer |
| 6 | `GET` | `/api/auth/get-session` | Public |
| 7 | `POST` | `/api/auth/forget-password` | Public |
| 8 | `POST` | `/api/auth/reset-password` | Public |
| 9 | `GET` | `/api/auth/verify-email` | Public |

Session transport is an `httpOnly` cookie. Every browser request must send `credentials: "include"`.

---

## 1. `POST /api/auth/sign-up/email`

### Request

```json
{
  "email": "ana@example.com",
  "password": "correct-horse-battery",
  "name": "Ana Putri",
  "phone": "+628110000000",
  "company": "Acme"
}
```

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `email` | string | ✔ | Valid, lowercased, unique |
| `password` | string | ✔ | Min 8 characters |
| `name` | string | ✔ | 1–150 |
| `phone` | string | ✖ | `additionalFields` |
| `company` | string | ✖ | `additionalFields` |

### Response `200`

```json
{ "user": { "id": "usr_1", "email": "ana@example.com", "name": "Ana Putri",
            "emailVerified": false, "image": null, "role": "customer" } }
```

With `requireEmailVerification: true`, **no session is issued** until the address is verified. A verification email is sent immediately.

### Rules

- Password hashing is Better Auth's (scrypt), written to `accounts.password` with `providerId = 'credential'` — never to `users`.
- `role` is always `customer` via `defaultRole`.

> **Behaviour change.** `auth-server.ts:161` currently makes the **first registered user an admin**:
> ```ts
> const userCount = await db.user.count();
> const role = userCount === 0 ? "admin" : "customer";
> ```
> Harmless in a mockup; in production whoever registers first on a fresh deploy owns the admin console. V2 removes it — the first admin is created by a seed script or promoted deliberately via `PATCH /admin/users/:id`.

---

## 2. `POST /api/auth/sign-in/email`

### Request

```json
{ "email": "ana@example.com", "password": "correct-horse-battery", "rememberMe": true }
```

### Response `200`

```json
{ "user": { "id": "usr_1", "email": "ana@example.com", "name": "Ana Putri",
            "emailVerified": true, "image": null, "role": "customer" },
  "redirect": false }
```

Sets the session cookie. Errors are deliberately identical for "unknown email" and "wrong password" — distinguishing them enables account enumeration.

Banned users are rejected here, with `banReason` and `banExpires` surfaced.

> The current implementation returns `{ error, session, user, profile }` with `200` on failure and a Supabase-shaped `session` object (`access_token`, `aud`, `app_metadata`) that no longer corresponds to anything. Better Auth's shape replaces it; the frontend auth client needs rewriting, not adapting.

---

## 3. `GET /api/auth/sign-in/social`

Starts the Google OAuth redirect. **Access:** Public.

### Query

| Param | Type | Required | Notes |
|---|---|:---:|---|
| `provider` | string | ✔ | `google` |
| `callbackURL` | string | ✖ | Post-login redirect; must be a trusted origin |

Responds `302` to Google's consent screen.

---

## 4. `GET /api/auth/callback/google`

Google's redirect target. **Access:** Public. Handled entirely by Better Auth — never called directly by a client.

Register this exact URL in the Google Cloud Console.

On success: creates or links the `accounts` row (`providerId = 'google'`, `password = NULL`, OAuth tokens populated), sets the session cookie, redirects to `callbackURL`.

Google-sourced fields: `users.name`, `users.image`, and `emailVerified = true`.

**Account linking.** With `trustedProviders: ["google"]`, signing in with Google using an email that already has a password account **links** into that one user rather than failing on the `UNIQUE (email)` constraint. Safe only because Google verifies the address ([`libraries.md`](../libraries.md) §2.2).

---

## 5. `POST /api/auth/sign-out`

No body. Deletes the `sessions` row and clears the cookie.

```json
{ "success": true }
```

---

## 6. `GET /api/auth/get-session`

Current session, or `null`. **Access:** Public — returns `null` rather than `401` when unauthenticated, so it is safe to call on every page load.

### Response `200`

```json
{
  "session": { "id": "ses_1", "userId": "usr_1", "expiresAt": "2026-09-14T04:12:00.000Z" },
  "user": { "id": "usr_1", "email": "ana@example.com", "name": "Ana Putri",
            "emailVerified": true, "image": null, "role": "customer",
            "banned": false, "phone": "+628110000000", "company": "Acme" }
}
```

Unauthenticated:

```json
{ "session": null, "user": null }
```

> `role` arrives with the session, so the client can render admin navigation without a second request. It is **display only** — every protected endpoint re-checks the role server-side.

For the editable profile, use `GET /me` ([users](./users.md)).

---

## 7. `POST /api/auth/forget-password`

```json
{ "email": "ana@example.com", "redirectTo": "https://app.terraspace.com/reset-password" }
```

### Response `200`

```json
{ "status": true }
```

> **Always `200`, whether or not the email exists.** A different response for unknown addresses is an account-enumeration oracle ([`error-handling.md`](../error-handling.md) §12). Rate-limit this endpoint.

Writes a `verifications` row and sends the email via Resend.

---

## 8. `POST /api/auth/reset-password`

```json
{ "newPassword": "…", "token": "abc123…" }
```

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `newPassword` | string | ✔ | Min 8 |
| `token` | string | ✔ | From the email link; single-use, expires |

`200` `{ "status": true }`. Invalid or expired tokens return `400` with Better Auth's error shape.

Updates `accounts.password` and **invalidates all existing sessions** for that user.

---

## 9. `GET /api/auth/verify-email`

Target of the verification link. **Access:** Public.

| Param | Type | Required |
|---|---|:---:|
| `token` | string | ✔ |
| `callbackURL` | string | ✖ |

Sets `users.emailVerified = true`, issues a session, redirects.

---

## Not implemented by us

| Concern | Owner |
|---|---|
| Password hashing / verification | Better Auth (scrypt) |
| Session creation, refresh, expiry | Better Auth |
| CSRF on auth routes | Better Auth |
| OAuth state and PKCE | Better Auth |
| Email verification and reset tokens | Better Auth (`verifications`) |

Delete `src/lib/auth-server.ts`, `src/lib/auth-guards-server.ts` and `src/lib/password-server.ts` when this lands.

## What we do implement

| Concern | Where |
|---|---|
| `requireAuth` middleware | `features/auth/auth.guards.js` — resolves the session, sets `req.user`, else `401 UNAUTHENTICATED` |
| `requireRole` middleware | Same — `403 FORBIDDEN` on role mismatch |
| Resource ownership | **In each service**, never middleware ([`be-architecture.md`](../be-architecture.md)) |
| Session/verification cleanup | `node-cron` job pruning expired rows |
