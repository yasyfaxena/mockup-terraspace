/**
 * @typedef {object} PaymentMethodDto
 * @property {string} code
 * @property {string} name
 * @property {string} category
 */

/**
 * @typedef {object} CreateChargeResponseDto
 * @property {string} paymentId
 * @property {string} status
 * @property {string} provider
 * @property {string} amount
 * @property {number} amountMinor
 * @property {string} currency
 * @property {string} checkoutUrl
 * @property {string} expiresAt
 * @property {{ id: string, reference: string, status: string }} booking
 */

/**
 * @typedef {object} PaymentStatusDto
 * @property {string} paymentId
 * @property {string} status
 * @property {string} provider
 * @property {string} amount
 * @property {string} currency
 * @property {PaymentMethodDto | null} paymentMethod
 * @property {string | null} checkoutUrl
 * @property {string | null} paidAt
 * @property {{ reference: string, status: string }} booking
 */

export {};
