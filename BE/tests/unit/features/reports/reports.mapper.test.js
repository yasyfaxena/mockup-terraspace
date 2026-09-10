import { describe, it, expect } from "vitest";
import {
  toRevenueDto,
  toOccupancyDto,
  leastUtilizedFrom,
  toPaymentsLedgerDto,
  toActivityDto,
  toOverviewDto,
} from "../../../../src/features/reports/reports.mapper.js";

describe("toRevenueDto", () => {
  it("subtracts succeeded refunds from gross to get netRevenue (revenue.md §2 rule 3)", () => {
    const raw = {
      byCurrency: [
        {
          currency: "IDR",
          gross_revenue: "1000000",
          tax_collected: "100000",
          paid_count: 10,
          total_count: 12,
          cancelled_count: 2,
        },
      ],
      byLocation: [],
      byWorkspaceType: [],
      series: [],
      refundsByCurrency: [{ currency: "IDR", refunded_minor: "150000" }],
    };

    const dto = toRevenueDto(raw, { from: "2026-08-01", to: "2026-08-31", groupBy: "day" });

    expect(dto.currency).toBe("IDR");
    expect(dto.totals.grossRevenue).toBe("1000000.00");
    expect(dto.totals.refundedAmount).toBe("150000.00");
    expect(dto.totals.netRevenue).toBe("850000.00");
    expect(dto.totals.bookingCount).toBe(10);
    expect(dto.totals.averageBookingValue).toBe("100000.00");
    expect(dto.totals.cancellationRate).toBe(Math.round((2 / 12) * 100));
  });

  it("counts only paid bookings toward revenue — pending is not money (revenue.md §2 rule 1)", () => {
    const raw = {
      byCurrency: [
        {
          currency: "IDR",
          gross_revenue: "500000",
          tax_collected: "50000",
          paid_count: 5,
          total_count: 8,
          cancelled_count: 0,
        },
      ],
      byLocation: [],
      byWorkspaceType: [],
      series: [],
      refundsByCurrency: [],
    };
    const dto = toRevenueDto(raw, { from: "2026-08-01", to: "2026-08-31", groupBy: "day" });
    expect(dto.totals.bookingCount).toBe(5);
  });

  it("splits into byCurrency instead of a flat currency field when more than one currency appears (rule 4)", () => {
    const raw = {
      byCurrency: [
        {
          currency: "IDR",
          gross_revenue: "1000000",
          tax_collected: "0",
          paid_count: 1,
          total_count: 1,
          cancelled_count: 0,
        },
        {
          currency: "USD",
          gross_revenue: "100",
          tax_collected: "0",
          paid_count: 1,
          total_count: 1,
          cancelled_count: 0,
        },
      ],
      byLocation: [],
      byWorkspaceType: [],
      series: [],
      refundsByCurrency: [],
    };
    const dto = toRevenueDto(raw, { from: "2026-08-01", to: "2026-08-31", groupBy: "day" });

    expect(dto.currency).toBeUndefined();
    expect(dto.byCurrency).toHaveLength(2);
    expect(dto.byCurrency.map((entry) => entry.currency).sort()).toEqual(["IDR", "USD"]);
    // never summed together — IDR's own total never leaks USD's amount
    const idr = dto.byCurrency.find((entry) => entry.currency === "IDR");
    expect(idr.totals.grossRevenue).toBe("1000000.00");
  });

  it("returns a zeroed shape when there is no data at all, without throwing", () => {
    const raw = {
      byCurrency: [],
      byLocation: [],
      byWorkspaceType: [],
      series: [],
      refundsByCurrency: [],
    };
    const dto = toRevenueDto(raw, { from: "2026-08-01", to: "2026-08-31", groupBy: "day" });
    expect(dto.currency).toBeNull();
    expect(dto.totals.grossRevenue).toBe("0.00");
  });

  it("computes byLocation sharePercent relative to that currency's own total", () => {
    const raw = {
      byCurrency: [
        {
          currency: "IDR",
          gross_revenue: "300",
          tax_collected: "0",
          paid_count: 3,
          total_count: 3,
          cancelled_count: 0,
        },
      ],
      byLocation: [
        {
          currency: "IDR",
          locationId: "loc1",
          locationName: "A",
          net_revenue: "200",
          booking_count: 2,
        },
        {
          currency: "IDR",
          locationId: "loc2",
          locationName: "B",
          net_revenue: "100",
          booking_count: 1,
        },
      ],
      byWorkspaceType: [],
      series: [],
      refundsByCurrency: [],
    };
    const dto = toRevenueDto(raw, { from: "2026-08-01", to: "2026-08-31", groupBy: "day" });
    const a = dto.byLocation.find((row) => row.locationId === "loc1");
    const b = dto.byLocation.find((row) => row.locationId === "loc2");
    expect(a.sharePercent).toBe(67);
    expect(b.sharePercent).toBe(33);
  });
});

describe("toOccupancyDto / leastUtilizedFrom", () => {
  const hoursPerDay = { standardUnit: 13, access247Unit: 24, standardCount: 1, access247Count: 0 };

  it("computes occupancyPercent from bookedHours over availableHours", () => {
    const raw = {
      bookedHours: [{ booked_hours: "13" }],
      series: [],
      byWorkspace: [],
    };
    const dto = toOccupancyDto(raw, {
      from: "2026-08-01",
      to: "2026-08-01",
      groupBy: "day",
      days: 1,
      hoursPerDay,
    });
    expect(dto.totals.availableHours).toBe("13.00");
    expect(dto.totals.occupancyPercent).toBe(100);
  });

  it("never divides by zero when there are no bookable workspaces", () => {
    const raw = { bookedHours: [{ booked_hours: "0" }], series: [], byWorkspace: [] };
    const dto = toOccupancyDto(raw, {
      from: "2026-08-01",
      to: "2026-08-01",
      groupBy: "day",
      days: 1,
      hoursPerDay: { standardUnit: 13, access247Unit: 24, standardCount: 0, access247Count: 0 },
    });
    expect(dto.totals.occupancyPercent).toBe(0);
  });

  it("leastUtilizedFrom returns the bottom 5 sorted ascending by occupancy", () => {
    const raw = {
      bookedHours: [{ booked_hours: "0" }],
      series: [],
      byWorkspace: Array.from({ length: 7 }, (_, index) => ({
        workspaceId: `ws${index}`,
        workspaceName: `Workspace ${index}`,
        type: "meeting_room",
        locationName: "HQ",
        access247: false,
        booked_hours: String(index),
        revenue: "0",
      })),
    };
    const dto = toOccupancyDto(raw, {
      from: "2026-08-01",
      to: "2026-08-01",
      groupBy: "day",
      days: 1,
      hoursPerDay,
    });
    const leastUtilized = leastUtilizedFrom(dto);
    expect(leastUtilized).toHaveLength(5);
    expect(leastUtilized[0].workspaceId).toBe("ws0");
    expect(leastUtilized.map((row) => row.occupancyPercent)).toEqual(
      [...leastUtilized.map((row) => row.occupancyPercent)].sort((a, b) => a - b),
    );
  });
});

describe("toPaymentsLedgerDto", () => {
  it("computes netAmount as amount minus refundedAmount, converted from minor units", () => {
    const raw = {
      rows: [
        {
          paymentId: "p1",
          bookingReference: "TS-ABC",
          status: "partially_refunded",
          provider: "xendit",
          paymentMethodCode: "OVO",
          paymentMethodCategory: "e_wallet",
          amountMinor: 100000n,
          refundedMinor: 40000n,
          currency: "IDR",
          customerName: "Ana",
          customerEmail: "ana@test.com",
          bookingDate: new Date("2026-08-15T00:00:00.000Z"),
          paidAt: new Date("2026-08-15T04:00:00.000Z"),
          createdAt: new Date("2026-08-15T03:00:00.000Z"),
        },
      ],
      total: 1,
      totalsByStatus: [{ status: "partially_refunded", currency: "IDR", total_minor: "100000" }],
    };
    const dto = toPaymentsLedgerDto(raw, { page: 1, limit: 20 });

    expect(dto.data[0].amount).toBe("100000.00");
    expect(dto.data[0].refundedAmount).toBe("40000.00");
    expect(dto.data[0].netAmount).toBe("60000.00");
  });

  it("totals cover the whole filtered set, computed independently of the returned page", () => {
    const raw = {
      rows: [],
      total: 500,
      totalsByStatus: [
        { status: "paid", currency: "IDR", total_minor: "5000000" },
        { status: "pending", currency: "IDR", total_minor: "200000" },
      ],
    };
    const dto = toPaymentsLedgerDto(raw, { page: 3, limit: 20 });
    expect(dto.totals.paid).toBe("5000000.00");
    expect(dto.totals.pending).toBe("200000.00");
    expect(dto.totals.refunded).toBe("0.00");
    expect(dto.meta.total).toBe(500);
  });
});

describe("toActivityDto", () => {
  it("formats a booking_created summary with the workspace and date", () => {
    const rows = [
      {
        id: "a1",
        type: "booking_created",
        occurredAt: new Date("2026-09-07T04:12:00.000Z"),
        actorName: "Ana Putri",
        actorId: "u1",
        subjectKind: "booking",
        subjectId: "b1",
        subjectReference: "TS-8F3K2A",
        extra: {
          workspaceName: "Meeting Room A",
          bookingDate: new Date("2026-09-15T00:00:00.000Z"),
        },
      },
    ];
    const [event] = toActivityDto(rows);
    expect(event.summary).toBe("Ana Putri booked Meeting Room A for 2026-09-15");
    expect(event.actor).toEqual({ id: "u1", name: "Ana Putri" });
  });

  it("formats a payment_succeeded summary converting minor units for display", () => {
    const rows = [
      {
        id: "p1",
        type: "payment_succeeded",
        occurredAt: new Date("2026-09-07T04:40:00.000Z"),
        actorName: null,
        actorId: null,
        subjectKind: "payment",
        subjectId: "pay1",
        subjectReference: "TS-8F3K2A",
        extra: { amount: "166500", currency: "IDR" },
      },
    ];
    const [event] = toActivityDto(rows);
    expect(event.summary).toBe("Payment of IDR 166500.00 received for TS-8F3K2A");
    expect(event.actor).toBeUndefined();
  });
});

describe("toOverviewDto", () => {
  it("computes bookingsChangePercent/revenueChangePercent against the prior comparison point", () => {
    const dto = toOverviewDto({
      date: "2026-09-07",
      currency: "IDR",
      bookingCounts: { total: 18, confirmed: 15, cancelled: 3 },
      revenue: "1240000",
      bookedHours: "40",
      availableHours: 100,
      newCustomers: 4,
      priorBookingCounts: { total: 16 },
      priorRevenue: "1300000",
      schedule: [],
    });
    expect(dto.comparison.bookingsChangePercent).toBe(Math.round(((18 - 16) / 16) * 100));
    expect(dto.comparison.revenueChangePercent).toBe(
      Math.round(((1240000 - 1300000) / 1300000) * 100),
    );
  });

  it("treats a zero prior as a 100% increase rather than dividing by zero", () => {
    const dto = toOverviewDto({
      date: "2026-09-07",
      currency: "IDR",
      bookingCounts: { total: 3, confirmed: 3, cancelled: 0 },
      revenue: "50000",
      bookedHours: "5",
      availableHours: 50,
      newCustomers: 1,
      priorBookingCounts: { total: 0 },
      priorRevenue: "0",
      schedule: [],
    });
    expect(dto.comparison.bookingsChangePercent).toBe(100);
    expect(dto.comparison.revenueChangePercent).toBe(100);
  });

  it("treats zero-to-zero as no change", () => {
    const dto = toOverviewDto({
      date: "2026-09-07",
      currency: "IDR",
      bookingCounts: { total: 0, confirmed: 0, cancelled: 0 },
      revenue: "0",
      bookedHours: "0",
      availableHours: 50,
      newCustomers: 0,
      priorBookingCounts: { total: 0 },
      priorRevenue: "0",
      schedule: [],
    });
    expect(dto.comparison.bookingsChangePercent).toBe(0);
    expect(dto.comparison.revenueChangePercent).toBe(0);
  });
});
