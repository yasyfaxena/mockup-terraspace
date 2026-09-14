import { describe, expect, it } from "vitest";
import { createGoogleCalendarUrl } from "@/features/bookings";

describe("createGoogleCalendarUrl", () => {
  it("generates a valid Google Calendar template URL with encoded parameters", () => {
    const url = createGoogleCalendarUrl({
      title: "TerraSpace: Private Office A",
      description: "Booking Reference: TSPC-123\nAccess Code: 123456",
      location: "123 Business Way, Jakarta",
      bookingDate: "2026-09-15",
      startTime: "10:00",
      endTime: "12:00",
    });

    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20260915T100000%2F20260915T120000");
    expect(url).toContain("text=TerraSpace%3A+Private+Office+A");
    expect(url).toContain("location=123+Business+Way%2C+Jakarta");
  });
});
