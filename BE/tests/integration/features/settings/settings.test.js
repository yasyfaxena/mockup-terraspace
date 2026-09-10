import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";
import { seedAdminSettings } from "../../../helpers/db.js";
import { clearPublicSettingsCache } from "../../../../src/features/settings/settings.service.js";

beforeEach(() => {
  clearPublicSettingsCache();
});

describe("GET /settings/public (settings.md §1)", () => {
  it("never returns null — the row is seeded at reset time", async () => {
    const res = await request(app).get("/api/v1/settings/public");

    expect(res.status).toBe(200);
    expect(res.body.companyName).toBeTruthy();
    expect(res.body.currency).toBe("IDR");
    expect(res.body.currencyExponent).toBe(0);
    expect(res.body.taxPercent).toMatch(/^\d+\.\d{2}$/);
    expect(res.body).toHaveProperty("cancellationWindowHours");
    expect(res.body).toHaveProperty("advanceBookingDays");
    expect(res.body).toHaveProperty("minimumBookingDurationMinutes");
    expect(res.body).toHaveProperty("bookingAccessBufferMinutes");
  });

  it("excludes internal-only fields", async () => {
    const res = await request(app).get("/api/v1/settings/public");
    expect(res.body).not.toHaveProperty("emailNotificationsEnabled");
    expect(res.body).not.toHaveProperty("updatedAt");
  });

  it("is public — no auth required", async () => {
    const res = await request(app).get("/api/v1/settings/public");
    expect(res.status).toBe(200);
  });

  it("reflects an admin update after the 5-minute cache is invalidated by the write", async () => {
    await seedAdminSettings({ taxPercent: 11 });
    const before = await request(app).get("/api/v1/settings/public");
    expect(before.body.taxPercent).toBe("11.00");

    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ taxPercent: "15.00" });

    const after = await request(app).get("/api/v1/settings/public");
    expect(after.body.taxPercent).toBe("15.00");
  });
});

describe("GET /admin/settings (settings.md §2)", () => {
  it("returns the full admin shape", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app).get("/api/v1/admin/settings").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("emailNotificationsEnabled");
    expect(res.body).toHaveProperty("updatedAt");
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/v1/admin/settings");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app).get("/api/v1/admin/settings").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

describe("PUT /admin/settings (settings.md §3)", () => {
  it("replaces only the fields sent — omitted fields keep their current value", async () => {
    await seedAdminSettings({ companyName: "Original Co", taxPercent: 11 });
    const { cookie } = await createUserAndSignIn({ role: "admin" });

    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ taxPercent: "12.50" });

    expect(res.status).toBe(200);
    expect(res.body.taxPercent).toBe("12.50");
    expect(res.body.companyName).toBe("Original Co");
  });

  it("rejects a currency with no known minor-unit exponent (422)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ currency: "XYZ" });

    expect(res.status).toBe(422);
  });

  it("accepts a known currency and normalizes it to uppercase", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ currency: "usd" });

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe("USD");
  });

  it("rejects a taxPercent outside 0-100", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ taxPercent: "150.00" });

    expect(res.status).toBe(422);
  });

  it("does not alter an existing booking's own snapshotted price when tax changes (rule 1)", async () => {
    const { seedBooking } = await import("../../../factories/booking.factory.js");
    const booking = await seedBooking({ unitPrice: 50000, taxPercent: 11 });
    const { cookie } = await createUserAndSignIn({ role: "admin" });

    await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ taxPercent: "20.00" });

    const persisted = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persisted.taxAmount.toString()).toBe(booking.taxAmount.toString());
  });

  it("returns 403 for a non-admin", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set("Cookie", cookie)
      .send({ taxPercent: "12.00" });
    expect(res.status).toBe(403);
  });
});
