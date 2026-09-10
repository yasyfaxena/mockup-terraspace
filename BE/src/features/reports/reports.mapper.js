import { fromMinor } from "../../shared/lib/money.js";

const PERCENT_MULTIPLIER = 100;
const DECIMAL_DISPLAY = 2;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;
const ISO_DATE_LENGTH = 10;
const ZERO_MINOR = 0n;
const LEAST_UTILIZED_COUNT = 5;

/**
 * @param {number} value
 * @returns {number}
 */
function roundPercent(value) {
  return Number.isFinite(value) ? Math.round(value * PERCENT_MULTIPLIER) : 0;
}

/**
 * @param {string | number} value
 * @returns {string}
 */
function toMoneyString(value) {
  return Number(value).toFixed(DECIMAL_DISPLAY);
}

/**
 * @param {Array<{ currency: string, refunded_minor: string }>} refundRows
 * @returns {Record<string, bigint>}
 */
function refundsByCurrency(refundRows) {
  /** @type {Record<string, bigint>} */
  const map = {};
  for (const row of refundRows) map[row.currency] = BigInt(row.refunded_minor);
  return map;
}

/**
 * @param {any[]} byCurrency
 * @param {Record<string, bigint>} refunded
 * @param {string} currency
 * @returns {object}
 */
function totalsFor(byCurrency, refunded, currency) {
  const row = byCurrency.find((entry) => entry.currency === currency);
  const gross = Number(row.gross_revenue);
  const refundedAmount = Number(fromMinor(refunded[currency] ?? ZERO_MINOR, currency));
  return {
    grossRevenue: toMoneyString(gross),
    refundedAmount: toMoneyString(refundedAmount),
    netRevenue: toMoneyString(gross - refundedAmount),
    taxCollected: toMoneyString(row.tax_collected),
    bookingCount: row.paid_count,
    averageBookingValue: toMoneyString(row.paid_count > 0 ? gross / row.paid_count : 0),
    cancellationRate: roundPercent(row.total_count > 0 ? row.cancelled_count / row.total_count : 0),
  };
}

/**
 * @param {any[]} series
 * @param {string} currency
 * @returns {object[]}
 */
function seriesFor(series, currency) {
  return series
    .filter((row) => row.currency === currency)
    .map((row) => ({
      period: row.period.toISOString().slice(0, ISO_DATE_LENGTH),
      grossRevenue: toMoneyString(row.gross_revenue),
      refundedAmount: "0.00",
      netRevenue: toMoneyString(row.gross_revenue),
      bookingCount: row.booking_count,
    }));
}

/**
 * @param {any[]} rows
 * @param {string} currency
 * @param {string} nameField
 * @param {string} idField
 * @returns {object[]}
 */
function shareBreakdownFor(rows, currency, nameField, idField) {
  const matching = rows.filter((row) => row.currency === currency);
  const total = matching.reduce((sum, row) => sum + Number(row.net_revenue), 0);
  return matching.map((row) => ({
    ...(idField ? { [idField]: row[idField] } : {}),
    [nameField]: row[nameField],
    netRevenue: toMoneyString(row.net_revenue),
    bookingCount: row.booking_count,
    sharePercent: roundPercent(total > 0 ? Number(row.net_revenue) / total : 0),
  }));
}

const EMPTY_TOTALS = Object.freeze({
  grossRevenue: "0.00",
  refundedAmount: "0.00",
  netRevenue: "0.00",
  taxCollected: "0.00",
  bookingCount: 0,
  averageBookingValue: "0.00",
  cancellationRate: 0,
});

/**
 * @param {{ byCurrency: any[], byLocation: any[], byWorkspaceType: any[], series: any[] }} raw
 * @param {Record<string, bigint>} refunded
 * @param {string} currency
 * @returns {object}
 */
function revenueForCurrency(raw, refunded, currency) {
  return {
    currency,
    totals: totalsFor(raw.byCurrency, refunded, currency),
    series: seriesFor(raw.series, currency),
    byLocation: shareBreakdownFor(raw.byLocation, currency, "locationName", "locationId"),
    byWorkspaceType: shareBreakdownFor(raw.byWorkspaceType, currency, "type", ""),
  };
}

/**
 * @param {object} base
 * @param {{ byCurrency: any[], byLocation: any[], byWorkspaceType: any[], series: any[] }} raw
 * @param {Record<string, bigint>} refunded
 * @param {string | undefined} currency
 * @returns {object}
 */
function singleCurrencyRevenueDto(base, raw, refunded, currency) {
  if (!currency) {
    return { ...base, currency: null, ...EMPTY_TOTALS_SHAPE };
  }
  const shaped = revenueForCurrency(raw, refunded, currency);
  return { ...base, ...shaped };
}

const EMPTY_TOTALS_SHAPE = Object.freeze({
  totals: EMPTY_TOTALS,
  series: [],
  byLocation: [],
  byWorkspaceType: [],
});

/**
 * Splits into a single flat shape when only one currency is present, or a
 * `byCurrency` array otherwise — amounts are never summed across
 * currencies (revenue.md §2 rule 4).
 * @param {{ byCurrency: any[], byLocation: any[], byWorkspaceType: any[], series: any[], refundsByCurrency: any[] }} raw
 * @param {{ from: string, to: string, groupBy: string }} range
 * @returns {object}
 */
export function toRevenueDto(raw, range) {
  const refunded = refundsByCurrency(raw.refundsByCurrency);
  const currencies = raw.byCurrency.map((row) => row.currency);
  const base = { range: { from: range.from, to: range.to }, groupBy: range.groupBy };

  if (currencies.length <= 1) {
    return singleCurrencyRevenueDto(base, raw, refunded, currencies[0]);
  }
  return {
    ...base,
    byCurrency: currencies.map((currency) => revenueForCurrency(raw, refunded, currency)),
  };
}

/**
 * @param {{ bookedHours: Array<{ booked_hours: string }>, series: any[], byWorkspace: any[] }} raw
 * @param {{
 *   from: string, to: string, groupBy: string, days: number,
 *   hoursPerDay: { standardUnit: number, access247Unit: number, standardCount: number, access247Count: number },
 * }} range
 * @returns {{ range: object, totals: object, series: object[], byWorkspace: WorkspaceOccupancyRow[] }}
 */
export function toOccupancyDto(raw, range) {
  const bookedHours = Number(raw.bookedHours[0].booked_hours);
  const { standardUnit, access247Unit, standardCount, access247Count } = range.hoursPerDay;
  const perDayTotal = standardUnit * standardCount + access247Unit * access247Count;
  const availableHours = perDayTotal * range.days;

  return {
    range: { from: range.from, to: range.to },
    totals: {
      bookedHours: toMoneyString(bookedHours),
      availableHours: toMoneyString(availableHours),
      occupancyPercent: roundPercent(availableHours > 0 ? bookedHours / availableHours : 0),
    },
    series: raw.series.map((row) => ({
      period: row.period.toISOString().slice(0, ISO_DATE_LENGTH),
      bookedHours: toMoneyString(row.booked_hours),
      occupancyPercent: roundPercent(perDayTotal > 0 ? Number(row.booked_hours) / perDayTotal : 0),
    })),
    byWorkspace: byWorkspaceOccupancy(raw.byWorkspace, {
      standardUnit,
      access247Unit,
      days: range.days,
    }),
  };
}

/**
 * @typedef {{
 *   workspaceId: string, workspaceName: string, type: string, locationName: string,
 *   bookedHours: string, occupancyPercent: number, revenue: string,
 * }} WorkspaceOccupancyRow
 */

/**
 * @param {any[]} rows
 * @param {{ standardUnit: number, access247Unit: number, days: number }} hours
 * @returns {WorkspaceOccupancyRow[]}
 */
function byWorkspaceOccupancy(rows, hours) {
  return rows
    .map((row) => {
      const available = (row.access247 ? hours.access247Unit : hours.standardUnit) * hours.days;
      const booked = Number(row.booked_hours);
      return {
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        type: row.type,
        locationName: row.locationName,
        bookedHours: toMoneyString(booked),
        occupancyPercent: roundPercent(available > 0 ? booked / available : 0),
        revenue: toMoneyString(row.revenue),
      };
    })
    .sort((left, right) => right.occupancyPercent - left.occupancyPercent);
}

/**
 * @param {ReturnType<typeof toOccupancyDto>} dto
 * @returns {object[]}
 */
export function leastUtilizedFrom(dto) {
  return [...dto.byWorkspace]
    .sort((left, right) => left.occupancyPercent - right.occupancyPercent)
    .slice(0, LEAST_UTILIZED_COUNT)
    .map(({ workspaceId, workspaceName, occupancyPercent, revenue }) => ({
      workspaceId,
      workspaceName,
      occupancyPercent,
      revenue,
    }));
}

/**
 * @param {any[]} totalsByStatus
 * @param {string} status
 * @returns {string}
 */
function totalFor(totalsByStatus, status) {
  const rows = totalsByStatus.filter((row) => row.status === status);
  if (rows.length === 0) return "0.00";
  return toMoneyString(
    rows.reduce((sum, row) => sum + Number(fromMinor(BigInt(row.total_minor), row.currency)), 0),
  );
}

/**
 * Assumes a single operating currency — the payments ledger's `totals`
 * has no `byCurrency` contract in reports.md §4 (unlike revenue's, which
 * does). A genuinely multi-currency deployment would need this extended.
 * @param {{ rows: any[], total: number, totalsByStatus: any[] }} raw
 * @param {{ page: number, limit: number }} pagination
 * @returns {object}
 */
export function toPaymentsLedgerDto(raw, pagination) {
  return {
    data: raw.rows.map((row) => {
      const refundedAmount = Number(fromMinor(BigInt(row.refundedMinor), row.currency));
      const amount = Number(fromMinor(BigInt(row.amountMinor), row.currency));
      return {
        paymentId: row.paymentId,
        bookingReference: row.bookingReference,
        status: row.status,
        provider: row.provider,
        paymentMethod: row.paymentMethodCode
          ? { code: row.paymentMethodCode, category: row.paymentMethodCategory ?? "" }
          : null,
        amount: toMoneyString(amount),
        refundedAmount: toMoneyString(refundedAmount),
        netAmount: toMoneyString(amount - refundedAmount),
        currency: row.currency,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        bookingDate: row.bookingDate.toISOString().slice(0, ISO_DATE_LENGTH),
        paidAt: row.paidAt ? row.paidAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      };
    }),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: raw.total,
      totalPages: Math.max(1, Math.ceil(raw.total / pagination.limit)),
    },
    totals: {
      paid: totalFor(raw.totalsByStatus, "paid"),
      refunded: totalFor(raw.totalsByStatus, "refunded"),
      pending: totalFor(raw.totalsByStatus, "pending"),
      failed: totalFor(raw.totalsByStatus, "failed"),
    },
  };
}

const ACTIVITY_SUMMARY = Object.freeze({
  booking_created: (/** @type {any} */ row) =>
    `${row.actorName ?? "A customer"} booked ${row.extra.workspaceName} for ${formatEventDate(row.extra.bookingDate)}`,
  booking_cancelled: (/** @type {any} */ row) =>
    `${row.actorName ?? "A customer"} cancelled the booking for ${row.extra.workspaceName}`,
  payment_succeeded: (/** @type {any} */ row) =>
    `Payment of ${row.extra.currency} ${fromMinor(BigInt(row.extra.amount), row.extra.currency)} received for ${row.subjectReference}`,
  payment_failed: (/** @type {any} */ row) =>
    `Payment of ${row.extra.currency} ${fromMinor(BigInt(row.extra.amount), row.extra.currency)} failed for ${row.subjectReference}`,
  payment_refunded: (/** @type {any} */ row) =>
    `Refund of ${row.extra.currency} ${fromMinor(BigInt(row.extra.amount), row.extra.currency)} issued for ${row.subjectReference}`,
  user_registered: (/** @type {any} */ row) => `${row.actorName} registered`,
});

/**
 * @param {Date} date
 * @returns {string}
 */
function formatEventDate(date) {
  return new Date(date).toISOString().slice(0, ISO_DATE_LENGTH);
}

/**
 * @param {any[]} rows
 * @returns {object[]}
 */
export function toActivityDto(rows) {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    occurredAt: row.occurredAt.toISOString(),
    summary: /** @type {any} */ (ACTIVITY_SUMMARY)[row.type](row),
    ...(row.actorId ? { actor: { id: row.actorId, name: row.actorName } } : {}),
    subject: {
      kind: row.subjectKind,
      id: row.subjectId,
      ...(row.subjectReference ? { reference: row.subjectReference } : {}),
    },
  }));
}

/**
 * @param {{
 *   date: string, currency: string | null,
 *   bookingCounts: { total: number, confirmed: number, cancelled: number },
 *   revenue: string, bookedHours: string, availableHours: number, newCustomers: number,
 *   priorBookingCounts: { total: number }, priorRevenue: string,
 *   schedule: any[],
 * }} data
 * @returns {object}
 */
export function toOverviewDto(data) {
  const revenue = Number(data.revenue);
  const priorRevenue = Number(data.priorRevenue);
  const bookedHours = Number(data.bookedHours);

  return {
    date: data.date,
    currency: data.currency,
    summary: {
      bookingsToday: data.bookingCounts.total,
      confirmedToday: data.bookingCounts.confirmed,
      cancelledToday: data.bookingCounts.cancelled,
      revenueToday: toMoneyString(revenue),
      occupancyPercent: roundPercent(
        data.availableHours > 0 ? bookedHours / data.availableHours : 0,
      ),
      newCustomersToday: data.newCustomers,
    },
    comparison: {
      bookingsChangePercent: percentChange(data.bookingCounts.total, data.priorBookingCounts.total),
      revenueChangePercent: percentChange(revenue, priorRevenue),
    },
    schedule: data.schedule.map((row) => ({
      id: row.id,
      reference: row.reference,
      startTime: row.startTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END),
      endTime: row.endTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END),
      status: row.status,
      paymentStatus: row.paymentStatus,
      totalAmount: toMoneyString(row.totalAmount),
      workspaceName: row.workspaceName,
      locationName: row.locationName,
      customerName: row.customerName,
    })),
  };
}

/**
 * @param {number} current
 * @param {number} prior
 * @returns {number}
 */
function percentChange(current, prior) {
  if (prior === 0) return current === 0 ? 0 : PERCENT_MULTIPLIER;
  return roundPercent((current - prior) / prior);
}
