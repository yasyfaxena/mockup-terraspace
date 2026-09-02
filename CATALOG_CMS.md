# Catalog CMS — Admin ↔ PostgreSQL ↔ Web Client

The catalog is now database-driven. Admin and public pages use the same PostgreSQL database through TanStack Start server functions and Prisma.

## Managed catalog

- Locations
- Workspaces / rooms
- Amenities
- Workspace pricing
- Workspace images via image URL
- Location access coordinates and access radius

## Data flow

`Admin Panel → src/backend → Prisma → PostgreSQL → getPublicCatalog() → Web Client`

There is no static/mock catalog fallback in `src/frontend/data/catalog.ts`.

## Admin operations

Admin CRUD endpoints are protected by `requireAdmin()` and write directly to the shared database:

- `adminCreateLocation`
- `adminUpdateLocation`
- `adminDeleteLocation`
- `adminCreateWorkspace`
- `adminUpdateWorkspace`
- `adminDeleteWorkspace`
- `adminCreateAmenity`
- `adminUpdateAmenity`
- `adminDeleteAmenity`

## Public operations

The customer website calls `getPublicCatalog()` and receives active locations, enabled workspaces, and active amenities from PostgreSQL.

## Database migration

The access configuration migration adds:

- `locations.latitude`
- `locations.longitude`
- `locations.access_radius_meters`

## Important

Do not reintroduce static arrays for website catalog content. If new customer-facing catalog fields are required, add them to Prisma, expose them from the backend catalog function, and consume them from the frontend catalog hook.
