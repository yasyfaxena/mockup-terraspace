export type PaymentProvider = "xendit" | "midtrans";
export type PaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded";

/** Mirrors BE `payments.mapper.js`'s `toPaymentMethodDto`. */
export type PaymentMethodDto = { code: string; name: string; category: string };

/** Mirrors BE `payments.mapper.js`'s `toCreateChargeResponseDto` (`POST /bookings/:id/payments`'s 201). */
export type CreateChargeResponseDto = {
  paymentId: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: string;
  amountMinor: number;
  currency: string;
  checkoutUrl: string;
  expiresAt: string;
  booking: { id: string; reference: string; status: string };
};

/** Mirrors BE `payments.mapper.js`'s `toPaymentStatusDto`. */
export type PaymentStatusDto = {
  paymentId: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  paymentMethod: PaymentMethodDto | null;
  checkoutUrl: string | null;
  paidAt: string | null;
  booking: { reference: string; status: string };
};

/** Mirrors BE `payments.mapper.js`'s `toAdminPaymentListItemDto` (payments.md §9). */
export type AdminPaymentListItemDto = {
  id: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  paymentMethod: PaymentMethodDto | null;
  paybridgeOrderId: string | null;
  refundedAmount: string;
  booking: { id: string; reference: string; bookingDate: string };
  customer: { id: string; name: string; email: string };
  paidAt: string | null;
  createdAt: string;
};

type RefundDto = {
  id: string;
  amount: string;
  status: string;
  reason: string | null;
  requestedBy: { id: string; name: string } | null;
  createdAt: string;
};

/** Mirrors BE `payments.mapper.js`'s `toAdminPaymentDetailDto` (payments.md §10). */
export type AdminPaymentDetailDto = {
  id: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: string;
  amountMinor: number;
  currency: string;
  paybridgeChargeId: string | null;
  paybridgeOrderId: string | null;
  providerChargeId: string | null;
  paymentMethod: PaymentMethodDto | null;
  booking: { id: string; reference: string };
  customer: { id: string; name: string; email: string };
  refunds: RefundDto[];
  events: Array<{
    event: string;
    status: string;
    receivedAt: string;
    processedAt: string | null;
  }>;
  paidAt: string | null;
  createdAt: string;
};

/** Mirrors BE `payments.mapper.js`'s `toRefundResponseDto`. */
export type RefundResponseDto = {
  id: string;
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  reason: string | null;
  payment: { status: PaymentStatus; refundedAmount: string; remainingAmount: string };
  createdAt: string;
};
