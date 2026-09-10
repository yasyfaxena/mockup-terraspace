import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";

describe("GET /health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 when the database answers", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue([{ "?column?": 1 }]);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "healthy" });
  });

  it("returns 503 when the database is unreachable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unhealthy" });
  });
});
