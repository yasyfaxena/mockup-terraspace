/**
 * The one factory every feature imports (state-map.md §2) — no feature
 * hand-writes an array-literal query key. Each phase adds its own
 * top-level namespace here as the matching feature lands.
 */
export const queryKeys = {
  health: {
    all: () => ["health"] as const,
  },
} as const;
