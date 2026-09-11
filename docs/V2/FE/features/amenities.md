# TerraSpace FE — Amenities (V2)

**Feature:** `src/features/amenities/`  
**Consumes:** BE `features/amenities.md` — 5 endpoints.

## 1. Screens

| Screen | Kind | Access |
|---|---|---|
| Amenity filters | Component | Public |
| Admin amenities | Panel | Admin |

Amenities are not a standalone customer page. They are catalog metadata used by workspace/location filters and detail views.

## 2. Components

| Component | Purpose |
|---|---|
| `amenity-filter.tsx` | Filter chips/select for public catalog |
| `amenity-list.tsx` | Reusable amenity display |
| `amenity-multi-select.tsx` | Pill-toggle multi-select sourced from the live amenity catalog — exported via `index.ts` so `locations`/`workspaces` admin forms consume it directly rather than each owning a copy (was `frontend/admin/admin-form-fields.tsx`'s `AmenityMultiSelect`; see `fe-architecture.md` §2/§7 for why this one lives here and not in `components/admin-fields/`) |
| `admin-amenity-table.tsx` | Admin list with status and usage — V1's version (`admin-amenities.tsx`) is a flat icon/name/category·status list with edit/delete, not a data-grid; that simple shape is fine to keep |
| `admin-amenity-form.tsx` | Create/edit name, category, icon, status |
| `amenity-delete-dialog.tsx` | Confirm deletion and explain `AMENITY_IN_USE` |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useAmenities(params)` | `GET /amenities` | `amenities.list(params)` |
| `useAdminAmenities(params)` | `GET /admin/amenities` | `amenities.adminList(params)` |
| `useCreateAmenity()` | `POST /admin/amenities` | invalidates `amenities.all()` |
| `useUpdateAmenity()` | `PATCH /admin/amenities/:id` | invalidates detail/list + affected catalog |
| `useDeleteAmenity()` | `DELETE /admin/amenities/:id` | invalidates `amenities.all()` + catalog |

Public data contains only active amenities. Admin data can include inactive amenities and usage counts.

## 4. Forms & validation

Create/update mirrors the BE:

- `name`: required, trimmed, 1–100, unique;
- `category`: optional, max 50, default `General`;
- `icon`: optional, known icon key, default `tag`;
- `status`: `active | inactive`.

The FE validates before submission, but uniqueness and allowed icon keys remain server-enforced.

## 5. States & edge cases

| Case | Behavior |
|---|---|
| Duplicate name | Show conflict on the name field |
| Amenity in use | Disable/confirm delete and surface `409 AMENITY_IN_USE` |
| Inactive amenity | Hidden from public filters |
| Rename | Existing workspace/location relationships continue to work because they reference the amenity ID |

## 6. Notes

When a location/workspace form submits `amenityIds`, this feature owns the selector UI but the parent catalog feature owns the mutation payload.
