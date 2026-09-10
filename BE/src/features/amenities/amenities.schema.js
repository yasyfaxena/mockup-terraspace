import { z } from "zod";

export const listAmenitiesQuerySchema = z.object({
  category: z.string().optional(),
});
