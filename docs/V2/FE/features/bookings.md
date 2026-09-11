# TerraSpace FE — Bookings (V2)

**Feature:** `src/features/bookings/`  
**Consumes:** BE `features/bookings.md` — 10 endpoints.

## 1. Screens

| Screen | Kind | Access |
|---|---|---|
| Booking review | Page | Customer |
| Booking confirmation | Page | Customer |
| My bookings | Page | Customer |
| Booking detail | Page | Customer |
| Admin/staff bookings | Panel | Staff/Admin |
| Admin/staff booking detail | Dialog/page | Staff/Admin |
| Operations calendar | Panel | Staff/Admin |

## 2. Components

| Component | Purpose |
|---|---|
| `booking-form.tsx` | Date/time selection and customer input |
| `booking-review.tsx` | Read-only server-backed quote |
| `booking-summary.tsx` | Booking details and status |
| `booking-card.tsx` | Customer booking list item |
| `booking-cancel-dialog.tsx` | Cancellation confirmation |
| `qr-pass.tsx` | Renders the booking's access code as a client-generated QR (via the `qrcode` package — no server-side QR endpoint), pulsing skeleton while generating; used on the confirmation screen (was `frontend/site/qr-pass.tsx`) |
| `admin-booking-table.tsx` | Filterable paginated operations list |
| `admin-booking-form.tsx` | Staff/admin create/edit |
| `booking-calendar.tsx` | 92-day capped operations calendar — day/week/month toggle, prev/next + "Today" nav, hourly grid (business hours), bookings positioned per workspace column. **V1 bug to fix, not copy:** `admin-calendar.tsx` identifies which column a booking belongs to by matching substrings in the workspace name against two hardcoded room names — V2 must key columns off the real workspace id/list returned by the calendar endpoint, not string-match a name. |

## 3. Data

| Hook | Endpoint | Query key |
|---|---|---|
| `useCreateBooking()` | `POST /bookings` | invalidates relevant availability/bookings |
| `useBookings(params)` | `GET /bookings` | `bookings.list(params)` |
| `useBooking(reference)` | `GET /bookings/:reference` | `bookings.detail(reference)` |
| `useCancelBooking(id)` | `PATCH /bookings/:id/cancel` | invalidates booking + availability |
| `useAdminBookings(params)` | `GET /admin/bookings` | `bookings.adminList(params)` |
| `useAdminBooking(id)` | `GET /admin/bookings/:id` | `bookings.adminDetail(id)` |
| `useAdminCreateBooking()` | `POST /admin/bookings` | invalidates admin/customer lists + availability |
| `useAdminUpdateBooking()` | `PATCH /admin/bookings/:id` | invalidates detail/lists + availability |
| `useAdminDeleteBooking()` | `DELETE /admin/bookings/:id` | invalidates lists/calendar |
| `useAdminBookingCalendar(params)` | `GET /admin/bookings/calendar` | `bookings.calendar(params)` |

## 4. Booking creation rules

The FE submits the booking facts required by the API, but never submits an authoritative amount.

**Never treat these as trusted request fields:**

- `total`;
- `totalAmount`;
- `unitPrice`.

The BE calculates pricing and snapshots `unitPrice` and `currency`.

## 5. Pricing display

The review screen may calculate a preview from:

```text
duration
× current server price
= subtotal
+ server tax configuration
= displayed total
```

The final response from the BE is authoritative.

IDR is displayed with `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`.

## 6. Cancellation

Customer cancellation uses `PATCH /bookings/:id/cancel`.

The FE:

- checks the cancellation state returned by the API;
- may disable the action when the known window has passed;
- still handles a server rejection because the server is authoritative;
- never deletes a customer booking.

Admin deletion is a separate admin-only operation.

## 7. States & edge cases

| Case | Behavior |
|---|---|
| `409 BOOKING_SLOT_TAKEN` | Refresh availability and keep the customer in the booking flow |
| `404` for another user's booking | Render not-found, not forbidden |
| Cancellation window passed | Hide/disable cancel action and handle server rejection |
| Booking time edited by staff | Refresh pricing and availability |
| Payment pending | Show payment state, not confirmed success |
| Booking cancelled | Availability query is invalidated so the slot can reappear |
| Calendar request > 92 days | Prevent in UI; API remains the final guard |

## 8. Notes

`booking_guests` is not part of V2. Do not add guest-management screens or a guest form.
