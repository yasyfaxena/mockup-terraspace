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
  bookings: {
    all: () => ["bookings"] as const,
    list: (params?: unknown) => ["bookings", "list", params ?? {}] as const,
    detail: (reference: string) => ["bookings", "detail", reference] as const,
    adminList: (params?: unknown) => ["bookings", "admin-list", params ?? {}] as const,
    adminDetail: (id: string) => ["bookings", "admin-detail", id] as const,
    calendar: (params?: unknown) => ["bookings", "calendar", params ?? {}] as const,
  },
  settings: {
    public: () => ["settings", "public"] as const,
  },
} as const;
