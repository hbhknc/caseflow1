import { requestJson } from "@/services/apiClient";
import type { CurrentUserResponse } from "@/types/api";

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return requestJson<CurrentUserResponse>("/me");
}
