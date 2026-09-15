import { apiClient } from "@/lib/api-client";
import type { AdminSettingsDto, PublicSettingsDto } from "./settings.types";
import type { UpdateSettingsInput } from "./settings.schema";

export function getPublicSettings() {
  return apiClient.get<PublicSettingsDto>("/api/v1/settings/public");
}

export function getAdminSettings() {
  return apiClient.get<AdminSettingsDto>("/api/v1/admin/settings");
}

export function updateAdminSettings(input: UpdateSettingsInput) {
  return apiClient.put<AdminSettingsDto>("/api/v1/admin/settings", input);
}
