/** @param {unknown} value */
function toMoneyString(value) {
  return Number(value).toFixed(2);
}

/**
 * @param {import("@prisma/client").Workspace & {
 *   workspaceAmenities: Array<{ amenity: import("@prisma/client").Amenity }>,
 *   location: { id: string, slug: string, name: string, address: string, city: string },
 * }} workspace
 * @param {string} currency
 * @returns {import("./workspaces.types.js").WorkspaceListItemDto}
 */
export function toWorkspaceListDto(workspace, currency) {
  return {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    floor: workspace.floor,
    pricePerHour: toMoneyString(workspace.pricePerHour),
    currency,
    availability: workspace.availability,
    simpleBooking: workspace.simpleBooking,
    imageUrl: workspace.imageUrl,
    description: workspace.description,
    cancellationPolicy: workspace.cancellationPolicy,
    amenities: workspace.workspaceAmenities.map((link) => ({
      id: link.amenity.id,
      name: link.amenity.name,
      nameId: link.amenity.nameId,
      category: link.amenity.category,
      icon: link.amenity.icon,
    })),
    location: workspace.location,
  };
}

/**
 * @param {import("@prisma/client").Workspace & { workspaceAmenities: Array<{ amenity: import("@prisma/client").Amenity }>, location: any }} workspace
 * @param {{ currency: string, taxPercent: unknown, advanceBookingDays: number, minimumDurationMinutes: number }} pricingContext
 */
export function toWorkspaceDetailDto(workspace, pricingContext) {
  return {
    ...toWorkspaceListDto(workspace, pricingContext.currency),
    pricing: {
      pricePerHour: toMoneyString(workspace.pricePerHour),
      currency: pricingContext.currency,
      taxPercent: Number(pricingContext.taxPercent).toFixed(2),
      minimumDurationMinutes: pricingContext.minimumDurationMinutes,
      advanceBookingDays: pricingContext.advanceBookingDays,
    },
    calendarSyncProvider: workspace.calendarSyncProvider,
    qrProvider: workspace.qrProvider,
  };
}
