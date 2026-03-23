import {
  buildMatterAnchorAlerts,
  buildMatterDeadlineSummary,
  calculateDeadlineReminderState,
  calculateDeadlineStatus,
  DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
  normalizeOptionalDateOnly,
  reconcileGeneratedDeadlines
} from "@/lib/deadlineRules";
import {
  createDemoMatter,
  demoBoards,
  demoBoardSettings,
  demoDeadlineTemplateSettings,
  demoDeadlines,
  demoMatters,
  demoNotes,
  demoStatus,
  demoTasks
} from "@/lib/demoData";
import type { AppStatus, BoardSettings, MatterStats, MatterStatsMonth } from "@/types/api";
import type {
  Deadline,
  DeadlineDashboardData,
  MatterAnchorAlert,
  DeadlinePriority,
  DeadlineTemplateSettings,
  MatterDeadlineSettings
} from "@/types/deadlines";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask,
  PracticeBoard
} from "@/types/matter";
import { DEFAULT_STAGE_LABELS, STAGES } from "@/utils/stages";

const matterStore: Matter[] = structuredClone(demoMatters);
const noteStore = structuredClone(demoNotes);
const taskStore: MatterTask[] = structuredClone(demoTasks);
const boardStore: PracticeBoard[] = structuredClone(demoBoards);
const deadlineStore: Deadline[] = structuredClone(demoDeadlines);
let boardSettingsStore: BoardSettings = structuredClone(demoBoardSettings);
let deadlineTemplateSettingsStore: DeadlineTemplateSettings = structuredClone(
  demoDeadlineTemplateSettings
);

export function shouldUseDemoFallback() {
  return (import.meta.env.VITE_ENABLE_DEMO_FALLBACK ?? "true") === "true";
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getBoardById(boardId: string) {
  return boardStore.find((board) => board.id === boardId) ?? null;
}

function getMatterById(matterId: string) {
  return matterStore.find((matter) => matter.id === matterId) ?? null;
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

function sortDeadlines(items: Deadline[]) {
  return [...items].sort((left, right) => {
    const leftStatus = calculateDeadlineStatus(left);
    const rightStatus = calculateDeadlineStatus(right);
    const rank = (status: Deadline["status"]) => {
      switch (status) {
        case "overdue":
          return 0;
        case "due_today":
          return 1;
        case "upcoming":
          return 2;
        case "completed":
          return 3;
        case "dismissed":
          return 4;
        default:
          return 5;
      }
    };
    const statusDelta = rank(leftStatus) - rank(rightStatus);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    if (left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function hydrateDeadline(deadline: Deadline) {
  const matter = getMatterById(deadline.matterId);
  const board = matter ? getBoardById(matter.boardId) : null;

  if (matter) {
    deadline.boardId = matter.boardId;
    deadline.matterName = matter.decedentName;
    deadline.clientName = matter.clientName;
    deadline.fileNumber = matter.fileNumber;
  }

  deadline.boardName = board?.name ?? deadline.boardName;
  deadline.status = calculateDeadlineStatus(deadline);
  deadline.reminderState = calculateDeadlineReminderState(deadline);

  return deadline;
}

function buildMatterAnchorIssuesForMatter(matter: Matter): MatterAnchorAlert[] {
  return buildMatterAnchorAlerts(
    {
      matterId: matter.id,
      boardId: matter.boardId,
      boardName: getBoardById(matter.boardId)?.name ?? null,
      matterName: matter.decedentName,
      clientName: matter.clientName,
      fileNumber: matter.fileNumber,
      templateKey: matter.deadlineTemplateKey,
      qualificationDate: matter.qualificationDate,
      publicationDate: matter.publicationDate
    },
    deadlineTemplateSettingsStore
  );
}

function syncDeadlineMetadataForMatter(matter: Matter) {
  for (const deadline of deadlineStore) {
    if (deadline.matterId === matter.id) {
      hydrateDeadline(deadline);
    }
  }
}

function listMatterDeadlinesInternal(matterId: string) {
  return sortDeadlines(
    deadlineStore
      .filter((deadline) => deadline.matterId === matterId)
      .map((deadline) => hydrateDeadline(deadline))
  );
}

function buildMatterDeadlineSettings(matter: Matter): MatterDeadlineSettings {
  return {
    matterId: matter.id,
    templateKey: matter.deadlineTemplateKey,
    qualificationDate: matter.qualificationDate,
    publicationDate: matter.publicationDate
  };
}

function refreshMatterDeadlineSummary(matterId: string) {
  const matter = getMatterById(matterId);

  if (!matter) {
    return;
  }

  matter.deadlineSummary = buildMatterDeadlineSummary(
    listMatterDeadlinesInternal(matterId),
    new Date(),
    buildMatterAnchorIssuesForMatter(matter)
  );
}

function refreshAllMatterDeadlineSummaries() {
  matterStore.forEach((matter) => refreshMatterDeadlineSummary(matter.id));
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

function syncGeneratedDeadlinesForMatter(matter: Matter, timestamp = new Date().toISOString()) {
  const reconciliation = reconcileGeneratedDeadlines({
    settings: buildMatterDeadlineSettings(matter),
    templateSettings: deadlineTemplateSettingsStore,
    existingDeadlines: deadlineStore
      .filter((deadline) => deadline.matterId === matter.id && deadline.sourceType === "template")
      .map((deadline) => ({
        id: deadline.id,
        templateKey: deadline.templateKey,
        templateItemKey: deadline.templateItemKey,
        sourceType: deadline.sourceType,
        isOverridden: deadline.isOverridden,
        completedAt: deadline.completedAt,
        dismissedAt: deadline.dismissedAt
      }))
  });

  for (const draft of reconciliation.toCreate) {
    deadlineStore.push(
      hydrateDeadline({
        id: crypto.randomUUID(),
        matterId: matter.id,
        boardId: matter.boardId,
        boardName: getBoardById(matter.boardId)?.name ?? matter.boardId,
        matterName: matter.decedentName,
        clientName: matter.clientName,
        fileNumber: matter.fileNumber,
        title: draft.title,
        category: draft.category,
        dueDate: draft.dueDate,
        assignee: null,
        status: "upcoming",
        reminderState: "none",
        priority: draft.priority,
        sourceType: "template",
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
        completedBy: null,
        completionNote: null,
        dismissedAt: null,
        dismissedBy: null,
        templateKey: draft.templateKey,
        templateItemKey: draft.templateItemKey,
        isOverridden: false
      })
    );
  }

  for (const draft of reconciliation.toUpdate) {
    const existing = deadlineStore.find((deadline) => deadline.id === draft.id);

    if (!existing || existing.completedAt || existing.dismissedAt) {
      continue;
    }

    existing.title = draft.title;
    existing.category = draft.category;
    existing.dueDate = draft.dueDate;
    existing.priority = draft.priority;
    existing.templateKey = draft.templateKey;
    existing.templateItemKey = draft.templateItemKey;
    existing.updatedAt = timestamp;
    hydrateDeadline(existing);
  }

  for (const deadlineId of reconciliation.toDismiss) {
    const existing = deadlineStore.find((deadline) => deadline.id === deadlineId);

    if (!existing || existing.completedAt || existing.dismissedAt) {
      continue;
    }

    existing.dismissedAt = timestamp;
    existing.dismissedBy = "CaseFlow Demo";
    existing.updatedAt = timestamp;
    hydrateDeadline(existing);
  }

  syncDeadlineMetadataForMatter(matter);
  refreshMatterDeadlineSummary(matter.id);
}

refreshAllMatterDeadlineSummaries();

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
    columnCount: boardSettingsStore.columnCount,
    stageLabels: { ...boardSettingsStore.stageLabels }
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

  deadlineStore
    .filter((deadline) => deadline.boardId === board.id)
    .forEach((deadline) => {
      deadline.boardName = board.name;
    });

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
  return structuredClone(
    sortDemoMatters(matterStore.filter((matter) => matter.boardId === boardId && !matter.archived))
  );
}

export async function listDemoArchivedMatters(boardId: string): Promise<Matter[]> {
  return structuredClone(
    [...matterStore]
      .filter((matter) => matter.boardId === boardId && matter.archived)
      .sort((left, right) => (right.archivedAt ?? "").localeCompare(left.archivedAt ?? ""))
  );
}

export async function createDemoMatterRecord(input: MatterFormInput): Promise<Matter> {
  const matter = createDemoMatter(input);
  matter.sortOrder = getNextDemoStageSortOrder(input.boardId, input.stage, "start");
  matterStore.unshift(matter);
  renumberDemoStage(input.boardId, input.stage);
  noteStore[matter.id] = [];
  refreshMatterDeadlineSummary(matter.id);
  return structuredClone(matter);
}

export async function updateDemoMatterRecord(
  matterId: string,
  input: MatterFormInput
): Promise<Matter> {
  const matter = getMatterById(matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.decedentName = input.decedentName;
  matter.clientName = input.clientName;
  matter.fileNumber = input.fileNumber;
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

  syncDeadlineMetadataForMatter(matter);
  refreshMatterDeadlineSummary(matter.id);

  return structuredClone(matter);
}

export async function moveDemoMatterRecord(
  matterId: string,
  stage: MatterStage,
  beforeMatterId: string | null = null
): Promise<Matter> {
  const matter = getMatterById(matterId);

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

  return structuredClone(matter);
}

export async function deleteDemoMatterRecord(matterId: string): Promise<void> {
  const index = matterStore.findIndex((item) => item.id === matterId);

  if (index >= 0) {
    matterStore.splice(index, 1);
  }

  for (let deadlineIndex = deadlineStore.length - 1; deadlineIndex >= 0; deadlineIndex -= 1) {
    if (deadlineStore[deadlineIndex]?.matterId === matterId) {
      deadlineStore.splice(deadlineIndex, 1);
    }
  }

  delete noteStore[matterId];
}

export async function archiveDemoMatterRecord(matterId: string): Promise<Matter> {
  const matter = getMatterById(matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.archived = true;
  matter.archivedAt = new Date().toISOString();
  matter.lastActivityAt = matter.archivedAt;
  return structuredClone(matter);
}

export async function unarchiveDemoMatterRecord(matterId: string): Promise<Matter> {
  const matter = getMatterById(matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.archived = false;
  matter.archivedAt = null;
  matter.lastActivityAt = new Date().toISOString();
  return structuredClone(matter);
}

export async function listDemoNotes(matterId: string): Promise<MatterNote[]> {
  return structuredClone(
    [...(noteStore[matterId] ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
  );
}

export async function addDemoNote(
  matterId: string,
  body: string,
  addToTaskList = false
): Promise<MatterNote> {
  const matter = getMatterById(matterId);

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

  return structuredClone(note);
}

export async function listDemoTasks(boardId: string): Promise<MatterTask[]> {
  return structuredClone(
    [...taskStore]
      .filter((task) => !task.completedAt)
      .filter((task) => getMatterById(task.matterId)?.boardId === boardId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  );
}

export async function getDemoMatterDeadlines(matterId: string) {
  const matter = getMatterById(matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  return {
    matter: structuredClone(matter),
    settings: structuredClone(buildMatterDeadlineSettings(matter)),
    deadlines: structuredClone(listMatterDeadlinesInternal(matterId)),
    anchorIssues: structuredClone(buildMatterAnchorIssuesForMatter(matter))
  };
}

export async function createDemoDeadlineRecord(input: {
  matterId: string;
  title: string;
  category: string;
  dueDate: string;
  assignee: string;
  priority: DeadlinePriority;
  notes: string;
}) {
  const matter = getMatterById(input.matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  const timestamp = new Date().toISOString();
  const deadline: Deadline = hydrateDeadline({
    id: crypto.randomUUID(),
    matterId: matter.id,
    boardId: matter.boardId,
    boardName: getBoardById(matter.boardId)?.name ?? matter.boardId,
    matterName: matter.decedentName,
    clientName: matter.clientName,
    fileNumber: matter.fileNumber,
    title: input.title.trim(),
    category: input.category.trim(),
    dueDate: input.dueDate,
    assignee: normalizeOptionalText(input.assignee),
    status: "upcoming",
    reminderState: "none",
    priority: input.priority,
    sourceType: "manual",
    notes: normalizeOptionalText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: null,
    templateItemKey: null,
    isOverridden: false
  });

  deadlineStore.push(deadline);
  matter.lastActivityAt = timestamp;
  refreshMatterDeadlineSummary(matter.id);

  return {
    matter: structuredClone(matter),
    deadline: structuredClone(deadline)
  };
}

export async function updateDemoDeadlineRecord(
  deadlineId: string,
  input: {
    title: string;
    category: string;
    dueDate: string;
    assignee: string;
    priority: DeadlinePriority;
    notes: string;
  }
) {
  const deadline = deadlineStore.find((item) => item.id === deadlineId);

  if (!deadline) {
    throw new Error("Deadline not found.");
  }

  if (deadline.completedAt) {
    throw new Error("Completed deadlines cannot be edited.");
  }

  if (deadline.dismissedAt) {
    throw new Error("Dismissed deadlines cannot be edited.");
  }

  const nextAssignee = normalizeOptionalText(input.assignee);
  const nextNotes = normalizeOptionalText(input.notes);
  const hasOverrideChanges =
    deadline.title !== input.title.trim() ||
    deadline.category !== input.category.trim() ||
    deadline.dueDate !== input.dueDate ||
    deadline.assignee !== nextAssignee ||
    deadline.priority !== input.priority ||
    deadline.notes !== nextNotes;

  deadline.title = input.title.trim();
  deadline.category = input.category.trim();
  deadline.dueDate = input.dueDate;
  deadline.assignee = nextAssignee;
  deadline.priority = input.priority;
  deadline.notes = nextNotes;
  deadline.updatedAt = new Date().toISOString();
  if (deadline.sourceType === "template" && hasOverrideChanges) {
    deadline.isOverridden = true;
  }
  hydrateDeadline(deadline);

  const matter = getMatterById(deadline.matterId);
  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.lastActivityAt = deadline.updatedAt;
  refreshMatterDeadlineSummary(matter.id);

  return {
    matter: structuredClone(matter),
    deadline: structuredClone(deadline)
  };
}

export async function completeDemoDeadlineRecord(
  deadlineId: string,
  completionNote = ""
) {
  const deadline = deadlineStore.find((item) => item.id === deadlineId);

  if (!deadline) {
    throw new Error("Deadline not found.");
  }

  if (deadline.dismissedAt) {
    throw new Error("Dismissed deadlines cannot be completed.");
  }

  if (!deadline.completedAt) {
    const timestamp = new Date().toISOString();
    deadline.completedAt = timestamp;
    deadline.completedBy = "CaseFlow Demo";
    deadline.completionNote = normalizeOptionalText(completionNote);
    deadline.updatedAt = timestamp;
    hydrateDeadline(deadline);
  }

  const matter = getMatterById(deadline.matterId);
  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.lastActivityAt = deadline.updatedAt;
  refreshMatterDeadlineSummary(matter.id);

  return {
    matter: structuredClone(matter),
    deadline: structuredClone(deadline)
  };
}

export async function dismissDemoDeadlineRecord(deadlineId: string) {
  const deadline = deadlineStore.find((item) => item.id === deadlineId);

  if (!deadline) {
    throw new Error("Deadline not found.");
  }

  if (deadline.completedAt) {
    throw new Error("Completed deadlines cannot be dismissed.");
  }

  if (!deadline.dismissedAt) {
    const timestamp = new Date().toISOString();
    deadline.dismissedAt = timestamp;
    deadline.dismissedBy = "CaseFlow Demo";
    deadline.updatedAt = timestamp;
    hydrateDeadline(deadline);
  }

  const matter = getMatterById(deadline.matterId);
  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.lastActivityAt = deadline.updatedAt;
  refreshMatterDeadlineSummary(matter.id);

  return {
    matter: structuredClone(matter),
    deadline: structuredClone(deadline)
  };
}

export async function saveDemoMatterDeadlineSettings(
  matterId: string,
  input: Omit<MatterDeadlineSettings, "matterId">
) {
  const matter = getMatterById(matterId);

  if (!matter) {
    throw new Error("Matter not found.");
  }

  matter.deadlineTemplateKey = input.templateKey;
  matter.qualificationDate = normalizeOptionalDateOnly(input.qualificationDate);
  matter.publicationDate = normalizeOptionalDateOnly(input.publicationDate);
  matter.lastActivityAt = new Date().toISOString();

  syncGeneratedDeadlinesForMatter(matter, matter.lastActivityAt);

  return {
    matter: structuredClone(matter),
    settings: structuredClone(buildMatterDeadlineSettings(matter)),
    deadlines: structuredClone(listMatterDeadlinesInternal(matter.id)),
    anchorIssues: structuredClone(buildMatterAnchorIssuesForMatter(matter))
  };
}

export async function getDemoDeadlineDashboard(filters?: {
  assignee?: string;
  matterId?: string;
  status?: Deadline["status"] | "all";
}): Promise<DeadlineDashboardData> {
  const allDeadlines = sortDeadlines(deadlineStore.map((deadline) => hydrateDeadline(deadline)));
  const activeMatters = matterStore.filter((matter) => !matter.archived);
  const assigneeFilter = normalizeOptionalText(filters?.assignee);
  const matterIdFilter = filters?.matterId?.trim() || null;
  const statusFilter = filters?.status && filters.status !== "all" ? filters.status : "all";

  return {
    deadlines: structuredClone(
      allDeadlines.filter((deadline) => {
        if (
          assigneeFilter &&
          (deadline.assignee ?? "").localeCompare(assigneeFilter, undefined, {
            sensitivity: "base"
          }) !== 0
        ) {
          return false;
        }

        if (matterIdFilter && deadline.matterId !== matterIdFilter) {
          return false;
        }

        if (statusFilter !== "all" && deadline.status !== statusFilter) {
          return false;
        }

        return true;
      })
    ),
    anchorIssues:
      statusFilter === "all" || statusFilter === "upcoming"
        ? structuredClone(
            activeMatters
              .flatMap((matter) => buildMatterAnchorIssuesForMatter(matter))
              .filter((issue) => !matterIdFilter || issue.matterId === matterIdFilter)
          )
        : [],
    assignees: Array.from(
      new Set(
        allDeadlines
          .map((deadline) => normalizeOptionalText(deadline.assignee))
          .filter((value): value is string => Boolean(value))
      )
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" })),
    matters: Array.from(
      new Map(
        activeMatters.map((matter) => [
          matter.id,
          {
            matterId: matter.id,
            boardId: matter.boardId,
            boardName: getBoardById(matter.boardId)?.name ?? null,
            label: `${matter.decedentName} | ${matter.fileNumber}`
          }
        ])
      ).values()
    ).sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))
  };
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
  const archivedMatters = boardMatters.filter((matter) => matter.archived && matter.archivedAt);

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
  return structuredClone(boardSettingsStore);
}

export async function updateDemoBoardSettings(
  input: Partial<BoardSettings>
): Promise<BoardSettings> {
  boardSettingsStore = {
    columnCount: Math.min(
      STAGES.length,
      Math.max(1, Math.round(Number(input.columnCount ?? boardSettingsStore.columnCount)))
    ),
    stageLabels: {
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
    }
  };

  return structuredClone(boardSettingsStore);
}

export async function getDemoDeadlineTemplateSettings(): Promise<DeadlineTemplateSettings> {
  return structuredClone(deadlineTemplateSettingsStore);
}

export async function updateDemoDeadlineTemplateSettings(
  input: DeadlineTemplateSettings
): Promise<DeadlineTemplateSettings> {
  deadlineTemplateSettingsStore = structuredClone(
    input.templates?.length ? input : DEFAULT_DEADLINE_TEMPLATE_SETTINGS
  );

  for (const matter of matterStore) {
    syncGeneratedDeadlinesForMatter(matter);
  }

  return structuredClone(deadlineTemplateSettingsStore);
}
