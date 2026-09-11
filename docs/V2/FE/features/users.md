# TerraSpace FE — Users (V2)

**Feature:** `src/features/users/` · **Consumes:** [BE `features/users.md`](../../BE/features/users.md) (8 endpoints) — `GET/PATCH /me`, `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id`, `POST /admin/users/:id/ban`/`/unban`

**Companion:** [`fe-architecture.md`](../fe-architecture.md) · [`state-map.md`](../state-map.md) · [`features/auth.md`](./auth.md)

---

## 1. Screens

| Screen | Kind | Route | Access |
|---|---|---|---|
| My profile | Page | new — was missing in V1 | Customer |
| Admin users list | Panel | inside `admin.tsx` | Admin |
| Admin user detail / edit | Dialog | triggered from the list | Admin |

`frontend/admin/admin-clients.tsx` (V1) becomes this feature's admin panel, consuming `GET /admin/users` directly instead of `adminGetClients`'s all-profiles-plus-all-bookings payload ([BE `features/README.md`](../../BE/features/README.md) §7.4).

**What not to carry over from `admin-clients.tsx`:** its Tier badge (Enterprise/Pro/Standard, computed client-side from lifetime spend thresholds) is membership-tier UI, and membership is explicitly out of scope for V2 (`frontend-spec.md` §4) — drop it, don't reimplement it against `GET /admin/users`. Its create/edit flow also uses a chain of sequential `window.prompt()` calls instead of a form — replace with `admin-user-edit-dialog.tsx` built on `react-hook-form` + Zod, per `frontend-spec.md` §2's shortcuts list. `frontend/admin/admin-guests.tsx` (guest-scoped bookings) has no V2 destination at all — guests are out of scope, and this screen is not part of this feature.

---

## 2. Components

| Component | Purpose |
|---|---|
| `profile-form.tsx` | Name, phone, company — `PATCH /me` |
| `admin-user-table.tsx` | Paginated, filterable by role; ban/unban actions inline |
| `admin-user-edit-dialog.tsx` | Role change, ban reason/expiry |

---

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useMe()` | `GET /me` | `users.me()` |
| `useUpdateProfile()` | `PATCH /me` | invalidates `users.me()` |
| `useUsers(params)` | `GET /admin/users` | `users.list(params)` |
| `useUser(id)` | `GET /admin/users/:id` | `users.detail(id)` |
| `useCreateUser()` | `POST /admin/users` | invalidates `users.list(*)` |
| `useUpdateUser()` | `PATCH /admin/users/:id` | invalidates `users.detail(id)`, `users.list(*)` |
| `useDeleteUser()` | `DELETE /admin/users/:id` | invalidates `users.list(*)` |
| `useBanUser()` / `useUnbanUser()` | `POST /admin/users/:id/ban`/`/unban` | invalidates `users.detail(id)`, `users.list(*)` |

`useMe()` is distinct from `features/auth`'s `useSession()` — the session hook answers "is someone logged in and what's their role," this one fetches the full profile record (phone, company) for the profile form. Most screens only need the former.

---

## 4. Forms & validation

`users.schema.ts` mirrors [BE `features/users.md`](../../BE/features/users.md)'s `PATCH /me` and admin create/update field sets. Role and ban fields are admin-only inputs — `profile-form.tsx` never renders them, keeping the customer form and the admin form on two schemas rather than one schema with conditionally-hidden fields.

---

## 5. States & edge cases

| Case | Behavior |
|---|---|
| `DELETE /admin/users/:id` on a user with bookings | `409` shown inline in the dialog: "Ban instead — this user has booking history" ([BE `development-phases.md`](../../BE/development-phases.md) Phase 2 exit criterion) |
| Attempting to demote the last admin | `409` from the API surfaces as a field error on the role select, not a silent failure |
| Banning oneself (an admin banning their own account) | Not specifically prevented client-side — relies on the API's own rule, if any; the table simply reflects whatever the API returns |

---

## 6. Notes

Nothing in this feature reads or renders an `accounts` row, a password hash, or an OAuth token — those never leave the BE per [BE `error-handling.md`](../../BE/error-handling.md) §12. The admin user table shows role, ban status, and profile fields only.
