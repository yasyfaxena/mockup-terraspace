import { prisma } from "../../shared/database/client.js";

export class LocationsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * Active locations with SQL-computed workspace stats — counts include
   * every workspace regardless of `availability`, never fetching rows to
   * reduce in application code (locations.md §1, the `catalog.ts:106` fix).
   * @param {{ city?: string, q?: string, amenityIds?: string[] }} filters
   */
  async findActivePublic({ city, q, amenityIds = [] }) {
    const conditions = ["l.status = 'active'"];
    const values = [];

    if (city) {
      values.push(city);
      conditions.push(`l.city ILIKE $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      conditions.push(
        `(l.name ILIKE $${values.length} OR l.address ILIKE $${values.length} OR l.city ILIKE $${values.length})`,
      );
    }
    if (amenityIds.length > 0) {
      values.push(amenityIds);
      const amenityIdsParam = values.length;
      values.push(amenityIds.length);
      const countParam = values.length;
      conditions.push(
        `l.id IN (SELECT location_id FROM location_amenities WHERE amenity_id = ANY($${amenityIdsParam}::uuid[]) GROUP BY location_id HAVING COUNT(DISTINCT amenity_id) = $${countParam})`,
      );
    }

    const rows = /** @type {any[]} */ (
      await this.db.$queryRawUnsafe(
        `
        SELECT
          l.id, l.slug, l.name, l.address, l.city,
          l.image_url AS "imageUrl", l.opening_hours AS "openingHours",
          l.access_24_7 AS "access247", l.description,
          l.latitude, l.longitude, l.timezone,
          COALESCE(s.desks_total, 0)::int AS "desksTotal",
          COALESCE(s.desks_available, 0)::int AS "desksAvailable",
          COALESCE(s.rooms_total, 0)::int AS "roomsTotal",
          COALESCE(s.rooms_available, 0)::int AS "roomsAvailable",
          COALESCE(s.price_from, 0) AS "priceFrom",
          COALESCE(s.types, ARRAY[]::text[]) AS types
        FROM locations l
        LEFT JOIN (
          SELECT
            location_id,
            COUNT(*) FILTER (WHERE type IN ('hot_desk', 'dedicated_desk')) AS desks_total,
            COUNT(*) FILTER (WHERE type IN ('hot_desk', 'dedicated_desk') AND availability = 'available') AS desks_available,
            COUNT(*) FILTER (WHERE type NOT IN ('hot_desk', 'dedicated_desk')) AS rooms_total,
            COUNT(*) FILTER (WHERE type NOT IN ('hot_desk', 'dedicated_desk') AND availability = 'available') AS rooms_available,
            MIN(price_per_hour) FILTER (WHERE price_per_hour > 0) AS price_from,
            ARRAY_AGG(DISTINCT type::text) AS types
          FROM workspaces
          GROUP BY location_id
        ) s ON s.location_id = l.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY l.name ASC
        `,
        ...values,
      )
    );
    return rows;
  }

  /** @param {string[]} locationIds */
  async findAmenitiesForLocations(locationIds) {
    if (locationIds.length === 0) return [];
    return this.db.locationAmenity.findMany({
      where: { locationId: { in: locationIds } },
      include: { amenity: true },
    });
  }

  /** @param {string} slug */
  findBySlugActive(slug) {
    return this.db.location.findFirst({
      where: { slug, status: "active" },
      include: {
        locationAmenities: { include: { amenity: true } },
        workspaces: { include: { workspaceAmenities: { include: { amenity: true } } } },
      },
    });
  }
}
