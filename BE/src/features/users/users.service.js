import { createElement } from "react";
import { render } from "@react-email/render";
import { auth as authInstance } from "../auth/index.js";
import { settingsService as defaultSettingsService } from "../settings/index.js";
import { NotFoundError } from "../../shared/errors/http-errors.js";
import { sendEmail } from "../../shared/lib/mailer.js";
import { toPaginationMeta } from "../../shared/lib/pagination.js";
import { UsersRepository } from "./users.repository.js";
import { toMeDto, toAdminListItemDto, toAdminDetailDto, toBanDto } from "./users.mapper.js";
import { EmailAlreadyExistsError, LastAdminError, UserHasBookingsError } from "./users.errors.js";
import { WelcomeEmail } from "./welcome-email.js";

const RECENT_BOOKINGS_LIMIT = 10;

export class UsersService {
  /**
   * @param {{
   *   usersRepository?: UsersRepository,
   *   auth?: typeof authInstance,
   *   settingsService?: typeof defaultSettingsService,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.usersRepository ?? new UsersRepository();
    this.auth = deps.auth ?? authInstance;
    this.settings = deps.settingsService ?? defaultSettingsService;
  }

  /**
   * @param {string} userId
   * @throws {NotFoundError}
   */
  async getMe(userId) {
    const [user, stats, authMethods, settings] = await Promise.all([
      this.repo.findById(userId),
      this.repo.getBookingStats(userId),
      this.repo.findAuthMethods(userId),
      this.settings.getSettings(),
    ]);
    if (!user) throw new NotFoundError("User not found.");
    return toMeDto(user, { stats, authMethods, currency: settings.currency });
  }

  /**
   * Only the allow-listed fields are ever written — spreading the request
   * body would let a customer send `{"role":"admin"}` (users.md §2).
   * @param {string} userId
   * @param {{ name?: string, phone?: string|null, company?: string|null, image?: string|null }} data
   */
  async updateMe(userId, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.image !== undefined) updateData.image = data.image;

    await this.repo.updateProfile(userId, updateData);
    return this.getMe(userId);
  }

  /**
   * @param {{ q?: string, role?: string, banned?: boolean, sort: string, order: string, page: number, limit: number }} query
   */
  async listAdmin(query) {
    const { rows, total } = await this.repo.listAdmin(query);
    return {
      data: rows.map(toAdminListItemDto),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   */
  async getAdminDetail(id) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    const [authMethods, activeSessions, recentBookings, stats] = await Promise.all([
      this.repo.findAuthMethods(id),
      this.repo.countActiveSessions(id),
      this.repo.recentBookings(id, RECENT_BOOKINGS_LIMIT),
      this.repo.getBookingStats(id),
    ]);
    return toAdminDetailDto(user, { authMethods, activeSessions, recentBookings, stats });
  }

  /**
   * Delegates to Better Auth's admin API so the password is hashed the
   * same way a real sign-up hashes it (users.md §5).
   * @param {{ email: string, password: string, name: string, phone?: string|null, company?: string|null, role: string, sendWelcomeEmail: boolean }} data
   * @param {{ headers: Headers }} context
   * @throws {EmailAlreadyExistsError}
   */
  async createUser(data, { headers }) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) throw new EmailAlreadyExistsError();

    const { user } = await this.auth.api.createUser({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
        // Better Auth's admin plugin types its own default roles
        // ("user"/"admin") unless it can statically infer the custom
        // ones from our config object — it can't, from plain JS.
        role: /** @type {any} */ (data.role),
        data: { phone: data.phone ?? null, company: data.company ?? null },
      },
      headers,
    });

    // An admin vouches for the address — no verification round trip needed.
    await this.repo.verifyEmail(user.id);

    if (data.sendWelcomeEmail) {
      const html = await render(createElement(WelcomeEmail, { name: data.name }));
      await sendEmail({ to: data.email, subject: "Welcome to TerraSpace", html });
    }

    return this.getAdminDetail(user.id);
  }

  /**
   * @param {string} id
   * @param {{ name?: string, phone?: string|null, company?: string|null, role?: string, email?: string }} data
   * @param {{ headers: Headers }} context
   * @throws {NotFoundError}
   * @throws {EmailAlreadyExistsError}
   * @throws {LastAdminError} demoting the last remaining admin
   */
  async updateAdminUser(id, data, { headers }) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    if (data.email && data.email !== user.email) {
      const existing = await this.repo.findByEmail(data.email);
      if (existing) throw new EmailAlreadyExistsError();
    }

    if (data.role && data.role !== user.role) {
      await this.#changeRole(id, user.role, data.role, headers);
    }

    const profileFields = this.#buildProfileFields(data, user.email);
    if (Object.keys(profileFields).length > 0) {
      await this.repo.adminUpdateProfile(id, profileFields);
    }

    return this.getAdminDetail(id);
  }

  /**
   * @param {string} id
   * @param {string} currentRole
   * @param {string} nextRole
   * @param {Headers} headers
   * @throws {LastAdminError} demoting the last remaining admin
   */
  async #changeRole(id, currentRole, nextRole, headers) {
    if (currentRole === "admin") {
      const remainingAdmins = await this.repo.countAdmins(id);
      if (remainingAdmins === 0) {
        throw new LastAdminError("Cannot demote the last remaining admin.");
      }
    }
    await this.auth.api.setRole({
      body: { userId: id, role: /** @type {any} */ (nextRole) },
      headers,
    });
  }

  /**
   * @param {{ name?: string, phone?: string|null, company?: string|null, email?: string }} data
   * @param {string} currentEmail
   */
  #buildProfileFields(data, currentEmail) {
    const fields = {};
    if (data.name !== undefined) fields.name = data.name;
    if (data.phone !== undefined) fields.phone = data.phone;
    if (data.company !== undefined) fields.company = data.company;
    if (data.email !== undefined && data.email !== currentEmail) {
      fields.email = data.email;
      // A forced address change is unverified until re-confirmed — the
      // customer-facing re-verification flow is Better Auth's own
      // change-email endpoint, which this admin-initiated path bypasses.
      fields.emailVerified = false;
    }
    return fields;
  }

  /**
   * @param {string} id
   * @param {{ actorId: string, headers: Headers }} context
   * @throws {NotFoundError}
   * @throws {LastAdminError} deleting yourself, or the last remaining admin
   * @throws {UserHasBookingsError}
   */
  async deleteUser(id, { actorId, headers }) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    if (id === actorId) {
      throw new LastAdminError("You cannot delete your own account.");
    }
    if (user.role === "admin") {
      const remainingAdmins = await this.repo.countAdmins(id);
      if (remainingAdmins === 0) {
        throw new LastAdminError("Cannot delete the last remaining admin.");
      }
    }

    const bookingCount = await this.repo.countBookings(id);
    if (bookingCount > 0) {
      throw new UserHasBookingsError();
    }

    await this.auth.api.removeUser({ body: { userId: id }, headers });
    return { success: true };
  }

  /**
   * @param {string} id
   * @param {{ reason: string, expiresAt?: string }} data
   * @param {{ actorId: string, headers: Headers }} context
   * @throws {NotFoundError}
   * @throws {LastAdminError} banning yourself, or the last remaining admin
   */
  async banUser(id, data, { actorId, headers }) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    if (id === actorId) {
      throw new LastAdminError("You cannot ban your own account.");
    }
    if (user.role === "admin") {
      const remainingAdmins = await this.repo.countAdmins(id);
      if (remainingAdmins === 0) {
        throw new LastAdminError("Cannot ban the last remaining admin.");
      }
    }

    const banExpiresIn = data.expiresAt
      ? Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000))
      : undefined;

    await this.auth.api.banUser({
      body: { userId: id, banReason: data.reason, banExpiresIn },
      headers,
    });

    const banned = await this.repo.findById(id);
    if (!banned) throw new NotFoundError("User not found.");
    return toBanDto(banned);
  }

  /**
   * @param {string} id
   * @param {{ headers: Headers }} context
   * @throws {NotFoundError}
   */
  async unbanUser(id, { headers }) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found.");

    await this.auth.api.unbanUser({ body: { userId: id }, headers });
    const unbanned = await this.repo.findById(id);
    if (!unbanned) throw new NotFoundError("User not found.");
    return toBanDto(unbanned);
  }
}

export const usersService = new UsersService();
