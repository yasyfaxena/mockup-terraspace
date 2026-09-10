import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  availabilityService as defaultAvailabilityService,
  BookingInPastError,
  AdvanceBookingExceededError,
} from "../bookings/index.js";
import { settingsService as defaultSettingsService } from "../settings/index.js";
import { locationsService as defaultLocationsService } from "../locations/index.js";
import { amenitiesService as defaultAmenitiesService } from "../amenities/index.js";
import { NotFoundError, ConflictError } from "../../shared/errors/http-errors.js";
import { toPaginationMeta } from "../../shared/lib/pagination.js";
import { openingHoursFor, MINIMUM_BOOKING_MINUTES } from "../../shared/constants/hours.js";
import { WorkspacesRepository } from "./workspaces.repository.js";
import {
  toWorkspaceListDto,
  toWorkspaceDetailDto,
  toAdminWorkspaceDto,
} from "./workspaces.mapper.js";

const WORKSPACE_NOT_FOUND_MESSAGE = "Workspace not found.";

/**
 * @param {string} timezone
 * @returns {string}
 */
function todayInZone(timezone) {
  return format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");
}

/** Business rules for the workspace catalog — public read, availability, admin CRUD. */
export class WorkspacesService {
  /**
   * @param {{
   *   workspacesRepository?: WorkspacesRepository,
   *   settingsService?: typeof defaultSettingsService,
   *   availabilityService?: typeof defaultAvailabilityService,
   *   locationsService?: typeof defaultLocationsService,
   *   amenitiesService?: typeof defaultAmenitiesService,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.workspacesRepository ?? new WorkspacesRepository();
    this.settings = deps.settingsService ?? defaultSettingsService;
    this.availability = deps.availabilityService ?? defaultAvailabilityService;
    this.locations = deps.locationsService ?? defaultLocationsService;
    this.amenities = deps.amenitiesService ?? defaultAmenitiesService;
  }

  /**
   * @param {import("zod").infer<typeof import("./workspaces.schema.js").listWorkspacesQuerySchema>} query
   * @returns {Promise<{ data: import("./workspaces.types.js").WorkspaceListItemDto[], meta: import("../../shared/types/pagination.js").PaginationMeta }>}
   */
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
   * @returns {Promise<object>}
   */
  async getById(id) {
    const [workspace, settings] = await Promise.all([
      this.repo.findByIdPublic(id),
      this.settings.getSettings(),
    ]);
    if (!workspace) throw new NotFoundError(WORKSPACE_NOT_FOUND_MESSAGE);

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
   * @returns {Promise<object>}
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

  /**
   * @param {import("zod").infer<typeof import("./workspaces.schema.js").listAdminWorkspacesQuerySchema>} query
   * @returns {Promise<{ data: import("./workspaces.types.js").AdminWorkspaceDto[], meta: import("../../shared/types/pagination.js").PaginationMeta }>}
   */
  async listAdmin(query) {
    const { rows, total } = await this.repo.findAllAdmin(query);
    return {
      data: rows.map(toAdminWorkspaceDto),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   * @returns {Promise<import("./workspaces.types.js").AdminWorkspaceDto>}
   */
  async getAdminDetail(id) {
    const workspace = await this.repo.findByIdAdmin(id);
    if (!workspace) throw new NotFoundError(WORKSPACE_NOT_FOUND_MESSAGE);
    return toAdminWorkspaceDto(workspace);
  }

  /**
   * @param {Record<string, any>} data
   * @throws {NotFoundError} `locationId` does not exist
   * @returns {Promise<import("./workspaces.types.js").AdminWorkspaceDto>}
   */
  async create(data) {
    // Throws NotFoundError automatically if locationId doesn't exist —
    // a real foreign key now, unlike the free-text locationSlug it
    // replaces (workspaces.md §5).
    await this.locations.getAdminDetail(data.locationId);
    await this.amenities.assertActiveAmenityIds(data.amenityIds);

    const { amenityIds = [], ...fields } = data;
    const workspace = await this.repo.transaction(async (tx) => {
      const created = await this.repo.create(fields, tx);
      await this.repo.setAmenities(created.id, amenityIds, tx);
      return created;
    });

    return this.getAdminDetail(workspace.id);
  }

  /**
   * @param {string} id
   * @param {Record<string, any>} data
   * @throws {NotFoundError} workspace or new `locationId` not found
   * @returns {Promise<import("./workspaces.types.js").AdminWorkspaceDto>}
   */
  async update(id, data) {
    const workspace = await this.repo.findById(id);
    if (!workspace) throw new NotFoundError(WORKSPACE_NOT_FOUND_MESSAGE);

    if (data.locationId !== undefined) {
      await this.locations.getAdminDetail(data.locationId);
    }
    if (data.amenityIds !== undefined) {
      await this.amenities.assertActiveAmenityIds(data.amenityIds);
    }

    const { amenityIds, ...fields } = data;
    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, fields, tx);
      if (amenityIds !== undefined) {
        await this.repo.replaceAmenities(id, amenityIds, tx);
      }
    });

    return this.getAdminDetail(id);
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   * @throws {ConflictError} non-cancelled bookings reference it
   * @returns {Promise<{ success: true }>}
   */
  async remove(id) {
    const workspace = await this.repo.findById(id);
    if (!workspace) throw new NotFoundError(WORKSPACE_NOT_FOUND_MESSAGE);

    const activeBookingCount = await this.repo.countActiveBookings(id);
    if (activeBookingCount > 0) {
      throw new ConflictError("This workspace has active bookings and cannot be deleted.");
    }

    await this.repo.delete(id);
    return { success: true };
  }
}

export const workspacesService = new WorkspacesService();
