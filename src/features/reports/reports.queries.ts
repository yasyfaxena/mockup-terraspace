import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  getActivity,
  getOccupancy,
  getOverview,
  getPaymentsReport,
  getRevenue,
  type ActivityParams,
  type OccupancyParams,
  type OverviewParams,
  type PaymentsReportParams,
  type RevenueParams,
} from "./reports.api";

export function overviewQueryOptions(params: OverviewParams = {}) {
  return queryOptions({
    queryKey: queryKeys.reports.overview(params),
    queryFn: () => getOverview(params),
  });
}

export function useOverview(params: OverviewParams = {}) {
  return useQuery(overviewQueryOptions(params));
}

export function revenueQueryOptions(params: RevenueParams) {
  return queryOptions({
    queryKey: queryKeys.reports.revenue(params),
    queryFn: () => getRevenue(params),
  });
}

export function useRevenue(params: RevenueParams) {
  return useQuery(revenueQueryOptions(params));
}

export function occupancyQueryOptions(params: OccupancyParams) {
  return queryOptions({
    queryKey: queryKeys.reports.occupancy(params),
    queryFn: () => getOccupancy(params),
  });
}

export function useOccupancy(params: OccupancyParams) {
  return useQuery(occupancyQueryOptions(params));
}

export function paymentsReportQueryOptions(params: PaymentsReportParams = {}) {
  return queryOptions({
    queryKey: queryKeys.reports.payments(params),
    queryFn: () => getPaymentsReport(params),
  });
}

export function usePaymentsReport(params: PaymentsReportParams = {}) {
  return useQuery(paymentsReportQueryOptions(params));
}

export function activityQueryOptions(params: ActivityParams = {}) {
  return queryOptions({
    queryKey: queryKeys.reports.activity(params),
    queryFn: () => getActivity(params),
    // The dashboard polls this like a live feed — short staleTime keeps a
    // background refetch from feeling stale without a full poll interval.
    staleTime: 15 * 1000,
  });
}

export function useActivity(params: ActivityParams = {}) {
  return useQuery(activityQueryOptions(params));
}
