import { describe, it, expect } from "vitest";
import {
  mapPrismaError,
  isExclusionViolation,
} from "../../../../src/shared/errors/prisma-mapper.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../src/shared/errors/http-errors.js";

/**
 * Fabricates the two shapes real Prisma errors take, so this stays correct
 * without needing a live database. A structured call like `.create()` never
 * throws `PrismaClientKnownRequestError` for a constraint Prisma has no
 * dedicated code for (CHECK, EXCLUDE, or an unmodelled unique index) — it
 * throws `PrismaClientUnknownRequestError`, whose SQLSTATE is only findable
 * inside the formatted `.message` (proven against a real database in
 * tests/integration/schema/booking-overlap.test.js and checks.test.js).
 */
function knownRequestError(code, meta) {
  return { code, meta, clientVersion: "6.19.3", name: "PrismaClientKnownRequestError" };
}

function unknownRequestError(sqlState, detail = "") {
  return {
    name: "PrismaClientUnknownRequestError",
    clientVersion: "6.19.3",
    message: `Error occurred during query execution:\nConnectorError(... PostgresError { code: "${sqlState}", message: "${detail}", ... })`,
  };
}

describe("mapPrismaError", () => {
  it("maps P2002 to ConflictError", () => {
    expect(mapPrismaError(knownRequestError("P2002"))).toBeInstanceOf(ConflictError);
  });

  it("maps P2025 to NotFoundError", () => {
    expect(mapPrismaError(knownRequestError("P2025"))).toBeInstanceOf(NotFoundError);
  });

  it("maps P2003 to ConflictError", () => {
    expect(mapPrismaError(knownRequestError("P2003"))).toBeInstanceOf(ConflictError);
  });

  it("maps P2000 to ValidationError", () => {
    expect(mapPrismaError(knownRequestError("P2000"))).toBeInstanceOf(ValidationError);
  });

  it("maps an unmodelled unique violation (23505) to ConflictError", () => {
    expect(mapPrismaError(unknownRequestError("23505"))).toBeInstanceOf(ConflictError);
  });

  it("maps a CHECK violation (23514) to ValidationError", () => {
    expect(mapPrismaError(unknownRequestError("23514"))).toBeInstanceOf(ValidationError);
  });

  it("returns null for an exclusion violation — the bookings service maps that one itself", () => {
    expect(mapPrismaError(unknownRequestError("23P01"))).toBeNull();
  });

  it("returns null for an unrecognized error", () => {
    expect(mapPrismaError(new Error("boom"))).toBeNull();
  });
});

describe("isExclusionViolation", () => {
  it("recognizes a PrismaClientUnknownRequestError carrying 23P01 in its message", () => {
    expect(isExclusionViolation(unknownRequestError("23P01", "conflicting key value"))).toBe(true);
  });

  it("recognizes a PrismaClientKnownRequestError with meta.code 23P01", () => {
    expect(isExclusionViolation(knownRequestError("P2010", { code: "23P01" }))).toBe(true);
  });

  it("does not confuse a CHECK violation for an exclusion violation", () => {
    expect(isExclusionViolation(unknownRequestError("23514"))).toBe(false);
  });

  it("returns false for a non-error value", () => {
    expect(isExclusionViolation(null)).toBe(false);
    expect(isExclusionViolation("not an error")).toBe(false);
  });
});
