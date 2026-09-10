import { describe, it, expect } from "vitest";
import {
  instantFromLocal,
  bookingStartInstant,
  bookingEndInstant,
  isCancellationWindowClosed,
} from "../../../../src/features/bookings/bookings.time.js";

describe("instantFromLocal", () => {
  it("converts a venue-local date+time to the correct UTC instant", () => {
    // Asia/Jakarta is UTC+7, no DST.
    const instant = instantFromLocal("2026-09-15", "09:00", "Asia/Jakarta");
    expect(instant.toISOString()).toBe("2026-09-15T02:00:00.000Z");
  });

  it("returns the same instant unchanged for UTC", () => {
    const instant = instantFromLocal("2026-09-15", "09:00", "UTC");
    expect(instant.toISOString()).toBe("2026-09-15T09:00:00.000Z");
  });
});

describe("bookingStartInstant / bookingEndInstant", () => {
  it("reads the `@db.Time` epoch-date columns correctly", () => {
    const booking = {
      bookingDate: new Date("2026-09-15T00:00:00.000Z"),
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T12:00:00.000Z"),
    };
    expect(bookingStartInstant(booking, "Asia/Jakarta").toISOString()).toBe(
      "2026-09-15T02:00:00.000Z",
    );
    expect(bookingEndInstant(booking, "Asia/Jakarta").toISOString()).toBe(
      "2026-09-15T05:00:00.000Z",
    );
  });
});

describe("isCancellationWindowClosed", () => {
  /** A booking starting exactly at a fixed UTC instant. */
  function bookingStartingAt(instant) {
    return {
      bookingDate: new Date(`${instant.toISOString().slice(0, 10)}T00:00:00.000Z`),
      startTime: new Date(`1970-01-01T${instant.toISOString().slice(11, 16)}:00.000Z`),
    };
  }

  it("enforces the boundary on both sides, down to the minute (bookings.md §4 exit criterion)", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const cancellationWindowHours = 24;
    const boundary = new Date(now.getTime() + cancellationWindowHours * 60 * 60 * 1000);

    // Exactly on the boundary — still allowed (inclusive).
    expect(
      isCancellationWindowClosed(bookingStartingAt(boundary), "UTC", cancellationWindowHours, now),
    ).toBe(false);

    // One minute earlier than the boundary (i.e. the booking starts one
    // minute sooner) — now inside the window, blocked.
    const oneMinuteInside = new Date(boundary.getTime() - 60 * 1000);
    expect(
      isCancellationWindowClosed(
        bookingStartingAt(oneMinuteInside),
        "UTC",
        cancellationWindowHours,
        now,
      ),
    ).toBe(true);

    // One minute past the boundary (booking starts one minute later) — still outside, allowed.
    const oneMinuteOutside = new Date(boundary.getTime() + 60 * 1000);
    expect(
      isCancellationWindowClosed(
        bookingStartingAt(oneMinuteOutside),
        "UTC",
        cancellationWindowHours,
        now,
      ),
    ).toBe(false);
  });

  it("is closed for a booking that has already started", () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    const past = new Date("2026-09-14T09:00:00.000Z");
    expect(isCancellationWindowClosed(bookingStartingAt(past), "UTC", 24, now)).toBe(true);
  });
});
