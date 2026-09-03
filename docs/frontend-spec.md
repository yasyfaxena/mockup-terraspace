# TerraSpace Frontend Specification

## 1. Frontend Stack

- React 19
- TypeScript
- TanStack Start & TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- React Hook Form
- Zod
- Capacitor

## 2. Frontend Architecture

**Selected:** Feature-Based Architecture with Layered Architecture principles.

The frontend is organized by business features while separating UI, logic, data access, and types.

### Why

- Easy to understand and maintain
- Scalable for new features
- Clear separation of concerns
- Avoids unnecessary Clean Architecture complexity

## 3. Project Structure

```text
src/
├── features/
│   ├── auth/
│   ├── booking/
│   ├── workspace/
│   ├── payment/
│   ├── membership/
│   └── analytics/
├── components/
│   ├── ui/
│   └── layout/
├── routes/
├── hooks/
├── lib/
├── shared/
└── assets/
```

Each feature may contain:

```text
feature/
├── components/   # UI
├── hooks/        # React logic/state
├── services/     # API/data access
└── types.ts      # Feature types
```

## 4. Routing

Use **TanStack Router / TanStack Start** with file-based routing.

`src/routes/` remains the routing entry point.

Routes should stay thin and handle:

- Route definition
- Route-level data loading
- Authentication/authorization
- Rendering the feature/page

Business logic belongs in feature modules or server APIs.

## 5. Data & State Management

Use **TanStack Query** for server state such as:

- Workspaces
- Bookings
- Users
- Catalog
- Analytics

Use React state for local UI state such as:

- Modal
- Tabs
- Toggles
- Form inputs

Avoid global state unless multiple unrelated components genuinely require it.

## 6. Forms & Validation

- **React Hook Form** → form handling
- **Zod** → frontend validation
- Server-side validation remains mandatory.

```text
User Input
   ↓
React Hook Form
   ↓
Zod
   ↓
Server Request
   ↓
Server Validation
```

## 7. UI & Styling

Use:

- Tailwind CSS
- Radix UI primitives
- Reusable UI components

Generic components belong in `components/ui/`.

Business-specific components belong inside their feature.

## 8. Code Quality

- Keep components focused on a single responsibility.
- Avoid mixing UI, API calls, validation, and complex business logic.
- Keep custom files generally under **400 lines**.
- Store shared business constants in `shared/constants.ts`.
- Reuse existing utilities instead of creating duplicates.

## 9. Upgrade Strategy

New functionality should be added as isolated features:

```text
features/
├── booking/
├── workspace/
├── payment/
├── membership/
└── access-control/
```

This supports incremental development and reduces regressions.

## 10. Architecture Decision

**Feature-Based Frontend Architecture + Layered principles**

Goals:

- Maintainable
- Scalable
- Testable
- Easy to extend
- Low coupling
- Avoid over-engineering
