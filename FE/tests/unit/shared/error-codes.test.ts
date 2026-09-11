import { describe, expect, it } from "vitest";
import { ERROR_CODE } from "@/shared/error-codes";
import { errorMessages } from "@/shared/i18n";

// error-handling.md §6/§10: a code with no translation is a review-blocking
// finding, not a shipped fallback — this test is what enforces that.
describe("error-codes i18n coverage", () => {
  it("has both an EN and ID string for every ERROR_CODE", () => {
    for (const code of Object.values(ERROR_CODE)) {
      expect(errorMessages.en[code], `missing EN translation for ${code}`).toBeTypeOf("string");
      expect(errorMessages.en[code].length, `empty EN translation for ${code}`).toBeGreaterThan(0);
      expect(errorMessages.id[code], `missing ID translation for ${code}`).toBeTypeOf("string");
      expect(errorMessages.id[code].length, `empty ID translation for ${code}`).toBeGreaterThan(0);
    }
  });

  it("has no stray translation keys beyond ERROR_CODE", () => {
    const known = new Set<string>(Object.values(ERROR_CODE));
    for (const locale of ["en", "id"] as const) {
      for (const key of Object.keys(errorMessages[locale])) {
        expect(known.has(key), `unexpected key "${key}" in errorMessages.${locale}`).toBe(true);
      }
    }
  });
});
