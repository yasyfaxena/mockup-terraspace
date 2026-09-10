# Bookings API

**Owns:** `bookings` · **Core feature** · Conventions: [`README.md`](./README.md)

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `POST` | `/bookings` | Customer |
| 2 | `GET` | `/bookings` | Customer |
| 3 | `GET` | `/bookings/:reference` | Customer |
| 4 | `PATCH` | `/bookings/:id/cancel` | Customer |
| 5 | `GET` | `/admin/bookings` | Staff |
| 6 | `GET` | `/admin/bookings/:id` | Staff |
| 7 | `POST` | `/admin/bookings` | Staff |
| 8 | `PATCH` | `/admin/bookings/:id` | Staff |
| 9 | `DELETE` | `/admin/bookings/:id` | **Admin** |
| 10 | `GET` | `/admin/bookings/calendar` | Staff |

---

## 1. `POST /bookings`

Create a booking. **Access:** Customer.

### Request

```json
{
  "workspaceId": "8f14e45f-ceea-467a-9c4b-2d3a1b9e7c11",
  "bookingDate": "2026-09-15",
  "startTime": "09:00",
  "endTime": "12:00"
}
```

| Field | Type | Required | Rules |
|---|---|:---:|---|
| `workspaceId` | UUID | ✔ | Must exist; `availability` must be bookable |
| `bookingDate` | `YYYY-MM-DD` | ✔ | Not in the past; within `advanceBookingDays` |
| `startTime` | `HH:mm` | ✔ | |
| `endTime` | `HH:mm` | ✔ | `> startTime`; gap ≥ 30 min; no midnight crossing |

> **No amount field.** The current `createBooking` accepts `total` from the client and writes it unchecked — a crafted request books anything for `0`. In V2 the server computes the amount from `workspaces.pricePerHour` and `adminSettings.taxPercent`, and the client cannot influence it. Show the quote from `GET /workspaces/:id` before submitting; the response below is authoritative.

> **No `paymentMethod` field either.** `bookings.payment_method` was removed from the schema (erd-spec.md §13, [`payments.md`](./payments.md) §2) — the flat `card`/`ewallet`/`bank` enum can't express PayBridge's real method codes. There is nothing on `bookings` to write it to until Phase 6's payments feature exists; method selection happens when the client later calls `POST /bookings/:id/payments`. `paymentStatus` is likewise **not settable here** — it stays `pending` until the payments service writes it.

### Response `201`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reference": "TS-8F3K2A",
  "accessCode": "TS-8F3K2A-4XQ9",
  "status": "pending",
  "bookingDate": "2026-09-15",
  "startTime": "09:00",
  "endTime": "12:00",
  "durationHours": "3.00",
  "unitPrice": "50000.00",
  "subtotalAmount": "150000.00",
  "taxAmount": "16500.00",
  "totalAmount": "166500.00",
  "currency": "IDR",
  "paymentStatus": "pending",
  "workspace": {
    "id": "8f14e45f-ceea-467a-9c4b-2d3a1b9e7c11",
    "name": "Meeting Room A",
    "type": "meeting_room",
    "floor": "3",
    "location": { "id": "…", "slug": "terraspace-jakarta", "name": "TerraSpace Jakarta", "address": "Jl. Sudirman 52", "city": "Jakarta" }
  },
  "createdAt": "2026-09-07T04:12:00.000Z"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Workspace does not exist |
| 409 | **`BOOKING_SLOT_TAKEN`** | Overlaps an existing `pending`/`confirmed` booking |
| 409 | `WORKSPACE_NOT_BOOKABLE` | `availability` is `disabled`, `maintenance` or `full` |
| 409 | `LOCATION_INACTIVE` | Parent location is `inactive` |
| 422 | `BOOKING_IN_PAST` | Start already passed |
| 422 | `BOOKING_TOO_FAR_AHEAD` | Beyond `advanceBookingDays` |
| 422 | `BOOKING_MIN_DURATION` | Under 30 minutes |

### Rules

1. One transaction: read workspace → read settings → compute → insert.
2. `unitPrice` and `currency` are **snapshots**. Later catalog or currency changes never alter this row.
3. `BOOKING_SLOT_TAKEN` comes from the database, not the pre-check — the exclusion constraint is the authority (ERD §13, [`error-handling.md`](../error-handling.md) §8).
4. `reference` and `accessCode` are server-generated and unique.
5. **`status` starts `pending`, not `confirmed`.** The slot is held either way — the exclusion constraint blocks on `status IN ('pending','confirmed')` — but the booking only becomes `confirmed` once [`payments`](./payments.md) processes a `payment_succeeded` webhook. A booking that never gets paid is cancelled by the stale-pending sweep or a `payment_expired` webhook (payments.md §12). Staff-created bookings (§7) are the exception: they default straight to `confirmed`, since they represent walk-ins already served.

**Price calculation**

```text
durationHours  = (endTime − startTime) / 60
unitPrice      = workspaces.pricePerHour        ← snapshot
subtotalAmount = unitPrice × durationHours
taxAmount      = subtotalAmount × adminSettings.taxPercent / 100
totalAmount    = subtotalAmount + taxAmount
```

---

## 2. `GET /bookings`

The authenticated user's own bookings. **Access:** Customer.

### Query

| Param | Type | Default | Notes |
|---|---|---|---|
| `status` | enum | — | `pending` · `confirmed` · `cancelled` · `completed` |
| `scope` | enum | `all` | `upcoming` (date ≥ today, not cancelled) · `past` · `all` |
| `page` / `limit` | int | `1` / `20` | |

### Response `200`

```json
{
  "data": [
    {
      "id": "3fa85f64-…",
      "reference": "TS-8F3K2A",
      "status": "confirmed",
      "bookingDate": "2026-09-15",
      "startTime": "09:00",
      "endTime": "12:00",
      "totalAmount": "166500.00",
      "currency": "IDR",
      "paymentStatus": "pending",
      "canCancel": true,
      "workspace": { "id": "…", "name": "Meeting Room A", "type": "meeting_room", "imageUrl": null,
                     "location": { "slug": "terraspace-jakarta", "name": "TerraSpace Jakarta", "city": "Jakarta" } },
      "createdAt": "2026-09-07T04:12:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

> `canCancel` is computed server-side from `cancellationWindowHours` and current status. Without it, every client re-implements the rule and they drift.

`accessCode` is **not** in the list response — fetch it from endpoint 3 when the pass is opened.

---

## 3. `GET /bookings/:reference`

Full detail for the confirmation page and QR pass. **Access:** Customer (owner only).

`:reference` is the human-readable code (`TS-8F3K2A`), so the confirmation URL is shareable by the owner.

### Response `200`

Same object as the `201` in endpoint 1, plus:

```json
{
  "cancelledAt": null,
  "canCancel": true,
  "cancellationPolicy": "Free cancellation up to 24 hours before start.",
  "accessWindow": { "from": "2026-09-15T08:30:00.000Z", "until": "2026-09-15T12:00:00.000Z" },
  "location": { "latitude": "-6.208800", "longitude": "106.845600", "accessRadiusMeters": 50 }
}
```

`accessWindow.from` is `startTime` minus `bookingAccessBufferMinutes` (30) — early arrival is allowed. `latitude`/`longitude`/`accessRadiusMeters` drive the smart-door geofence.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such reference, **or it belongs to another user** |

> **404, never 403**, for someone else's booking. A 403 confirms the reference exists, which is enough to enumerate them ([`error-handling.md`](../error-handling.md) §12).

---

## 4. `PATCH /bookings/:id/cancel`

**Access:** Customer (owner) or Staff.

No request body.

### Response `200`

```json
{ "id": "3fa85f64-…", "reference": "TS-8F3K2A", "status": "cancelled",
  "cancelledAt": "2026-09-10T02:30:00.000Z", "refundEligible": true }
```

### Errors

| Status | Code | When |
|---|---|---|
| 403 | `BOOKING_CANCELLATION_WINDOW_CLOSED` | Inside `cancellationWindowHours` |
| 404 | `NOT_FOUND` | Not found, or another user's |
| 409 | `BOOKING_ALREADY_CANCELLED` | Already cancelled |

### Rules

1. **Never deletes.** Sets `status = 'cancelled'` and `cancelledAt = now()` — the row is financial history.
2. Cancelling releases the slot: the exclusion constraint's `WHERE status IN ('pending','confirmed')` excludes it immediately.
3. Ownership is checked **in the service**, not middleware — middleware has not loaded the row yet.
4. Staff may cancel any booking; the reason is recorded in the audit log.

---

## 5. `GET /admin/bookings`

**Access:** Staff. Replaces `adminGetBookings`, `adminGetDashboardBookings` and the list half of `adminGetCalendarBookings`.

### Query

| Param | Type | Notes |
|---|---|---|
| `status` | enum | |
| `paymentStatus` | enum | |
| `locationId` | UUID | |
| `workspaceId` | UUID | |
| `userId` | string | |
| `from` / `to` | `YYYY-MM-DD` | `bookingDate` range |
| `q` | string | Search `reference` or customer name/email |
| `sort` | enum | `bookingDate` (default, desc) · `createdAt` · `totalAmount` |
| `page` / `limit` | int | `1` / `20`, max `100` |

### Response `200`

```json
{
  "data": [
    {
      "id": "3fa85f64-…",
      "reference": "TS-8F3K2A",
      "status": "confirmed",
      "paymentStatus": "paid",
      "bookingDate": "2026-09-15",
      "startTime": "09:00",
      "endTime": "12:00",
      "totalAmount": "166500.00",
      "currency": "IDR",
      "customer": { "id": "usr_1", "name": "Ana Putri", "email": "ana@example.com", "company": "Acme" },
      "workspace": { "id": "…", "name": "Meeting Room A",
                     "location": { "id": "…", "name": "TerraSpace Jakarta", "slug": "terraspace-jakarta" } },
      "createdAt": "2026-09-07T04:12:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

> The current implementation returns **every** booking with no limit, and the three near-identical list functions differ only in projection and sort. One filterable endpoint replaces all of them.

---

## 6. `GET /admin/bookings/:id`

**Access:** Staff. Full row plus audit fields.

```json
{
  "id": "3fa85f64-…", "reference": "TS-8F3K2A", "accessCode": "TS-8F3K2A-4XQ9",
  "status": "confirmed", "paymentStatus": "paid",
  "bookingDate": "2026-09-15", "startTime": "09:00", "endTime": "12:00",
  "durationHours": "3.00", "unitPrice": "50000.00", "subtotalAmount": "150000.00",
  "taxAmount": "16500.00", "totalAmount": "166500.00", "currency": "IDR",
  "customer": { "id": "usr_1", "name": "Ana Putri", "email": "ana@example.com", "phone": "+62811…", "company": "Acme" },
  "workspace": { "id": "…", "name": "Meeting Room A", "type": "meeting_room", "floor": "3",
                 "location": { "id": "…", "name": "TerraSpace Jakarta", "slug": "terraspace-jakarta", "city": "Jakarta" } },
  "createdAt": "2026-09-07T04:12:00.000Z",
  "updatedAt": "2026-09-07T04:12:00.000Z",
  "cancelledAt": null
}
```

---

## 7. `POST /admin/bookings`

Staff booking on a customer's behalf (walk-in, phone). **Access:** Staff.

### Request

```json
{
  "userId": "usr_1",
  "workspaceId": "8f14e45f-…",
  "bookingDate": "2026-09-15",
  "startTime": "09:00",
  "endTime": "12:00",
  "status": "confirmed"
}
```

| Field | Type | Required | Default |
|---|---|:---:|---|
| `userId` | string | ✔ | — |
| `workspaceId` | UUID | ✔ | — |
| `bookingDate` | `YYYY-MM-DD` | ✔ | — |
| `startTime` / `endTime` | `HH:mm` | ✔ | — |
| `status` | enum | ✖ | `confirmed` — `pending` or `confirmed` only |

Same `201` shape as endpoint 1 — no `paymentMethod` field, same reasoning as endpoint 1. `paymentStatus` is not accepted here either: it stays `pending`, exactly as a walk-in booked by a customer would, until Phase 6's payments service marks it paid (including for a cash payment taken at the desk — that path is still to be designed there).

### Rules

- Price is server-computed, exactly as endpoint 1 — staff cannot set an arbitrary amount either.
- **`advanceBookingDays` and past-date checks are waived** for staff (retroactive entry for a walk-in already served).
- **`BOOKING_SLOT_TAKEN` is *not* waived.** The exclusion constraint has no bypass; a genuine double-booking must be resolved by moving the other booking.

---

## 8. `PATCH /admin/bookings/:id`

**Access:** Staff. All fields optional; only what is sent changes.

```json
{ "status": "completed", "bookingDate": "2026-09-16",
  "startTime": "10:00", "endTime": "13:00" }
```

| Field | Type | Notes |
|---|---|---|
| `status` | enum | Setting `cancelled` also sets `cancelledAt` |
| `bookingDate` | `YYYY-MM-DD` | Re-checks overlap |
| `startTime` / `endTime` | `HH:mm` | Re-checks overlap; **recomputes** duration and amounts |
| `workspaceId` | UUID | Move to another workspace; re-prices at that workspace's **current** rate |

### Errors

| Status | Code | When |
|---|---|---|
| 409 | `BOOKING_SLOT_TAKEN` | New time overlaps another booking |
| 422 | `BOOKING_MIN_DURATION` | New range under 30 minutes |

> **Changing time or workspace re-prices the booking.** The current `adminUpdateBooking` lets staff edit `startTime`, `endTime` and `totalAmount` independently, so times and money silently diverge. In V2 amounts are always derived; `totalAmount` is not a writable field. Neither are `paymentMethod` (removed from the schema, see endpoint 1) or `paymentStatus` (payments-service-only, see endpoint 7).

---

## 9. `DELETE /admin/bookings/:id`

**Access:** Admin only.

```json
{ "success": true }
```

> Hard delete. **Prefer cancelling** — a deleted booking disappears from every historical revenue report. Available for genuine data errors (test rows, duplicates) and is audit-logged with the actor. Staff cannot reach it.

---

## 10. `GET /admin/bookings/calendar`

Compact payload for the admin calendar. **Access:** Staff.

### Query

| Param | Type | Required | Notes |
|---|---|:---:|---|
| `from` | `YYYY-MM-DD` | ✔ | |
| `to` | `YYYY-MM-DD` | ✔ | Max 92 days from `from` |
| `locationId` | UUID | ✖ | |
| `workspaceId` | UUID | ✖ | |

### Response `200`

```json
{
  "data": [
    { "id": "3fa85f64-…", "reference": "TS-8F3K2A", "status": "confirmed",
      "bookingDate": "2026-09-15", "startTime": "09:00", "endTime": "12:00",
      "workspaceId": "…", "workspaceName": "Meeting Room A", "customerName": "Ana Putri" }
  ]
}
```

Not paginated — bounded by the mandatory date range instead. The `to − from ≤ 92 days` cap is what makes that safe; the current `adminGetCalendarBookings` takes no range and returns every booking ever made.

### Errors

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_FAILED` | Range exceeds 92 days, or `to < from` |

---

## Business rules summary

| Rule | Where enforced |
|---|---|
| No overlapping bookings | **PostgreSQL exclusion constraint** — `23P01` → `BOOKING_SLOT_TAKEN` |
| Minimum 30 minutes | `CHECK` + service |
| No midnight crossing | `CHECK (startTime < endTime)` |
| Within `advanceBookingDays` | Service (waived for staff) |
| Cancellation window | Service |
| Price is server-computed | Service — never accepted from a client |
| `unitPrice` / `currency` snapshotted | Service, at insert |
| Cancel, never delete | Service (delete is admin-only, endpoint 9) |
| Ownership on read/cancel | **Service**, not middleware |
