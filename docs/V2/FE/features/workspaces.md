# TerraSpace FE — Workspaces (V2)

**Feature:** `src/features/workspaces/`  
**Consumes:** BE `features/workspaces.md` — 7 endpoints.

## 1. Screens

| Screen | Kind | Route | Access |
|---|---|---|---|
| Workspace/catalog results | Page/section | catalog context | Public |
| Workspace detail | Page | `/workspaces/$id` | Public |
| Availability selector | Component | workspace/booking flow | Public |
| Admin workspaces | Panel | admin shell | Admin |
| Workspace create/edit | Dialog/page | admin context | Admin |

## 2. Components

| Component | Purpose |
|---|---|
| `workspace-card.tsx` | Horizontal card (image left, details right on `sm:flex-row`): type badge + `AvailabilityBadge`, name, location + floor, amenity chips, operating hours, price/hour, "Details" (outline) + "Book" (`bg-galaxy-accent`, disabled when unavailable) buttons. "Book" while signed out routes to `/login?redirect=...`, not straight to booking (was `frontend/site/cards.tsx`'s `WorkspaceCard`). |
| `availability-badge.tsx` | 4 fixed states — `available` (success), `limited` (warning), `full` (muted), `unavailable` (destructive) — pill with a filled dot. One shared component; do not reinvent per screen (was `frontend/site/availability-badge.tsx`). |
| `search-module.tsx` | Search bar: location select (hidden when only one location exists), date, time, workspace-type select, submit — navigates to the catalog with search params (was `frontend/site/search-module.tsx`). |
| `workspace-detail.tsx` | Full workspace information |
| `availability-picker.tsx` | Date and available intervals |
| `workspace-filters.tsx` | Type, price, amenity, availability filters |
| `admin-workspace-table.tsx` | Paginated admin catalog |
| `admin-workspace-form.tsx` | Create/edit workspace |
| `workspace-delete-dialog.tsx` | Delete with conflict handling |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useWorkspaces(params)` | `GET /workspaces` | `workspaces.list(params)` |
| `useWorkspace(id)` | `GET /workspaces/:id` | `workspaces.detail(id)` |
| `useWorkspaceAvailability(id, date)` | `GET /workspaces/:id/availability` | `workspaces.availability(id,date)` |
| `useAdminWorkspaces(params)` | `GET /admin/workspaces` | `workspaces.adminList(params)` |
| `useCreateWorkspace()` | `POST /admin/workspaces` | invalidates workspace/catalog lists |
| `useUpdateWorkspace()` | `PATCH /admin/workspaces/:id` | invalidates detail + lists |
| `useDeleteWorkspace()` | `DELETE /admin/workspaces/:id` | invalidates lists |

The public list supports location, type, availability, amenities, price, sorting, pagination.

## 4. Forms & validation

The form mirrors the BE create/update contract:

- `locationId`;
- `name`;
- `type`;
- `floor`;
- `pricePerHour`;
- `availability`;
- `simpleBooking`;
- `imageUrl`;
- `description`;
- `cancellationPolicy`;
- `amenityIds`.

`imageUrl` is a hosted URL. V2 does not define a multipart image-upload endpoint, so the FE must not invent one. V1's admin form widget (`ImageField`, `frontend/admin/admin-form-fields.tsx`) works within that constraint already — it lets the admin either paste a real URL or pick a local file, converting the file to a `data:` URI client-side and writing that string into the same `imageUrl` field. That's a legitimate way to satisfy "just a URL string" without a real upload endpoint; V2's `components/admin-fields/image-field.tsx` (§2 of `fe-architecture.md`) should keep this behavior rather than assume a file-upload API exists.

## 5. Availability behavior

`GET /workspaces/:id/availability?date=YYYY-MM-DD` returns computed free intervals.

The FE displays intervals, not raw booking records.

Do not expose:

- booking IDs;
- booking references;
- customer names;
- internal booking rows.

Availability should be refetched after relevant booking mutations.

## 6. States & edge cases

| Case | Behavior |
|---|---|
| No availability | Show a useful empty state and allow another date |
| Slot taken during checkout | Handle `409 BOOKING_SLOT_TAKEN`, refresh availability |
| Disabled workspace | Never show it in the public catalog |
| Inactive location | Public API already excludes it; FE does not duplicate filtering |
| Delete with active bookings | Surface `409`, do not retry as another operation |
| Price changes | New catalog data uses the new price; existing bookings remain unchanged |

## 7. Notes

Do not use capacity as a booking requirement. The customer flow is focused on selecting the single bookable space and its available time.
