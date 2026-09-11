import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type {
  AdminBookingDetailDto,
  AdminBookingListItemDto,
  BookingDetailDto,
  BookingListItemDto,
  BookingStatus,
  CalendarEntryDto,
  CancelBookingDto,
  PaymentStatus,
} from "./bookings.types";
import type {
  CreateAdminBookingInput,
  CreateBookingInput,
  UpdateAdminBookingInput,
} from "./bookings.schema";

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export function createBooking(input: CreateBookingInput) {
  return apiClient.post<BookingDetailDto>("/api/v1/bookings", input);
}

export type ListBookingsParams = {
  page?: number | undefined;
  limit?: number | undefined;
  status?: BookingStatus | undefined;
  scope?: "upcoming" | "past" | "all" | undefined;
};

export function listBookings(params: ListBookingsParams = {}) {
  return apiClient.get<{ data: BookingListItemDto[]; meta: PaginationMeta }>(
    `/api/v1/bookings${toQueryString(params)}`,
  );
}

export function getBookingByReference(reference: string) {
  return apiClient.get<BookingDetailDto>(`/api/v1/bookings/${reference}`);
}

export function cancelBooking(id: string) {
  return apiClient.patch<CancelBookingDto>(`/api/v1/bookings/${id}/cancel`);
}

export type ListAdminBookingsParams = {
  page?: number | undefined;
  limit?: number | undefined;
  status?: BookingStatus | undefined;
  paymentStatus?: PaymentStatus | undefined;
  locationId?: string | undefined;
  workspaceId?: string | undefined;
  userId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
  sort?: "bookingDate" | "createdAt" | "totalAmount" | undefined;
  order?: "asc" | "desc" | undefined;
};

export function listAdminBookings(params: ListAdminBookingsParams = {}) {
  return apiClient.get<{ data: AdminBookingListItemDto[]; meta: PaginationMeta }>(
    `/api/v1/admin/bookings${toQueryString(params)}`,
  );
}

export function getAdminBookingDetail(id: string) {
  return apiClient.get<AdminBookingDetailDto>(`/api/v1/admin/bookings/${id}`);
}

export function createAdminBooking(input: CreateAdminBookingInput) {
  return apiClient.post<BookingDetailDto>("/api/v1/admin/bookings", input);
}

export function updateAdminBooking(id: string, input: UpdateAdminBookingInput) {
  return apiClient.patch<AdminBookingDetailDto>(`/api/v1/admin/bookings/${id}`, input);
}

export function deleteAdminBooking(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/v1/admin/bookings/${id}`);
}

export type CalendarParams = {
  from: string;
  to: string;
  locationId?: string | undefined;
  workspaceId?: string | undefined;
};

export function getAdminCalendar(params: CalendarParams) {
  return apiClient.get<{ data: CalendarEntryDto[] }>(
    `/api/v1/admin/bookings/calendar${toQueryString(params)}`,
  );
}
