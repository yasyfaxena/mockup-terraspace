# TerraSpace FE — Payments (V2)

**Feature:** `src/features/payments/`  
**Consumes:** BE `features/payments.md` — 7 API endpoints plus PayBridge webhook processing owned entirely by BE.

## 1. Screens

| Screen | Kind | Access |
|---|---|---|
| Payment method selection | Page/section | Customer |
| Payment redirect/processing | Page | Customer |
| Payment result | Page/section | Customer |
| Admin payments | Panel | Admin |
| Admin payment detail | Dialog/page | Admin |
| Refund dialog | Dialog | Admin |

## 2. Components

| Component | Purpose |
|---|---|
| `payment-method-list.tsx` | Render methods from the API |
| `payment-status.tsx` | Pending/paid/failed/refunded state |
| `checkout-button.tsx` | Starts payment |
| `payment-result.tsx` | Reads current booking payment state |
| `admin-payment-table.tsx` | Paginated payment list — V1's `admin-payments.tsx` labels statuses in prose ("Successful"/"Failed") rather than the BE's actual `payment_state` enum values (`paid`/`failed`/…, [BE `payments.md`](../../BE/features/payments.md) §2). V2 should map the real enum to a display label in one place (the shared status-badge component, `frontend-spec.md` §2), not invent parallel wording per screen |
| `admin-payment-detail.tsx` | Payment information |
| `refund-dialog.tsx` | Full/partial refund request |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `usePaymentMethods(params)` | `GET /payment-methods` | `payments.methods(params)` |
| `useCreatePayment()` | `POST /bookings/:id/payments` | invalidates booking/payment |
| `useBookingPayment(reference)` | `GET /bookings/:reference/payment` | `payments.booking(reference)` |
| `useAdminPayments(params)` | `GET /admin/payments` | `payments.adminList(params)` |
| `useAdminPayment(id)` | `GET /admin/payments/:id` | `payments.adminDetail(id)` |
| `useRefundPayment()` | `POST /admin/payments/:id/refund` | invalidates payment + booking |

`POST /webhooks/paybridge` is not called by the browser. It is a BE-to-PayBridge callback.

## 4. Checkout flow

```text
Booking created
   ↓
GET /payment-methods
   ↓
Customer selects method
   ↓
POST /bookings/:id/payments
   ↓
BE writes payment row
   ↓
checkoutUrl
   ↓
PayBridge
   ↓
BE webhook
   ↓
booking/payment status
   ↓
FE refetches status
```

The FE must not mark a booking as paid from a redirect query parameter alone.

## 5. Money

The FE receives decimal strings.

For IDR:

```text
"100000.00" → Rp100.000
```

The PayBridge minor-unit conversion is a BE responsibility. The FE must not multiply IDR by 100.

## 6. States & edge cases

| Case | Behavior |
|---|---|
| Payment pending | Show waiting state and allow safe refresh |
| Payment failed | Show retry action when the API allows it |
| Payment expired | Booking becomes cancelled; refresh booking/availability |
| Paid | Show confirmation |
| Amount mismatch | Trust BE state; never show success based on client assumptions |
| Refund | Refresh payment and booking state after success |
| Duplicate webhook | BE handles idempotency; FE only consumes resulting state |

## 7. Security boundary

No PayBridge private key, signing secret, webhook signature, or webhook parsing logic belongs in the FE.

Do not log sensitive payment data.
