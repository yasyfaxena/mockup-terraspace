# TerraSpace — Testing Strategy

## 1. Why Pick and Choose Testing Types?

There are many types of testing (unit, integration, system, functional, UI, usability, compatibility, responsive, performance, security, regression, UAT), but **not all of them are practical to automate at the code level**, and **not all are relevant at this stage of the project**. The ones selected below focus on tests that can actually be written as code (run automatically in CI), and that target the areas with the highest risk if they break: **booking & authentication**.

---

## 2. Testing in Use (priority)

| Type                       | Tool                             | Why it's used                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit Testing**           | Vitest                           | Tests small, isolated functions — e.g. booking price calculation, date helpers, Zod schema validation. Fast to run, catches bugs earliest.                                                                                                                                        |
| **Integration Testing**    | Vitest                           | Tests the connections between layers per the BE architecture (`Route → Controller → Service → Repository → DB`) and the FE→API flow. This matters most because TerraSpace's layered architecture means risk lives at the seams between layers, not just inside a single function. |
| **UI / Component Testing** | React Testing Library + jest-dom | Tests components from the user's perspective (click a button, fill a form, submit) rather than implementation details. Fits booking forms, login, guest forms.                                                                                                                    |
| **Functional Testing**     | _(covered automatically)_        | No separate tool needed — the integration + component tests above already prove each feature (login, booking, CRUD) works as required.                                                                                                                                            |
| **Regression Testing**     | _(covered automatically via CI)_ | No new tool needed — since all the tests above run automatically on every code change (CI), regressions (old features breaking due to new changes) get caught automatically.                                                                                                      |

---

## 3. Testing Package Versions

Checked against the actual `package.json` in the TerraSpace mockup project — **none of these are currently installed.**

| Package                     | In Mockup      | Recommended                    | Reason                                                        |
| --------------------------- | -------------- | ------------------------------ | ------------------------------------------------------------- |
| `vitest`                    | ❌ not present | **`4.x`**                      | v5 is still beta — don't use it yet.                          |
| `@testing-library/react`    | ❌ not present | **`16.3.x`**                   | Fixes type inference for React 19.                            |
| `@testing-library/jest-dom` | ❌ not present | **`6.x`**                      | v7 is only ~2 weeks old, not proven yet.                      |
| `jsdom`                     | ❌ not present | **let Vitest auto-resolve it** | Don't hardcode an old pin (e.g. v26) — it's already outdated. |
| `@vitest/coverage-v8`       | ❌ not present | **`4.x`**                      | Must match the `vitest` core major.minor.                     |

**Finding:** the testing stack hasn't been installed yet, even though it's already a decision made in this spec — this should be set up before any new features are added.

---

## 4. ⏸️ Testing Types Not Automated for Now (and why)

| Type                         | Why it's not a current priority                                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Testing (E2E)**     | Requires a separate tool (Playwright/Cypress) and significant setup effort. Can be added later once core features (booking, auth) are stable — start with just 1-2 critical scenarios (full booking flow), not full coverage. |
| **Usability Testing**        | Qualitative/manual by nature (observing users), not something that can be asserted in code. This belongs to product/design, not the test suite.                                                                               |
| **Compatibility Testing**    | Manual checks on major browsers (Chrome, Safari) at release time are sufficient for now; no need yet for automated cross-browser testing (e.g. BrowserStack).                                                                 |
| **Responsive Testing**       | Already handled at the design level via Tailwind (mobile-first utility classes); a manual visual check is enough, no automated test needed.                                                                                   |
| **Performance Testing**      | Only becomes relevant once there's real traffic. Load testing (k6/Artillery) can be added to the roadmap once the system is live.                                                                                             |
| **Security Testing**         | Most of the risk (input validation, session auth) is already covered by the unit/integration tests above. A full security audit/pentest should be a separate process (not part of the daily test suite), done before go-live. |
| **Acceptance Testing (UAT)** | A manual process with the client/stakeholders for sign-off, not something written as code.                                                                                                                                    |

---

## 5. Feature Testing Priority

1. Booking
2. Authentication / authorization
3. Form & Zod validation
4. Service/business logic
5. Repository/database operations
6. Important UI interactions
7. Error / loading / empty states

---

## 6. Test Folder Structure

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

## 7. Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Recommended CI checks (fastest to slowest, alongside the linter/type-check from the libraries doc):

```bash
npm run test:run
```

---

## 8. Decision Summary

| Area                | Decision                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| Test runner         | Vitest (v4, stable — not the v5 beta)                                       |
| Component testing   | React Testing Library + jest-dom                                            |
| Coverage            | @vitest/coverage-v8                                                         |
| Prioritized testing | Unit, Integration, Component/UI                                             |
| Deferred testing    | E2E, Usability, Compatibility, Responsive, Performance, Security audit, UAT |

**Conclusion:** focus testing on just 3 types that can be automated and directly impact core feature quality (booking & auth), rather than trying to cover all 12 testing types at once. Set up the testing stack (currently missing from the mockup) before building out new features.
