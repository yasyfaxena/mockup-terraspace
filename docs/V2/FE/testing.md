# TerraSpace — Testing (V2 FE)

**Stack:** Vitest · Testing Library · MSW · Playwright

**Companion:** [`fe-architecture.md`](./fe-architecture.md) · [`state-map.md`](./state-map.md) · [`error-handling.md`](./error-handling.md) · [BE `testing.md`](../BE/testing.md)

> **V1 has no frontend test suite at all today** — no `vitest`/Testing Library/MSW/Playwright in `package.json`, no `tests/` directory, no test scripts. Everything below is the proposed V2 setup, built alongside the features it tests, not a description of anything that currently runs.

---

## 1. Four suites, four jobs

| Suite | Dependencies | Speed | Answers |
|---|---|---|---|
| **Unit** | None — no network, no DOM beyond what Testing Library needs | ~1 ms | "Is this hook/mapper/handler correct?" |
| **Integration** | MSW-mocked API, real TanStack Query + Router | ~10–100 ms | "Does the route, the query, and the error path work together?" |
| **Contract** | Real running `BE/` (CI only) | ~seconds | "Does the hand-mirrored schema still match what the API actually returns?" |
| **E2E (regression)** | Real running `BE/`, real browser (Playwright) | ~seconds–minutes | "Does the whole booking flow work, and has a fixed defect come back?" |

The split mirrors [BE `testing.md`](../BE/testing.md) §1 one layer up: unit proves logic, integration proves wiring, and the two suites that need a real `BE/` (contract, E2E) are the frontend's equivalent of "what must be an integration test" — nothing about an API's actual shape can be unit tested.

---

## 2. Folder structure

`tests/` mirrors `src/`, same rule as [BE `testing.md`](../BE/testing.md) §2.

```text
tests/
├── unit/                                   mirrors src/ — no network
│   ├── features/
│   │   ├── bookings/
│   │   │   ├── bookings.queries.test.tsx       MSW-free — mocked query client
│   │   │   ├── use-booking-price.test.ts       pricing display logic
│   │   │   └── bookings.mapper.test.ts
│   │   ├── payments/  locations/  workspaces/  amenities/
│   │   ├── users/     settings/   reports/     auth/
│   └── shared/
│       ├── error-codes.test.ts                 i18n coverage — see §3
│       └── query-keys.test.ts
│
├── integration/                            MSW + real Router + real QueryClient
│   ├── routes/
│   │   ├── booking-review.test.tsx
│   │   ├── workspace-detail.test.tsx
│   │   └── admin-locations.test.tsx
│   └── error-handling/
│       └── global-error-handler.test.tsx       every ERROR_CODE branch — see error-handling.md §4
│
├── contract/                                against a real running BE/ — CI only, see §7
│   └── schemas.contract.test.ts
│
├── e2e/                                     Playwright, real browser + real BE/
│   ├── booking-flow.spec.ts
│   ├── admin-catalog.spec.ts
│   └── regression/                          one file per shipped FE defect — see §5
│       ├── REG-FE-001-price-resubmit-on-edit.spec.ts
│       └── REG-FE-002-stale-availability-after-cancel.spec.ts
│
├── mocks/
│   ├── handlers/                            one file per feature, MSW request handlers
│   │   ├── bookings.handlers.ts
│   │   └── ...
│   └── server.ts                            setupServer(...handlers)
│
└── factories/
    ├── booking.factory.ts   workspace.factory.ts   ...
```

### Naming

| | Convention | Example |
|---|---|---|
| Unit | `<source file>.test.ts(x)` | `bookings.mapper.test.ts` |
| Integration | `<route or flow>.test.tsx` | `booking-review.test.tsx` |
| E2E regression | `REG-FE-<nnn>-<slug>.spec.ts` | `REG-FE-001-price-resubmit-on-edit.spec.ts` |

---

## 3. Unit tests

No network — MSW is not started for this suite. A query hook is tested by supplying a `QueryClient` with the data or error pre-seeded, not by mocking `fetch`.

```tsx
// tests/unit/features/bookings/use-booking-price.test.ts
import { renderHook } from "@testing-library/react";
import { useBookingPrice } from "@/features/bookings/pricing/use-booking-price";

describe("useBookingPrice", () => {
  it("computes the display total from price-per-hour and tax", () => {
    const { result } = renderHook(() =>
      useBookingPrice({ pricePerHour: "50.00", startTime: "09:00", endTime: "12:00", taxPercent: "11.00" }),
    );
    expect(result.current.subtotal).toBe("150.00");
    expect(result.current.total).toBe("166.50");
  });
});
```

### What belongs here

| Covered | Example |
|---|---|
| Display-only pricing/cancellation-window math | `use-booking-price.test.ts` — mirrors [BE `testing.md`](../BE/testing.md) §3's `pricing.service.test.js`, same numbers, different layer |
| Mapper output (API DTO → view model) | `bookings.mapper.test.ts` |
| Every `error.code` branch in [`error-handling.md`](./error-handling.md) §4 | Asserts the side effect (redirect called, toast called, `form.setError` called) — not just "no crash" |
| `shared/query-keys.ts` factory output shape | `query-keys.test.ts` — a key with the wrong param shape breaks invalidation silently |
| **i18n coverage** | `error-codes.test.ts` iterates every `ERROR_CODE` and asserts both `errors.en` and `errors.id` have an entry — the automated form of [`error-handling.md`](./error-handling.md) §6 |

---

## 4. Integration tests

Real `QueryClient`, real TanStack Router, real components — only the network is faked, with MSW intercepting at the `fetch` boundary so `lib/api-client.ts` runs unmodified.

```tsx
// tests/integration/routes/booking-review.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@tests/mocks/server";
import { http, HttpResponse } from "msw";
import { renderRoute } from "@tests/helpers/render-route";

describe("booking review", () => {
  it("shows BOOKING_SLOT_TAKEN and refetches availability, without a page crash", async () => {
    server.use(
      http.post("*/api/v1/bookings", () =>
        HttpResponse.json(
          { error: { code: "BOOKING_SLOT_TAKEN", message: "...", requestId: "req_1", details: null } },
          { status: 409 },
        ),
      ),
    );

    renderRoute("/booking/review", { workspaceId: "ws-1" });
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByText(/just booked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled(); // not stuck submitting
  });
});
```

### What belongs here

| Covered | Example |
|---|---|
| A route's loader + guard + render together | `workspace-detail.test.tsx` |
| Every global-handler branch actually wired to a real mutation | `global-error-handler.test.tsx` |
| Loading/empty/error states from [`error-handling.md`](./error-handling.md) §7 | Render with a delayed/empty/erroring MSW handler, assert the right one shows |
| Cache invalidation from [`state-map.md`](./state-map.md) §3 | After `useCancelBooking` resolves, assert the availability query refetched — via a second MSW handler call count, not by inspecting internals |

---

## 5. Regression tests (E2E)

One Playwright spec per FE defect that actually shipped — the frontend's equivalent of [BE `testing.md`](../BE/testing.md) §5's REG catalog, prefixed `REG-FE-` to keep the two numbering spaces distinct since they track different defects in different repos of the same monorepo.

```ts
/**
 * REG-FE-001 — Stale price resubmitted after editing the time
 *
 * Was: changing the time slot on the review screen kept the previously
 *      computed total in local state and submitted it as a "reference" price,
 *      which the BE ignored — but the UI showed the wrong number to the user
 *      for the whole review step, confusing customers even though the charge
 *      was correct.
 * Fix: the displayed total recomputes from the currently selected time on
 *      every change; nothing about it is cached across a time-slot edit.
 */
test("updates the shown total immediately when the time slot changes", async ({ page }) => {
  await page.goto("/workspaces/ws-1");
  await page.getByLabel("Start time").fill("09:00");
  await page.getByLabel("End time").fill("12:00");
  await expect(page.getByTestId("booking-total")).toHaveText("Rp 166.500");

  await page.getByLabel("End time").fill("14:00");
  await expect(page.getByTestId("booking-total")).toHaveText("Rp 277.500");
});
```

**Not every BE regression test has an FE counterpart.** REG-011 (duplicate webhook delivery) and REG-012 (webhook body re-serialized) are entirely server-to-server — no UI path exercises them, so no `REG-FE-*` spec exists for them ([`development-phases.md`](./development-phases.md) Phase 8 notes this explicitly). A BE regression test earns an FE one only when a user-visible symptom exists.

A regression spec is **never deleted** when the code it guards is refactored — same rule as [BE `testing.md`](../BE/testing.md) §5's closing paragraph.

---

## 6. Mocking the API

One handler file per feature, composed into a single MSW server — analogous to [BE `testing.md`](../BE/testing.md) §6's "tests use a different database," here it is "tests use a fake network, never the real `BE/`," except in §7 and E2E.

```ts
// tests/mocks/handlers/bookings.handlers.ts
export const bookingsHandlers = [
  http.get("*/api/v1/bookings", () => HttpResponse.json({ data: [buildBooking()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } })),
  http.post("*/api/v1/bookings", () => HttpResponse.json(buildBooking(), { status: 201 })),
];
```

```ts
// tests/mocks/server.ts
export const server = setupServer(...bookingsHandlers, ...workspacesHandlers, /* ... */);
```

```ts
// tests/setup/integration-setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` is deliberate: a request MSW does not recognize almost always means a feature added a new endpoint call without adding its handler — better a loud test failure than a silent pass-through.

---

## 7. Contract tests

The one suite that talks to a real `BE/`, and the direct answer to [`development-phases.md`](./development-phases.md) §3's risk that a hand-mirrored Zod schema drifts from the API it mirrors.

```ts
// tests/contract/schemas.contract.test.ts
import { bookingResponseSchema } from "@/features/bookings/bookings.schema";

describe("bookings contract", () => {
  it("GET /bookings/:reference matches the FE's Zod schema", async () => {
    const booking = await seedBookingViaApi();               // real BE/, real Postgres (test instance)
    const res = await fetch(`${API_BASE}/api/v1/bookings/${booking.reference}`, { headers: authHeaders });
    const body = await res.json();

    expect(() => bookingResponseSchema.parse(body)).not.toThrow();
  });
});
```

| Rule | Reason |
|---|---|
| Runs against a real `BE/` instance, never MSW | The thing being tested **is** "does the mock still match reality" — mocking it would test nothing |
| Runs in CI only, not on every local save | Needs a running backend; not part of the fast local loop (§9) |
| One test per shared response shape, not per endpoint | A shape used by 3 endpoints needs 1 contract test, not 3 |
| A failure here blocks merge | This is the drift detector [`libraries.md`](./libraries.md) §5 and [`development-phases.md`](./development-phases.md) risk table both name as the mitigation — treat it as load-bearing, not optional |

---

## 8. Time

Same rule as [BE `testing.md`](../BE/testing.md) §8, one layer up — the cancellation-window countdown shown to the user is untestable against a real clock:

```ts
it("shows the booking as no longer cancellable one minute past the window", () => {
  vi.setSystemTime(new Date("2026-09-15T00:01:00Z"));
  render(<BookingCard booking={buildBooking({ bookingDate: "2026-09-15", startTime: "09:00" })} />);
  expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
});
```

Test both sides of the boundary, matching [BE `testing.md`](../BE/testing.md) §8 exactly — the FE's countdown display must agree with the BE's actual enforcement to the minute, or a customer sees a live "cancel" button that then 403s.

---

## 9. Configuration

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["tests/unit/**/*.test.{ts,tsx}"], environment: "jsdom" } },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/setup/integration-setup.ts"],
        },
      },
      { test: { name: "contract", include: ["tests/contract/**/*.test.ts"], environment: "node" } },
    ],
  },
});
```

```jsonc
{
  "scripts": {
    "test": "vitest run --project unit --project integration",
    "test:unit": "vitest run --project unit",
    "test:contract": "vitest run --project contract",
    "test:e2e": "playwright test tests/e2e"
  }
}
```

`test:watch` (unqualified `vitest`) runs unit + integration only — contract and e2e both need a running `BE/`, so a watch loop never starts one, matching [BE `testing.md`](../BE/testing.md) §9's identical reasoning for its own `test:watch`.

---

## 10. Coverage

| Layer | Target | Rationale |
|---|---|---|
| `*.queries.ts`, `*.mapper.ts` | 90% | Where data-shape bugs and cache-key mistakes live |
| Display-logic hooks (pricing, cancellation window) | 90% | Same reasoning as [BE `testing.md`](../BE/testing.md) §10 — these mirror server rules and must not silently diverge |
| Components (`components/`) | 70% | Rendering is cheaper to eyeball in review than to chase to 90% |
| `routes/*` | Via integration, not unit | A route file is mostly wiring — see [`fe-architecture.md`](./fe-architecture.md) §8 |

A global 80% floor is fine; chasing 100% on presentational components produces tests that assert markup, not behavior.

---

## 11. What not to do

| Anti-pattern | Instead |
|---|---|
| Mocking `useQuery`/`useMutation` themselves | Use a real `QueryClient` + MSW — mocking the library under test proves the mock, not the code |
| Asserting on toast **text** | Assert `toast.error` was called, or assert the translation key resolved — text changes are not a regression |
| Testing that a component "renders" with no assertion on content | Assert the specific role/label/text a user would rely on |
| Skipping the contract suite locally forever | Run it before opening a PR that touches a `*.schema.ts` — CI is the backstop, not the only run |
| Deleting a `REG-FE-*` spec during a refactor | Investigate the failure first — same rule as [BE `testing.md`](../BE/testing.md) §11 |

---

## 12. CI

```bash
npm run check          # format, lint, types — fails in seconds
npm run test:unit      # ~seconds
npm run test           # unit + integration, ~tens of seconds
npm run test:contract  # needs a running BE/ — pull requests and main
npm run test:e2e       # slowest — full browser, full BE/
```

**Required to merge:** unit + integration + contract green. E2E regression runs on pull requests and `main`; a failure there is treated the same as [BE `testing.md`](../BE/testing.md) §12 treats its own regression suite — never optional, never skipped to unblock a merge.
