import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  cancelBooking,
  createAdminBooking,
  createBooking,
  deleteAdminBooking,
  getAdminBookingDetail,
  getAdminCalendar,
  getBookingByReference,
  listAdminBookings,
  listBookings,
  updateAdminBooking,
  type CalendarParams,
  type ListAdminBookingsParams,
  type ListBookingsParams,
} from "./bookings.api";
import type {
  CreateAdminBookingInput,
  CreateBookingInput,
  UpdateAdminBookingInput,
} from "./bookings.schema";

export function bookingsListQueryOptions(params: ListBookingsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () => listBookings(params),
  });
}

export function bookingDetailQueryOptions(reference: string) {
  return queryOptions({
    queryKey: queryKeys.bookings.detail(reference),
    queryFn: () => getBookingByReference(reference),
  });
}

export function adminBookingsListQueryOptions(params: ListAdminBookingsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.bookings.adminList(params),
    queryFn: () => listAdminBookings(params),
  });
}

export function adminBookingDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.bookings.adminDetail(id),
    queryFn: () => getAdminBookingDetail(id),
  });
}

export function adminCalendarQueryOptions(params: CalendarParams) {
  return queryOptions({
    queryKey: queryKeys.bookings.calendar(params),
    queryFn: () => getAdminCalendar(params),
  });
}

export function useBookings(params: ListBookingsParams = {}) {
  return useQuery(bookingsListQueryOptions(params));
}

export function useBooking(reference: string) {
  return useQuery({ ...bookingDetailQueryOptions(reference), enabled: Boolean(reference) });
}

export function useAdminBookings(params: ListAdminBookingsParams = {}) {
  return useQuery(adminBookingsListQueryOptions(params));
}

export function useAdminBookingDetail(id: string) {
  return useQuery({ ...adminBookingDetailQueryOptions(id), enabled: Boolean(id) });
}

export function useAdminCalendar(params: CalendarParams) {
  return useQuery({
    ...adminCalendarQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
  };
}

/**
 * No optimistic update (development-phases.md Phase 5 exit criteria) — a
 * slot can lose the race server-side (`BOOKING_SLOT_TAKEN`), and a booking
 * that renders then disappears is worse than a spinner. This just waits
 * for the real response.
 */
export function useCreateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: invalidate,
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: invalidate,
  });
}

export function useCreateAdminBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateAdminBookingInput) => createAdminBooking(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminBookingInput }) =>
      updateAdminBooking(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAdminBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => deleteAdminBooking(id),
    onSuccess: invalidate,
  });
}
