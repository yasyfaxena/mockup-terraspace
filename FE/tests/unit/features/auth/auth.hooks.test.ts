import { afterEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession, useSession: vi.fn() },
}));

const { requireAuth, requireRole } = await import("@/features/auth/auth.hooks");

function sessionOf(role: "customer" | "staff" | "admin") {
  return { data: { session: { id: "s1" }, user: { id: "u1", name: "Test User", role } } };
}

describe("requireAuth", () => {
  afterEach(() => {
    getSession.mockReset();
  });

  it("returns the session data when signed in", async () => {
    getSession.mockResolvedValue(sessionOf("customer"));

    const data = await requireAuth();

    expect(data.user.name).toBe("Test User");
  });

  it("redirects an anonymous visitor to /login", async () => {
    getSession.mockResolvedValue({ data: null });

    const redirectTo = await requireAuth()
      .then(() => null)
      .catch((e: { options: { to?: string } }) => e.options.to);

    expect(redirectTo).toBe("/login");
  });

  it("redirects to /login when getSession throws a network error / Failed to fetch", async () => {
    getSession.mockRejectedValue(new TypeError("Failed to fetch"));

    const redirectTo = await requireAuth()
      .then(() => null)
      .catch((e: { options: { to?: string } }) => e.options.to);

    expect(redirectTo).toBe("/login");
  });

  it("preserves location.pathname as redirect param when redirecting to /login", async () => {
    getSession.mockResolvedValue({ data: null });

    const redirectOptions = await requireAuth({ pathname: "/profile" })
      .then(() => null)
      .catch((e: { options: { to?: string; search?: { redirect?: string } } }) => e.options);

    expect(redirectOptions?.to).toBe("/login");
    expect(redirectOptions?.search?.redirect).toBe("/profile");
  });
});

describe("requireRole", () => {
  afterEach(() => {
    getSession.mockReset();
  });

  it("allows a matching role through", async () => {
    getSession.mockResolvedValue(sessionOf("admin"));

    const data = await requireRole("admin");

    expect(data.user.role).toBe("admin");
  });

  it("redirects a signed-in but wrong-role user to / (not /login)", async () => {
    getSession.mockResolvedValue(sessionOf("customer"));

    const redirectTo = await requireRole("admin")
      .then(() => null)
      .catch((e: { options: { to?: string } }) => e.options.to);

    expect(redirectTo).toBe("/");
  });

  it("redirects an anonymous visitor to /login, not /", async () => {
    getSession.mockResolvedValue({ data: null });

    const redirectTo = await requireRole("admin")
      .then(() => null)
      .catch((e: { options: { to?: string } }) => e.options.to);

    expect(redirectTo).toBe("/login");
  });
});
