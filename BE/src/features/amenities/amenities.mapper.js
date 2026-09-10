/**
 * @param {import("@prisma/client").Amenity} amenity
 * @returns {import("./amenities.types.js").AmenityDto}
 */
export function toAmenityDto(amenity) {
  return {
    id: amenity.id,
    name: amenity.name,
    category: amenity.category,
    icon: amenity.icon,
  };
}

/**
 * @param {import("@prisma/client").Amenity & { _count?: { locationAmenities: number, workspaceAmenities: number } }} amenity
 * @returns {import("./amenities.types.js").AdminAmenityDto}
 */
export function toAdminAmenityDto(amenity) {
  return {
    id: amenity.id,
    name: amenity.name,
    category: amenity.category,
    icon: amenity.icon,
    status: amenity.status,
    usage: {
      locations: amenity._count?.locationAmenities ?? 0,
      workspaces: amenity._count?.workspaceAmenities ?? 0,
    },
    createdAt: amenity.createdAt.toISOString(),
    updatedAt: amenity.updatedAt.toISOString(),
  };
}
