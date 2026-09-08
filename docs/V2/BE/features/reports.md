# Reports API

**Owns:** no tables — read-only · Conventions: [`README.md`](./README.md)

The one feature that reads across boundaries. It owns nothing, **writes nothing**, and issues aggregate SQL through its own read-only repository ([`be-architecture.md`](../be-architecture.md)).

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/admin/reports/overview` | Staff |
| 2 | `GET` | `/admin/reports/revenue` | Admin |
| 3 | `GET` | `/admin/reports/occupancy` | Admin |
| 4 | `GET` | `/admin/reports/payments` | Admin |
| 5 | `GET` | `/admin/activity` | Staff |
| 6 | `GET` | `/admin/reports/export` | Admin |

---

## The rule this feature exists to enforce

**Aggregation happens in SQL, not in the browser.**

The current implementation inverts this. `adminGetAnalytics` returns **every booking and every profile** so the client can reduce them (`analytics.ts:5-45`); `adminGetClients` returns every profile *and* every booking so the client can join and sum (`customers.ts:74-104`). Both are unbounded: response size grows linearly with the business, and the same reduction is re-implemented in every component that needs it.

Every endpoint below returns numbers that are already computed.

---

## 1. `GET /admin/reports/overview`

Dashboard tiles for a single day. **Access:** Staff.

### Query

| Param | Type | Default |
|---|---|---|
| `date` | `YYYY-MM-DD` | today |
| `locationId` | UUID | all |

### Response `200`

```json
{
  "date": "2026-09-07",
  "currency": "IDR",
  "summary": {
    "bookingsToday": 18,
    "confirmedToday": 15,
    "cancelledToday": 3,
    "revenueToday": "1240000.00",
    "occupancyPercent": 62,
    "newCustomersToday": 4
  },
  "comparison": { "bookingsChangePercent": 12, "revenueChangePercent": -4 },
  "schedule": [
    { "id": "3fa85f64-…", "reference": "TS-8F3K2A", "startTime": "09:00", "endTime": "12:00",
      "status": "confirmed", "paymentStatus": "paid", "totalAmount": "166500.00",
      "workspaceName": "Meeting Room A", "locationName": "TerraSpace Jakarta",
      "customerName": "Ana Putri" }
  ]
}
```

`comparison` is against the same weekday one week earlier — day-over-day is misleading for a business with strong weekday/weekend variation.

`schedule` is capped at 100 rows, ordered by `startTime`. Beyond that, use `GET /admin/bookings`.

**`revenueToday` counts only `paymentStatus = 'paid'`.** Pending checkouts are not revenue.

---

## 2. `GET /admin/reports/revenue`

**Access:** Admin.

### Query

| Param | Type | Required | Default | Notes |
|---|---|:---:|---|---|
| `from` / `to` | `YYYY-MM-DD` | ✔ | — | Max 366 days |
| `groupBy` | enum | ✖ | `day` | `day` · `week` · `month` |
| `locationId` | UUID | ✖ | all | |
| `workspaceType` | enum | ✖ | all | |

### Response `200`

```json
{
  "range": { "from": "2026-08-01", "to": "2026-08-31" },
  "groupBy": "day",
  "currency": "IDR",
  "totals": {
    "grossRevenue": "24180000.00",
    "refundedAmount": "620000.00",
    "netRevenue": "23560000.00",
    "taxCollected": "2394000.00",
    "bookingCount": 312,
    "averageBookingValue": "77500.00",
    "cancellationRate": 8
  },
  "series": [
    { "period": "2026-08-01", "grossRevenue": "820000.00", "refundedAmount": "0.00",
      "netRevenue": "820000.00", "bookingCount": 11 }
  ],
  "byLocation": [
    { "locationId": "b1e2…", "locationName": "TerraSpace Jakarta",
      "netRevenue": "15200000.00", "bookingCount": 198, "sharePercent": 64 }
  ],
  "byWorkspaceType": [
    { "type": "meeting_room", "netRevenue": "12400000.00", "bookingCount": 96, "sharePercent": 53 }
  ]
}
```

### Rules

1. **Revenue is `paymentStatus = 'paid'` only.** `pending` is not money.
2. `refundedAmount` comes from `refunds` where `status = 'succeeded'` ([payments](./payments.md)).
3. `netRevenue = grossRevenue − refundedAmount`. Report net as the headline — gross alone overstates the business.
4. Amounts are summed **per currency**. If bookings exist in more than one currency the response splits into a `byCurrency` array instead of a single `currency` field. Summing across currencies is never done.
5. Rows use each booking's **snapshotted** `totalAmount`, so historical figures never move when the catalog is repriced.
6. Cancelled bookings count toward `cancellationRate` but not revenue.

---

## 3. `GET /admin/reports/occupancy`

Utilization — the number that decides whether to add capacity. **Access:** Admin.

### Query

| Param | Type | Required | Default |
|---|---|:---:|---|
| `from` / `to` | `YYYY-MM-DD` | ✔ | — |
| `locationId` | UUID | ✖ | all |
| `groupBy` | enum | ✖ | `day` |

### Response `200`

```json
{
  "range": { "from": "2026-08-01", "to": "2026-08-31" },
  "totals": { "bookedHours": "1840.00", "availableHours": "4160.00", "occupancyPercent": 44 },
  "series": [ { "period": "2026-08-01", "bookedHours": "62.00", "occupancyPercent": 48 } ],
  "byWorkspace": [
    { "workspaceId": "8f14…", "workspaceName": "Meeting Room A", "type": "meeting_room",
      "locationName": "TerraSpace Jakarta",
      "bookedHours": "148.00", "occupancyPercent": 71, "revenue": "7400000.00" }
  ],
  "leastUtilized": [
    { "workspaceId": "c9d3…", "workspaceName": "Event Space", "occupancyPercent": 6, "revenue": "480000.00" }
  ]
}
```

`availableHours` = open hours per day × bookable workspaces, excluding `disabled` and `maintenance`. Counting unavailable workspaces would understate utilization and make a full venue look half-empty.

`leastUtilized` (bottom 5) is the actionable half — it names what to reprice or repurpose.

---

## 4. `GET /admin/reports/payments`

Financial ledger. **Access:** Admin. Replaces `adminGetPayments` and `adminGetPaymentsDetailed`.

### Query

`from` / `to` · `status` · `provider` · `method` · `q` · `page` / `limit`

### Response `200`

```json
{
  "data": [
    { "paymentId": "9c1f…", "bookingReference": "TS-8F3K2A",
      "status": "paid", "provider": "xendit",
      "paymentMethod": { "code": "BCA_VIRTUAL_ACCOUNT", "category": "virtual_account" },
      "amount": "166500.00", "refundedAmount": "0.00", "netAmount": "166500.00", "currency": "IDR",
      "customerName": "Ana Putri", "customerEmail": "ana@example.com",
      "bookingDate": "2026-09-15",
      "paidAt": "2026-09-07T04:40:00.000Z", "createdAt": "2026-09-07T04:12:00.000Z" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 412, "totalPages": 21 },
  "totals": { "paid": "23560000.00", "refunded": "620000.00", "pending": "1180000.00", "failed": "340000.00" }
}
```

`totals` covers the **entire filtered set**, not the current page — otherwise the figures change as you paginate.

> This reports real payment state. The current `adminGetPayments` infers it from the booking: `booking.status === "cancelled" ? "refunded" : "paid"` (`reports.ts:25`) — so every non-cancelled booking is reported as paid whether or not money arrived, and every cancelled one as refunded whether or not it was. The numbers were never real.

---

## 5. `GET /admin/activity`

Recent-activity feed for the console. **Access:** Staff. Replaces `adminGetNotifications`.

### Query

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | int | `20` | Max 50 |
| `since` | ISO 8601 | — | Only newer entries — for polling |
| `type` | enum | all | Repeatable |

### Response `200`

```json
{
  "data": [
    { "id": "evt_1", "type": "booking_created", "occurredAt": "2026-09-07T04:12:00.000Z",
      "summary": "Ana Putri booked Meeting Room A for 15 Sep",
      "actor": { "id": "usr_1", "name": "Ana Putri" },
      "subject": { "kind": "booking", "id": "3fa85f64-…", "reference": "TS-8F3K2A" } },
    { "id": "evt_2", "type": "payment_succeeded", "occurredAt": "2026-09-07T04:40:00.000Z",
      "summary": "Payment of $166.50 received for TS-8F3K2A",
      "subject": { "kind": "payment", "id": "9c1f…" } }
  ]
}
```

Types: `booking_created` · `booking_cancelled` · `payment_succeeded` · `payment_failed` · `payment_refunded` · `user_registered`.

Use `since` for polling rather than re-fetching the whole feed.

---

## 6. `GET /admin/reports/export`

CSV export for finance. **Access:** Admin.

### Query

| Param | Type | Required | Notes |
|---|---|:---:|---|
| `report` | enum | ✔ | `bookings` · `payments` · `revenue` |
| `from` / `to` | `YYYY-MM-DD` | ✔ | Max 366 days |
| `locationId` | UUID | ✖ | |

### Response `200`

`Content-Type: text/csv` · `Content-Disposition: attachment; filename="payments-2026-08.csv"`

**Streamed**, not buffered — a year of payments will not fit comfortably in memory, and building the whole string first is how an export takes down the API process.

Amounts are unformatted decimals (`166.50`) with a separate `currency` column. Never pre-format money for a spreadsheet.

### Errors

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_FAILED` | Range over 366 days, or `to < from` |

---

## Implementation notes

| Concern | Approach |
|---|---|
| Query style | Prisma `groupBy` / `$queryRaw` for aggregates. **Never** fetch rows to reduce in JS |
| Date bucketing | `date_trunc` in PostgreSQL, not in application code |
| Range caps | Every endpoint bounds its range — this is what keeps them safe without pagination |
| Currency | Group by currency; never sum across |
| Caching | 60s on overview and activity; revenue and occupancy are uncached — finance reads must be current |
| Timezone | Bucket by venue-local date. A booking at 23:00 in Jakarta belongs to that Jakarta day, not the UTC one ([`libraries.md`](../libraries.md) §11) |
| Writes | **None.** If a report needs to mutate state, that logic belongs in the owning feature |
