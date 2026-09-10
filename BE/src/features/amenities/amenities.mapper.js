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
