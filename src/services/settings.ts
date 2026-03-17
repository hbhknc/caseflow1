import { requestJsonWithFallback } from "@/services/apiClient";
import { getDemoStatus } from "@/services/demoApi";
import type { AppStatus } from "@/types/api";

export async function getAppStatus(): Promise<AppStatus> {
  const response = await requestJsonWithFallback<{ status: AppStatus }>(
    "/settings",
    {},
    async () => ({ status: await getDemoStatus() })
  );

  return response.status;
}

