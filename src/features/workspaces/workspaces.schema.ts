import { z } from "zod";

const WORKSPACE_TYPES = [
  "hot_desk",
  "dedicated_desk",
  "private_office",
  "meeting_room",
  "event_space",
] as const;
const WORKSPACE_AVAILABILITIES = [
  "available",
  "limited",
  "full",
  "maintenance",
  "disabled",
] as const;

// Mirrors BE workspaces.schema.js's createWorkspaceSchema/updateWorkspaceSchema.
// No `.default()` — see locations.schema.ts's comment for why.
export const workspaceFormSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  name: z.string().trim().min(1, "Name is required").max(150),
  type: z.enum(WORKSPACE_TYPES),
  floor: z.string().trim().max(50),
  pricePerHour: z.number().min(0),
  availability: z.enum(WORKSPACE_AVAILABILITIES),
  simpleBooking: z.boolean(),
  imageUrl: z.string().url().nullable(),
  description: z.string(),
  cancellationPolicy: z.string(),
  amenityIds: z.array(z.string()),
});
export type WorkspaceFormInput = z.infer<typeof workspaceFormSchema>;
