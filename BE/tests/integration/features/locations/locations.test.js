import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { seedAmenity, linkLocationAmenity } from "../../../factories/amenity.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

describe("GET /locations (locations.md §1)", () => {
  it("computes stats in SQL, counting every workspace regardless of availability", async () => {
    const location = await seedLocation({ city: "Jakarta" });
    // A disabled workspace with the LOWEST price — REG-006: disabled
    // workspaces must still count toward priceFrom and totals, not just
    // the available ones (the catalog.ts:106 fix).
    await seedWorkspace({
      locationId: location.id,
      type: "hot_desk",
      pricePerHour: "5000.00",
      availability: "disabled",
    });
    await seedWorkspace({
      locationId: location.id,
      type: "meeting_room",
      pricePerHour: "50000.00",
      availability: "available",
    });

    const res = await request(app).get("/api/v1/locations");

    expect(res.status).toBe(200);
    const found = res.body.data.find((entry) => entry.id === location.id);
    expect(found.stats).toMatchObject({
      desksTotal: 1,
      desksAvailable: 0, // the desk is disabled
      roomsTotal: 1,
      roomsAvailable: 1,
      priceFrom: "5000.00", // the disabled workspace's price, not the available one's
      availability: "limited",
    });
    expect(found.stats.types.sort()).toEqual(["hot_desk", "meeting_room"]);
  });

  it("filters by city, case-insensitively", async () => {
    const location = await seedLocation({ city: "Bandung" });
    const res = await request(app).get("/api/v1/locations?city=bandung");
    expect(res.status).toBe(200);
    expect(res.body.data.map((entry) => entry.id)).toContain(location.id);
  });

  it("only returns active locations", async () => {
    const location = await seedLocation({ status: "inactive" });
    const res = await request(app).get("/api/v1/locations");
    expect(res.body.data.map((entry) => entry.id)).not.toContain(location.id);
  });

  it("filters by amenityId, requiring every listed amenity", async () => {
    const location = await seedLocation();
    const [wifi, parking] = await Promise.all([
      seedAmenity({ name: "Wi-Fi" }),
      seedAmenity({ name: "Parking" }),
    ]);
    await linkLocationAmenity(location.id, wifi.id);

    const missingBoth = await request(app).get(
      `/api/v1/locations?amenityId=${wifi.id}&amenityId=${parking.id}`,
    );
    expect(missingBoth.body.data.map((entry) => entry.id)).not.toContain(location.id);

    const hasOne = await request(app).get(`/api/v1/locations?amenityId=${wifi.id}`);
    expect(hasOne.body.data.map((entry) => entry.id)).toContain(location.id);
  });

  it("is not paginated — no meta field", async () => {
    const res = await request(app).get("/api/v1/locations");
    expect(res.body).not.toHaveProperty("meta");
  });
});

describe("GET /locations/:slug (locations.md §2)", () => {
  it("includes workspaces, excluding disabled ones, but stats still count them", async () => {
    const location = await seedLocation();
    const visible = await seedWorkspace({ locationId: location.id, availability: "available" });
    await seedWorkspace({ locationId: location.id, availability: "disabled" });

    const res = await request(app).get(`/api/v1/locations/${location.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.workspaces).toHaveLength(1);
    expect(res.body.workspaces[0].id).toBe(visible.id);
    expect(res.body.stats.desksTotal + res.body.stats.roomsTotal).toBe(2);
    expect(res.body.accessRadiusMeters).toBe(50);
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await request(app).get("/api/v1/locations/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for an inactive location", async () => {
    const location = await seedLocation({ status: "inactive" });
    const res = await request(app).get(`/api/v1/locations/${location.slug}`);
    expect(res.status).toBe(404);
  });
});

describe("Admin locations (locations.md §3–6)", () => {
  it("rejects a punctuation-only slug with 422, never persisting it", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .post("/api/v1/admin/locations")
      .set("Cookie", cookie)
      .send({ slug: "!!!", name: "Test", address: "Addr", city: "City" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("slugifies the input server-side", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .post("/api/v1/admin/locations")
      .set("Cookie", cookie)
      .send({ slug: "  Terra Space!! Bandung  ", name: "Test", address: "Addr", city: "City" });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("terra-space-bandung");
  });

  it("rejects a duplicate slug with 409", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const existing = await seedLocation();

    const res = await request(app)
      .post("/api/v1/admin/locations")
      .set("Cookie", cookie)
      .send({ slug: existing.slug, name: "Test", address: "Addr", city: "City" });

    expect(res.status).toBe(409);
  });

  it("rejects an unknown or inactive amenityId", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const inactive = await seedAmenity({ status: "inactive" });

    const res = await request(app)
      .post("/api/v1/admin/locations")
      .set("Cookie", cookie)
      .send({
        slug: "test-amenity-loc",
        name: "Test",
        address: "Addr",
        city: "City",
        amenityIds: [inactive.id],
      });

    expect(res.status).toBe(422);
  });

  it("keeps every workspace attached when the slug is renamed — the FK is locationId", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();
    const workspace = await seedWorkspace({ locationId: location.id });

    const renameRes = await request(app)
      .patch(`/api/v1/admin/locations/${location.id}`)
      .set("Cookie", cookie)
      .send({ slug: "renamed-slug" });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.slug).toBe("renamed-slug");
    expect(renameRes.body.workspaceCount).toBe(1);

    const listRes = await request(app)
      .get(`/api/v1/admin/workspaces?locationId=${location.id}`)
      .set("Cookie", cookie);
    expect(listRes.body.data.map((entry) => entry.id)).toContain(workspace.id);
  });

  it("returns 409 when deleting a location with workspaces, 200 once empty", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();
    await seedWorkspace({ locationId: location.id });

    const blocked = await request(app)
      .delete(`/api/v1/admin/locations/${location.id}`)
      .set("Cookie", cookie);
    expect(blocked.status).toBe(409);

    const empty = await seedLocation();
    const allowed = await request(app)
      .delete(`/api/v1/admin/locations/${empty.id}`)
      .set("Cookie", cookie);
    expect(allowed.status).toBe(200);
  });
});
