import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  createCharge,
  getAdminPaymentDetail,
  getPaymentStatus,
  listAdminPayments,
  listPaymentMethods,
  refundPayment,
  type ListAdminPaymentsParams,
} from "./payments.api";
import type { PaymentProvider } from "./payments.types";
import type { RefundFormInput } from "./payments.schema";

const PENDING_STATES = new Set(["pending", "awaiting_payment"]);
const POLL_INTERVAL_MS = 3_000;

export function paymentMethodsQueryOptions(provider: PaymentProvider = "xendit") {
  return queryOptions({
    queryKey: queryKeys.payments.methods(provider),
    queryFn: () => listPaymentMethods(provider),
  });
}

export function paymentStatusQueryOptions(reference: string) {
  return queryOptions({
    queryKey: queryKeys.payments.status(reference),
    queryFn: () => getPaymentStatus(reference),
    // The webhook lands asynchronously — poll while pending, stop the
    // moment the status leaves a pending state (development-phases.md
    // Phase 6 exit criteria: pending -> paid without a manual refresh).
    refetchInterval: (query) =>
      query.state.data && !PENDING_STATES.has(query.state.data.status) ? false : POLL_INTERVAL_MS,
  });
}

export function adminPaymentsListQueryOptions(params: ListAdminPaymentsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.payments.adminList(params),
    queryFn: () => listAdminPayments(params),
  });
}

export function adminPaymentDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.payments.adminDetail(id),
    queryFn: () => getAdminPaymentDetail(id),
  });
}

export function usePaymentMethods(provider: PaymentProvider = "xendit") {
  return useQuery(paymentMethodsQueryOptions(provider));
}

export function usePaymentStatus(reference: string) {
  return useQuery({ ...paymentStatusQueryOptions(reference), enabled: Boolean(reference) });
}

export function useAdminPayments(params: ListAdminPaymentsParams = {}) {
  return useQuery(adminPaymentsListQueryOptions(params));
}

export function useAdminPaymentDetail(id: string) {
  return useQuery({ ...adminPaymentDetailQueryOptions(id), enabled: Boolean(id) });
}

export function useCreateCharge() {
  return useMutation({
    mutationFn: ({ bookingId, provider }: { bookingId: string; provider?: PaymentProvider }) =>
      createCharge(bookingId, provider),
    // BOOKING_SLOT_TAKEN-style specific handling (PAYMENT_ALREADY_PENDING)
    // happens at the call site, not here — see checkout-redirect.tsx.
    meta: { suppressGlobalError: true },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RefundFormInput }) => refundPayment(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.adminDetail(id) });
      void queryClient.invalidateQueries({ queryKey: ["payments", "admin-list"] });
    },
  });
}
