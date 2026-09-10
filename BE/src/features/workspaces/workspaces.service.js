import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  availabilityService as defaultAvailabilityService,
  BookingInPastError,
  AdvanceBookingExceededError,
} from "../bookings/index.js";
import { settingsService as defaultSettingsService } from "../settings/index.js";
import { NotFoundError } from "../../shared/errors/http-errors.js";
import { toPaginationMeta } from "../../shared/lib/pagination.js";
import { openingHoursFor, MINIMUM_BOOKING_MINUTES } from "../../shared/constants/hours.js";
import { WorkspacesRepository } from "./workspaces.repository.js";
import { toWorkspaceListDto, toWorkspaceDetailDto } from "./workspaces.mapper.js";

/** @param {string} timezone */
function todayInZone(timezone) {
  return format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");
}

export class WorkspacesService {
  /**
   * @param {{
   *   workspacesRepository?: WorkspacesRepository,
   *   settingsService?: typeof defaultSettingsService,
   *   availabilityService?: typeof defaultAvailabilityService,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.workspacesRepository ?? new WorkspacesRepository();
    this.settings = deps.settingsService ?? defaultSettingsService;
    this.availability = deps.availabilityService ?? defaultAvailabilityService;
  }

  /** @param {import("zod").infer<typeof import("./workspaces.schema.js").listWorkspacesQuerySchema>} query */
  async listPublic(query) {
    const [{ rows, total }, settings] = await Promise.all([
      this.repo.findPublic(query),
      this.settings.getSettings(),
    ]);
    return {
      data: rows.map((row) => toWorkspaceListDto(row, settings.currency)),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   */
  async getById(id) {
    const [workspace, settings] = await Promise.all([
      this.repo.findByIdPublic(id),
      this.settings.getSettings(),
    ]);
    if (!workspace) throw new NotFoundError("Workspace not found.");

    return toWorkspaceDetailDto(workspace, {
      currency: settings.currency,
      taxPercent: settings.taxPercent,
      advanceBookingDays: settings.advanceBookingDays,
      minimumDurationMinutes: MINIMUM_BOOKING_MINUTES,
    });
  }

  /**
   * @param {string} id
   * @param {string} dateStr YYYY-MM-DD
   * @throws {NotFoundError}
   * @throws {BookingInPastError}
   * @throws {AdvanceBookingExceededError}
   */
  async getAvailability(id, dateStr) {
    const workspace = await this.repo.findBookableById(id);
    if (!workspace) throw new NotFoundError("Workspace not found or not bookable.");

    const settings = await this.settings.getSettings();
    const todayStr = todayInZone(workspace.location.timezone);
    if (dateStr < todayStr) throw new BookingInPastError();

    const maxDateStr = format(
      addDays(new Date(`${todayStr}T00:00:00.000Z`), settings.advanceBookingDays),
      "yyyy-MM-dd",
    );
    if (dateStr > maxDateStr) throw new AdvanceBookingExceededError(settings.advanceBookingDays);

    const openingHours = openingHoursFor(workspace.location);
    const bookingDate = new Date(`${dateStr}T00:00:00.000Z`);
    const { busy, available } = await this.availability.getFreeBusy(id, bookingDate, openingHours);

    return {
      workspaceId: id,
      date: dateStr,
      openingHours,
      minimumDurationMinutes: MINIMUM_BOOKING_MINUTES,
      busy,
      available,
    };
  }
}

export const workspacesService = new WorkspacesService();
