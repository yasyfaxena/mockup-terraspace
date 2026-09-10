// Availability lands ahead of the rest of the bookings feature — it is
// pure logic over rows, easy to unit test, and Phase 5's booking creation
// depends on it (development-phases.md, Phase 3). The remaining bookings
// files (routes/controller/service/repository) arrive in Phase 5.
export { availabilityService, AvailabilityService } from "./availability/availability.service.js";
export { BookingInPastError, AdvanceBookingExceededError } from "./bookings.errors.js";
