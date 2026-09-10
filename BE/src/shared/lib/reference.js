import { customAlphabet } from "nanoid";

// Excludes 0/O/1/I so a code can be read aloud without ambiguity
// (libraries.md §12).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nanoid = customAlphabet(ALPHABET, 6);
const suffixId = customAlphabet(ALPHABET, 4);

/** `TS-8F3K2A` — the human-readable confirmation code (bookings.md §1). */
export function generateBookingReference() {
  return `TS-${nanoid()}`;
}

/** `TS-8F3K2A-4XQ9` — the QR/door-scan code, scoped under its booking's reference. @param {string} reference */
export function generateAccessCode(reference) {
  return `${reference}-${suffixId()}`;
}
