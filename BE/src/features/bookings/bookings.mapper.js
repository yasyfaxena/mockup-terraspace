import { ACCESS_BUFFER_MINUTES } from "../../shared/constants/hours.js";
import {
  bookingStartInstant,
  bookingEndInstant,
  isCancellationWindowClosed,
} from "./bookings.time.js";

/** @param {unknown} value */
function toMoneyString(value) {
  return Number(value).toFixed(2);
}

/** @param {Date} value */
function toDateString(value) {
  return value.toISOString().slice(0, 10);
}

/** @param {Date} value a `@db.Time` column value */
function toTimeString(value) {
  return value.toISOString().slice(11, 16);
}

/** @param {{ status: string }} booking @param {boolean} closed */
function canCancelFrom(booking, closed) {
  return !closed && booking.status !== "cancelled" && booking.status !== "completed";
}

/**
 * @param {import("@prisma/client").Workspace & { location: any }} workspace
 * @returns {{ id: string, name: string, type: string, imageUrl: string|null, location: { slug: string, name: string, city: string } }}
 */
function toWorkspaceListSummary(workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    imageUrl: workspace.imageUrl,
    location: {
      slug: workspace.location.slug,
      name: workspace.location.name,
      city: workspace.location.city,
    },
  };
}

/**
 * @param {import("@prisma/client").Workspace & { location: any }} workspace
 */
function toWorkspaceDetailSummary(workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    floor: workspace.floor,
    location: {
      id: workspace.location.id,
      slug: workspace.location.slug,
      name: workspace.location.name,
      address: workspace.location.address,
      city: workspace.location.city,
    },
  };
}

/**
 * The customer-facing list shape (bookings.md §2).
 * @param {import("@prisma/client").Booking & { workspace: any }} booking
 * @param {number} cancellationWindowHours
 * @returns {import("./bookings.types.js").BookingListItemDto}
 */
export function toBookingListDto(booking, cancellationWindowHours) {
  const closed = isCancellationWindowClosed(
    booking,
    booking.workspace.location.timezone,
    cancellationWindowHours,
  );
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    bookingDate: toDateString(booking.bookingDate),
    startTime: toTimeString(booking.startTime),
    endTime: toTimeString(booking.endTime),
    totalAmount: toMoneyString(booking.totalAmount),
    currency: booking.currency,
    paymentStatus: booking.paymentStatus,
    canCancel: canCancelFrom(booking, closed),
    workspace: toWorkspaceListSummary(booking.workspace),
    createdAt: booking.createdAt.toISOString(),
  };
}

/**
 * The `201`/customer-detail shape (bookings.md §1, §3).
 * @param {import("@prisma/client").Booking & { workspace: any }} booking
 * @param {{ cancellationWindowHours: number, detail?: boolean }} context
 * @returns {import("./bookings.types.js").BookingDetailDto}
 */
export function toBookingDto(booking, context) {
  const timezone = booking.workspace.location.timezone;
  const base = {
    id: booking.id,
    reference: booking.reference,
    accessCode: booking.accessCode,
    status: booking.status,
    bookingDate: toDateString(booking.bookingDate),
    startTime: toTimeString(booking.startTime),
    endTime: toTimeString(booking.endTime),
    durationHours: toMoneyString(booking.durationHours),
    unitPrice: toMoneyString(booking.unitPrice),
    subtotalAmount: toMoneyString(booking.subtotalAmount),
    taxAmount: toMoneyString(booking.taxAmount),
    totalAmount: toMoneyString(booking.totalAmount),
    currency: booking.currency,
    paymentStatus: booking.paymentStatus,
    workspace: toWorkspaceDetailSummary(booking.workspace),
    createdAt: booking.createdAt.toISOString(),
  };

  if (!context.detail) return base;

  const closed = isCancellationWindowClosed(booking, timezone, context.cancellationWindowHours);
  const accessFrom = new Date(
    bookingStartInstant(booking, timezone).getTime() - ACCESS_BUFFER_MINUTES * 60 * 1000,
  );
  return {
    ...base,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    canCancel: canCancelFrom(booking, closed),
    cancellationPolicy: booking.workspace.cancellationPolicy,
    accessWindow: {
      from: accessFrom.toISOString(),
      until: bookingEndInstant(booking, timezone).toISOString(),
    },
    location: {
      latitude:
        booking.workspace.location.latitude === null
          ? null
          : String(booking.workspace.location.latitude),
      longitude:
        booking.workspace.location.longitude === null
          ? null
          : String(booking.workspace.location.longitude),
      accessRadiusMeters: booking.workspace.location.accessRadiusMeters,
    },
  };
}

/**
 * Cancellation response (bookings.md §4).
 * @param {import("@prisma/client").Booking} booking
 * @param {boolean} refundEligible
 */
export function toCancelDto(booking, refundEligible) {
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    refundEligible,
  };
}

/**
 * The staff list shape (bookings.md §5).
 * @param {import("@prisma/client").Booking & { user: any, workspace: any }} booking
 */
export function toAdminBookingListDto(booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    bookingDate: toDateString(booking.bookingDate),
    startTime: toTimeString(booking.startTime),
    endTime: toTimeString(booking.endTime),
    totalAmount: toMoneyString(booking.totalAmount),
    currency: booking.currency,
    customer: booking.user,
    workspace: {
      id: booking.workspace.id,
      name: booking.workspace.name,
      location: booking.workspace.location,
    },
    createdAt: booking.createdAt.toISOString(),
  };
}

/**
 * The staff detail shape (bookings.md §6).
 * @param {import("@prisma/client").Booking & { user: any, workspace: any }} booking
 */
export function toAdminBookingDetailDto(booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    accessCode: booking.accessCode,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    bookingDate: toDateString(booking.bookingDate),
    startTime: toTimeString(booking.startTime),
    endTime: toTimeString(booking.endTime),
    durationHours: toMoneyString(booking.durationHours),
    unitPrice: toMoneyString(booking.unitPrice),
    subtotalAmount: toMoneyString(booking.subtotalAmount),
    taxAmount: toMoneyString(booking.taxAmount),
    totalAmount: toMoneyString(booking.totalAmount),
    currency: booking.currency,
    customer: booking.user,
    workspace: {
      id: booking.workspace.id,
      name: booking.workspace.name,
      type: booking.workspace.type,
      floor: booking.workspace.floor,
      location: booking.workspace.location,
    },
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
  };
}

/**
 * The compact calendar payload (bookings.md §10).
 * @param {{
 *   id: string, reference: string, status: string, bookingDate: Date, startTime: Date, endTime: Date,
 *   workspaceId: string, workspace: { name: string }, user: { name: string },
 * }} booking
 */
export function toCalendarEntryDto(booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    bookingDate: toDateString(booking.bookingDate),
    startTime: toTimeString(booking.startTime),
    endTime: toTimeString(booking.endTime),
    workspaceId: booking.workspaceId,
    workspaceName: booking.workspace.name,
    customerName: booking.user.name,
  };
}
