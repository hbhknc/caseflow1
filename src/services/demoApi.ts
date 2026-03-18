import { createDemoMatter, demoMatters, demoNotes, demoStatus, demoTasks } from "@/lib/demoData";
import type { AppStatus, MatterStats } from "@/types/api";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask
} from "@/types/matter";

const matterStore = [...demoMatters];
const noteStore = structuredClone(demoNotes);
const taskStore = [...demoTasks];

export function shouldUseDemoFallback() {
  return (import.meta.env.VITE_ENABLE_DEMO_FALLBACK ?? "true") === "true";
}

export async function listDemoMatters(): Promise<Matter[]> {
  return [...matterStore].sort((left, right) =>
    right.lastActivityAt.localeCompare(left.lastActivityAt)
  );
}

export async function listDemoArchivedMatters(): Promise<Matter[]> {
  return [...matterStore]
    .filter((matter) => matter.archived)
    .sort((left, right) => (right.archivedAt ?? "").localeCompare(left.archivedAt ?? ""));
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

export async function addDemoNote(
  matterId: string,
  body: string,
  addToTaskList = false
): Promise<MatterNote> {
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

  if (addToTaskList) {
    taskStore.unshift({
      id: crypto.randomUUID(),
      matterId,
      matterName: matter.decedentName,
      clientName: matter.clientName,
      fileNumber: matter.fileNumber,
      body,
      createdAt: note.createdAt,
      completedAt: null
    });
  }

  return note;
}

export async function listDemoTasks(): Promise<MatterTask[]> {
  return [...taskStore]
    .filter((task) => !task.completedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function calculateAveragePerYear(timestamps: string[]) {
  if (timestamps.length === 0) {
    return 0;
  }

  const years = timestamps.map((timestamp) => new Date(timestamp).getUTCFullYear());
  const span = Math.max(...years) - Math.min(...years) + 1;
  return Number((timestamps.length / span).toFixed(1));
}

export async function getDemoMatterStats(): Promise<MatterStats> {
  const archivedMatters = matterStore.filter(
    (matter) => matter.archived && matter.archivedAt
  );

  const averageCaseLengthDays =
    archivedMatters.length === 0
      ? null
      : Math.round(
          archivedMatters.reduce((total, matter) => {
            const openedAt = new Date(matter.createdAt).getTime();
            const archivedAt = new Date(matter.archivedAt ?? matter.createdAt).getTime();
            return total + (archivedAt - openedAt) / (1000 * 60 * 60 * 24);
          }, 0) / archivedMatters.length
        );

  return {
    totalCasesOpened: matterStore.length,
    totalCasesArchived: archivedMatters.length,
    averageCasesOpenedPerYear: calculateAveragePerYear(
      matterStore.map((matter) => matter.createdAt)
    ),
    averageCasesArchivedPerYear: calculateAveragePerYear(
      archivedMatters.map((matter) => matter.archivedAt ?? matter.createdAt)
    ),
    averageCaseLengthDays
  };
}

export async function getDemoStatus(): Promise<AppStatus> {
  return {
    ...demoStatus,
    timestamp: new Date().toISOString()
  };
}
