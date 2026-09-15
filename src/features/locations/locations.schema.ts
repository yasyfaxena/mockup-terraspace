import { z } from "zod";

// Mirrors BE locations.schema.js's createLocationSchema/updateLocationSchema.
// No `.default()` here on purpose — every field always has an explicit
// value from the form's `DEFAULT_VALUES`, so the resolver's input and
// output types stay identical (a defaulted Zod field is optional on input
// but required on output, which trips up useForm<T>'s single generic).
export const locationFormSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required"),
  name: z.string().trim().min(1, "Name is required").max(150),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required").max(100),
  imageUrl: z.string().url().nullable(),
  openingHours: z.string(),
  access247: z.boolean(),
  description: z.string(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  accessRadiusMeters: z.number().int().positive(),
  timezone: z.string().trim().min(1),
  status: z.enum(["active", "inactive"]),
  amenityIds: z.array(z.string()),
});
export type LocationFormInput = z.infer<typeof locationFormSchema>;
