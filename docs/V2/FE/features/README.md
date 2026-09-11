# TerraSpace — Frontend Features (V2)

The FE feature structure mirrors the V2 BE feature boundaries. The BE has **61 endpoints**; this directory documents how the FE consumes all user-facing and admin-facing contracts.

| Feature | FE doc | Screens | BE endpoints |
|---|---|---:|---:|
| Auth | [`auth.md`](./auth.md) | 3 | 9 |
| Users | [`users.md`](./users.md) | 3 | 8 |
| Locations | [`locations.md`](./locations.md) | 3 | 6 |
| Workspaces | [`workspaces.md`](./workspaces.md) | 5 | 7 |
| Amenities | [`amenities.md`](./amenities.md) | 2 | 5 |
| Bookings | [`bookings.md`](./bookings.md) | 7 | 10 |
| Payments | [`payments.md`](./payments.md) | 6 | 7 |
| Settings | [`settings.md`](./settings.md) | 2 | 3 |
| Reports | [`reports.md`](./reports.md) | 6 | 6 |
| **Total** | | **37** | **61** |

**V2 scope decisions:** no membership feature and no guest-management feature. `booking_guests` is out of scope. (The `/membership` and `/enterprise` *routes* already exist today as feature-disabled marketing pages and stay that way — see §4.)

---

## 1. Conventions

| Area | Rule |
|---|---|
| Routing | TanStack Start / TanStack Router; routes stay thin |
| Data fetching | TanStack Query through feature query hooks |
| API calls | Feature `*.api.ts` → shared API client |
| Forms | React Hook Form + feature Zod schema |
| Auth | Better Auth client under `/api/auth/*` |
| Normal API | `/api/v1/*` |
| Session | `httpOnly` cookie, `credentials: include` |
| Money | Decimal strings; IDR display via `Intl.NumberFormat` |
| Validation | FE for UX, BE for authority |
| Loading/empty/error | Required for every query-backed screen |
| Access | Route guards for UX; BE remains security boundary |

---

## 2. Access levels

| Level | Meaning | FE behavior |
|---|---|---|
| Public | No session | Render |
| Customer | Authenticated | Anonymous → `/login` |
| Staff | `staff` or `admin` | Others → `/` |
| Admin | `admin` | Others → `/` |

---

## 3. Endpoint ownership

### Auth

The FE calls Better Auth directly through the auth client. These routes are unversioned and must not be passed through the normal `ApiError` mapper.

- sign up;
- sign in;
- Google OAuth;
- callback;
- sign out;
- session;
- forgot password;
- reset password;
- verify email.

### Users

- `/me` profile;
- admin user list/detail/create/update/delete;
- ban/unban.

### Locations

- public list/detail;
- admin list/create/update/delete.

### Workspaces

- public list/detail/availability;
- admin list/create/update/delete.

### Amenities

- public list;
- admin list/create/update/delete.

### Bookings

- customer create/list/detail/cancel;
- staff/admin list/detail/create/update;
- admin delete;
- operations calendar.

### Payments

- payment methods;
- create checkout;
- payment status;
- admin payment list/detail/refund.

The PayBridge webhook endpoint is BE-only.

### Settings

- public settings;
- admin settings read/update.

### Reports

- overview;
- revenue;
- occupancy;
- payments;
- activity;
- CSV export.

---

## 4. Migration from legacy frontend

The old catalog/admin implementation is migrated by resource. This table names the actual `src/frontend/` files, not just the resource area, so nothing gets silently dropped:

| Legacy file(s) | V2 destination |
|---|---|
| `site/cards.tsx` (`LocationCard`), `site/location-map.tsx` | `features/locations` |
| `site/cards.tsx` (`WorkspaceCard`), `site/availability-badge.tsx`, `site/search-module.tsx` | `features/workspaces` |
| `admin/admin-locations.tsx`, `admin/location-coords-field.tsx` | `features/locations` |
| `admin/admin-workspaces.tsx` | `features/workspaces` |
| `admin/admin-amenities.tsx` | `features/amenities` |
| `admin/admin-form-fields.tsx` (`AmenityMultiSelect`) | `features/amenities` (exported for cross-feature use) |
| `admin/admin-form-fields.tsx` (`ImageField`, `DbSelectField`) | `components/admin-fields/` — business-agnostic, not feature-owned |
| `site/qr-pass.tsx` | `features/bookings` |
| `admin/admin-bookings.tsx`, `admin/admin-calendar.tsx` | `features/bookings` |
| Booking review/confirmation routes | `features/bookings` + `features/payments` |
| `admin/admin-clients.tsx` (user list/edit only — drop its tier-badge logic, see `features/users.md`) | `features/users` |
| `admin/admin-guests.tsx` | **no V2 destination** — guests are out of scope |
| `admin/admin-payments.tsx` | `features/payments` |
| `admin/admin-settings.tsx` | `features/settings` |
| `admin/admin-dashboard.tsx`, `admin/admin-analytics.tsx`, `admin/admin-notifications.tsx` | `features/reports` |
| `admin/admin-layout.tsx` | `components/layout/` (`admin-shell.tsx` + `admin-sidebar.tsx` — see `fe-architecture.md` §2) |
| `site/site-shell.tsx`, `site/site-header.tsx`, `site/site-footer.tsx` | `components/layout/` (unchanged) |
| `ui/*` (14 files) | `components/ui/` (renamed, unchanged — see `frontend-spec.md` §2) |
| Auth server/client glue | `features/auth` |

`src/routes/{enterprise,membership,pricing,how-it-works,help,terms,privacy}.tsx` have no feature to migrate into — they're static/marketing pages with no BE-mapped data, and stay as plain route files (`frontend-spec.md` §5).

Delete legacy implementations only after their V2 feature is wired and tested.

---

## 5. Feature rule

A feature may import:

```text
shared
lib
ui
its own feature modules
```

It must not import another feature's private API/data-access module.

Cross-feature behavior goes through the feature's public `index.ts` surface or through shared domain utilities where appropriate.

---

## 6. Critical user flow

```text
Catalog
  ↓
Workspace detail
  ↓
Availability
  ↓
Booking review
  ↓
Create booking
  ↓
Payment
  ↓
Confirmation
```

The booking flow is the primary customer path in V2.

The FE must never rely on static/mock catalog data when the corresponding V2 API is available.
