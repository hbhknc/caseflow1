import { createDemoMatter, demoMatters, demoNotes, demoStatus } from "@/lib/demoData";
import type { AppStatus } from "@/types/api";
import type { Matter, MatterFormInput, MatterNote, MatterStage } from "@/types/matter";

const matterStore = [...demoMatters];
const noteStore = structuredClone(demoNotes);

export function shouldUseDemoFallback() {
  return import.meta.env.DEV && (import.meta.env.VITE_ENABLE_DEMO_FALLBACK ?? "true") === "true";
}

export async function listDemoMatters(): Promise<Matter[]> {
  return [...matterStore].sort((left, right) =>
    right.lastActivityAt.localeCompare(left.lastActivityAt)
  );
}

export async function createDemoMatterRecord(input: MatterFormInput): Promise<Matter> {
  const matter = createDemoMatter(input);
  matterStore.unshift(matter);
  noteStore[matter.id] = [];
  return matter;
}

export async function updateDemoMatterRecord(
  matterId: string,
  input: MatterFormInput
): Promise<Matter> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.decedentName = input.decedentName;
  matter.clientName = input.clientName;
  matter.fileNumber = input.fileNumber;
  matter.stage = input.stage;
  matter.lastActivityAt = new Date().toISOString();

  return matter;
}

export async function moveDemoMatterRecord(
  matterId: string,
  stage: MatterStage
): Promise<Matter> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.stage = stage;
  matter.lastActivityAt = new Date().toISOString();
  return matter;
}

export async function deleteDemoMatterRecord(matterId: string): Promise<void> {
  const index = matterStore.findIndex((item) => item.id === matterId);

  if (index >= 0) {
    matterStore.splice(index, 1);
  }

  delete noteStore[matterId];
}

export async function archiveDemoMatterRecord(matterId: string): Promise<Matter> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.archived = true;
  matter.archivedAt = new Date().toISOString();
  matter.lastActivityAt = matter.archivedAt;
  return matter;
}

export async function listDemoNotes(matterId: string): Promise<MatterNote[]> {
  return [...(noteStore[matterId] ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export async function addDemoNote(matterId: string, body: string): Promise<MatterNote> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  const note: MatterNote = {
    id: crypto.randomUUID(),
    matterId,
    body,
    createdAt: new Date().toISOString(),
    createdBy: "CaseFlow Demo"
  };

  noteStore[matterId] = [note, ...(noteStore[matterId] ?? [])];
  matter.lastActivityAt = note.createdAt;

  return note;
}

export async function getDemoStatus(): Promise<AppStatus> {
  return {
    ...demoStatus,
    timestamp: new Date().toISOString()
  };
}

