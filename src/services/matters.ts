import { requestJsonWithFallback } from "@/services/apiClient";
import {
  addDemoNote,
  archiveDemoMatterRecord,
  createDemoMatterRecord,
  deleteDemoMatterRecord,
  listDemoMatters,
  listDemoNotes,
  listDemoTasks,
  moveDemoMatterRecord,
  updateDemoMatterRecord
} from "@/services/demoApi";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask
} from "@/types/matter";

export async function listMatters(): Promise<Matter[]> {
  const response = await requestJsonWithFallback<{ matters: Matter[] }>(
    "/matters",
    {},
    async () => ({ matters: await listDemoMatters() })
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
  stage: MatterStage
): Promise<Matter> {
  const response = await requestJsonWithFallback<{ matter: Matter }>(
    `/matters/${matterId}`,
    {
      method: "PATCH",
      body: { stage }
    },
    async () => ({ matter: await moveDemoMatterRecord(matterId, stage) })
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

export async function listTasks(): Promise<MatterTask[]> {
  const response = await requestJsonWithFallback<{ tasks: MatterTask[] }>(
    "/tasks",
    {},
    async () => ({ tasks: await listDemoTasks() })
  );

  return response.tasks;
}
