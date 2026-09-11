import { apiClient } from "@/lib/api-client";
import type { PublicSettingsDto } from "./settings.types";

export function getPublicSettings() {
  return apiClient.get<PublicSettingsDto>("/api/v1/settings/public");
}
