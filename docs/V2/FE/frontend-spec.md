# TerraSpace — Frontend Specification (V2)

**Purpose:** frontend implementation contract aligned with the V2 backend specification.

**Backend source of truth:** `BE/features/` — 61 API endpoints across Auth, Users, Locations, Workspaces, Amenities, Bookings, Payments, Settings, and Reports.

---

## 1. Frontend stack

| Area | Choice |
|---|---|
| Language | TypeScript, strict |
| UI | React 19 |
| App framework | TanStack Start |
| Routing | TanStack Router, file-based |
| Server state | TanStack Query |
| Build | Vite |
| Styling | Tailwind CSS |
| Forms | React Hook Form |
| Validation | Zod |
| UI primitives | Radix UI |
| Testing | Vitest + Testing Library + MSW + Playwright |
| Linting | ESLint 9 + typescript-eslint + React Hooks + boundaries |
| Formatting | Prettier |

---

## 2. Design system

The V1 app (`src/frontend/`) already has a real, specific visual identity — V2 carries it over rather than inventing a new one. This section is the one place that identity is written down; feature docs describe *behavior*, not colors.

### Stack

shadcn/ui ("new-york" style) on **Radix UI primitives** + `class-variance-authority` (variant/size props) + `tailwind-merge`/`clsx` via a `cn()` helper. Icons: `lucide-react`. Tailwind v4, **CSS-first config** — there is no `tailwind.config.*`; the theme lives entirely in a `styles.css` `@theme inline` block plus `@utility` custom-utility declarations. `components.json` (`baseColor: "slate"`, `cssVariables: true`) is the shadcn source of truth for regenerating primitives.

### Typography

- Font: **"Plus Jakarta Sans"** (`--font-sans` / `--font-display`), Google Fonts, weights 400/500/600/700.
- Fluid heading utilities: `text-display`, `text-h1`, `text-h2` (`clamp()`-based, scale with viewport), `text-eyebrow` (uppercase, tracked, small label above a heading).

### Color tokens

All colors are semantic **oklch** tokens (never raw Tailwind palette classes in `ui/*` or site components):

| Token | Role | Approx. value |
|---|---|---|
| `--background` / `--foreground` | Page background / body text | Near-white blue-violet tint / deep navy |
| `--primary` | Brand color — buttons, links, focus rings | Strong indigo/violet, `oklch(0.52 0.23 275)` |
| `--accent` | Secondary brand accent | Magenta-violet, `oklch(0.58 0.25 305)` |
| `--destructive` | Errors, delete actions, cancelled states | Red, `oklch(0.56 0.2 22)` |
| `--success` / `--warning` / `--info` | Status semantics | Green / amber / blue |
| `--muted-foreground`, `--popover`, `--accent` (surface use) | Secondary text, menus, hover surfaces | — |

Brand-specific extras: `--navy`, `--galaxy-blue`, `--galaxy-purple`, and two gradient tokens — `--gradient-galaxy` (dark navy → purple, used for dark hero/admin surfaces) and `--gradient-accent` (cyan → blue → violet → pink, the primary CTA gradient, exposed as the `bg-galaxy-accent` utility and animated on hover via a `gradientShift` keyframe).

A full `.dark { ... }` token override block exists for the **public site's** class-based dark mode. Do not trust source comments that describe the palette as "forest green" — the shipped `--primary` value is indigo/violet; verify against `styles.css`, not old comments, if the two disagree again.

### Layout tokens

- Radius: `--radius: 0.65rem` base, with a derived scale `--radius-sm` … `--radius-4xl`.
- Shadows: `--shadow-soft`, `--shadow-lift`, `--shadow-glow`, `--shadow-neon` — layered, blue/purple-tinted.
- Utilities: `container-page` (max-width `80rem`, centered, `1.25rem` side padding), `section-y` (vertical section rhythm), `hover-glow` (lift + glow on hover, used on site cards), `text-galaxy` (gradient text-clip).

### Component primitives (`components/ui/`)

The real, currently-shipping set is 14 files: `accordion`, `button`, `checkbox`, `dropdown-menu`, `input`, `label`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `textarea`. `button.tsx` exposes variants `default | destructive | outline | secondary | ghost | link` and sizes `default | sm | lg | icon` (`asChild` supported via `@radix-ui/react-slot`). Shared conventions across all of them: `rounded-md`/`rounded-sm`, `border-input`/`border`, `shadow-sm`, `focus-visible:ring-1 focus-visible:ring-ring`.

Several Radix packages already sit in `package.json` (dialog, tabs, popover, tooltip, switch, avatar, progress, alert-dialog, and others) with **no corresponding file yet** — `dialog.tsx`, `tabs.tsx`, `switch.tsx`, and a real data-table are things V2 needs to actually build, not assume already exist.

### Two visual systems — both intentional, kept separate

- **Site** (public-facing): light theme, semantic tokens throughout (`bg-primary`, `text-muted-foreground`, …), built from `ui/*` directly. Sticky translucent header (`bg-background/85 backdrop-blur-xl`), gradient CTA buttons (`bg-galaxy-accent`), `hover-glow` cards.
- **Admin** (staff/admin panel): a separate dark "glass" dashboard look, historically built with raw inline Tailwind arbitrary values (`bg-white/[0.02]`, `bg-[#09101f]/90`, brand hex `#6366f1`/`#818cf8`) instead of the semantic tokens, with a `[data-admin-theme]` attribute remapping those utilities for the admin's own light/dark toggle. **V2 should re-express this on the same semantic-token system as the site** (dark-glass is a legitimate visual target — a dark sidebar/panel aesthetic — but it should be built from theme tokens, not parallel hardcoded hex values) — see the shortcuts list below.

### Internationalization

Every user-facing string, on both site and admin, is bilingual (English / Indonesian). V2 keeps this (`shared/i18n.tsx`, already in the file tree, §2 of `fe-architecture.md`) but through one mechanism — the current admin pattern of inline `locale === "id"` ternaries scattered per component is a shortcut to retire, not a convention to copy.

### Status badges

A pill badge (`rounded-full`, tinted background + border + text in one color) is the universal way state is shown — booking status, payment status, member tier, availability. V1 reinvents the color→label mapping per page (`STATUS_STYLES`, `STATUS_CFG`, `TIER_CFG`, each slightly different); V2 should have **one** shared status-badge component parameterized by a status→token map, with the color meaning kept consistent: success/emerald = confirmed·active·available·paid, warning/amber = pending·limited, destructive/red = cancelled·failed·unavailable, accent/indigo = highlighted or brand-level.

### Known V1 shortcuts — reproduce the *look*, not these specific implementations

- Admin "tables" are CSS `grid` divs with `divide-y` rows, not a real `<table>`/data-grid.
- Some admin create/edit flows (`admin-clients.tsx`, `admin-guests.tsx`) use sequential `window.prompt()` calls instead of a form — `react-hook-form` + Zod are already in the V2 stack (§1, §8) specifically to replace this.
- Modal markup (`fixed inset-0 z-50` overlay + panel) is copy-pasted per admin page rather than one shared dialog component.
- The admin calendar's two rooms are matched by hardcoded name substrings, not real workspace data.
- The dashboard's "Quick Actions" includes a dead "Memberships" action with no destination — do not carry it forward.

---

## 3. Architecture

**Selected:** Feature-Based Architecture with Layered principles.

```text
src/
├── features/
│   ├── auth/
│   ├── users/
│   ├── locations/
│   ├── workspaces/
│   ├── amenities/
│   ├── bookings/
│   ├── payments/
│   ├── settings/
│   └── reports/
├── components/
│   ├── ui/
│   └── layout/
├── routes/
├── hooks/
├── lib/
├── shared/
└── assets/
```

Each feature may contain:

```text
feature/
├── components/
├── hooks/
├── *.api.ts
├── *.queries.ts
├── *.schema.ts
├── *.mapper.ts
├── *.types.ts
└── index.ts
```

The exact files are added only when the feature needs them; empty layers are not created for convention's sake.

### Why this architecture

- Business functionality stays grouped by feature.
- API access is separated from components.
- Forms and validation remain close to the feature that owns them.
- Routes stay thin.
- Features can evolve without creating a large global service layer.
- The structure matches the V2 backend feature boundaries.

---

## 4. V2 feature scope

| Feature | Public/customer | Staff | Admin |
|---|:---:|:---:|:---:|
| Auth | ✓ | ✓ | ✓ |
| Users | ✓ `/me` | — | ✓ |
| Locations | ✓ | — | ✓ |
| Workspaces | ✓ | — | ✓ |
| Amenities | ✓ | — | ✓ |
| Bookings | ✓ customer | ✓ operations | ✓ |
| Payments | ✓ customer | ✓ visibility | ✓ |
| Settings | public subset | — | ✓ |
| Reports | — | overview/activity | ✓ |

**Removed from V2:** membership and guest-management *functionality* — `booking_guests` is explicitly out of scope in the backend decision log. This is not the same as removing the pages: `/membership` and `/enterprise` already exist today as thin, feature-disabled marketing routes (hidden from nav, no BE-backed data) — they carry over as static content, they just never gain a feature module. `/pricing`, `/how-it-works`, `/help`, `/terms`, `/privacy` are the same shape: real pages today, none BE-mapped, none owned by a `src/features/*` folder — they stay as simple route files with static/marketing content, not full features.

---

## 5. Routing

TanStack Router / Start with file-based routes.

Routes should handle only:

1. route definition;
2. route-level guards;
3. route parameters/search params;
4. loading the required feature view;
5. route-level error/not-found handling.

Business logic belongs in `src/features/`.

Representative route map — includes the existing marketing/legal pages the V1 app already ships, so the rewrite doesn't quietly drop them:

```text
/
├── locations
│   └── $slug
├── workspaces
│   └── $id
├── amenities
├── booking
│   ├── review
│   └── confirmation
├── bookings
│   ├── index
│   └── $reference
├── dashboard                customer dashboard
├── profile
├── login
├── signup
├── pricing                  static/marketing — no feature module
├── how-it-works             static/marketing — no feature module
├── help                     static/marketing — no feature module
├── enterprise                static/marketing, feature-disabled — no feature module
├── membership                static/marketing, feature-disabled — no feature module
├── terms                    legal — no feature module
├── privacy                  legal — no feature module
└── admin
    ├── login
    ├── dashboard
    ├── locations
    ├── workspaces
    ├── amenities
    ├── bookings
    ├── calendar
    ├── users
    ├── payments
    ├── settings
    └── reports
```

Exact route filenames may vary with the existing repository; the feature ownership must not.

> **V1 note — this is a deliberate change, not a mismatch to reconcile.** Today `/admin` is a *single* route (`src/routes/admin.tsx`) that renders one `AdminShell` holding `activeTab` in React state; switching between Dashboard/Bookings/Calendar/Locations/… never changes the URL, and there is no way to deep-link or bookmark a specific admin page. V2 replaces this with real per-page routes as shown above — each admin section is its own route file with its own guard, its own loader-driven prefetch, and its own URL. The visual shell (sidebar nav grouped into Operations/Inventory/Customers/Finance/Insights — see [`fe-architecture.md`](./fe-architecture.md) §2) carries over; the routing mechanism underneath it does not.

---

## 6. API boundary

All normal API calls go through `src/lib/api-client.ts` and feature `*.api.ts` modules.

```text
Component
   ↓
Feature hook
   ↓
Feature API function
   ↓
shared api-client
   ↓
/api/v1
   ↓
V2 BE
```

Authentication is the exception:

```text
Auth component
   ↓
features/auth/auth.client.ts
   ↓
/api/auth/*
   ↓
Better Auth
```

The browser sends `credentials: "include"` because the BE uses an `httpOnly` session cookie.

No component calls `fetch()` directly.

---

## 7. Data and state

### Server state

TanStack Query owns:

- locations;
- workspaces;
- amenities;
- bookings;
- payments;
- users;
- settings;
- reports.

Query keys are centralized in `shared/query-keys.ts`.

### Local UI state

React state owns:

- dialog open/close;
- selected tab;
- temporary filter UI;
- form inputs;
- transient display state.

Do not copy server entities into global React state.

---

## 8. Money and dates

The V2 platform currency is **IDR**.

API money values are decimal strings:

```json
{
  "pricePerHour": "700000.00",
  "currency": "IDR"
}
```

The FE must:

- never use floating-point arithmetic for authoritative booking totals;
- never send `totalAmount`, `unitPrice`, or tax as an authority to `POST /bookings`;
- render money with `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`;
- use the server response for the final quote;
- treat `currencyExponent = 0` for IDR.

The booking review may calculate a display preview, but the server remains authoritative.

Dates are `YYYY-MM-DD`; times are `HH:mm`; timestamps are ISO 8601 UTC.

---

## 9. Forms and validation

```text
User input
   ↓
React Hook Form
   ↓
Zod schema
   ↓
Feature API
   ↓
V2 BE validation
```

Client validation is for fast feedback, not security.

Schemas mirror the BE contract for:

- profile updates;
- catalog CRUD;
- booking creation/editing;
- settings;
- refunds;
- query parameters where useful.

The FE must tolerate server-side validation even when client validation passes.

---

## 10. Access control

The FE uses the session role for UX and route protection:

| Access | FE behavior |
|---|---|
| Public | Render |
| Customer | Anonymous → `/login` |
| Staff | Non-staff → `/` |
| Admin | Non-admin → `/` |

A hidden navigation item is **not** a security boundary. The BE remains authoritative.

---

## 11. Loading, empty, and error states

Every query-backed screen explicitly handles:

```text
Loading → Skeleton / loading state
Empty   → Useful empty state
Error   → Error UI / mapped message
Success → Data view
```

`404 NOT_FOUND` for a detail route becomes the route's not-found state rather than a generic toast.

Mutation errors are mapped through `error-handling.md`.

---

## 12. Booking flow

The primary customer flow is:

```text
Location / Workspace
       ↓
Availability
       ↓
Select date + time
       ↓
Booking review
       ↓
Server quote / create booking
       ↓
Payment method
       ↓
PayBridge checkout
       ↓
Confirmation
```

Rules:

- availability comes from `GET /workspaces/:id/availability`;
- booking creation does not accept a client-supplied amount;
- the FE never assumes a slot is reserved merely because it was displayed as available;
- `409 BOOKING_SLOT_TAKEN` returns the user to an availability-aware state;
- payment confirmation is driven by the payment status returned by the BE.

---

## 13. Admin catalog flow

```text
Admin shell
   ├── Locations
   ├── Workspaces
   └── Amenities
```

CRUD mutations invalidate the relevant list/detail queries.

Delete actions show the server's conflict reason:

- location with workspaces → cannot delete;
- workspace with active bookings → cannot delete;
- amenity in use → cannot delete.

No client-side workaround bypasses these constraints.

---

## 14. Payments

The FE consumes:

- `GET /payment-methods`;
- `POST /bookings/:id/payments`;
- `GET /bookings/:reference/payment`;
- admin payment list/detail/refund endpoints.

The FE does **not** implement PayBridge request signing or webhook verification. Those are BE responsibilities.

A payment checkout response supplies the `checkoutUrl`; the FE navigates the customer to that checkout and later reads the booking/payment state.

---

## 15. Reports

Report data is already aggregated by the BE.

The FE renders:

- overview tiles;
- daily/weekly/monthly revenue;
- occupancy;
- payment summaries;
- admin activity;
- CSV export action.

The FE must not fetch every booking and calculate business aggregates in the browser.

---

## 16. Code-quality rules

- TypeScript strict mode.
- Feature boundaries enforced by ESLint.
- No feature imports another feature's private `*.api.ts`.
- `components/ui` never imports feature modules.
- Shared/lib layers never import features.
- Prefer files below 400 lines.
- No magic booking/configuration values outside shared constants.
- No duplicated API clients.
- No direct network access from presentational components.

See `fe-architecture.md`, `linter.md`, and `testing.md`.

---

## 17. Definition of done

A FE feature is complete only when:

- [ ] its screens/routes are documented;
- [ ] all required BE endpoints are mapped;
- [ ] query keys and invalidation are documented;
- [ ] forms mirror the API contract;
- [ ] loading/empty/error states exist;
- [ ] access rules are wired;
- [ ] money/date rules are respected;
- [ ] unit/integration tests cover important logic;
- [ ] an E2E test covers critical user behavior where applicable;
- [ ] no direct component-to-API `fetch` exists;
- [ ] documentation matches the implemented contract.
