# TerraSpace — ERD (V2)

**Database:** PostgreSQL 14+ · **Auth:** Better Auth · **Payments:** PayBridge · **Tables:** 14

> Payment tables (`payments`, `payment_events`, `refunds`) are specified in [`features/payments.md`](./features/payments.md) §2, alongside the PayBridge integration they exist to serve. They are summarized here.

---

## 1. Entity map

```text
IDENTITY (Better Auth)
──────────────────────────────────────────────────────────────

        ┌───────────────┐
        │     USERS     │
        └───┬───┬───┬───┘
            │   │   │
      1:N   │   │   │  1:N
   ┌────────┘   │   └────────┐
   ▼            ▼ 1:N        ▼
┌──────────┐ ┌──────────┐ ┌──────────────────────────────────┐
│ SESSIONS │ │ ACCOUNTS │ │            BOOKINGS              │
└──────────┘ └──────────┘ └────────────────┬─────────────────┘
                                           │
┌───────────────┐                          │ N:1
│ VERIFICATIONS │  (standalone, no FK)     │
└───────────────┘                          │
                                           │
CATALOG                                    │
───────────────────────────────────────────┼──────────────────
                                           ▼
        ┌───────────────┐  1:N   ┌──────────────────┐
        │   LOCATIONS   │───────>│    WORKSPACES    │
        └───────┬───────┘        └─────────┬────────┘
                │ 1:N                      │ 1:N
                ▼                          ▼
     ┌────────────────────┐   ┌─────────────────────┐
     │ LOCATION_AMENITIES │   │ WORKSPACE_AMENITIES │
     └──────────┬─────────┘   └──────────┬──────────┘
                │ N:1                    │ N:1
                └───────────┬────────────┘
                            ▼
                    ┌───────────────┐
                    │   AMENITIES   │
                    └───────────────┘

PAYMENTS (PayBridge)
──────────────────────────────────────────────────────────────

        ┌───────────────┐  1:N   ┌──────────────────┐
        │   BOOKINGS    │───────>│     PAYMENTS     │
        └───────────────┘        └────┬────────┬────┘
                                      │ 1:N    │ 1:N
                                      ▼        ▼
                    ┌──────────────────┐   ┌───────────┐
                    │  PAYMENT_EVENTS  │   │  REFUNDS  │
                    │ (webhook inbox)  │   └─────┬─────┘
                    └──────────────────┘         │ N:1
                                                 ▼
                                            ┌─────────┐
                                            │  USERS  │ (requested_by)
                                            └─────────┘

CONFIGURATION
──────────────────────────────────────────────────────────────
┌────────────────┐
│ ADMIN_SETTINGS │  (singleton, no FK)
└────────────────┘

Core transaction path:   USERS → BOOKINGS → WORKSPACES → LOCATIONS
Money path:              BOOKINGS → PAYMENTS → PAYMENT_EVENTS
```

### Entity summary

| # | Entity | Area | PK | Foreign keys | Purpose |
|---:|---|---|---|---|---|
| 1 | `users` | Identity | `id` `TEXT` | — | Account identity, role, profile fields |
| 2 | `sessions` | Identity | `id` `TEXT` | `user_id` | Active login sessions |
| 3 | `accounts` | Identity | `id` `TEXT` | `user_id` | Login methods; credential password |
| 4 | `verifications` | Identity | `id` `TEXT` | — | Email-verify / password-reset tokens |
| 5 | `locations` | Catalog | `id` `UUID` | — | Physical venues |
| 6 | `workspaces` | Catalog | `id` `UUID` | `location_id` | Bookable resources |
| 7 | `amenities` | Catalog | `id` `UUID` | — | Facility master catalog |
| 8 | `workspace_amenities` | Catalog | `(workspace_id, amenity_id)` | both | Junction — workspace ↔ amenity |
| 9 | `location_amenities` | Catalog | `(location_id, amenity_id)` | both | Junction — location ↔ amenity |
| 10 | `bookings` | Transaction | `id` `UUID` | `user_id`, `workspace_id` | **Core transaction** |
| 11 | `payments` | Payments | `id` `UUID` | `booking_id` | PayBridge charge; keyed by `paybridge_order_id` |
| 12 | `payment_events` | Payments | `id` `UUID` | `payment_id` | Webhook inbox — idempotency + audit |
| 13 | `refunds` | Payments | `id` `UUID` | `payment_id`, `requested_by` | Full or partial refunds |
| 14 | `admin_settings` | Config | `id` `BOOLEAN` | — | Global configuration singleton |

---

## 2. Relationships & referential actions

| # | Child → Parent | Card. | ON DELETE | ON UPDATE | Reason for the delete rule |
|---|---|---:|---|---|---|
| 1 | `sessions.user_id` → `users.id` | N:1 | `CASCADE` | `CASCADE` | Sessions are disposable; they die with the user. |
| 2 | `accounts.user_id` → `users.id` | N:1 | `CASCADE` | `CASCADE` | Login methods are meaningless without the user. |
| 3 | `bookings.user_id` → `users.id` | N:1 | `RESTRICT` | `CASCADE` | Bookings are financial history. Deactivate via `users.banned`, never delete. |
| 4 | `workspaces.location_id` → `locations.id` | N:1 | `RESTRICT` | `CASCADE` | Retire a venue with `status='inactive'`; deleting it would destroy its workspaces. |
| 5 | `bookings.workspace_id` → `workspaces.id` | N:1 | `RESTRICT` | `CASCADE` | Same — booking history must survive catalog changes. |
| 6 | `workspace_amenities.workspace_id` → `workspaces.id` | N:1 | `CASCADE` | `CASCADE` | Link rows have no meaning without the workspace. |
| 7 | `workspace_amenities.amenity_id` → `amenities.id` | N:1 | `RESTRICT` | `CASCADE` | An amenity in use cannot be deleted; set `status='inactive'`. |
| 8 | `location_amenities.location_id` → `locations.id` | N:1 | `CASCADE` | `CASCADE` | Link rows have no meaning without the location. |
| 9 | `location_amenities.amenity_id` → `amenities.id` | N:1 | `RESTRICT` | `CASCADE` | Same as #7. |
| 10 | `payments.booking_id` → `bookings.id` | N:1 | `RESTRICT` | `CASCADE` | A booking with payment history cannot be deleted. Several payments per booking (retry after expiry). |
| 11 | `payment_events.payment_id` → `payments.id` | N:1 | `RESTRICT` | `CASCADE` | Nullable — an event whose `orderId` resolves to nothing is still recorded for investigation. |
| 12 | `refunds.payment_id` → `payments.id` | N:1 | `RESTRICT` | `CASCADE` | Refunds are financial records. |
| 13 | `refunds.requested_by` → `users.id` | N:1 | `RESTRICT` | `CASCADE` | The admin who authorized money leaving the business. |

`verifications` and `admin_settings` have no foreign keys.

> **`ON UPDATE CASCADE` everywhere** is a safety default only — all primary keys are UUIDs or Better Auth-generated strings and are never updated in practice.
>
> **N:M relationships:** `WORKSPACES ↔ AMENITIES` and `LOCATIONS ↔ AMENITIES`, resolved by the two junction tables.

---

## 3. Enum types

```sql
CREATE TYPE user_role              AS ENUM ('customer','staff','admin');
CREATE TYPE location_status        AS ENUM ('active','inactive');
CREATE TYPE amenity_status         AS ENUM ('active','inactive');
CREATE TYPE workspace_type         AS ENUM ('hot_desk','dedicated_desk','private_office','meeting_room','event_space');
CREATE TYPE workspace_availability AS ENUM ('available','limited','full','maintenance','disabled');
CREATE TYPE booking_status         AS ENUM ('pending','confirmed','cancelled','completed');
CREATE TYPE payment_status         AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE payment_method         AS ENUM ('card','ewallet','bank');
```

---

# Tables

## 4. `users`

Identity record. Managed by Better Auth (`role`/`banned` from the admin plugin, `phone`/`company` as additional fields).

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `TEXT` | NO | — | PK |
| `name` | `TEXT` | NO | — | |
| `email` | `TEXT` | NO | — | UK |
| `email_verified` | `BOOLEAN` | NO | `false` | |
| `image` | `TEXT` | YES | `NULL` | |
| `role` | `user_role` | NO | `'customer'` | |
| `banned` | `BOOLEAN` | NO | `false` | |
| `ban_reason` | `TEXT` | YES | `NULL` | |
| `ban_expires` | `TIMESTAMPTZ` | YES | `NULL` | |
| `phone` | `VARCHAR(30)` | YES | `NULL` | |
| `company` | `VARCHAR(150)` | YES | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(email)` | UNIQUE | Login lookup |
| `(role)` | BTREE | Admin/staff listing |

> `id` is generated by Better Auth — no database default.

---

## 5. `sessions`

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `TEXT` | NO | — | PK |
| `user_id` | `TEXT` | NO | — | FK → `users.id` |
| `token` | `TEXT` | NO | — | UK |
| `expires_at` | `TIMESTAMPTZ` | NO | — | |
| `ip_address` | `TEXT` | YES | `NULL` | |
| `user_agent` | `TEXT` | YES | `NULL` | |
| `impersonated_by` | `TEXT` | YES | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(token)` | UNIQUE | Hot path — every authenticated request |
| `(user_id)` | BTREE | Device list / sign out everywhere |
| `(expires_at)` | BTREE | Expired-session cleanup |

---

## 6. `accounts`

One row per login method. Credential password lives here, not on `users` — which is what lets a user hold email+password *and* Google sign-in simultaneously, with no schema change.

| `user_id` | `provider_id` | `account_id` | `password` | OAuth token columns |
|---|---|---|---|---|
| `usr_1` | `credential` | `usr_1` | scrypt hash | `NULL` |
| `usr_1` | `google` | Google subject id | `NULL` | populated |
| `usr_2` | `google` | Google subject id | `NULL` | populated |

`usr_1` above has both methods linked to one identity. Adding another provider later adds rows, never columns.

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `TEXT` | NO | — | PK |
| `user_id` | `TEXT` | NO | — | FK → `users.id` |
| `account_id` | `TEXT` | NO | — | UK (composite) |
| `provider_id` | `TEXT` | NO | — | UK (composite) |
| `password` | `TEXT` | YES | `NULL` | Hash; NULL for OAuth |
| `access_token` | `TEXT` | YES | `NULL` | |
| `refresh_token` | `TEXT` | YES | `NULL` | |
| `id_token` | `TEXT` | YES | `NULL` | |
| `access_token_expires_at` | `TIMESTAMPTZ` | YES | `NULL` | |
| `refresh_token_expires_at` | `TIMESTAMPTZ` | YES | `NULL` | |
| `scope` | `TEXT` | YES | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(provider_id, account_id)` | UNIQUE | One identity per provider |
| `(user_id)` | BTREE | A user's linked login methods |

---

## 7. `verifications`

Email-verification and password-reset tokens. No FK — `identifier` may exist before a user row.

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `TEXT` | NO | — | PK |
| `identifier` | `TEXT` | NO | — | |
| `value` | `TEXT` | NO | — | |
| `expires_at` | `TIMESTAMPTZ` | NO | — | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(identifier)` | BTREE | Token lookup |
| `(expires_at)` | BTREE | Expired-token cleanup |

---

## 8. `locations`

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK |
| `slug` | `VARCHAR(100)` | NO | — | UK |
| `name` | `VARCHAR(150)` | NO | — | |
| `address` | `TEXT` | NO | — | |
| `city` | `VARCHAR(100)` | NO | — | |
| `image_url` | `TEXT` | YES | `NULL` | |
| `opening_hours` | `TEXT` | NO | `'Mon–Sun 09:00–22:00'` | |
| `access_24_7` | `BOOLEAN` | NO | `false` | |
| `description` | `TEXT` | NO | `''` | |
| `latitude` | `NUMERIC(9,6)` | YES | `NULL` | |
| `longitude` | `NUMERIC(9,6)` | YES | `NULL` | |
| `access_radius_meters` | `INTEGER` | NO | `50` | |
| `timezone` | `VARCHAR(64)` | NO | `'Asia/Jakarta'` | **IANA zone** — `Asia/Jakarta` · `Asia/Makassar` · `Asia/Jayapura` |
| `status` | `location_status` | NO | `'active'` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(slug)` | UNIQUE | Public route `/locations/:slug` |
| `(city, status)` | BTREE | Location listing & filtering |

**Checks:** `latitude BETWEEN -90 AND 90` · `longitude BETWEEN -180 AND 180` · `access_radius_meters > 0`

> **Why `timezone` is a column and not a constant.** `bookings` stores `booking_date` (`DATE`) and `start_time` (`TIME`) in **venue-local** terms — there is no zone in the values themselves. Converting one to an absolute instant needs the venue's zone, and Indonesia alone spans three (`Asia/Jakarta` WIB, `Asia/Makassar` WITA, `Asia/Jayapura` WIT). Without this column, "is this booking active right now", the cancellation-window check, and report day-bucketing are all silently wrong for any venue outside the server's zone.
>
> Store the **IANA identifier**, never a fixed offset — offsets change, zones do not. Validate against `Intl.supportedValuesOf("timeZone")` at write time.

---

## 9. `workspaces`

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK |
| `location_id` | `UUID` | NO | — | FK → `locations.id` |
| `name` | `VARCHAR(150)` | NO | — | |
| `type` | `workspace_type` | NO | — | |
| `floor` | `VARCHAR(50)` | NO | `''` | |
| `price_per_hour` | `NUMERIC(12,2)` | NO | `0` | |
| `availability` | `workspace_availability` | NO | `'available'` | |
| `simple_booking` | `BOOLEAN` | NO | `false` | |
| `image_url` | `TEXT` | YES | `NULL` | |
| `description` | `TEXT` | NO | `''` | |
| `cancellation_policy` | `TEXT` | NO | `''` | |
| `calendar_sync_provider` | `VARCHAR(50)` | YES | `NULL` | |
| `qr_provider` | `VARCHAR(50)` | YES | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(location_id, availability)` | BTREE | Bookable workspaces at a location |
| `(type, availability)` | BTREE | Workspace-type filtering |

**Checks:** `price_per_hour >= 0`

> The FK is `location_id`, **not** `location_slug`. A slug is a mutable public identifier; keying on it orphans workspaces whenever a location is renamed.

---

## 10. `amenities`

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK |
| `name` | `VARCHAR(100)` | NO | — | UK |
| `name_id` | `VARCHAR(100)` | YES | `NULL` | |
| `category` | `VARCHAR(50)` | NO | `'General'` | |
| `icon` | `VARCHAR(50)` | NO | `'tag'` | |
| `status` | `amenity_status` | NO | `'active'` | |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(name)` | UNIQUE | No duplicate master rows |
| `(category, status)` | BTREE | Admin catalog filtering |

---

## 11. `workspace_amenities`

Junction resolving `WORKSPACES ↔ AMENITIES`.

| Column | Type | Null | Key |
|---|---|---:|---|
| `workspace_id` | `UUID` | NO | PK, FK → `workspaces.id` |
| `amenity_id` | `UUID` | NO | PK, FK → `amenities.id` |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(workspace_id, amenity_id)` | PK | Workspace → amenities; blocks duplicates |
| `(amenity_id, workspace_id)` | BTREE | Reverse lookup: which workspaces have X |

---

## 12. `location_amenities`

Junction resolving `LOCATIONS ↔ AMENITIES`.

| Column | Type | Null | Key |
|---|---|---:|---|
| `location_id` | `UUID` | NO | PK, FK → `locations.id` |
| `amenity_id` | `UUID` | NO | PK, FK → `amenities.id` |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(location_id, amenity_id)` | PK | Location → amenities; blocks duplicates |
| `(amenity_id, location_id)` | BTREE | Reverse lookup |

---

## 13. `bookings`

Core transaction table.

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK |
| `user_id` | `TEXT` | NO | — | FK → `users.id` |
| `workspace_id` | `UUID` | NO | — | FK → `workspaces.id` |
| `booking_date` | `DATE` | NO | — | |
| `start_time` | `TIME(0)` | NO | — | |
| `end_time` | `TIME(0)` | NO | — | |
| `unit_price` | `NUMERIC(12,2)` | NO | `0` | Price snapshot |
| `duration_hours` | `NUMERIC(6,2)` | NO | `0` | |
| `subtotal_amount` | `NUMERIC(14,2)` | NO | `0` | |
| `tax_amount` | `NUMERIC(14,2)` | NO | `0` | |
| `total_amount` | `NUMERIC(14,2)` | NO | `0` | |
| `currency` | `CHAR(3)` | NO | `'IDR'` | Currency snapshot |
| ~~`payment_method`~~ | — | — | — | **Removed** — the `card`/`ewallet`/`bank` enum cannot express PayBridge's method codes (`BCA_VIRTUAL_ACCOUNT`, `OVO`, …). The truth is `payments.payment_method_code` / `payment_method_category` |
| `payment_status` | `payment_status` | NO | `'pending'` | **Derived.** Mirrors the active payment's state so booking lists need no join; written only by the payments service |
| `status` | `booking_status` | NO | `'pending'` | |
| `reference` | `VARCHAR(50)` | NO | — | UK |
| `access_code` | `VARCHAR(255)` | NO | — | UK |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |
| `cancelled_at` | `TIMESTAMPTZ` | YES | `NULL` | |

**Indexes**

| Index | Type | Purpose |
|---|---|---|
| `(id)` | PK | — |
| `(reference)` | UNIQUE | Confirmation lookup |
| `(access_code)` | UNIQUE | QR / door scan |
| `(user_id, booking_date DESC)` | BTREE | "My bookings" |
| `(workspace_id, booking_date)` | BTREE | Day-view availability |
| `(status, booking_date)` | BTREE | Admin calendar |
| `(payment_status, created_at DESC)` | BTREE | Payment reports |
| `(workspace_id, booking_period)` | **GiST** | Overlap constraint — see below |

**Checks**

- `start_time < end_time`
- `end_time - start_time >= INTERVAL '30 minutes'`
- `unit_price >= 0` · `duration_hours > 0` · `total_amount = subtotal_amount + tax_amount`
- `(status = 'cancelled') = (cancelled_at IS NOT NULL)`

**No-double-booking constraint**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD COLUMN booking_period tsrange
  GENERATED ALWAYS AS (
    tsrange(booking_date + start_time, booking_date + end_time, '[)')
  ) STORED;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (workspace_id WITH =, booking_period WITH &&)
  WHERE (status IN ('pending','confirmed'));
```

`'[)'` bounds mean a booking ending at 12:00 does not clash with one starting at 12:00. The partial `WHERE` releases the slot once a booking is cancelled or completed.

---

## 14. `admin_settings`

Singleton configuration row.

| Column | Type | Null | Default | Key |
|---|---|---:|---|---|
| `id` | `BOOLEAN` | NO | `true` | PK |
| `company_name` | `VARCHAR(150)` | NO | `'TerraSpace'` | |
| `support_email` | `VARCHAR(255)` | YES | `NULL` | |
| `currency` | `CHAR(3)` | NO | `'IDR'` | |
| `tax_percent` | `NUMERIC(5,2)` | NO | `0` | |
| `cancellation_window_hours` | `INTEGER` | NO | `24` | |
| `advance_booking_days` | `INTEGER` | NO | `30` | |
| `email_notifications_enabled` | `BOOLEAN` | NO | `true` | |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | |

**Indexes:** `(id)` PK only — the table holds one row.

**Checks:** `id = true` · `tax_percent BETWEEN 0 AND 100` · `cancellation_window_hours >= 0` · `advance_booking_days >= 0` · `currency ~ '^[A-Z]{3}$'`

---

## 15. Data types

| Data | Type |
|---|---|
| Auth ids (`users`, `sessions`, `accounts`, `verifications`) | `TEXT` — generated by Better Auth |
| Domain ids (`locations`, `workspaces`, `amenities`, `bookings`) | `UUID DEFAULT gen_random_uuid()` |
| Money | `NUMERIC(12,2)` / `NUMERIC(14,2)` — exact decimal, never `FLOAT` |
| Percentage | `NUMERIC(5,2)` |
| Coordinates | `NUMERIC(9,6)` |
| Currency | `CHAR(3)` — ISO 4217 |
| Booking date | `DATE` |
| Times of day | `TIME(0)` — never strings |
| Timestamps | `TIMESTAMPTZ` |
| Status / category | PostgreSQL `ENUM` |

---

## 16. Not modelled

| Entity | Status | Note |
|---|---|---|
| `profiles` | Merged | Folded into `users` (1:1, no independent lifecycle) |
| `availability_slots` | Not needed | Availability is derived from `bookings` — users pick arbitrary start/end times |
| `booking_guests` | Deferred | Product decision pending; the app currently ships guest features |
| `payments` | **Now modelled** | PayBridge integration — see [`features/payments.md`](./features/payments.md) §2 |
| membership / credits | Out of scope | No plan, subscription or credit-ledger entity specified |
