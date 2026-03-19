import { requestJsonWithFallback } from "@/services/apiClient";
import {
  addDemoNote,
  archiveDemoMatterRecord,
  createDemoMatterRecord,
  deleteDemoMatterRecord,
  listDemoArchivedMatters,
  listDemoMatters,
  listDemoNotes,
  listDemoTasks,
  moveDemoMatterRecord,
  unarchiveDemoMatterRecord,
  updateDemoMatterRecord
} from "@/services/demoApi";
import type { MatterImportRowInput, MatterImportSummary } from "@/types/api";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask
} from "@/types/matter";

export async function listMatters(boardId: string): Promise<Matter[]> {
  const query = new URLSearchParams({ boardId });
  const response = await requestJsonWithFallback<{ matters: Matter[] }>(
    `/matters?${query.toString()}`,
    {},
    async () => ({ matters: await listDemoMatters(boardId) })
  );

  return response.matters;
}

export async function listArchivedMatters(boardId: string): Promise<Matter[]> {
  const query = new URLSearchParams({ boardId, archived: "1" });
  const response = await requestJsonWithFallback<{ matters: Matter[] }>(
    `/matters?${query.toString()}`,
    {},
    async () => ({ matters: await listDemoArchivedMatters(boardId) })
  );

  return response.matters;
}

export async function createMatter(input: MatterFormInput): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    "/matters",
    {
      method: "POST",
      body: input
    },
    async () => ({ matter: await createDemoMatterRecord(input) })
  );

  return response.matter;
}

export async function saveMatter(
  matterId: string,
  input: MatterFormInput
): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    `/matters/${matterId}`,
    {
      method: "PUT",
      body: input
    },
    async () => ({ matter: await updateDemoMatterRecord(matterId, input) })
  );

  return response.matter;
}

export async function moveMatterStage(
  matterId: string,
  stage: MatterStage,
  beforeMatterId: string | null = null
): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    `/matters/${matterId}`,
    {
      method: "PATCH",
      body: { stage, beforeMatterId }
    },
    async () => ({ matter: await moveDemoMatterRecord(matterId, stage, beforeMatterId) })
  );

  return response.matter;
}

export async function deleteMatter(matterId: string): Promise<void> {
  await requestJsonWithFallback<{ success: boolean }>(
    `/matters/${matterId}`,
    { method: "DELETE" },
    async () => {
      await deleteDemoMatterRecord(matterId);
      return { success: true };
    }
  );
}

export async function archiveMatter(matterId: string): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    "/matters/archive",
    {
      method: "POST",
      body: { matterId }
    },
    async () => ({ matter: await archiveDemoMatterRecord(matterId) })
  );

  return response.matter;
}

export async function unarchiveMatter(matterId: string): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    "/matters/unarchive",
    {
      method: "POST",
      body: { matterId }
    },
    async () => ({ matter: await unarchiveDemoMatterRecord(matterId) })
  );

  return response.matter;
}

export async function listMatterNotes(matterId: string): Promise<MatterNote[]> {
  const query = new URLSearchParams({ matterId });

  const response = await requestJsonWithFallback<{ notes: MatterNote[] }>(
    `/notes?${query.toString()}`,
    {},
    async () => ({ notes: await listDemoNotes(matterId) })
  );

  return response.notes;
}

export async function saveMatterNote(
  matterId: string,
  body: string,
  addToTaskList = false
): Promise<MatterNote> {
  const response = await requestJsonWithFallback<{ note: MatterNote }>(
    "/notes",
    {
      method: "POST",
      body: { matterId, body, addToTaskList }
    },
    async () => ({ note: await addDemoNote(matterId, body, addToTaskList) })
  );

  return response.note;
}

export async function listTasks(boardId: string): Promise<MatterTask[]> {
  const query = new URLSearchParams({ boardId });
  const response = await requestJsonWithFallback<{ tasks: MatterTask[] }>(
    `/tasks?${query.toString()}`,
    {},
    async () => ({ tasks: await listDemoTasks(boardId) })
  );

  return response.tasks;
}

export async function completeTask(taskId: string): Promise<void> {
  await requestJsonWithFallback<{ success: boolean }>(
    "/tasks",
    {
      method: "POST",
      body: { taskId }
    },
    async () => {
      throw new Error("Task completion requires the authenticated API.");
    }
  );
}

export async function importMatters(
  boardId: string,
  rows: MatterImportRowInput[]
): Promise<MatterImportSummary> {
  const response = await requestJsonWithFallback<{ summary: MatterImportSummary }>(
    "/matters/import",
    {
      method: "POST",
      body: { boardId, rows }
    },
    async () => {
      throw new Error("Matter import requires the authenticated API.");
    }
  );

  return response.summary;
}
