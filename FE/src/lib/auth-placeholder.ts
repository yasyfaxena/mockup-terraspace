/**
 * Stand-in for the real `features/auth` `useSession()` (Phase 2). Site/admin
 * layout shells need *something* to call in Phase 1 so they render before
 * Better Auth is wired up — every consumer here is replaced in Phase 2, not
 * extended.
 */
export function useAuthPlaceholder() {
  return {
    session: null as { user: { email: string } } | null,
    profile: null as { full_name?: string; role?: string } | null,
    user: null as { email?: string } | null,
    signOut: async () => {},
  };
}
