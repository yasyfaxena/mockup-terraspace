# TerraSpace — FE Documentation (V2)

This package is the completed frontend documentation set for TerraSpace V2.

## What was completed

The original FE package was missing the frontend specification and the feature documentation for several BE domains. This version aligns the FE with the full V2 BE contract:

- Auth
- Users
- Locations
- Workspaces
- Amenities
- Bookings
- Payments
- Settings
- Reports

The V2 BE defines **61 endpoints**. The FE feature docs map those endpoints to screens, components, hooks, validation, cache invalidation, and edge cases.

## Documents

- [`frontend-spec.md`](./frontend-spec.md) — overall FE contract
- [`fe-architecture.md`](./fe-architecture.md) — folder/layer architecture
- [`state-map.md`](./state-map.md) — server/local state and invalidation
- [`error-handling.md`](./error-handling.md) — error mapping and UI behavior
- [`libraries.md`](./libraries.md) — FE libraries
- [`linter.md`](./linter.md) — linting/code-quality rules
- [`testing.md`](./testing.md) — unit/integration/contract/E2E strategy
- [`development-phases.md`](./development-phases.md) — implementation phases
- [`features/README.md`](./features/README.md) — complete feature map

## V2 scope

Membership and guest-management are not included. The primary customer flow is catalog → availability → booking → payment → confirmation.

## Backend relationship

The FE documentation is designed to live beside the V2 BE documentation in the repository:

```text
docs/
├── FE/
└── BE/
```

Links such as `../BE/...` therefore resolve correctly when these docs are placed in the repository's normal `docs/FE` and `docs/BE` directories.
