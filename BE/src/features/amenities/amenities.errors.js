import { ConflictError } from "../../shared/errors/http-errors.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class AmenityInUseError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.AMENITY_IN_USE;
  constructor() {
    super("This amenity is assigned to a location or workspace and cannot be deleted.");
  }
}
