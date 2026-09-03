# TerraSpace — Linter, Libraries & Testing

## 1. Linter & Code Quality

### ESLint 9
**Why:**
It's the standard choice for React + TypeScript projects, and v9's flat config is simpler to maintain long-term.

Purpose:
- JavaScript/TypeScript linting
- React Hooks rules (`eslint-plugin-react-hooks`) → prevents common bugs like an incorrect `useEffect` dependency array
- React Refresh rules (`eslint-plugin-react-refresh`) → keeps Vite's HMR (Fast Refresh) working correctly

Packages used:
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `eslint-config-prettier` (so ESLint and Prettier rules don't conflict)

```bash
npm run lint
```

### Prettier
**Why:**
Separates formatting concerns from code-quality concerns. ESLint focuses on bugs/logic, Prettier focuses on writing style (indentation, quotes, etc.) — so there's no style debate between developers.

```bash
npx prettier --check .
```

### TypeScript (strict mode)
**Why:**
Adds a compile-time validation layer before code even runs. Especially useful with Prisma + Zod, since types can flow end-to-end from DB → API → FE.

```bash
npx tsc --noEmit
```

**Decision:** ESLint + Prettier + TypeScript is sufficient. No additional linter needed (e.g. Biome/StandardJS) — it would overlap in function and add complexity without new benefit.

---

## 2. Libraries

**Principle:** only keep/add libraries that genuinely support the current architecture, and **avoid duplicating** libraries for the same purpose (it bloats the bundle and makes the project harder to maintain).

| Category | Selected library | Why no alternative was added |
|---|---|---|
| Forms | React Hook Form | Already efficient (uncontrolled), no need for Formik etc. |
| Validation | Zod | Already integrated with RHF + type inference, no need for Yup etc. |
| ORM | Prisma | Already type-safe with PostgreSQL, no need for Drizzle/TypeORM |
| Data fetching / server state | TanStack Query | Already covers caching & server sync, no need for SWR/Redux-Saga |
| Routing | TanStack Router/Start | File-based, type-safe |
| UI primitives | Radix UI | Headless, accessible by default |
| Styling | Tailwind CSS | Utility-first, pairs well with Radix |
| Notifications | Sonner | Lightweight, sufficient for toast needs |
| Icons | Lucide React | Consistent with the Radix ecosystem |
| Dates | date-fns | Modular, tree-shakable (vs. moment.js) |

> **Note:** Capacitor was removed from the list since TerraSpace is currently **web-only** — there's no need to build a native Android/iOS app yet. It can be added back later if there's a plan to expand into mobile.

---

## 3. Testing Strategy

### Why pick and choose testing types?

There are many types of testing (unit, integration, system, functional, UI, usability, compatibility, responsive, performance, security, regression, UAT), but **not all of them are practical to automate at the code level**, and **not all are relevant at this stage of the project**. The ones selected below focus on tests that can actually be written as code (run automatically in CI), and that target the areas with the highest risk if they break: **booking & authentication**.

### ✅ Testing in use (priority)

| Type | Tool | Why it's used |
|---|---|---|
| **Unit Testing** | Vitest | Tests small, isolated functions — e.g. booking price calculation, date helpers, Zod schema validation. Fast to run, catches bugs earliest. |
| **Integration Testing** | Vitest | Tests the connections between layers per the BE architecture (`Route → Controller → Service → Repository → DB`) and the FE→API flow. This matters most because TerraSpace's layered architecture means risk lives at the seams between layers, not just inside a single function. |
| **UI / Component Testing** | React Testing Library + jest-dom | Tests components from the user's perspective (click a button, fill a form, submit) rather than implementation details. Fits booking forms, login, guest forms. |
| **Functional Testing** | *(covered automatically)* | No separate tool needed — the integration + component tests above already prove each feature (login, booking, CRUD) works as required. |
| **Regression Testing** | *(covered automatically via CI)* | No new tool needed — since all the tests above run automatically on every code change (CI), regressions (old features breaking due to new changes) get caught automatically. |

Additional packages:
- `vitest` — main test runner
- `@testing-library/react` — component rendering & interaction
- `@testing-library/jest-dom` — DOM assertions (`toBeInTheDocument`, etc.)
- `@vitest/coverage-v8` — coverage reporting

### ⏸️ Testing types **not** automated for now (and why)

| Type | Why it's not a current priority |
|---|---|
| **System Testing (E2E)** | Requires a separate tool (Playwright/Cypress) and significant setup effort. Can be added later once core features (booking, auth) are stable — start with just 1-2 critical scenarios (full booking flow), not full coverage. |
| **Usability Testing** | Qualitative/manual by nature (observing users), not something that can be asserted in code. This belongs to product/design, not the test suite. |
| **Compatibility Testing** | Manual checks on major browsers (Chrome, Safari) at release time are sufficient for now; no need yet for automated cross-browser testing (e.g. BrowserStack). |
| **Responsive Testing** | Already handled at the design level via Tailwind (mobile-first utility classes); a manual visual check is enough, no automated test needed. |
| **Performance Testing** | Only becomes relevant once there's real traffic. Load testing (k6/Artillery) can be added to the roadmap once the system is live. |
| **Security Testing** | Most of the risk (input validation, session auth) is already covered by the unit/integration tests above. A full security audit/pentest should be a separate process (not part of the daily test suite), done before go-live. |
| **Acceptance Testing (UAT)** | A manual process with the client/stakeholders for sign-off, not something written as code. |

### Feature Testing Priority

1. Booking
2. Authentication / authorization
3. Form & Zod validation
4. Service/business logic
5. Repository/database operations
6. Important UI interactions
7. Error / loading / empty states

### Test Folder Structure

Tests are kept close to the feature/module they validate:

```text
src/features/<feature>/__tests__/
backend/modules/<module>/__tests__/
```

Example:

```text
src/features/booking/__tests__/
backend/modules/bookings/__tests__/
```

---

## 4. Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "check:type": "tsc --noEmit"
  }
}
```

Recommended CI checks (fastest to slowest):

```bash
npm run lint
npx prettier --check .
npm run check:type
npm run test:run
```

---

## 5. Decision Summary

| Area | Decision |
|---|---|
| Linter | ESLint 9 |
| Formatter | Prettier |
| Type checking | TypeScript (strict) |
| Validation | Zod |
| Test runner | Vitest |
| Component testing | React Testing Library + jest-dom |
| Coverage | @vitest/coverage-v8 |
| Prioritized testing | Unit, Integration, Component/UI |
| Deferred testing | E2E, Usability, Compatibility, Responsive, Performance, Security audit, UAT |

**Conclusion:** keep the existing linting and library stack as-is (no additions needed), and focus testing on just 3 types that can be automated and directly impact core feature quality (booking & auth), rather than trying to cover all 12 testing types at once.
