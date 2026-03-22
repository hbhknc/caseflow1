import { requestJsonWithFallback } from "@/services/apiClient";
import {
  getDemoBoardSettings,
  getDemoDeadlineTemplateSettings,
  getDemoStatus,
  updateDemoBoardSettings,
  updateDemoDeadlineTemplateSettings
} from "@/services/demoApi";
import type { AppStatus, BoardSettings, SettingsOverview } from "@/types/api";
import type { DeadlineTemplateSettings } from "@/types/deadlines";

async function getSettingsResponse(): Promise<SettingsOverview> {
  return requestJsonWithFallback<SettingsOverview>(
    "/settings",
    {},
    async () => ({
      status: await getDemoStatus(),
      boardSettings: await getDemoBoardSettings(),
      deadlineTemplateSettings: await getDemoDeadlineTemplateSettings()
    })
  );
}

export async function getAppStatus(): Promise<AppStatus> {
  const response = await getSettingsResponse();
  return response.status;
}

export async function getBoardSettings(): Promise<BoardSettings> {
  const response = await getSettingsResponse();
  return response.boardSettings;
}

export async function getDeadlineTemplateSettings(): Promise<DeadlineTemplateSettings> {
  const response = await getSettingsResponse();
  return response.deadlineTemplateSettings;
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  return getSettingsResponse();
}

export async function saveBoardSettings(boardSettings: BoardSettings): Promise<BoardSettings> {
  const response = await requestJsonWithFallback<{
    boardSettings: BoardSettings;
    deadlineTemplateSettings: DeadlineTemplateSettings;
  }>(
    "/settings",
    {
      method: "PUT",
      body: { boardSettings }
    },
    async () => ({
      boardSettings: await updateDemoBoardSettings(boardSettings),
      deadlineTemplateSettings: await getDemoDeadlineTemplateSettings()
    })
  );

  return response.boardSettings;
}

export async function saveDeadlineTemplateSettings(
  deadlineTemplateSettings: DeadlineTemplateSettings
): Promise<DeadlineTemplateSettings> {
  const response = await requestJsonWithFallback<{
    boardSettings: BoardSettings;
    deadlineTemplateSettings: DeadlineTemplateSettings;
  }>(
    "/settings",
    {
      method: "PUT",
      body: { deadlineTemplateSettings }
    },
    async () => ({
      boardSettings: await getDemoBoardSettings(),
      deadlineTemplateSettings: await updateDemoDeadlineTemplateSettings(
        deadlineTemplateSettings
      )
    })
  );

  return response.deadlineTemplateSettings;
}
