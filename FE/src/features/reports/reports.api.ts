import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type {
  ActivityItemDto,
  ActivityType,
  ExportReport,
  OccupancyDto,
  OverviewDto,
  PaymentsLedgerDto,
  ReportGroupBy,
  RevenueDto,
} from "./reports.types";

// Same base-URL resolution as lib/auth-client.ts — the export download is a
// real cross-origin browser navigation (window.location.href), not a fetch
// through apiClient, so it needs the origin, not just a path.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type OverviewParams = { date?: string | undefined; locationId?: string | undefined };

export function getOverview(params: OverviewParams = {}) {
  return apiClient.get<OverviewDto>(`/api/v1/admin/reports/overview${toQueryString(params)}`);
}

export type RevenueParams = {
  from: string;
  to: string;
  groupBy?: ReportGroupBy | undefined;
  locationId?: string | undefined;
  workspaceType?: string | undefined;
};

export function getRevenue(params: RevenueParams) {
  return apiClient.get<RevenueDto>(`/api/v1/admin/reports/revenue${toQueryString(params)}`);
}

export type OccupancyParams = {
  from: string;
  to: string;
  groupBy?: ReportGroupBy | undefined;
  locationId?: string | undefined;
};

export function getOccupancy(params: OccupancyParams) {
  return apiClient.get<OccupancyDto>(`/api/v1/admin/reports/occupancy${toQueryString(params)}`);
}

export type PaymentsReportParams = {
  page?: number | undefined;
  limit?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  status?: string | undefined;
  provider?: string | undefined;
  method?: string | undefined;
  q?: string | undefined;
};

export function getPaymentsReport(params: PaymentsReportParams = {}) {
  return apiClient.get<PaymentsLedgerDto>(`/api/v1/admin/reports/payments${toQueryString(params)}`);
}

export type ActivityParams = {
  limit?: number | undefined;
  since?: string | undefined;
  type?: ActivityType[] | undefined;
};

export function getActivity(params: ActivityParams = {}) {
  return apiClient.get<{ data: ActivityItemDto[] }>(
    `/api/v1/admin/activity${toQueryString(params)}`,
  );
}

export type ExportParams = {
  report: ExportReport;
  from: string;
  to: string;
  locationId?: string | undefined;
};

/**
 * The BE streams CSV straight from `res` (reports.service.js's
 * `streamExport`) — there is no JSON envelope to parse, so this is a plain
 * URL for a real browser navigation/download, never a `fetch` (features/
 * reports.md §8: "must not buffer large report datasets in React state").
 */
export function buildExportUrl(params: ExportParams): string {
  return `${API_BASE_URL}/api/v1/admin/reports/export${toQueryString(params)}`;
}
