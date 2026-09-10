import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

const FROM = "2026-08-01";
const TO = "2026-08-31";

describe("GET /admin/reports/export (reports.md §6)", () => {
  it("streams a bookings CSV with the correct headers and a matching row", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const booking = await seedBooking({
      bookingDate: "2026-08-15",
      unitPrice: 50000,
      taxPercent: 11,
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=bookings&from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="bookings-.*\.csv"/);

    const lines = res.text.trim().split("\r\n");
    expect(lines[0]).toBe(
      "reference,bookingDate,startTime,endTime,status,paymentStatus,totalAmount,currency,workspaceName,locationName,customerName",
    );
    const row = lines.find((line) => line.startsWith(booking.reference));
    expect(row).toBeTruthy();
    expect(row).toContain("166500.00");
    // an unformatted decimal, not pre-formatted with thousands separators (reports.md §6)
    expect(row).not.toContain("166,500");
  });

  it("streams a revenue CSV with subtotal/tax/total as separate unformatted columns", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({
      bookingDate: "2026-08-15",
      unitPrice: 50000,
      taxPercent: 11,
      paymentStatus: "paid",
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=revenue&from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    const lines = res.text.trim().split("\r\n");
    expect(lines[0]).toContain("subtotalAmount,taxAmount,totalAmount,currency");
    expect(lines[1]).toContain("150000.00,16500.00,166500.00,IDR");
  });

  it("excludes non-paid bookings from the revenue export", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({ bookingDate: "2026-08-15", paymentStatus: "pending" });

    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=revenue&from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    const lines = res.text.trim().split("\r\n");
    expect(lines).toHaveLength(1); // header only
  });

  it("rejects a range over 366 days (422)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=bookings&from=2025-01-01&to=2026-06-01`)
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("rejects an unknown report type", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=customers&from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("returns 403 for staff — admin only", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/export?report=bookings&from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});
