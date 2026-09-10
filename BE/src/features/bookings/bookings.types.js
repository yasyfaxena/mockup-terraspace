/**
 * @typedef {object} BookingListItemDto
 * @property {string} id
 * @property {string} reference
 * @property {string} status
 * @property {string} bookingDate
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} totalAmount
 * @property {string} currency
 * @property {string} paymentStatus
 * @property {boolean} canCancel
 * @property {{ id: string, name: string, type: string, imageUrl: string|null, location: { slug: string, name: string, city: string } }} workspace
 * @property {string} createdAt
 */

/**
 * @typedef {object} BookingDetailDto
 * @property {string} id
 * @property {string} reference
 * @property {string} accessCode
 * @property {string} status
 * @property {string} bookingDate
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} durationHours
 * @property {string} unitPrice
 * @property {string} subtotalAmount
 * @property {string} taxAmount
 * @property {string} totalAmount
 * @property {string} currency
 * @property {string} paymentStatus
 * @property {{ id: string, name: string, type: string, floor: string, location: { id: string, slug: string, name: string, address: string, city: string } }} workspace
 * @property {string} createdAt
 * @property {string|null} [cancelledAt]
 * @property {boolean} [canCancel]
 * @property {string} [cancellationPolicy]
 * @property {{ from: string, until: string }} [accessWindow]
 * @property {{ latitude: string|null, longitude: string|null, accessRadiusMeters: number }} [location]
 */

export {};
