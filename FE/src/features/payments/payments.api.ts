import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type {
  AdminPaymentDetailDto,
  AdminPaymentListItemDto,
  CreateChargeResponseDto,
  PaymentMethodDto,
  PaymentProvider,
  PaymentStatus,
  PaymentStatusDto,
  RefundResponseDto,
} from "./payments.types";
import type { RefundFormInput } from "./payments.schema";

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export function listPaymentMethods(provider: PaymentProvider = "xendit") {
  return apiClient.get<{ provider: PaymentProvider; data: PaymentMethodDto[] }>(
    `/api/v1/payment-methods${toQueryString({ provider })}`,
  );
}

export function createCharge(bookingId: string, provider?: PaymentProvider) {
  return apiClient.post<CreateChargeResponseDto>(
    `/api/v1/bookings/${bookingId}/payments`,
    provider ? { provider } : undefined,
  );
}

export function getPaymentStatus(bookingReference: string) {
  return apiClient.get<PaymentStatusDto>(`/api/v1/bookings/${bookingReference}/payment`);
}

export type ListAdminPaymentsParams = {
  page?: number | undefined;
  limit?: number | undefined;
  status?: PaymentStatus | undefined;
  provider?: PaymentProvider | undefined;
  method?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
};

export function listAdminPayments(params: ListAdminPaymentsParams = {}) {
  return apiClient.get<{ data: AdminPaymentListItemDto[]; meta: PaginationMeta }>(
    `/api/v1/admin/payments${toQueryString(params)}`,
  );
}

export function getAdminPaymentDetail(id: string) {
  return apiClient.get<AdminPaymentDetailDto>(`/api/v1/admin/payments/${id}`);
}

export function refundPayment(id: string, input: RefundFormInput) {
  return apiClient.post<RefundResponseDto>(`/api/v1/admin/payments/${id}/refund`, input);
}
