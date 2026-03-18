import { requestJsonWithFallback } from "@/services/apiClient";
import { getDemoMatterStats } from "@/services/demoApi";
import type { MatterStats } from "@/types/api";

export async function getMatterStats(boardId: string): Promise<MatterStats> {
  const query = new URLSearchParams({ boardId });
  const response = await requestJsonWithFallback<{ stats: MatterStats }>(
    `/stats?${query.toString()}`,
    {},
    async () => ({ stats: await getDemoMatterStats(boardId) })
  );

  return response.stats;
}
