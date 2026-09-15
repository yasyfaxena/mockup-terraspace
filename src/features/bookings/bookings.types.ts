export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type BookingWorkspaceListSummary = {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  location: { slug: string; name: string; city: string };
};

type BookingWorkspaceDetailSummary = {
  id: string;
  name: string;
  type: string;
  floor: string;
  location: { id: string; slug: string; name: string; address: string; city: string };
};

/** Mirrors BE `bookings.mapper.js`'s `toBookingListDto` (bookings.md §2). */
export type BookingListItemDto = {
  id: string;
  reference: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  paymentStatus: PaymentStatus;
  canCancel: boolean;
  workspace: BookingWorkspaceListSummary;
  createdAt: string;
};

/**
 * Mirrors BE `bookings.mapper.js`'s `toBookingDto` — the base shape (also
 * `POST /bookings`'s 201 response) is everything except the fields below
 * `cancelledAt`, only present when `detail: true` (GET /bookings/:reference).
 */
export type BookingDetailDto = {
  id: string;
  reference: string;
  accessCode: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  unitPrice: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  paymentStatus: PaymentStatus;
  workspace: BookingWorkspaceDetailSummary;
  createdAt: string;
  cancelledAt?: string | null;
  canCancel?: boolean;
  cancellationPolicy?: string;
  accessWindow?: { from: string; until: string };
  location?: { latitude: string | null; longitude: string | null; accessRadiusMeters: number };
};

/** Mirrors BE `bookings.mapper.js`'s `toCancelDto`. */
export type CancelBookingDto = {
  id: string;
  reference: string;
  status: BookingStatus;
  cancelledAt: string | null;
  refundEligible: boolean;
};

/** Mirrors BE `bookings.mapper.js`'s `toAdminBookingListDto` (bookings.md §5). */
export type AdminBookingListItemDto = {
  id: string;
  reference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  currency: string;
  customer: { id: string; name: string; email: string };
  workspace: { id: string; name: string; location: { id: string; name: string; slug: string } };
  createdAt: string;
};

/** Mirrors BE `bookings.mapper.js`'s `toAdminBookingDetailDto` (bookings.md §6). */
export type AdminBookingDetailDto = {
  id: string;
  reference: string;
  accessCode: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  unitPrice: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  customer: { id: string; name: string; email: string };
  workspace: {
    id: string;
    name: string;
    type: string;
    floor: string;
    location: { id: string; name: string; slug: string };
  };
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

/**
 * Mirrors BE `bookings.mapper.js`'s `toCalendarEntryDto` (bookings.md §10)
 * — real `workspaceId`, not a name to substring-match (Phase 5's fix for
 * V1's admin-calendar.tsx room-column bug).
 */
export type CalendarEntryDto = {
  id: string;
  reference: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  workspaceId: string;
  workspaceName: string;
  customerName: string;
};
