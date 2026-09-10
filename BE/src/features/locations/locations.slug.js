/**
 * Lowercases, collapses every run of non-alphanumeric characters to a
 * single `-`, and strips leading/trailing `-`. Punctuation-only input (or
 * a non-Latin script with no ASCII letters/digits) reduces to `""` — the
 * caller must reject that, never persist it (locations.md §4; the
 * `catalog.ts:16-32` empty-slug defect this replaces).
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  const collapsed = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");

  let start = 0;
  let end = collapsed.length;
  while (start < end && collapsed[start] === "-") start += 1;
  while (end > start && collapsed[end - 1] === "-") end -= 1;
  return collapsed.slice(start, end);
}
