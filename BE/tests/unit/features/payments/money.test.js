import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import {
  toMinor,
  fromMinor,
  toDecimal,
  CURRENCY_EXPONENT,
} from "../../../../src/shared/lib/money.js";
import { InternalError } from "../../../../src/shared/errors/http-errors.js";

describe("toMinor", () => {
  it("IDR (exponent 0): 100000.00 -> 100000n, never x100 (REG-010)", () => {
    expect(toMinor(new Decimal("100000.00"), "IDR")).toBe(100000n);
  });

  it("USD (exponent 2): 166.50 -> 16650n", () => {
    expect(toMinor(new Decimal("166.50"), "USD")).toBe(16650n);
  });

  it("SGD (exponent 2): 220.00 -> 22000n", () => {
    expect(toMinor(new Decimal("220.00"), "SGD")).toBe(22000n);
  });

  it("throws for a currency with no known exponent, rather than guessing", () => {
    expect(() => toMinor(new Decimal("100.00"), "XYZ")).toThrow(InternalError);
  });
});

describe("fromMinor", () => {
  it("is the exact inverse of toMinor for IDR", () => {
    expect(fromMinor(166500n, "IDR")).toBe("166500.00");
  });

  it("is the exact inverse of toMinor for USD", () => {
    expect(fromMinor(16650n, "USD")).toBe("166.50");
  });

  it("throws for an unknown currency", () => {
    expect(() => fromMinor(100n, "XYZ")).toThrow(InternalError);
  });
});

describe("toDecimal", () => {
  it("builds a Decimal usable by toMinor", () => {
    expect(toMinor(toDecimal("50000.00"), "IDR")).toBe(50000n);
  });
});

describe("CURRENCY_EXPONENT", () => {
  it("has no decimal places for IDR — the dangerous case", () => {
    expect(CURRENCY_EXPONENT.IDR).toBe(0);
  });
});
