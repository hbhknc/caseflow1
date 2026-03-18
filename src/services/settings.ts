import { requestJsonWithFallback } from "@/services/apiClient";
import { getDemoBoardSettings, getDemoStatus, updateDemoBoardSettings } from "@/services/demoApi";
import type { AppStatus, BoardSettings } from "@/types/api";

export async function getAppStatus(): Promise<AppStatus> {
  const response = await requestJsonWithFallback<{ status: AppStatus; boardSettings: BoardSettings }>(
    "/settings",
    {},
    async () => ({
      status: await getDemoStatus(),
      boardSettings: await getDemoBoardSettings()
    })
  );

  return response.status;
}

export async function getBoardSettings(): Promise<BoardSettings> {
  const response = await requestJsonWithFallback<{ status: AppStatus; boardSettings: BoardSettings }>(
    "/settings",
    {},
    async () => ({
      status: await getDemoStatus(),
      boardSettings: await getDemoBoardSettings()
    })
  );

  return response.boardSettings;
}

export async function getSettingsOverview(): Promise<{
  status: AppStatus;
  boardSettings: BoardSettings;
}> {
  return requestJsonWithFallback<{ status: AppStatus; boardSettings: BoardSettings }>(
    "/settings",
    {},
    async () => ({
      status: await getDemoStatus(),
      boardSettings: await getDemoBoardSettings()
    })
  );
}

export async function saveBoardSettings(boardSettings: BoardSettings): Promise<BoardSettings> {
  const response = await requestJsonWithFallback<{ boardSettings: BoardSettings }>(
    "/settings",
    {
      method: "PUT",
      body: { boardSettings }
    },
    async () => ({ boardSettings: await updateDemoBoardSettings(boardSettings) })
  );

  return response.boardSettings;
}
