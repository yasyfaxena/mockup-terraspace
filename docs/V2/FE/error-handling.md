# TerraSpace — Error Handling (V2 FE)

**Companion:** [`fe-architecture.md`](./fe-architecture.md) · [`state-map.md`](./state-map.md) · [BE `error-handling.md`](../BE/error-handling.md)

> **This is a V2 target, not V1's current behavior.** `lib/api-client.ts`, `ApiError`, `shared/error-codes.ts`, and the global query-client handler below don't exist yet — V1 calls `src/backend/api/*` server functions directly and mostly swallows failures in a bare `try {} catch {}` (e.g. `admin-notifications.tsx`), the exact anti-pattern §1 rules out. Every code block in this document describes what to build, not what's there today.

---

## 1. Principle

> **Queries and mutations throw a typed `ApiError`. One handler turns it into UI.**

This mirrors [BE `error-handling.md`](../BE/error-handling.md) §1 exactly, one layer up the stack: no component parses a fetch response, and no feature builds its own toast copy from scratch.

```text
   fetch (lib/api-client.ts) ──► throws ApiError ──► TanStack Query's onError
                                                            │
                                                ┌───────────┴───────────┐
                                                ▼                       ▼
                                     global handler (toast)   local handler (form field errors)
```

| Layer | Responsibility |
|---|---|
| **`lib/api-client.ts`** | Parses every non-2xx response into one `ApiError` shape. Never lets a raw `Response` or parsed JSON escape |
| **`*.queries.ts`** | Calls the api layer; adds no error handling of its own beyond what TanStack Query's `onError` needs |
| **Global query-client handler** | Toasts anything not explicitly handled locally — the default, not the exception |
| **A form or screen** | Overrides the default only for codes it has a *specific* response to (field errors, a refetch, a redirect) |

Three rules that follow:

- A `try { } catch { }` around a query/mutation call, swallowing the error silently, appears **nowhere**.
- A component never does `if (error.message === "...")` — always `error.code`.
- Every error the user can see has both an EN and ID string (`src/lib/i18n.tsx`) — see §6.

---

## 2. The `ApiError` shape

Mirrors [BE `error-handling.md`](../BE/error-handling.md) §3's envelope, typed on the client:

```ts
// lib/api-client.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId: string,
    public details: Array<{ path: string; message: string }> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err = body?.error;
    throw new ApiError(
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "Something went wrong.",
      res.status,
      err?.requestId ?? "",
      err?.details ?? null,
    );
  }
  return res.json();
}
```

`shared/error-codes.ts` hand-mirrors [BE `error-handling.md`](../BE/error-handling.md) §7's catalog as a frozen object, the same discipline as [BE `linter.md`](../BE/linter.md) §5 Layer 1 — a component switches on `ERROR_CODE.BOOKING_SLOT_TAKEN`, never the bare string.

> **Why a hand-mirrored catalog and not a generated one.** BE and FE are separate deployables; generating types from the live OpenAPI spec is the long-term answer (tracked in [`libraries.md`](./libraries.md) §5) but is not a Phase 0 blocker. Until then, [`testing.md`](./testing.md) §7's contract tests catch drift.

---

## 3. Global handler

```ts
// lib/query-client.ts
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressGlobalError) return;   // the query handles it locally
      handleApiError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.suppressGlobalError) return;
      handleApiError(error);
    },
  }),
});

function handleApiError(error: unknown) {
  if (!(error instanceof ApiError)) {
    toast.error(t("common.somethingWentWrong"));
    return;
  }
  if (error.code === "UNAUTHENTICATED") {
    router.navigate({ to: "/login" });
    return;
  }
  toast.error(t(`errors.${error.code}`, { defaultValue: error.message }));
}
```

A feature opts a specific mutation **out** of the global toast only when it has something better to show — `meta: { suppressGlobalError: true }` on that one call, not a blanket try/catch.

---

## 4. Per-code handling

Every code from [BE `error-handling.md`](../BE/error-handling.md) §7 that the FE can actually receive, and what happens beyond the default toast:

```ts
switch (error.code) {
  case "BOOKING_SLOT_TAKEN":
    // meta.suppressGlobalError: true on this mutation — replaced by a specific toast + refetch
    toast.error(t("booking.slotTaken"));
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.availability(workspaceId, date) });
    break;

  case "BOOKING_CANCELLATION_WINDOW_CLOSED":
    toast.error(t("booking.cancellationClosed"));
    break;

  case "PAYMENT_ALREADY_PENDING":
    // not an error to the user — reuse the returned checkoutUrl instead of a toast
    window.location.href = error.details?.checkoutUrl as string;
    break;

  case "VALIDATION_FAILED":
    error.details?.forEach((d) => form.setError(d.path, { message: t(`validation.${d.path}`, d.message) }));
    break;

  case "UNAUTHENTICATED":
    router.navigate({ to: "/login" });
    break;

  case "FORBIDDEN":
    router.navigate({ to: "/" });
    break;

  case "NOT_FOUND":
    // rendered by the route's notFoundComponent, not a toast — see §5
    break;

  default:
    toast.error(t("common.somethingWentWrong"));
}
```

This table is the FE's mirror of [BE `error-handling.md`](../BE/error-handling.md) §15's "frontend contract" section — that section in the BE spec is the source; this file is where it is actually implemented.

---

## 5. `NOT_FOUND` is a route state, not a toast

A `404` from the API (a booking that does not exist, or [BE `error-handling.md`](../BE/error-handling.md) §12's "someone else's row returns 404, not 403") should render TanStack Router's `notFoundComponent` for that route, not a transient toast that then leaves the user on a blank page. A route whose loader can 404 declares it:

```tsx
export const Route = createFileRoute("/bookings/$reference")({
  loader: ({ params }) => ensureBooking(params.reference),   // throws ApiError NOT_FOUND
  notFoundComponent: () => <BookingNotFound />,
});
```

`error.code === "NOT_FOUND"` from a **mutation** (e.g., cancelling a booking that was just deleted by staff) is still a toast — there is no route to redirect away from mid-action.

---

## 6. i18n — every code needs both languages

`src/lib/i18n.tsx` (unchanged from V1 — see `frontend-spec.md` §2 for how the rest of the app already uses `useI18n()`/`t()`) carries the translation. The rule from [BE `error-handling.md`](../BE/error-handling.md) §3: **the client switches on `code`, never `message`** — `message` is the server's English fallback for an untranslated code, not a display string to parse.

```ts
// src/lib/i18n.tsx — errors namespace
export const errors = {
  en: {
    BOOKING_SLOT_TAKEN: "This time slot was just booked.",
    BOOKING_CANCELLATION_WINDOW_CLOSED: "This booking can no longer be cancelled.",
    // ...
  },
  id: {
    BOOKING_SLOT_TAKEN: "Slot waktu ini baru saja dipesan.",
    BOOKING_CANCELLATION_WINDOW_CLOSED: "Pemesanan ini sudah tidak dapat dibatalkan.",
    // ...
  },
};
```

A code with no translation falls back to `error.message` (English) — acceptable once, but [`development-phases.md`](./development-phases.md) Phase 8 makes a missing translation a review-blocking finding, not a shipped fallback.

---

## 7. Loading, error, and empty states — the three a query-backed view must have

Not part of the `ApiError` flow directly, but the other half of "a query can fail" that a component must render for, beyond the toast:

```tsx
function WorkspaceList() {
  const { data, isPending, isError } = useWorkspaces(filters);

  if (isPending) return <WorkspaceListSkeleton />;
  if (isError) return <InlineErrorState onRetry={() => queryClient.refetchQueries(...)} />;
  if (data.items.length === 0) return <EmptyState message={t("workspaces.empty")} />;
  return <WorkspaceGrid items={data.items} />;
}
```

The global toast in §3 still fires for the same error — this local `isError` branch is the difference between "the page also shows something sensible where the list used to be" and "a toast appeared over an infinite spinner."

---

## 8. Network and offline

| Condition | Handling |
|---|---|
| Request times out / no network | TanStack Query's default retry (3x, exponential backoff) runs first; a final failure is `error instanceof TypeError` (fetch's own network error), routed to a generic "check your connection" toast, not `ERROR_CODE`-keyed |
| API unreachable entirely (BE down) | Same path — the client cannot distinguish "BE down" from "no network," and should not guess |
| A `502`/`504` (`PROVIDER_ERROR` / `PROVIDER_TIMEOUT`, from a PayBridge outage relayed by the BE) | Real message shown ("payment provider unavailable, please retry") — these are operational on the BE side too ([BE `error-handling.md`](../BE/error-handling.md) §5), so the client is allowed to show the real string here, unlike a generic 500 |

---

## 9. What must never happen client-side

| Never | Why |
|---|---|
| Trusting a cached "current price" as the amount to submit | Reintroduces [BE `development-phases.md`](../BE/development-phases.md) Phase 5's closed defect from the other direction — see [`development-phases.md`](./development-phases.md) Phase 5 |
| Showing `error.details` raw JSON to the user | `details` is field-path data for forms, not display copy |
| Logging `ApiError` details to the browser console in production | May contain `requestId`s users could confuse for support-sensitive data; `error-capture.ts` is an SSR stack-recovery utility, not an error-tracking service ([`libraries.md`](./libraries.md) §7) — if a browser Sentry SDK is adopted, report there, otherwise this stays server-log-only |
| A route guard that silently renders nothing on `401`/`403` | Always redirect somewhere legible — §4's `UNAUTHENTICATED`/`FORBIDDEN` handling |

---

## 10. Testing

| What | How |
|---|---|
| `ApiError` parses every documented shape | Unit test against fixtures built from [BE `error-handling.md`](../BE/error-handling.md) §3 |
| Each `ERROR_CODE` branch in §4 | Unit test per case, asserting the side effect (redirect, invalidate, form error) — not just "no crash" |
| Global toast fires for an unhandled code | MSW-mocked 500, assert `toast.error` called once |
| No code is missing a translation | A test iterates `Object.keys(ERROR_CODE)` against both `errors.en` and `errors.id` — see [`testing.md`](./testing.md) §3 |
