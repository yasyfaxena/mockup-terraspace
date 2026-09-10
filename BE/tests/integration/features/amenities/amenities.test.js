import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedAmenity } from "../../../factories/amenity.factory.js";

describe("GET /amenities (amenities.md §1)", () => {
  it("returns only active amenities, unpaginated", async () => {
    const active = await seedAmenity({ status: "active" });
    const inactive = await seedAmenity({ status: "inactive" });

    const res = await request(app).get("/api/v1/amenities");

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("meta");
    const ids = res.body.data.map((entry) => entry.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("filters by category", async () => {
    const facility = await seedAmenity({ category: "Facility" });
    const equipment = await seedAmenity({ category: "Equipment" });

    const res = await request(app).get("/api/v1/amenities?category=Facility");

    const ids = res.body.data.map((entry) => entry.id);
    expect(ids).toContain(facility.id);
    expect(ids).not.toContain(equipment.id);
  });
});
