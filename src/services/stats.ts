import { requestJsonWithFallback } from "@/services/apiClient";
import { getDemoMatterStats } from "@/services/demoApi";
import type { MatterStats } from "@/types/api";

export async function getMatterStats(): Promise<MatterStats> {
  const response = await requestJsonWithFallback<{ stats: MatterStats }>(
    "/stats",
    {},
    async () => ({ stats: await getDemoMatterStats() })
  );

  return response.stats;
}
