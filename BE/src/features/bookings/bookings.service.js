import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { settingsService as defaultSettingsService } from "../settings/index.js";
import { usersService as defaultUsersService } from "../users/index.js";
import { NotFoundError } from "../../shared/errors/http-errors.js";
import { toPaginationMeta } from "../../shared/lib/pagination.js";
import { MINIMUM_BOOKING_MINUTES } from "../../shared/constants/hours.js";
import { generateBookingReference, generateAccessCode } from "../../shared/lib/reference.js";
import { isExclusionViolation } from "../../shared/errors/prisma-mapper.js";
import { BookingsRepository } from "./bookings.repository.js";
import { computeBookingAmounts, computeDurationHours } from "./pricing/pricing.js";
import { instantFromLocal, isCancellationWindowClosed } from "./bookings.time.js";
import {
  BookingInPastError,
  AdvanceBookingExceededError,
  BookingMinDurationError,
  SlotTakenError,
  WorkspaceNotBookableError,
  LocationInactiveError,
  CancellationWindowClosedError,
  BookingAlreadyCancelledError,
} from "./bookings.errors.js";
import {
  toBookingListDto,
  toBookingDto,
  toCancelDto,
  toAdminBookingListDto,
  toAdminBookingDetailDto,
  toCalendarEntryDto,
} from "./bookings.mapper.js";

// `disabled`/`maintenance`/`full` reject a new booking (bookings.md §1 errors) —
// only these two accept one.
const BOOKABLE_AVAILABILITIES = ["available", "limited"];
const STAFF_ROLES = ["staff", "admin"];

/** @param {string} hhmm */
function toTimeOfDay(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** @param {Date} time a `@db.Time` column value */
function toHHMM(time) {
  return time.toISOString().slice(11, 16);
}

/** @param {string} timezone */
function todayInZone(timezone) {
  return format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");
}

export class BookingsService {
  /**
   * @param {{
   *   bookingsRepository?: BookingsRepository,
   *   settingsService?: typeof defaultSettingsService,
   *   usersService?: typeof defaultUsersService,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.bookingsRepository ?? new BookingsRepository();
    this.settings = deps.settingsService ?? defaultSettingsService;
    this.users = deps.usersService ?? defaultUsersService;
  }

  /**
   * Shared by customer create (§1) and staff create (§7) — only what
   * varies (owner, date-check waiver, initial status) is parameterised.
   * @param {{
   *   userId: string, workspaceId: string, bookingDate: string, startTime: string,
   *   endTime: string, status: string, waiveDateChecks: boolean,
   * }} params
   * @throws {NotFoundError} workspace does not exist
   * @throws {WorkspaceNotBookableError}
   * @throws {LocationInactiveError}
   * @throws {BookingInPastError}
   * @throws {AdvanceBookingExceededError}
   * @throws {BookingMinDurationError}
   * @throws {SlotTakenError}
   */
  async #createBooking({
    userId,
    workspaceId,
    bookingDate,
    startTime,
    endTime,
    status,
    waiveDateChecks,
  }) {
    const workspace = await this.repo.findWorkspaceForBooking(workspaceId);
    if (!workspace) throw new NotFoundError("Workspace not found.");
    if (!BOOKABLE_AVAILABILITIES.includes(workspace.availability))
      throw new WorkspaceNotBookableError();
    if (workspace.location.status !== "active") throw new LocationInactiveError();

    const settings = await this.settings.getSettings();

    if (!waiveDateChecks) {
      const startInstant = instantFromLocal(bookingDate, startTime, workspace.location.timezone);
      if (startInstant.getTime() < Date.now()) throw new BookingInPastError();

      const todayStr = todayInZone(workspace.location.timezone);
      const maxDateStr = format(
        addDays(new Date(`${todayStr}T00:00:00.000Z`), settings.advanceBookingDays),
        "yyyy-MM-dd",
      );
      if (bookingDate > maxDateStr)
        throw new AdvanceBookingExceededError(settings.advanceBookingDays);
    }

    const durationMinutes = computeDurationHours(startTime, endTime) * 60;
    if (durationMinutes < MINIMUM_BOOKING_MINUTES) throw new BookingMinDurationError();

    const amounts = computeBookingAmounts({
      startTime,
      endTime,
      unitPrice: workspace.pricePerHour,
      taxPercent: settings.taxPercent,
    });
    const reference = generateBookingReference();

    try {
      return await this.repo.create({
        userId,
        workspaceId,
        bookingDate: new Date(`${bookingDate}T00:00:00.000Z`),
        startTime: toTimeOfDay(startTime),
        endTime: toTimeOfDay(endTime),
        unitPrice: workspace.pricePerHour,
        durationHours: amounts.durationHours,
        subtotalAmount: amounts.subtotalAmount,
        taxAmount: amounts.taxAmount,
        totalAmount: amounts.totalAmount,
        currency: settings.currency,
        status,
        reference,
        accessCode: generateAccessCode(reference),
      });
    } catch (err) {
      // The exclusion constraint, not this pre-check, is the authority on
      // availability (error-handling.md §8) — a concurrent insert between
      // the check above and this write is still caught here.
      if (isExclusionViolation(err)) throw new SlotTakenError();
      throw err;
    }
  }

  /**
   * @param {string} userId
   * @param {{ workspaceId: string, bookingDate: string, startTime: string, endTime: string }} data
   */
  async create(userId, data) {
    const booking = await this.#createBooking({
      ...data,
      userId,
      status: "confirmed",
      waiveDateChecks: false,
    });
    const settings = await this.settings.getSettings();
    return toBookingDto(booking, { cancellationWindowHours: settings.cancellationWindowHours });
  }

  /**
   * Staff booking on a customer's behalf — advance-booking and past-date
   * checks are waived (retroactive entry for a walk-in), but the
   * exclusion constraint never is (bookings.md §7).
   * @param {{
   *   userId: string, workspaceId: string, bookingDate: string,
   *   startTime: string, endTime: string, status: string,
   * }} data
   * @throws {NotFoundError} `userId` or `workspaceId` does not exist
   */
  async createStaff(data) {
    await this.users.getAdminDetail(data.userId);
    const booking = await this.#createBooking({ ...data, waiveDateChecks: true });
    const settings = await this.settings.getSettings();
    return toBookingDto(booking, { cancellationWindowHours: settings.cancellationWindowHours });
  }

  /**
   * @param {string} userId
   * @param {{ status?: string, scope: string, page: number, limit: number }} query
   */
  async list(userId, query) {
    const [{ rows, total }, settings] = await Promise.all([
      this.repo.findManyForUser(userId, query),
      this.settings.getSettings(),
    ]);
    return {
      data: rows.map((row) => toBookingListDto(row, settings.cancellationWindowHours)),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} userId
   * @param {string} reference
   * @throws {NotFoundError} not found, or belongs to another user
   */
  async getByReference(userId, reference) {
    const booking = await this.repo.findByReference(reference);
    if (!booking || booking.userId !== userId) throw new NotFoundError("Booking not found.");

    const settings = await this.settings.getSettings();
    return toBookingDto(booking, {
      cancellationWindowHours: settings.cancellationWindowHours,
      detail: true,
    });
  }

  /**
   * Owner or staff. Ownership is checked here, not middleware — the row
   * has not been loaded yet when the guard runs (bookings.md §4 rule 3).
   * @param {{ id: string, role?: string | null }} actor
   * @param {string} id
   * @throws {NotFoundError} not found, or belongs to another user
   * @throws {BookingAlreadyCancelledError}
   * @throws {CancellationWindowClosedError}
   */
  async cancel(actor, id) {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");

    const isStaff = STAFF_ROLES.includes(actor.role ?? "");
    if (!isStaff && booking.userId !== actor.id) throw new NotFoundError("Booking not found.");

    if (booking.status === "cancelled") throw new BookingAlreadyCancelledError();

    const settings = await this.settings.getSettings();
    const timezone = booking.workspace.location.timezone;
    if (isCancellationWindowClosed(booking, timezone, settings.cancellationWindowHours)) {
      throw new CancellationWindowClosedError(settings.cancellationWindowHours);
    }

    const cancelled = await this.repo.update(id, { status: "cancelled", cancelledAt: new Date() });
    return toCancelDto(cancelled, cancelled.paymentStatus === "paid");
  }

  /**
   * @param {{
   *   status?: string, paymentStatus?: string, locationId?: string, workspaceId?: string,
   *   userId?: string, from?: string, to?: string, q?: string,
   *   sort: string, order: string, page: number, limit: number,
   * }} query
   */
  async listAdmin(query) {
    const { rows, total } = await this.repo.findAllAdmin(query);
    return {
      data: rows.map(toAdminBookingListDto),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   */
  async getAdminDetail(id) {
    const booking = await this.repo.findByIdAdmin(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    return toAdminBookingDetailDto(booking);
  }

  /**
   * All fields optional; changing time or workspace re-prices the
   * booking (bookings.md §8) — `totalAmount` is never directly writable.
   * @param {string} id
   * @param {Record<string, any>} data
   * @throws {NotFoundError} booking or new `workspaceId` not found
   * @throws {BookingMinDurationError}
   * @throws {SlotTakenError}
   */
  async updateAdmin(id, data) {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");

    /** @type {Record<string, any>} */
    const fields = {};
    if (data.status !== undefined) {
      fields.status = data.status;
      fields.cancelledAt = data.status === "cancelled" ? new Date() : null;
    }

    const needsReprice =
      data.workspaceId !== undefined ||
      data.bookingDate !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined;

    if (needsReprice) {
      const workspaceId = data.workspaceId ?? booking.workspaceId;
      const workspace = await this.repo.findWorkspaceForBooking(workspaceId);
      if (!workspace) throw new NotFoundError("Workspace not found.");

      const startTime = data.startTime ?? toHHMM(booking.startTime);
      const endTime = data.endTime ?? toHHMM(booking.endTime);
      const durationMinutes = computeDurationHours(startTime, endTime) * 60;
      if (durationMinutes < MINIMUM_BOOKING_MINUTES) throw new BookingMinDurationError();

      const settings = await this.settings.getSettings();
      const amounts = computeBookingAmounts({
        startTime,
        endTime,
        unitPrice: workspace.pricePerHour,
        taxPercent: settings.taxPercent,
      });

      fields.workspaceId = workspaceId;
      if (data.bookingDate !== undefined)
        fields.bookingDate = new Date(`${data.bookingDate}T00:00:00.000Z`);
      fields.startTime = toTimeOfDay(startTime);
      fields.endTime = toTimeOfDay(endTime);
      fields.unitPrice = workspace.pricePerHour;
      fields.durationHours = amounts.durationHours;
      fields.subtotalAmount = amounts.subtotalAmount;
      fields.taxAmount = amounts.taxAmount;
      fields.totalAmount = amounts.totalAmount;
    }

    try {
      await this.repo.update(id, fields);
    } catch (err) {
      if (isExclusionViolation(err)) throw new SlotTakenError();
      throw err;
    }

    return this.getAdminDetail(id);
  }

  /**
   * Hard delete. Admin only — prefer {@link cancel} (bookings.md §9).
   * @param {string} id
   * @throws {NotFoundError}
   */
  async remove(id) {
    const booking = await this.repo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    await this.repo.delete(id);
    return { success: true };
  }

  /** @param {{ from: string, to: string, locationId?: string, workspaceId?: string }} query */
  async calendar(query) {
    const rows = await this.repo.findCalendar(query);
    return { data: rows.map(toCalendarEntryDto) };
  }
}

export const bookingsService = new BookingsService();
