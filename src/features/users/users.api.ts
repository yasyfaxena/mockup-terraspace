import { apiClient } from "@/lib/api-client";
import type { MeDto } from "./users.types";
import type { UpdateProfileInput } from "./users.schema";

export function getMe() {
  return apiClient.get<MeDto>("/api/v1/me");
}

export function updateMe(input: UpdateProfileInput) {
  return apiClient.patch<MeDto>("/api/v1/me", input);
}
