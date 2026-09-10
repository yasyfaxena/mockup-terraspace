import { differenceInCalendarDays, subWeeks, format as formatDate } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ReportsRepository } from "./reports.repository.js";
import { fromMinor } from "../../shared/lib/money.js";
import { DEFAULT_OPENING_HOURS, ALL_DAY_OPENING_HOURS } from "../../shared/constants/hours.js";
import {
  toRevenueDto,
  toOccupancyDto,
  leastUtilizedFrom,
  toPaymentsLedgerDto,
  toActivityDto,
  toOverviewDto,
} from "./reports.mapper.js";

/**
 * Only used to resolve "today"/`newCustomersToday` when `overview` is not
 * scoped to one location — matches `Location.timezone`'s own schema
 * default, since there is no single canonical venue otherwise
 * (settings.md has no platform-wide timezone field to read instead).
 */
export const DEFAULT_REPORT_TIMEZONE = "Asia/Jakarta";

const MINUTES_PER_HOUR = 60;
const EXPORT_BATCH_SIZE = 500;
const CSV_LINE_BREAK = "\r\n";
const ISO_DATE_LENGTH = 10;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;
const MONEY_DISPLAY_DECIMALS = 2;

/**
 * `Decimal#toString()` on a `NUMERIC(14,2)` raw-SQL result strips
 * trailing zeros (`166500`, not `166500.00`) — every other money field
 * in this API is always shown at 2dp (`shared/lib/money.js`), so the
 * export must format explicitly rather than trust the driver's string.
 * @param {import("@prisma/client/runtime/library").Decimal | string | number} value
 * @returns {string}
 */
function toMoneyString(value) {
  return Number(value).toFixed(MONEY_DISPLAY_DECIMALS);
}

/**
 * @param {{ from: string, to: string }} span
 * @returns {number}
 */
function hoursSpan(span) {
  const [fromHour, fromMinute] = span.from.split(":").map(Number);
  const [toHour, toMinute] = span.to.split(":").map(Number);
  return (
    (toHour * MINUTES_PER_HOUR + toMinute - (fromHour * MINUTES_PER_HOUR + fromMinute)) /
    MINUTES_PER_HOUR
  );
}

const STANDARD_HOURS_PER_DAY = hoursSpan(DEFAULT_OPENING_HOURS);
const ACCESS_247_HOURS_PER_DAY = hoursSpan(ALL_DAY_OPENING_HOURS);

/**
 * @param {Array<{ access247: boolean, count: number }>} rows
 * @returns {{ standardCount: number, access247Count: number }}
 */
function splitWorkspaceCounts(rows) {
  const standardCount = rows.find((row) => !row.access247)?.count ?? 0;
  const access247Count = rows.find((row) => row.access247)?.count ?? 0;
  return { standardCount, access247Count };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * @param {unknown[]} fields
 * @returns {string}
 */
function csvRow(fields) {
  return fields.map(csvEscape).join(",") + CSV_LINE_BREAK;
}

/** Read-only aggregate reporting for the admin dashboard (reports.md). */
export class ReportsService {
  /** @param {{ reportsRepository?: ReportsRepository }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.reportsRepository ?? new ReportsRepository();
  }

  /**
   * @param {{ date?: string, locationId?: string }} query
   * @returns {Promise<object>}
   */
  async getOverview(query) {
    const timezone = DEFAULT_REPORT_TIMEZONE;
    const date = query.date ?? formatDate(toZonedTime(new Date(), timezone), "yyyy-MM-dd");
    const priorDate = formatDate(subWeeks(new Date(`${date}T00:00:00.000Z`), 1), "yyyy-MM-dd");

    const [today, prior] = await Promise.all([
      this.repo.overview({ date, locationId: query.locationId, timezone }),
      this.repo.overview({ date: priorDate, locationId: query.locationId, timezone }),
    ]);

    const { standardCount, access247Count } = splitWorkspaceCounts(today.bookableWorkspaces);
    const availableHours =
      standardCount * STANDARD_HOURS_PER_DAY + access247Count * ACCESS_247_HOURS_PER_DAY;

    return toOverviewDto({
      date,
      currency: today.currency,
      bookingCounts: today.bookingCounts,
      revenue: today.revenue,
      bookedHours: today.bookedHours,
      availableHours,
      newCustomers: today.newCustomers,
      priorBookingCounts: prior.bookingCounts,
      priorRevenue: prior.revenue,
      schedule: today.schedule,
    });
  }

  /**
   * @param {{ from: string, to: string, groupBy: "day"|"week"|"month", locationId?: string, workspaceType?: string }} query
   * @returns {Promise<object>}
   */
  async getRevenue(query) {
    const raw = await this.repo.revenue(query);
    return toRevenueDto(raw, query);
  }

  /**
   * @param {{ from: string, to: string, locationId?: string, groupBy: "day"|"week"|"month" }} query
   * @returns {Promise<object>}
   */
  async getOccupancy(query) {
    const [raw, workspaceCounts] = await Promise.all([
      this.repo.occupancy(query),
      this.repo.bookableWorkspaceCounts(query.locationId),
    ]);
    const { standardCount, access247Count } = splitWorkspaceCounts(workspaceCounts);
    const days =
      differenceInCalendarDays(
        new Date(`${query.to}T00:00:00.000Z`),
        new Date(`${query.from}T00:00:00.000Z`),
      ) + 1;

    const dto = toOccupancyDto(raw, {
      ...query,
      days,
      hoursPerDay: {
        standardUnit: STANDARD_HOURS_PER_DAY,
        access247Unit: ACCESS_247_HOURS_PER_DAY,
        standardCount,
        access247Count,
      },
    });
    return { ...dto, leastUtilized: leastUtilizedFrom(dto) };
  }

  /**
   * @param {{ from?: string, to?: string, status?: string, provider?: string, method?: string, q?: string, page: number, limit: number }} query
   * @returns {Promise<object>}
   */
  async getPaymentsReport(query) {
    const raw = await this.repo.paymentsLedger(query);
    return toPaymentsLedgerDto(raw, { page: query.page, limit: query.limit });
  }

  /**
   * @param {{ limit: number, since?: string, type?: string[] }} query
   * @returns {Promise<{ data: object[] }>}
   */
  async getActivity(query) {
    const rows = await this.repo.activity({
      limit: query.limit,
      since: query.since,
      types: query.type,
    });
    return { data: toActivityDto(rows) };
  }

  /**
   * Streams CSV rows straight to `res` in fixed-size, keyset-paginated
   * batches — never buffers the whole export in memory (reports.md §6).
   * @param {import("express").Response} res
   * @param {{ report: "bookings"|"payments"|"revenue", from: string, to: string, locationId?: string }} query
   * @returns {Promise<void>}
   */
  async streamExport(res, query) {
    const { header, fetchBatch, toRow } = EXPORT_DEFINITIONS[query.report](this.repo);
    const filename = `${query.report}-${query.from}-to-${query.to}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.write(csvRow(header));

    /** @type {string | null} */
    let cursor = null;
    for (;;) {
      const batch = await fetchBatch({
        from: query.from,
        to: query.to,
        locationId: query.locationId,
        cursor,
        batchSize: EXPORT_BATCH_SIZE,
      });
      if (batch.length === 0) break;
      for (const row of batch) res.write(csvRow(toRow(row)));
      cursor = batch[batch.length - 1].id;
      if (batch.length < EXPORT_BATCH_SIZE) break;
    }

    res.end();
  }
}

const EXPORT_DEFINITIONS = {
  /**
   * @param {ReportsRepository} repo
   * @returns {{ header: string[], fetchBatch: (params: any) => Promise<any[]>, toRow: (row: any) => unknown[] }}
   */
  bookings: (repo) => ({
    header: [
      "reference",
      "bookingDate",
      "startTime",
      "endTime",
      "status",
      "paymentStatus",
      "totalAmount",
      "currency",
      "workspaceName",
      "locationName",
      "customerName",
    ],
    fetchBatch: (/** @type {any} */ params) => repo.exportBookingsBatch(params),
    toRow: (/** @type {any} */ row) => [
      row.reference,
      row.bookingDate.toISOString().slice(0, ISO_DATE_LENGTH),
      row.startTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END),
      row.endTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END),
      row.status,
      row.paymentStatus,
      toMoneyString(row.totalAmount),
      row.currency,
      row.workspaceName,
      row.locationName,
      row.customerName,
    ],
  }),
  /**
   * @param {ReportsRepository} repo
   * @returns {{ header: string[], fetchBatch: (params: any) => Promise<any[]>, toRow: (row: any) => unknown[] }}
   */
  payments: (repo) => ({
    header: [
      "paybridgeOrderId",
      "bookingReference",
      "status",
      "provider",
      "amount",
      "currency",
      "customerName",
      "paidAt",
      "createdAt",
    ],
    fetchBatch: (/** @type {any} */ params) => repo.exportPaymentsBatch(params),
    toRow: (/** @type {any} */ row) => [
      row.paybridgeOrderId,
      row.bookingReference,
      row.status,
      row.provider,
      fromMinor(row.amountMinor, row.currency),
      row.currency,
      row.customerName,
      row.paidAt ? row.paidAt.toISOString() : "",
      row.createdAt.toISOString(),
    ],
  }),
  /**
   * @param {ReportsRepository} repo
   * @returns {{ header: string[], fetchBatch: (params: any) => Promise<any[]>, toRow: (row: any) => unknown[] }}
   */
  revenue: (repo) => ({
    header: [
      "bookingDate",
      "reference",
      "locationName",
      "workspaceType",
      "subtotalAmount",
      "taxAmount",
      "totalAmount",
      "currency",
    ],
    fetchBatch: (/** @type {any} */ params) => repo.exportRevenueBatch(params),
    toRow: (/** @type {any} */ row) => [
      row.bookingDate.toISOString().slice(0, ISO_DATE_LENGTH),
      row.reference,
      row.locationName,
      row.workspaceType,
      toMoneyString(row.subtotalAmount),
      toMoneyString(row.taxAmount),
      toMoneyString(row.totalAmount),
      row.currency,
    ],
  }),
};

export const reportsService = new ReportsService();
