# TerraSpace Backend Specification

## 1. Backend Stack

- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- Zod
- Better Auth

## 2. Backend Architecture

**Selected:** Modular Monolith with Layered Architecture.

The backend is organized by business modules while separating HTTP handling, business logic, and database access.

### Why

- Easy to understand and maintain
- Clear separation of concerns
- Scalable for new features
- Simple development and deployment
- Avoids unnecessary Microservices complexity
- Can be migrated to Microservices later if required

## 3. Project Structure

```text
backend/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── locations/
│   ├── workspaces/
│   ├── bookings/
│   ├── guests/
│   ├── payments/
│   ├── membership/
│   └── analytics/
├── middleware/
├── config/
├── database/
├── lib/
│   └── auth.ts
└── app.ts
```

Each module may contain:

```text
module/
├── routes/
├── controller/
├── service/
├── repository/
└── schemas/
```

`lib/auth.ts` holds the Better Auth instance (config, plugins, Prisma adapter binding), imported by the `auth` module and by middleware that needs session access.

## 4. Architecture Layers

Each module follows:

```text
Routes (Express Router)
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

### Routes
Express routers that map HTTP endpoints to controllers.

### Controller
Handles HTTP requests and responses.

### Service
Contains business logic and application rules.

### Repository
Handles database operations through Prisma.

## 5. Database

Use **PostgreSQL** with **Prisma ORM**.

Prisma is responsible for:
- Database access
- Relations
- Type-safe queries
- Migrations

Business logic should not be placed directly inside database queries.

## 6. Validation & Security

- Use Zod for server-side request validation.
- Validate all external input.
- Use **Better Auth** for authentication (session management, credential/password handling, and route protection via middleware).
- Enforce authorization on the backend, using Better Auth session data in an Express middleware guard for protected routes.
- Never trust frontend validation alone.
- Never expose passwords, secrets, or sensitive data.

## 7. Code Quality

- Keep controllers thin.
- Keep business logic inside services.
- Keep database access inside repositories.
- Avoid duplicated business logic.
- Keep custom files generally under **400 lines**.
- Reuse existing utilities.
- Use ESLint and Prettier.

## 8. Upgrade Strategy

New functionality should be added as isolated modules:

```text
modules/
├── booking/
├── workspace/
├── payment/
├── membership/
└── access-control/
```

This allows the backend to grow without significantly affecting existing modules.

## 9. Architecture Decision

**Modular Monolith + Layered Architecture**

Goals:
- Maintainable
- Scalable
- Testable
- Easy to extend
- Low coupling
- Simple deployment
- Avoid over-engineering

Microservices are not required at the current stage.
