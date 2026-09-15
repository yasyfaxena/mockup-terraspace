/**
 * Mirrors BE `reports.mapper.js`. All money fields are decimal strings,
 * all `*Percent` fields are already `Math.round(value * 100)` integers
 * (e.g. `62` means 62%, not `0.62`) — never re-multiply them.
 */

export type ReportGroupBy = "day" | "week" | "month";

export type ScheduleEntryDto = {
  id: string;
  reference: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  workspaceName: string;
  locationName: string;
  customerName: string;
};

export type OverviewDto = {
  date: string;
  currency: string | null;
  summary: {
    bookingsToday: number;
    confirmedToday: number;
    cancelledToday: number;
    revenueToday: string;
    occupancyPercent: number;
    newCustomersToday: number;
  };
  comparison: {
    bookingsChangePercent: number;
    revenueChangePercent: number;
  };
  schedule: ScheduleEntryDto[];
};

export type RevenueTotals = {
  grossRevenue: string;
  refundedAmount: string;
  netRevenue: string;
  taxCollected: string;
  bookingCount: number;
  averageBookingValue: string;
  cancellationRate: number;
};

export type RevenueSeriesPoint = {
  period: string;
  grossRevenue: string;
  refundedAmount: string;
  netRevenue: string;
  bookingCount: number;
};

export type RevenueShareRow = {
  locationId?: string;
  locationName?: string;
  type?: string;
  netRevenue: string;
  bookingCount: number;
  sharePercent: number;
};

export type RevenueForCurrency = {
  currency: string;
  totals: RevenueTotals;
  series: RevenueSeriesPoint[];
  byLocation: RevenueShareRow[];
  byWorkspaceType: RevenueShareRow[];
};

/**
 * `toRevenueDto` returns one of two shapes depending on how many distinct
 * currencies appear in the range (revenue.md §2 rule 4: amounts are never
 * summed across currencies) — a flat single-currency shape (currency is
 * `null` when the range has no bookings at all) or a `byCurrency` array.
 */
export type RevenueDto =
  | ({ range: { from: string; to: string }; groupBy: ReportGroupBy } & RevenueForCurrency)
  | {
      range: { from: string; to: string };
      groupBy: ReportGroupBy;
      currency: null;
      totals: RevenueTotals;
      series: RevenueSeriesPoint[];
      byLocation: RevenueShareRow[];
      byWorkspaceType: RevenueShareRow[];
    }
  | {
      range: { from: string; to: string };
      groupBy: ReportGroupBy;
      byCurrency: RevenueForCurrency[];
    };

export type OccupancySeriesPoint = {
  period: string;
  bookedHours: string;
  occupancyPercent: number;
};

export type WorkspaceOccupancyRow = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  locationName: string;
  bookedHours: string;
  occupancyPercent: number;
  revenue: string;
};

export type OccupancyDto = {
  range: { from: string; to: string };
  totals: {
    bookedHours: string;
    availableHours: string;
    occupancyPercent: number;
  };
  series: OccupancySeriesPoint[];
  byWorkspace: WorkspaceOccupancyRow[];
  leastUtilized: Array<{
    workspaceId: string;
    workspaceName: string;
    occupancyPercent: number;
    revenue: string;
  }>;
};

export type PaymentsLedgerRow = {
  paymentId: string;
  bookingReference: string;
  status: string;
  provider: string;
  paymentMethod: { code: string; category: string } | null;
  amount: string;
  refundedAmount: string;
  netAmount: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  paidAt: string | null;
  createdAt: string;
};

export type PaymentsLedgerDto = {
  data: PaymentsLedgerRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  totals: { paid: string; refunded: string; pending: string; failed: string };
};

export const ACTIVITY_TYPES = [
  "booking_created",
  "booking_cancelled",
  "payment_succeeded",
  "payment_failed",
  "payment_refunded",
  "user_registered",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityItemDto = {
  id: string;
  type: ActivityType;
  occurredAt: string;
  summary: string;
  actor?: { id: string; name: string };
  subject: { kind: string; id: string; reference?: string };
};

export const REVENUE_WORKSPACE_TYPES = [
  "hot_desk",
  "dedicated_desk",
  "meeting_room",
  "private_office",
] as const;

export const EXPORT_REPORTS = ["bookings", "payments", "revenue"] as const;
export type ExportReport = (typeof EXPORT_REPORTS)[number];
