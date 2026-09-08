# Locations API

**Owns:** `locations`, `location_amenities` · Conventions: [`README.md`](./README.md)

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/locations` | Public |
| 2 | `GET` | `/locations/:slug` | Public |
| 3 | `GET` | `/admin/locations` | Admin |
| 4 | `POST` | `/admin/locations` | Admin |
| 5 | `PATCH` | `/admin/locations/:id` | Admin |
| 6 | `DELETE` | `/admin/locations/:id` | Admin |

---

## 1. `GET /locations`

Active venues for the public site. **Access:** Public.

### Query

| Param | Type | Default | Notes |
|---|---|---|---|
| `city` | string | — | Exact match, case-insensitive |
| `q` | string | — | Search `name`, `address`, `city` |
| `amenityId` | UUID | — | Repeatable; matches locations having **all** listed amenities |

Not paginated — the venue count is small and bounded. Only `status = 'active'` is returned.

### Response `200`

```json
{
  "data": [
    {
      "id": "b1e2…",
      "slug": "terraspace-jakarta",
      "name": "TerraSpace Jakarta",
      "address": "Jl. Sudirman 52",
      "city": "Jakarta",
      "imageUrl": "https://…/jakarta.jpg",
      "openingHours": "Mon–Sun 09:00–22:00",
      "access247": false,
      "description": "Central Jakarta coworking …",
      "latitude": "-6.208800",
      "longitude": "106.845600",
      "timezone": "Asia/Jakarta",
      "amenities": [
        { "id": "a1…", "name": "Wi-Fi", "nameId": "Wi-Fi", "category": "Connectivity", "icon": "wifi" },
        { "id": "a2…", "name": "Parking", "nameId": "Parkir", "category": "Facility", "icon": "car" }
      ],
      "stats": {
        "desksTotal": 24, "desksAvailable": 18,
        "roomsTotal": 6,  "roomsAvailable": 4,
        "occupancy": 27,
        "priceFrom": "12000.00",
        "types": ["hot_desk", "meeting_room", "private_office"],
        "availability": "limited"
      }
    }
  ]
}
```

### `stats`

Aggregated server-side in SQL, not by shipping every workspace to the browser.

| Field | Meaning |
|---|---|
| `desksTotal` / `desksAvailable` | Workspace type in (`hot_desk`, `dedicated_desk`) |
| `roomsTotal` / `roomsAvailable` | All other types |
| `occupancy` | `(total − available) / total × 100`, integer percent |
| `priceFrom` | Lowest `pricePerHour` above 0; `"0.00"` if none |
| `types` | Distinct workspace types present |
| `availability` | `available` (all free) · `limited` (some) · `unavailable` (none) |

Counts include **all** workspaces regardless of `availability`, so a venue with everything temporarily disabled still shows its real catalog size and price. This mirrors the fix documented at `catalog.ts:106` — filtering disabled workspaces before aggregating made locations display "Starting from $0.00" and "Temporarily unavailable" even when correctly configured.

> **Replaces `getPublicCatalog`.** That single call returned every location, every workspace and every amenity in one payload. It is split into `/locations`, `/workspaces` and `/amenities`, each independently filterable and cacheable.

---

## 2. `GET /locations/:slug`

Detail page. **Access:** Public. `:slug` is the URL identifier (`terraspace-jakarta`).

### Response `200`

Same object as above, plus:

```json
{
  "accessRadiusMeters": 50,
  "workspaces": [
    { "id": "8f14…", "name": "Hot Desk 12", "type": "hot_desk", "floor": "2",
      "pricePerHour": "12000.00", "currency": "IDR", "availability": "available",
      "imageUrl": null, "simpleBooking": true,
      "amenities": [{ "id": "a1…", "name": "Wi-Fi", "icon": "wifi" }] }
  ]
}
```

`workspaces` excludes `availability = 'disabled'`. For filtering or paging beyond this, use `GET /workspaces?locationId=`.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such slug, or `status = 'inactive'` |

---

## 3. `GET /admin/locations`

**Access:** Admin. Every location including `inactive`.

### Query

| Param | Type | Notes |
|---|---|---|
| `status` | enum | `active` · `inactive` |
| `q` | string | Search name / city / slug |

### Response `200`

Public fields plus `status`, `createdAt`, `updatedAt`, and `workspaceCount` — the last so the console can warn before a delete that would be rejected.

```json
{
  "data": [
    { "id": "b1e2…", "slug": "terraspace-jakarta", "name": "TerraSpace Jakarta",
      "address": "Jl. Sudirman 52", "city": "Jakarta", "imageUrl": "https://…",
      "openingHours": "Mon–Sun 09:00–22:00", "access247": false, "description": "…",
      "latitude": "-6.208800", "longitude": "106.845600", "accessRadiusMeters": 50,
      "timezone": "Asia/Jakarta", "status": "active", "workspaceCount": 30,
      "amenityIds": ["a1…", "a2…"],
      "createdAt": "2026-08-31T14:00:00.000Z", "updatedAt": "2026-09-01T09:00:00.000Z" }
  ]
}
```

Admin responses carry `amenityIds` rather than expanded objects — the form binds ids directly.

---

## 4. `POST /admin/locations`

**Access:** Admin.

### Request

```json
{
  "slug": "terraspace-bandung",
  "name": "TerraSpace Bandung",
  "address": "Jl. Asia Afrika 8",
  "city": "Bandung",
  "imageUrl": "https://…/bandung.jpg",
  "openingHours": "Mon–Sun 08:00–22:00",
  "access247": false,
  "description": "…",
  "latitude": -6.9175,
  "longitude": 107.6191,
  "accessRadiusMeters": 50,
  "timezone": "Asia/Jakarta",
  "status": "active",
  "amenityIds": ["a1…", "a2…"]
}
```

| Field | Type | Required | Default | Rules |
|---|---|:---:|---|---|
| `slug` | string | ✔ | — | Slugified server-side; **must not reduce to empty**; unique |
| `name` | string | ✔ | — | 1–150, trimmed |
| `address` | string | ✔ | — | Trimmed |
| `city` | string | ✔ | — | 1–100, trimmed |
| `imageUrl` | string\|null | ✖ | `null` | Valid URL |
| `openingHours` | string | ✖ | `"Mon–Sun 09:00–22:00"` | |
| `access247` | boolean | ✖ | `false` | |
| `description` | string | ✖ | `""` | |
| `latitude` | number\|null | ✖ | `null` | −90…90 |
| `longitude` | number\|null | ✖ | `null` | −180…180 |
| `accessRadiusMeters` | int | ✖ | `50` | `> 0` |
| `timezone` | string | ✖ | `"Asia/Jakarta"` | **IANA zone.** Validate against `Intl.supportedValuesOf("timeZone")`; reject fixed offsets like `+07:00` |
| `status` | enum | ✖ | `active` | |
| `amenityIds` | UUID[] | ✖ | `[]` | Each must exist and be `active` |

**Slug handling.** Input is lowercased, non-alphanumerics collapse to `-`, leading/trailing `-` stripped. If the result is empty (punctuation-only, or a non-Latin script), the request is rejected — an empty slug matched the `/locations/` index route and silently produced a location with zero workspaces (`catalog.ts:16-32`).

### Response `201`

The admin object from endpoint 3.

### Errors

| Status | Code | When |
|---|---|---|
| 409 | `CONFLICT` | `slug` already exists |
| 422 | `VALIDATION_FAILED` | Slug reduces to empty; coordinates out of range |

---

## 5. `PATCH /admin/locations/:id`

**Access:** Admin. All fields optional; same types and rules as endpoint 4.

### Response `200`

The updated admin object.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such id |
| 409 | `CONFLICT` | New `slug` taken |

> **Renaming a slug is now safe.** In the current implementation workspaces reference their location by `locationSlug` with no foreign key, so `adminUpdateLocation` has to run a manual `updateMany` cascade inside a transaction (`catalog.ts:296-306`) — and any slug edit that bypassed it orphaned every workspace. V2 keys on `locationId`, so a slug is just a label and the cascade disappears. This is what permanently retires `scripts/fix-orphaned-workspaces.mjs`.

---

## 6. `DELETE /admin/locations/:id`

**Access:** Admin.

### Response `200`

```json
{ "success": true }
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such id |
| 409 | `CONFLICT` | Location still has workspaces |

> **Behaviour change.** Today `adminDeleteLocation` deletes unconditionally, and the Prisma `onDelete: Cascade` on `Workspace.location` takes every workspace with it — silently destroying catalog rows and orphaning booking history. V2's FK is `RESTRICT`: delete the workspaces first, or set `status = 'inactive'` to retire the venue while keeping its bookings intact. Deactivation is the intended path.
