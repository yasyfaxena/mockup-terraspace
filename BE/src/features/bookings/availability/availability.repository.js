import { prisma } from "../../../shared/database/client.js";

export class AvailabilityRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * Only `pending`/`confirmed` bookings block a slot — matches the
   * exclusion constraint's partial `WHERE` (erd-spec.md §13).
   * @param {string} workspaceId
   * @param {Date} bookingDate
   */
  findBlockingBookings(workspaceId, bookingDate) {
    return this.db.booking.findMany({
      where: { workspaceId, bookingDate, status: { in: ["pending", "confirmed"] } },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    });
  }
}
