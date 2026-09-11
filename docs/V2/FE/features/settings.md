# TerraSpace FE — Settings (V2)

**Feature:** `src/features/settings/`  
**Consumes:** BE `features/settings.md` — 3 endpoints.

## 1. Screens

| Screen | Kind | Access |
|---|---|---|
| Booking configuration | Internal feature data | Public/customer |
| Admin settings | Panel | Admin |

The public settings endpoint is consumed by booking/catalog UI but does not need a customer-facing settings page.

## 2. Components

| Component | Purpose |
|---|---|
| `admin-settings-form.tsx` | Edit singleton settings — V1's version (`admin-settings.tsx`) groups fields into labeled sections (General, Booking Rules, Payments, Notifications) with a label/value row per field, and a "Save Changes" button that shows a spinner then a transient success checkmark; that grouped-section layout is worth keeping. It also uses a hand-rolled toggle switch for the notifications field rather than the Radix `Switch` primitive — V2 should use a real `switch.tsx` (not yet in `components/ui/`, see `frontend-spec.md` §2) instead of reproducing the custom one |
| `booking-policy-summary.tsx` | Optional display of booking/cancellation policy |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `usePublicSettings()` | `GET /settings/public` | `settings.public()` |
| `useAdminSettings()` | `GET /admin/settings` | `settings.admin()` |
| `useUpdateSettings()` | `PUT /admin/settings` | invalidates public + admin settings |

Public settings are cached for approximately 5 minutes because the BE contract describes them as slow-changing configuration.

## 4. Values used by the FE

Public response includes:

- `companyName`;
- `supportEmail`;
- `currency`;
- `currencyExponent`;
- `taxPercent`;
- `cancellationWindowHours`;
- `advanceBookingDays`;
- `minimumBookingDurationMinutes`;
- `bookingAccessBufferMinutes`.

The FE uses these values instead of hardcoding the corresponding business rules.

## 5. Admin form

The admin form mirrors:

- company name;
- support email;
- currency;
- tax percent;
- cancellation window;
- advance booking days;
- email notification setting.

Currency must be an uppercase ISO 4217 code supported by the BE's exponent table.

**Do not carry over V1's currency field behavior.** `admin-settings.tsx` today renders currency as a *disabled* select permanently locked to USD — a leftover from before the platform standardized on IDR. V2's BE defaults to and is built around IDR (`frontend-spec.md` §8), and `PUT /admin/settings` genuinely accepts any BE-supported currency, so the V2 field must be a real, editable select — not disabled, and not defaulting to USD.

## 6. States & edge cases

| Case | Behavior |
|---|---|
| Settings unavailable | Show configuration error; do not silently invent tax/cancellation values |
| Currency rejected | Show server validation error |
| Settings updated | Invalidate both public and admin settings |
| Tax changed | New booking quotes use the refreshed setting; existing booking snapshots remain unchanged |

## 7. Notes

`src/shared/constants.ts` may contain UI constants, but it must not be the source of truth for database-backed booking configuration.
