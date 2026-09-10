import { z } from "zod";
import { repeatableQueryParam } from "../../shared/lib/pagination.js";

export const listLocationsQuerySchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  amenityId: repeatableQueryParam(z.string().uuid()),
});
