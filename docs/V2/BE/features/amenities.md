# Amenities API

**Owns:** `amenities` · Conventions: [`README.md`](./README.md)

Master catalog of facilities (Wi-Fi, projector, parking). Referenced by both locations and workspaces through junction tables; the junctions themselves are written via those features' `amenityIds` field, not here.

| # | Method | Path | Access |
|---|---|---|---|
| 1 | `GET` | `/amenities` | Public |
| 2 | `GET` | `/admin/amenities` | Admin |
| 3 | `POST` | `/admin/amenities` | Admin |
| 4 | `PATCH` | `/admin/amenities/:id` | Admin |
| 5 | `DELETE` | `/admin/amenities/:id` | Admin |

---

## 1. `GET /amenities`

Active amenities, for filter chips on the public site. **Access:** Public.

### Query

| Param | Type | Notes |
|---|---|---|
| `category` | string | Exact match |

Not paginated — the catalog is small and bounded. Only `status = 'active'` is returned.

### Response `200`

```json
{
  "data": [
    { "id": "a1…", "name": "Wi-Fi", "category": "Connectivity", "icon": "wifi" },
    { "id": "a3…", "name": "Projector", "category": "Equipment", "icon": "projector" }
  ]
}
```

---

## 2. `GET /admin/amenities`

**Access:** Admin. Includes `inactive`.

### Query

| Param | Type | Notes |
|---|---|---|
| `status` | enum | `active` · `inactive` |
| `category` | string | |
| `q` | string | Search `name` |

### Response `200`

```json
{
  "data": [
    { "id": "a1…", "name": "Wi-Fi", "category": "Connectivity",
      "icon": "wifi", "status": "active",
      "usage": { "locations": 3, "workspaces": 28 },
      "createdAt": "2026-08-31T14:00:00.000Z", "updatedAt": "2026-09-01T09:00:00.000Z" }
  ]
}
```

`usage` counts junction rows, so the console can disable the delete button before the request is rejected (endpoint 5).

---

## 3. `POST /admin/amenities`

**Access:** Admin.

### Request

```json
{ "name": "Standing Desk", "category": "Furniture", "icon": "desk", "status": "active" }
```

| Field | Type | Required | Default | Rules |
|---|---|:---:|---|---|
| `name` | string | ✔ | — | 1–100, trimmed, **unique** |
| `category` | string | ✖ | `"General"` | Max 50 |
| `icon` | string | ✖ | `"tag"` | Max 50; must be a known icon key |
| `status` | enum | ✖ | `active` | |

### Response `201`

The admin object from endpoint 2 (with `usage` zeroed).

### Errors

| Status | Code | When |
|---|---|---|
| 409 | `CONFLICT` | `name` already exists |

> **`UNIQUE (name)` is new.** The current schema has no unique constraint, and `adminCreateAmenity` does not check — so "Wi-Fi" can be created repeatedly, and each duplicate appears as a separate filter chip pointing at a different subset of workspaces.

---

## 4. `PATCH /admin/amenities/:id`

**Access:** Admin. All fields optional; same rules as endpoint 3.

### Response `200`

The updated admin object.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such amenity |
| 409 | `CONFLICT` | New `name` taken |

> Renaming propagates everywhere immediately — junction rows reference `amenities.id`, not the label. Under the current `String[]` arrays a rename reaches nothing, leaving every existing workspace showing the old text. This is the practical payoff of normalizing (ERD §16.3).
>
> Setting `status = 'inactive'` hides an amenity from public filters while leaving existing assignments intact. This is the intended way to retire one.

---

## 5. `DELETE /admin/amenities/:id`

**Access:** Admin.

### Response `200`

```json
{ "success": true }
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | No such amenity |
| 409 | `AMENITY_IN_USE` | Assigned to any location or workspace |

The `409` is backed by `ON DELETE RESTRICT` on both junction tables, so a concurrent assignment between check and delete cannot slip through.

> **Behaviour change.** `adminDeleteAmenity` currently deletes unconditionally. Because assignments live in `String[]` columns rather than foreign keys, nothing notices — every workspace keeps a dangling label that no longer resolves to a catalog entry, and the admin UI has no way to find or fix them. Deactivate instead.