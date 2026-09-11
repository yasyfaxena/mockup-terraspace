/**
 * The one factory every feature imports (state-map.md §2) — no feature
 * hand-writes an array-literal query key. Each phase adds its own
 * top-level namespace here as the matching feature lands.
 */
export const queryKeys = {
  health: {
    all: () => ["health"] as const,
  },
  locations: {
    all: () => ["locations"] as const,
    list: (params?: unknown) => ["locations", "list", params ?? {}] as const,
    detail: (slug: string) => ["locations", "detail", slug] as const,
    adminList: (params?: unknown) => ["locations", "admin-list", params ?? {}] as const,
  },
  workspaces: {
    all: () => ["workspaces"] as const,
    list: (params?: unknown) => ["workspaces", "list", params ?? {}] as const,
    detail: (id: string) => ["workspaces", "detail", id] as const,
    availability: (id: string, date: string) => ["workspaces", "availability", id, date] as const,
    adminList: (params?: unknown) => ["workspaces", "admin-list", params ?? {}] as const,
  },
  amenities: {
    all: () => ["amenities"] as const,
    list: (params?: unknown) => ["amenities", "list", params ?? {}] as const,
    adminList: (params?: unknown) => ["amenities", "admin-list", params ?? {}] as const,
  },
} as const;
