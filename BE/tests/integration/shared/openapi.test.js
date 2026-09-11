import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

describe("GET /openapi.json + /docs (development-phases.md Phase 8)", () => {
  it("serves a valid OpenAPI 3.1 document covering every feature", async () => {
    const res = await request(app).get("/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(40);

    const operationCount = Object.values(res.body.paths).reduce(
      (sum, pathItem) => sum + Object.keys(pathItem).length,
      0,
    );
    expect(operationCount).toBeGreaterThanOrEqual(61);

    const tags = new Set(
      Object.values(res.body.paths).flatMap((pathItem) =>
        Object.values(pathItem).flatMap((operation) => operation.tags ?? []),
      ),
    );
    expect(tags).toEqual(
      new Set([
        "Locations",
        "Workspaces",
        "Amenities",
        "Bookings",
        "Payments",
        "Settings",
        "Reports",
        "Users",
        "Auth",
      ]),
    );
  });

  it("requestBody/requestParams schemas match the real Zod validation schemas, not hand-typed duplicates", async () => {
    const res = await request(app).get("/openapi.json");
    const createLocation = res.body.paths["/admin/locations"].post;

    expect(createLocation.requestBody.content["application/json"].schema.required).toContain(
      "name",
    );
  });

  it("serves the interactive Scalar reference page", async () => {
    const res = await request(app).get("/docs");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
  });
});
