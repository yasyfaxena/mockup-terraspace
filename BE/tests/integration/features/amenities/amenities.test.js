import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedAmenity, linkWorkspaceAmenity } from "../../../factories/amenity.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

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

describe("Admin amenities (amenities.md §2–5)", () => {
  it("gates admin routes behind requireRole(admin)", async () => {
    const res = await request(app).get("/api/v1/admin/amenities");
    expect(res.status).toBe(401);
  });

  it("rejects creating a duplicate name — UNIQUE (name) is new", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payload = { name: "Standing Desk" };

    const first = await request(app)
      .post("/api/v1/admin/amenities")
      .set("Cookie", cookie)
      .send(payload);
    expect(first.status).toBe(201);
    expect(first.body.usage).toEqual({ locations: 0, workspaces: 0 });

    const second = await request(app)
      .post("/api/v1/admin/amenities")
      .set("Cookie", cookie)
      .send(payload);
    expect(second.status).toBe(409);
  });

  it("renaming propagates everywhere immediately — junctions key on id, not the label", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const amenity = await seedAmenity({ name: "Old Name" });
    const workspace = await seedWorkspace();
    await linkWorkspaceAmenity(workspace.id, amenity.id);

    const patchRes = await request(app)
      .patch(`/api/v1/admin/amenities/${amenity.id}`)
      .set("Cookie", cookie)
      .send({ name: "New Name" });
    expect(patchRes.status).toBe(200);

    const publicRes = await request(app).get(`/api/v1/workspaces/${workspace.id}`);
    expect(publicRes.body.amenities.map((entry) => entry.name)).toContain("New Name");
  });

  it("returns 409 AMENITY_IN_USE when assigned, deletes cleanly once unused (REG-009)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const amenity = await seedAmenity();
    const workspace = await seedWorkspace();
    await linkWorkspaceAmenity(workspace.id, amenity.id);

    const blocked = await request(app)
      .delete(`/api/v1/admin/amenities/${amenity.id}`)
      .set("Cookie", cookie);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("AMENITY_IN_USE");

    const unused = await seedAmenity();
    const allowed = await request(app)
      .delete(`/api/v1/admin/amenities/${unused.id}`)
      .set("Cookie", cookie);
    expect(allowed.status).toBe(200);
  });
});
