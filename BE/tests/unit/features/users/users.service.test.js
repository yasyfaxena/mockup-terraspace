import { describe, it, expect, vi } from "vitest";
import { UsersService } from "../../../../src/features/users/users.service.js";
import {
  EmailAlreadyExistsError,
  LastAdminError,
  UserHasBookingsError,
} from "../../../../src/features/users/users.errors.js";
import { NotFoundError } from "../../../../src/shared/errors/http-errors.js";

function fakeHeaders() {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Headers is unflagged in every Node this repo supports; the linter's version detection is just conservative
  return new Headers();
}

/** @param {{ repo?: object, auth?: object }} [overrides] */
function makeService(overrides = {}) {
  const repo = {
    findById: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(null),
    countAdmins: vi.fn().mockResolvedValue(1),
    countBookings: vi.fn().mockResolvedValue(0),
    adminUpdateProfile: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
    findAuthMethods: vi.fn().mockResolvedValue([]),
    countActiveSessions: vi.fn().mockResolvedValue(0),
    recentBookings: vi.fn().mockResolvedValue([]),
    getBookingStats: vi
      .fn()
      .mockResolvedValue({ totalBookings: 0, upcomingBookings: 0, totalSpent: 0 }),
    getPlatformCurrency: vi.fn().mockResolvedValue("IDR"),
    listAdmin: vi.fn(),
    ...overrides.repo,
  };
  const auth = {
    api: {
      createUser: vi.fn(),
      setRole: vi.fn(),
      removeUser: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    },
    ...overrides.auth,
  };
  // Never falls back to the real singleton — that reaches a live Prisma
  // client whenever this file runs in the same process as the
  // integration suite (e.g. `vitest run --coverage` with no --project
  // filter), silently hitting a real, possibly-empty database.
  const settingsService = {
    getSettings: vi.fn().mockResolvedValue({ currency: "IDR" }),
    ...overrides.settingsService,
  };
  const service = new UsersService({ usersRepository: repo, auth, settingsService });
  return { service, repo, auth, settingsService };
}

describe("UsersService.updateMe", () => {
  it("writes only the allow-listed fields — a hostile 'role' is dropped", async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      createdAt: new Date(),
      name: "A",
    });

    await service.updateMe("u1", { name: "New", role: "admin" });

    expect(repo.updateProfile).toHaveBeenCalledWith("u1", { name: "New" });
  });
});

describe("UsersService.deleteUser", () => {
  it("throws NotFoundError for a missing user", async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue(null);
    await expect(
      service.deleteUser("missing", { actorId: "actor", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses to delete your own account", async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue({ id: "u1", role: "customer" });
    await expect(
      service.deleteUser("u1", { actorId: "u1", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("refuses to delete the last remaining admin", async () => {
    const { service, repo } = makeService({ repo: { countAdmins: vi.fn().mockResolvedValue(0) } });
    repo.findById.mockResolvedValue({ id: "u2", role: "admin" });
    await expect(
      service.deleteUser("u2", { actorId: "actor", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("refuses to delete a user with bookings", async () => {
    const { service, repo } = makeService({
      repo: { countBookings: vi.fn().mockResolvedValue(2) },
    });
    repo.findById.mockResolvedValue({ id: "u3", role: "customer" });
    await expect(
      service.deleteUser("u3", { actorId: "actor", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(UserHasBookingsError);
  });

  it("deletes via Better Auth's admin API once every check passes", async () => {
    const { service, repo, auth } = makeService();
    repo.findById.mockResolvedValue({ id: "u4", role: "customer" });

    const result = await service.deleteUser("u4", { actorId: "actor", headers: fakeHeaders() });

    expect(result).toEqual({ success: true });
    expect(auth.api.removeUser).toHaveBeenCalledWith({
      body: { userId: "u4" },
      headers: expect.anything(),
    });
  });
});

describe("UsersService.banUser", () => {
  it("refuses to ban your own account", async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue({ id: "u1", role: "customer" });
    await expect(
      service.banUser("u1", { reason: "x" }, { actorId: "u1", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("refuses to ban the last remaining admin", async () => {
    const { service, repo } = makeService({ repo: { countAdmins: vi.fn().mockResolvedValue(0) } });
    repo.findById.mockResolvedValue({ id: "u2", role: "admin" });
    await expect(
      service.banUser("u2", { reason: "x" }, { actorId: "actor", headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });
});

describe("UsersService.updateAdminUser", () => {
  it("refuses to demote the last remaining admin", async () => {
    const { service, repo } = makeService({ repo: { countAdmins: vi.fn().mockResolvedValue(0) } });
    repo.findById.mockResolvedValue({ id: "u1", role: "admin", email: "a@test.com" });
    await expect(
      service.updateAdminUser("u1", { role: "customer" }, { headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("rejects a duplicate email", async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue({ id: "u1", role: "customer", email: "old@test.com" });
    repo.findByEmail.mockResolvedValue({ id: "other" });
    await expect(
      service.updateAdminUser("u1", { email: "new@test.com" }, { headers: fakeHeaders() }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });
});
