# Workspaces API

**Owns:** `workspaces`, `workspace_amenities` · Conventions: [`README.md`](./README.md)

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/workspaces` | Public |
| 2 | `GET` | `/workspaces/:id` | Public |
| 3 | `GET` | `/workspaces/:id/availability` | Public |
| 4 | `GET` | `/admin/workspaces` | Admin |
| 5 | `POST` | `/admin/workspaces` | Admin |
| 6 | `PATCH` | `/admin/workspaces/:id` | Admin |
| 7 | `DELETE` | `/admin/workspaces/:id` | Admin |

---

## 1. `GET /workspaces`

Bookable workspaces. **Access:** Public.

### Query

| Param | Type | Default | Notes |
|---|---|---|---|
| `locationId` | UUID | — | |
| `locationSlug` | string | — | Convenience for `/locations/:slug` pages |
| `type` | enum | — | Repeatable. `hot_desk` · `dedicated_desk` · `private_office` · `meeting_room` · `event_space` |
| `availability` | enum | — | Repeatable |
| `amenityId` | UUID | — | Repeatable; matches workspaces having **all** listed |
| `minPrice` / `maxPrice` | decimal | — | Against `pricePerHour` |
| `sort` | enum | `createdAt` | `pricePerHour` · `name` · `createdAt` |
| `order` | enum | `asc` | |
| `page` / `limit` | int | `1` / `20` | Max `100` |

`availability = 'disabled'` and workspaces at `inactive` locations are always excluded.

### Response `200`

```json
{
  "data": [
    {
      "id": "8f14e45f-…",
      "name": "Meeting Room A",
      "type": "meeting_room",
      "floor": "3",
      "pricePerHour": "50000.00",
      "currency": "IDR",
      "availability": "available",
      "simpleBooking": false,
      "imageUrl": "https://…/room-a.jpg",
      "description": "Seats 8, 65\" display …",
      "cancellationPolicy": "Free cancellation up to 24 hours before start.",
      "amenities": [
        { "id": "a3…", "name": "Projector", "nameId": "Proyektor", "category": "Equipment", "icon": "projector" }
      ],
      "location": {
        "id": "b1e2…", "slug": "terraspace-jakarta", "name": "TerraSpace Jakarta",
        "address": "Jl. Sudirman 52", "city": "Jakarta"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
}
```

`currency` comes from `adminSettings.currency` — the display currency for the catalog. The booking snapshots it at creation.

> **`imageUrl` is URL-only**, same as `image` on the user profile (see `users.md`). It links to an already-hosted image; there is no multipart/file upload for workspace photos in this spec yet. If the console needs to upload an image file directly (rather than paste a URL), that needs a separate endpoint (e.g. `POST /admin/workspaces/:id/image` accepting `multipart/form-data`, storing the file, and writing the resulting URL back into `imageUrl`). Not yet defined here — scope as a follow-up.

---

## 2. `GET /workspaces/:id`

Detail page. **Access:** Public.

### Response `200`

The object above, plus a live quote:

```json
{
  "pricing": {
    "pricePerHour": "50000.00",
    "currency": "IDR",
    "taxPercent": "11.00",
    "minimumDurationMinutes": 30,
    "advanceBookingDays": 30
  },
  "calendarSyncProvider": null,
  "qrProvider": "internal"
}
```

> `pricing` exists so the booking form can show an accurate total **before** submitting. The server still recomputes it on `POST /bookings` and its figure wins — this block is for display only, never an input.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such workspace, `disabled`, or location `inactive` |

---

## 3. `GET /workspaces/:id/availability`

Free and busy intervals for one date. **Access:** Public.

### Query

| Param | Type | Required | Notes |
|---|---|:---:|---|
| `date` | `YYYY-MM-DD` | ✔ | Today or later, within `advanceBookingDays` |

### Response `200`

```json
{
  "workspaceId": "8f14e45f-…",
  "date": "2026-09-15",
  "openingHours": { "from": "09:00", "to": "22:00" },
  "minimumDurationMinutes": 30,
  "busy":      [ { "from": "09:00", "to": "10:30" }, { "from": "12:00", "to": "13:00" } ],
  "available": [ { "from": "10:30", "to": "12:00" }, { "from": "13:00", "to": "22:00" } ]
}
```

### Rules

1. Only `pending` and `confirmed` bookings block. Cancelled and completed release the slot.
2. Intervals are half-open `[from, to)` — a booking ending at 12:00 does not clash with one starting at 12:00, matching the `'[)'` bound on the exclusion constraint.
3. `busy` carries **no** booking ids, references or customer names. This is a public endpoint; it must not leak who booked what.
4. Availability is derived, never stored — there is no slot table (ERD §16.4).

> **Replaces `getBookingsForDate`.** That was a `POST` for a read, and it returned raw booking rows including `id`, `status` and `workspaceName`, leaving the client to compute free time. This returns the computed answer over `GET`, so it is cacheable and linkable.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Workspace not found or not bookable |
| 422 | `BOOKING_IN_PAST` | `date` is in the past |
| 422 | `BOOKING_TOO_FAR_AHEAD` | Beyond `advanceBookingDays` |

---

## 4. `GET /admin/workspaces`

**Access:** Admin. Includes `disabled` workspaces and those at inactive locations.

Same query parameters as endpoint 1, plus `status`-agnostic behaviour and `q` (search by name).

### Response `200`

```json
{
  "data": [
    { "id": "8f14e45f-…", "locationId": "b1e2…", "name": "Meeting Room A",
      "type": "meeting_room", "floor": "3", "pricePerHour": "50000.00",
      "availability": "available", "simpleBooking": false,
      "imageUrl": "https://…", "description": "…", "cancellationPolicy": "…",
      "calendarSyncProvider": null, "qrProvider": "internal",
      "amenityIds": ["a3…", "a4…"],
      "activeBookingCount": 12,
      "location": { "id": "b1e2…", "name": "TerraSpace Jakarta", "slug": "terraspace-jakarta" },
      "createdAt": "…", "updatedAt": "…" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
}
```

`activeBookingCount` (non-cancelled) lets the console disable the delete button before the request is rejected. Note it's not a full safety check by itself: it can read `0` for a workspace that still has only cancelled bookings, and delete will still 409 for that workspace (see §7) — the console should treat any booking history, not just `activeBookingCount > 0`, as reason to prefer "disable" over "delete".

---

## 5. `POST /admin/workspaces`

**Access:** Admin.

### Request

```json
{
  "locationId": "b1e2…",
  "name": "Meeting Room B",
  "type": "meeting_room",
  "floor": "3",
  "pricePerHour": "45000.00",
  "availability": "available",
  "simpleBooking": false,
  "imageUrl": "https://…/room-b.jpg",
  "description": "Seats 6 …",
  "cancellationPolicy": "Free cancellation up to 24 hours before start.",
  "calendarSyncProvider": null,
  "qrProvider": "internal",
  "amenityIds": ["a3…"]
}
```

| Field | Type | Required | Default | Rules |
|---|---|:---:|---|---|
| `locationId` | UUID | ✔ | — | Must exist |
| `name` | string | ✔ | — | 1–150, trimmed |
| `type` | enum | ✔ | — | See §1 |
| `floor` | string | ✖ | `""` | Max 50 |
| `pricePerHour` | decimal string | ✖ | `"0.00"` | `>= 0`, 2 dp |
| `availability` | enum | ✖ | `available` | |
| `simpleBooking` | boolean | ✖ | `false` | |
| `imageUrl` | string\|null | ✖ | `null` | Valid URL. **URL-only** — this endpoint does not accept file uploads; see the note under `GET /workspaces` for the planned upload endpoint |
| `description` | string | ✖ | `""` | |
| `cancellationPolicy` | string | ✖ | `""` | |
| `calendarSyncProvider` | string\|null | ✖ | `null` | Max 50 |
| `qrProvider` | string\|null | ✖ | `null` | Max 50 |
| `amenityIds` | UUID[] | ✖ | `[]` | Each must exist and be `active` |

### Response `201`

The admin object from endpoint 4.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | `locationId` does not exist |
| 422 | `VALIDATION_FAILED` | Unknown `type`, negative price, unknown `amenityIds` |

> **Two changes from the current implementation.** `locationSlug` becomes `locationId` — a real foreign key, so a workspace can no longer be created against a location that does not exist (today nothing checks it, which is how orphans appear). And `type` becomes an enum: today it is a free-text string, and the desk-vs-room split is inferred by testing whether the string contains `"desk"` (`catalog.ts:12`), so a typo like `"Hot Dsk"` silently reclassifies it as a room.

---

## 6. `PATCH /admin/workspaces/:id`

**Access:** Admin. All fields optional; same types and rules as endpoint 5.

### Response `200`

The updated admin object.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Workspace or new `locationId` not found |

> Changing `pricePerHour` affects **future** bookings only. Existing rows keep their `unitPrice` snapshot (ERD §13).

---

## 7. `DELETE /admin/workspaces/:id`

**Access:** Admin.

### Response `200`

```json
{ "success": true }
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such workspace |
| 409 | `CONFLICT` | Non-cancelled bookings reference it, or `ON DELETE RESTRICT` rejects the delete |

The application layer blocks the delete with a friendly 409 whenever a non-cancelled booking references the workspace. But `bookings.workspace_id` is `ON DELETE RESTRICT` (erd-spec.md #5) **unconditionally** — the constraint has no notion of booking status, so it blocks the delete for as long as *any* booking row exists, including cancelled ones. In practice this means a workspace can only ever be hard-deleted if it has never had a single booking; a concurrent booking created between the check and the delete is caught the same way. Once a workspace has any booking history, it can never be un-deleted — retire it with `availability = 'disabled'` instead (see below).

Retire a workspace with `availability = 'disabled'` instead — it leaves the catalog and stops accepting bookings while its history stays intact.