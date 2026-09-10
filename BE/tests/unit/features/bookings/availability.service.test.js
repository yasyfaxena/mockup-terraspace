import { describe, it, expect } from "vitest";
import { computeFreeIntervals } from "../../../../src/features/bookings/availability/availability.service.js";

const OPENING_HOURS = { from: "09:00", to: "22:00" };

describe("computeFreeIntervals", () => {
  it("returns the full opening hours when nothing is busy", () => {
    expect(computeFreeIntervals(OPENING_HOURS, [])).toEqual([{ from: "09:00", to: "22:00" }]);
  });

  it("splits around a single busy interval", () => {
    const busy = [{ from: "10:30", to: "12:00" }];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([
      { from: "09:00", to: "10:30" },
      { from: "12:00", to: "22:00" },
    ]);
  });

  it("handles a busy interval starting exactly at opening time — no leading free slot", () => {
    const busy = [{ from: "09:00", to: "10:00" }];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([{ from: "10:00", to: "22:00" }]);
  });

  it("handles a busy interval ending exactly at closing time — no trailing free slot", () => {
    const busy = [{ from: "20:00", to: "22:00" }];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([{ from: "09:00", to: "20:00" }]);
  });

  it("handles back-to-back busy intervals sharing a boundary — '[)' means no gap, no overlap", () => {
    const busy = [
      { from: "09:00", to: "12:00" },
      { from: "12:00", to: "14:00" },
    ];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([{ from: "14:00", to: "22:00" }]);
  });

  it("returns no free time when fully booked", () => {
    const busy = [{ from: "09:00", to: "22:00" }];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([]);
  });

  it("handles several separate busy intervals", () => {
    const busy = [
      { from: "09:00", to: "10:30" },
      { from: "12:00", to: "13:00" },
    ];
    expect(computeFreeIntervals(OPENING_HOURS, busy)).toEqual([
      { from: "10:30", to: "12:00" },
      { from: "13:00", to: "22:00" },
    ]);
  });
});
