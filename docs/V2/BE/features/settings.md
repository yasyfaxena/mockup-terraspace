# Settings API

**Owns:** `admin_settings` (singleton) · Conventions: [`README.md`](./README.md)

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/settings/public` | Public |
| 2 | `GET` | `/admin/settings` | Admin |
| 3 | `PUT` | `/admin/settings` | Admin |

---

## 1. `GET /settings/public`

The subset of configuration the booking UI needs. **Access:** Public.

### Response `200`

```json
{
  "companyName": "TerraSpace",
  "supportEmail": "support@terraspace.com",
  "currency": "IDR",
  "currencyExponent": 0,
  "taxPercent": "11.00",
  "cancellationWindowHours": 24,
  "advanceBookingDays": 30,
  "minimumBookingDurationMinutes": 30,
  "bookingAccessBufferMinutes": 30
}
```

### Why this endpoint exists

These values drive real client behaviour: the booking form needs `taxPercent` to show a total, the date picker needs `advanceBookingDays` to bound itself, and the cancel button needs `cancellationWindowHours` to know when to disable.

Today they are hardcoded in `src/shared/constants.ts` (`APP_CONFIG`) **and** stored in `admin_settings`, so an admin changing the tax rate updates the database while the UI keeps quoting the old figure. One source of truth removes that class of bug.

**Deliberately excluded:** `emailNotificationsEnabled` and `updatedAt` — internal operational state with no client use.

`currencyExponent` is included because it is needed to interpret money correctly (`IDR` → `0`, `USD` → `2`; see [payments](./payments.md) §3).

Cache for 5 minutes. Values change rarely, and every booking page load reads them.

---

## 2. `GET /admin/settings`

**Access:** Admin.

### Response `200`

```json
{
  "companyName": "TerraSpace",
  "supportEmail": "support@terraspace.com",
  "currency": "IDR",
  "taxPercent": "11.00",
  "cancellationWindowHours": 24,
  "advanceBookingDays": 30,
  "emailNotificationsEnabled": true,
  "updatedAt": "2026-09-01T09:00:00.000Z"
}
```

The row is a singleton (`id = true`). It is **seeded at migration time**, so this endpoint always returns an object.

> `adminGetSettings` currently returns `null` when the row is missing (`settings.ts:12`), which every caller must handle — and if it is ever hit, booking price calculation silently loses its tax rate. Seeding removes the null case entirely.

---

## 3. `PUT /admin/settings`

**Access:** Admin. `PUT`, not `PATCH` — a singleton is replaced, not partially addressed. Omitted fields keep their current value.

### Request

```json
{
  "companyName": "TerraSpace",
  "supportEmail": "support@terraspace.com",
  "currency": "IDR",
  "taxPercent": "11.00",
  "cancellationWindowHours": 24,
  "advanceBookingDays": 30,
  "emailNotificationsEnabled": true
}
```

| Field | Type | Rules |
|---|---|---|
| `companyName` | string | 1–150 |
| `supportEmail` | string\|null | Valid email |
| `currency` | string | **ISO 4217, uppercase, 3 letters, must have a known minor-unit exponent** |
| `taxPercent` | decimal string | `0`–`100`, 2 dp |
| `cancellationWindowHours` | int | `>= 0` |
| `advanceBookingDays` | int | `>= 0` |
| `emailNotificationsEnabled` | boolean | |

### Response `200`

The object from endpoint 2.

### Errors

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_FAILED` | Range violation, or a currency with no known exponent |

### Rules

1. **Existing bookings are unaffected.** Each snapshots `unitPrice` and `currency` at creation (ERD §13). Changing the tax rate or currency here changes only future bookings — never historical revenue.
2. **`currency` must be a code the payment layer understands.** PayBridge takes amounts in minor units, and the conversion needs the currency's exponent. Accepting a currency not in that table would make every checkout fail at charge creation, so it is rejected here instead ([payments](./payments.md) §3).
3. Changing `currency` is always logged as a warning — those bookings keep the old snapshot and will be charged in it. **Implementation note:** the warning does not actually count unpaid bookings first. `bookings.service.js` already depends on `settings` for tax/cancellation-window lookups; querying `bookings` back from `settings` to check for unpaid rows would make the two features import each other, a genuine ESM circular-import hazard (`import/no-cycle`), not just a lint nitpick. Every currency change is warned on unconditionally instead — a currency change with zero unpaid bookings logs one extra (harmless) warning line, which is a smaller cost than a circular dependency between two core features.
4. Every change is audit-logged with the acting admin. These values move money.

> **Field naming.** The current implementation accepts and returns `snake_case` here (`company_name`, `tax_percent`) while other endpoints use `camelCase`. V2 is `camelCase` throughout.
