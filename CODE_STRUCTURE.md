# TerraSpace Code Structure

## Architecture

- `src/frontend/` — customer UI and admin UI components.
- `src/backend/` — server functions and database-facing operations.
- `src/shared/` — business constants shared by frontend and backend.
- `src/routes/` — TanStack Start file-based route entry points. This folder must remain at this path for automatic routing.
- `src/lib/` — framework/auth/database infrastructure shared by the application.
- `prisma/` — schema and database migrations.

## Source-of-truth rule

Dynamic catalog content must come from PostgreSQL. Do not add static arrays for locations, workspaces, amenities, prices, or membership plans when that content is expected to appear on the customer website.

The intended flow is:

`Admin UI → server function → PostgreSQL → public server function → customer UI`

## Code-size guideline

Custom frontend/backend files should normally stay at **300 lines or fewer**. A small number of existing route/UI files are larger because they contain complete page compositions or framework-generated component patterns; split new business logic into dedicated modules instead of growing those files further.

Generated files such as `src/routeTree.gen.ts` are excluded from this guideline.

## No magic business values

Business defaults and operational limits belong in `src/shared/constants.ts` or in database configuration. Avoid scattering booking durations, access buffers, status values, default units, and identifiers throughout components.

## Database changes

Every schema change must have a Prisma migration. Run:

```bash
npm run db:generate
npm run db:migrate
```

Do not create a second database or a separate mock catalog for the Admin panel.
