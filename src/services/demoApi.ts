import {
  createDemoMatter,
  demoBoards,
  demoBoardSettings,
  demoMatters,
  demoNotes,
  demoStatus,
  demoTasks
} from "@/lib/demoData";
import type { AppStatus, BoardSettings, MatterStats, MatterStatsMonth } from "@/types/api";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask,
  PracticeBoard
} from "@/types/matter";
import { DEFAULT_STAGE_LABELS, STAGES } from "@/utils/stages";

const matterStore = [...demoMatters];
const noteStore = structuredClone(demoNotes);
const taskStore = [...demoTasks];
const boardStore: PracticeBoard[] = structuredClone(demoBoards);

export function shouldUseDemoFallback() {
  return (import.meta.env.VITE_ENABLE_DEMO_FALLBACK ?? "true") === "true";
}

function getBoardById(boardId: string) {
  return boardStore.find((board) => board.id === boardId);
}

function sortDemoMatters(items: Matter[]) {
  return [...items].sort((left, right) => {
    const stageDelta = STAGES.indexOf(left.stage) - STAGES.indexOf(right.stage);

    if (stageDelta !== 0) {
      return stageDelta;
    }

    return left.sortOrder - right.sortOrder;
  });
}

function renumberDemoStage(boardId: string, stage: MatterStage) {
  const mattersInStage = matterStore
    .filter((matter) => matter.boardId === boardId && !matter.archived && matter.stage === stage)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  mattersInStage.forEach((matter, index) => {
    matter.sortOrder = index + 1;
  });
}

function getNextDemoStageSortOrder(
  boardId: string,
  stage: MatterStage,
  placement: "start" | "end"
) {
  const mattersInStage = matterStore.filter(
    (matter) => matter.boardId === boardId && !matter.archived && matter.stage === stage
  );

  if (mattersInStage.length === 0) {
    return 1;
  }

  const sortOrders = mattersInStage.map((matter) => matter.sortOrder);
  return placement === "start" ? Math.min(...sortOrders) - 1 : Math.max(...sortOrders) + 1;
}

function buildBoardId(name: string) {
  const baseId =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "board";
  let candidate = baseId;
  let suffix = 2;

  while (boardStore.some((board) => board.id === candidate)) {
    candidate = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function listDemoBoards(): Promise<PracticeBoard[]> {
  return structuredClone(boardStore);
}

export async function createDemoBoard(name: string): Promise<PracticeBoard> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Board name is required.");
  }

  const board: PracticeBoard = {
    id: buildBoardId(trimmed),
    name: trimmed,
    columnCount: demoBoardSettings.columnCount,
    stageLabels: { ...demoBoardSettings.stageLabels }
  };

  boardStore.push(board);
  return structuredClone(board);
}

export async function updateDemoBoard(
  boardId: string,
  input: Partial<PracticeBoard>
): Promise<PracticeBoard> {
  const board = getBoardById(boardId);

  if (!board) {
    throw new Error("Board not found.");
  }

  board.name = input.name?.trim() || board.name;
  board.columnCount = Math.min(
    STAGES.length,
    Math.max(1, Math.round(Number(input.columnCount ?? board.columnCount)))
  );
  board.stageLabels = {
    intake: input.stageLabels?.intake?.trim() || board.stageLabels.intake,
    qualified_opened:
      input.stageLabels?.qualified_opened?.trim() || board.stageLabels.qualified_opened,
    notice_admin: input.stageLabels?.notice_admin?.trim() || board.stageLabels.notice_admin,
    inventory_collection:
      input.stageLabels?.inventory_collection?.trim() ||
      board.stageLabels.inventory_collection,
    accounting_closing:
      input.stageLabels?.accounting_closing?.trim() || board.stageLabels.accounting_closing
  };

  return structuredClone(board);
}

export async function deleteDemoBoard(boardId: string): Promise<PracticeBoard[]> {
  if (boardStore.length === 1) {
    throw new Error("At least one board is required.");
  }

  if (matterStore.some((matter) => matter.boardId === boardId)) {
    throw new Error("Move or archive matters off this board before deleting it.");
  }

  const index = boardStore.findIndex((board) => board.id === boardId);
  if (index < 0) {
    throw new Error("Board not found.");
  }

  boardStore.splice(index, 1);
  return structuredClone(boardStore);
}

export async function listDemoMatters(boardId: string): Promise<Matter[]> {
  return sortDemoMatters(
    matterStore.filter((matter) => matter.boardId === boardId && !matter.archived)
  );
}

export async function listDemoArchivedMatters(boardId: string): Promise<Matter[]> {
  return [...matterStore]
    .filter((matter) => matter.boardId === boardId && matter.archived)
    .sort((left, right) => (right.archivedAt ?? "").localeCompare(left.archivedAt ?? ""));
}

export async function createDemoMatterRecord(input: MatterFormInput): Promise<Matter> {
  const matter = createDemoMatter(input);
  matter.sortOrder = getNextDemoStageSortOrder(input.boardId, input.stage, "start");
  matterStore.unshift(matter);
  renumberDemoStage(input.boardId, input.stage);
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
  matter.inventoryDueDate = input.inventoryDueDate || null;
  matter.ntcExpirationDate = input.ntcExpirationDate || null;
  const previousBoardId = matter.boardId;
  const previousStage = matter.stage;
  const stageChanged = previousStage !== input.stage;
  matter.boardId = input.boardId;
  matter.stage = input.stage;
  matter.lastActivityAt = new Date().toISOString();
  if (stageChanged) {
    matter.stageEnteredAt = matter.lastActivityAt;
  }

  if (previousBoardId !== input.boardId || stageChanged) {
    matter.sortOrder = getNextDemoStageSortOrder(input.boardId, input.stage, "start");
    renumberDemoStage(previousBoardId, previousStage);
    renumberDemoStage(input.boardId, input.stage);
  }

  return matter;
}

export async function moveDemoMatterRecord(
  matterId: string,
  stage: MatterStage,
  beforeMatterId: string | null = null
): Promise<Matter> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  const destinationMatters = matterStore
    .filter(
      (item) =>
        item.boardId === matter.boardId &&
        !item.archived &&
        item.stage === stage &&
        item.id !== matterId
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (beforeMatterId && !destinationMatters.some((item) => item.id === beforeMatterId)) {
    throw new Error("Target matter for reordering was not found.");
  }

  const previousStage = matter.stage;
  matter.stage = stage;
  if (previousStage !== stage) {
    matter.lastActivityAt = new Date().toISOString();
    matter.stageEnteredAt = matter.lastActivityAt;
  }
  if (beforeMatterId) {
    const beforeIndex = destinationMatters.findIndex((item) => item.id === beforeMatterId);
    destinationMatters.splice(beforeIndex, 0, matter);
  } else {
    destinationMatters.push(matter);
  }

  destinationMatters.forEach((item, index) => {
    item.sortOrder = index + 1;
  });

  if (previousStage !== stage) {
    renumberDemoStage(matter.boardId, previousStage);
  }

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

export async function unarchiveDemoMatterRecord(matterId: string): Promise<Matter> {
  const matter = matterStore.find((item) => item.id === matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.archived = false;
  matter.archivedAt = null;
  matter.lastActivityAt = new Date().toISOString();
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
  matter.interactionCount += 1;

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

export async function listDemoTasks(boardId: string): Promise<MatterTask[]> {
  return [...taskStore]
    .filter((task) => !task.completedAt)
    .filter((task) => matterStore.find((matter) => matter.id === task.matterId)?.boardId === boardId)
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

function formatUtcMonthKey(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function buildOpenedCasesByMonthLast12Months(
  timestamps: string[],
  referenceDate = new Date()
): MatterStatsMonth[] {
  const currentMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    return new Date(
      Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + offset, 1)
    );
  });
  const counts = new Map(months.map((month) => [formatUtcMonthKey(month), 0]));

  for (const timestamp of timestamps) {
    const parsed = new Date(timestamp);

    if (Number.isNaN(parsed.getTime())) {
      continue;
    }

    const monthKey = formatUtcMonthKey(
      new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1))
    );

    if (counts.has(monthKey)) {
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    }
  }

  return months.map((month) => ({
    monthStart: month.toISOString(),
    openedCount: counts.get(formatUtcMonthKey(month)) ?? 0
  }));
}

export async function getDemoMatterStats(boardId: string): Promise<MatterStats> {
  const boardMatters = matterStore.filter((matter) => matter.boardId === boardId);
  const archivedMatters = boardMatters.filter(
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
    totalCasesOpened: boardMatters.length,
    totalCasesArchived: archivedMatters.length,
    averageCasesOpenedPerYear: calculateAveragePerYear(
      boardMatters.map((matter) => matter.createdAt)
    ),
    averageCasesArchivedPerYear: calculateAveragePerYear(
      archivedMatters.map((matter) => matter.archivedAt ?? matter.createdAt)
    ),
    averageCaseLengthDays,
    openedCasesByMonthLast12Months: buildOpenedCasesByMonthLast12Months(
      boardMatters.map((matter) => matter.createdAt)
    )
  };
}

export async function getDemoStatus(): Promise<AppStatus> {
  return {
    ...demoStatus,
    timestamp: new Date().toISOString()
  };
}

export async function getDemoBoardSettings(): Promise<BoardSettings> {
  return structuredClone(demoBoardSettings);
}

export async function updateDemoBoardSettings(
  input: Partial<BoardSettings>
): Promise<BoardSettings> {
  const stageLabels = {
    intake: input.stageLabels?.intake?.trim() || DEFAULT_STAGE_LABELS.intake,
    qualified_opened:
      input.stageLabels?.qualified_opened?.trim() || DEFAULT_STAGE_LABELS.qualified_opened,
    notice_admin: input.stageLabels?.notice_admin?.trim() || DEFAULT_STAGE_LABELS.notice_admin,
    inventory_collection:
      input.stageLabels?.inventory_collection?.trim() ||
      DEFAULT_STAGE_LABELS.inventory_collection,
    accounting_closing:
      input.stageLabels?.accounting_closing?.trim() ||
      DEFAULT_STAGE_LABELS.accounting_closing
  };

  return {
    columnCount: Math.min(
      STAGES.length,
      Math.max(1, Math.round(Number(input.columnCount ?? demoBoardSettings.columnCount)))
    ),
    stageLabels
  };
}
