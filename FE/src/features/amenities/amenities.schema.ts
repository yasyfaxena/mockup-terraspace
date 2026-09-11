import { z } from "zod";

// Mirrors BE amenities.schema.js's createAmenitySchema/updateAmenitySchema.
// No `nameId` — the Indonesian-language field was retired BE-side too.
// No `.default()` — see locations.schema.ts's comment for why.
export const amenityFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.string().trim().max(50),
  icon: z.string().trim().max(50),
  status: z.enum(["active", "inactive"]),
});
export type AmenityFormInput = z.infer<typeof amenityFormSchema>;
