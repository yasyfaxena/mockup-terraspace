export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/**
 * Builds a query string matching BE's `repeatableQueryParam` expectation —
 * an array value becomes the same key repeated, not a comma-joined string.
 */
export function toQueryString(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
