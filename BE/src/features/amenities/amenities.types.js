/**
 * @typedef {object} AmenityDto
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} icon
 */

/**
 * @typedef {object} AdminAmenityDto
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} icon
 * @property {"active"|"inactive"} status
 * @property {{ locations: number, workspaces: number }} usage
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export {};
