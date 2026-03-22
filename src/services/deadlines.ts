import { requestJsonWithFallback } from "@/services/apiClient";
import {
  completeDemoDeadlineRecord,
  createDemoDeadlineRecord,
  dismissDemoDeadlineRecord,
  getDemoDeadlineDashboard,
  getDemoMatterDeadlines,
  saveDemoMatterDeadlineSettings,
  updateDemoDeadlineRecord
} from "@/services/demoApi";
import type {
  Deadline,
  DeadlineCompletionInput,
  DeadlineDashboardData,
  DeadlineDashboardFilters,
  DeadlineInput,
  DeadlineUpdateInput,
  MatterDeadlineSettings,
  MatterDeadlineSettingsInput
} from "@/types/deadlines";
import type { Matter } from "@/types/matter";

type MatterDeadlinesResponse = {
  matter: Matter;
  settings: MatterDeadlineSettings;
  deadlines: Deadline[];
};

type DeadlineMutationResponse = {
  matter: Matter;
  deadline: Deadline;
};

export async function listMatterDeadlines(
  matterId: string
): Promise<MatterDeadlinesResponse> {
  const query = new URLSearchParams({ scope: "matter", matterId });

  return requestJsonWithFallback<MatterDeadlinesResponse>(
    `/deadlines?${query.toString()}`,
    {},
    async () => getDemoMatterDeadlines(matterId)
  );
}

export async function listDeadlineDashboard(
  filters: Partial<DeadlineDashboardFilters> = {}
): Promise<DeadlineDashboardData> {
  const query = new URLSearchParams();

  if (filters.assignee?.trim()) {
    query.set("assignee", filters.assignee.trim());
  }

  if (filters.matterId?.trim()) {
    query.set("matterId", filters.matterId.trim());
  }

  if (filters.status?.trim()) {
    query.set("status", filters.status);
  }

  const suffix = query.size ? `?${query.toString()}` : "";
  const response = await requestJsonWithFallback<{ dashboard: DeadlineDashboardData }>(
    `/deadlines${suffix}`,
    {},
    async () => ({
      dashboard: await getDemoDeadlineDashboard(filters)
    })
  );

  return response.dashboard;
}

export async function createDeadline(input: DeadlineInput): Promise<DeadlineMutationResponse> {
  return requestJsonWithFallback<DeadlineMutationResponse>(
    "/deadlines",
    {
      method: "POST",
      body: input
    },
    async () => createDemoDeadlineRecord(input)
  );
}

export async function updateDeadline(
  deadlineId: string,
  input: DeadlineUpdateInput
): Promise<DeadlineMutationResponse> {
  return requestJsonWithFallback<DeadlineMutationResponse>(
    `/deadlines/${deadlineId}`,
    {
      method: "PUT",
      body: input
    },
    async () => updateDemoDeadlineRecord(deadlineId, input)
  );
}

export async function completeDeadline(
  deadlineId: string,
  input: DeadlineCompletionInput
): Promise<DeadlineMutationResponse> {
  return requestJsonWithFallback<DeadlineMutationResponse>(
    "/deadlines/complete",
    {
      method: "POST",
      body: {
        deadlineId,
        ...input
      }
    },
    async () => completeDemoDeadlineRecord(deadlineId, input.completionNote)
  );
}

export async function dismissDeadline(deadlineId: string): Promise<DeadlineMutationResponse> {
  return requestJsonWithFallback<DeadlineMutationResponse>(
    "/deadlines/dismiss",
    {
      method: "POST",
      body: { deadlineId }
    },
    async () => dismissDemoDeadlineRecord(deadlineId)
  );
}

export async function saveMatterDeadlineSettings(
  matterId: string,
  input: MatterDeadlineSettingsInput
): Promise<MatterDeadlinesResponse> {
  return requestJsonWithFallback<MatterDeadlinesResponse>(
    "/deadlines/settings",
    {
      method: "PUT",
      body: {
        matterId,
        ...input
      }
    },
    async () => saveDemoMatterDeadlineSettings(matterId, input)
  );
}
