# TerraSpace FE — Auth (V2)

**Feature:** `src/features/auth/` · **Consumes:** [BE `features/auth.md`](../../BE/features/auth.md) (9 endpoints, all under `/api/auth/*`, unversioned — Better Auth owns this path entirely)

**Companion:** [`fe-architecture.md`](../fe-architecture.md) · [`error-handling.md`](../error-handling.md) · [BE `libraries.md`](../../BE/libraries.md) §2

---

## 1. Screens

| Screen | Kind | Route | Access |
|---|---|---|---|
| Sign in | Page | `login.tsx` | Public |
| Sign up | Page | `signup.tsx` | Public |
| Admin sign in | Page | `admin_.login.tsx` | Public (redirects if not `staff`/`admin` after sign-in) |

No "forgot password" or "verify email" page is listed separately — both are handled by Better Auth's own hosted flow triggered from the sign-in form (§3), matching the BE's stance that `/api/auth/*` is not normalized into the app's own error/response shape ([BE `error-handling.md`](../../BE/error-handling.md) §11).

---

## 2. Components

| Component | Purpose |
|---|---|
| `sign-in-form.tsx` | Email+password, plus a "Continue with Google" button |
| `sign-up-form.tsx` | Email+password+name; company/phone are collected later in `features/users` profile, not at sign-up |
| `session-provider.tsx` | Wraps the app; exposes `useSession()` to every route via context, backed by Better Auth's client |

No admin-only "manage other users' sessions" component lives here — that is `features/users` (§ admin user table), which calls `/admin/users/:id/ban` rather than anything under `/api/auth/*`.

The site header's auth-aware right-hand slot (was `frontend/site/site-header.tsx`) is this feature's most visible consumer of `useSession()`: signed-out renders Login/Sign up buttons, signed-in renders a pill dropdown (email, a Dashboard link, Sign out) — both variants carry over as-is.

---

---

## 3. Data

| Hook | Backed by |
|---|---|
| `useSession()` | Better Auth's client-side session hook — not a `queryKeys`-based TanStack Query call; Better Auth manages its own cache |
| `useSignIn()` | `authClient.signIn.email(...)` |
| `useSignUp()` | `authClient.signUp.email(...)` |
| `useSignInWithGoogle()` | `authClient.signIn.social({ provider: "google" })` |
| `useSignOut()` | `authClient.signOut()` |
| `useRequireRole(role)` | Reads `useSession()`, throws `redirect({ to: "/login" })` or `redirect({ to: "/" })` for use in a route's `beforeLoad` |

`auth.client.ts` is the only file that imports Better Auth's client SDK — every hook above wraps it, matching [`fe-architecture.md`](../fe-architecture.md) §3's "index.ts is the public surface" rule.

---

## 4. Forms & validation

`auth.schema.ts` mirrors the shape Better Auth expects, not a BE Zod schema (there is no `features/auth/auth.schema.js` on the backend to mirror — Better Auth validates its own routes internally):

```ts
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

Field-level errors from a failed sign-in are **not** the `VALIDATION_FAILED` / `details[]` shape from [BE `error-handling.md`](../../BE/error-handling.md) §3 — Better Auth's own error shape applies here (§11 of that document), so `auth.client.ts` maps it to `form.setError` directly rather than going through the shared `ApiError` path in [`error-handling.md`](../error-handling.md) §2.

---

## 5. States & edge cases

| Case | Behavior |
|---|---|
| Sign-up with an email that already has a password account | Better Auth returns its own conflict shape; shown as a field error on `email`, not a toast |
| Sign-up with an email that already has a Google-only account | Same as above — the account-linking trust boundary in [BE `libraries.md`](../../BE/libraries.md) §2.2 means this is a real conflict, not silently merged |
| Session expired mid-session | `useSession()` flips to unauthenticated; the next protected route's `beforeLoad` redirects to `/login` — no special handling needed per-component |
| Unverified email tries to sign in | Better Auth blocks it (`requireEmailVerification: true`, [BE `docker.md`](../../BE/docker.md) §7); the sign-in form shows "check your email," not a generic auth failure |

---

## 6. Notes

- `src/lib/auth-server.ts`, `src/lib/auth-guards-server.ts`, `src/lib/password-server.ts` are deleted once this feature lands — see [`development-phases.md`](../development-phases.md) Phase 2.
- No password-strength meter or custom hashing exists on the client — Better Auth owns hashing entirely ([BE `libraries.md`](../../BE/libraries.md) §2), the FE only enforces `min(8)` for early feedback.
- The admin login page is the same `sign-in-form.tsx`, not a separate implementation — role-gating happens after sign-in via `useRequireRole("admin")` on the admin shell route, not by having two different forms.
