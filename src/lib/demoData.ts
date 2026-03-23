import { DEFAULT_DEADLINE_TEMPLATE_SETTINGS } from "@/lib/deadlineRules";
import { DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY } from "@/lib/matterDeadlineSettings";
import type { AppStatus, BoardSettings } from "@/types/api";
import type {
  Deadline,
  DeadlineTemplateSettings,
  MatterDeadlineSummary
} from "@/types/deadlines";
import type { Matter, MatterNote, MatterStage, MatterTask, PracticeBoard } from "@/types/matter";
import { DEFAULT_STAGE_LABELS } from "@/utils/stages";

const now = "2026-03-17T09:00:00.000Z";
const emptyDeadlineSummary: MatterDeadlineSummary = {
  overdueCount: 0,
  dueTodayCount: 0,
  activeCount: 0,
  urgentReminderCount: 0,
  anchorAlertCount: 0,
  nextDeadlineTitle: null,
  nextDeadlineDueDate: null,
  nextDeadlineStatus: null,
  nextReminderState: null
};

export const demoMatters: Matter[] = [
  {
    id: "matter_seed_001",
    boardId: "probate",
    decedentName: "Eleanor Whitfield",
    clientName: "Marcus Whitfield",
    fileNumber: "PR-2026-0014",
    deadlineTemplateKey: "standard_estate_administration",
    qualificationDate: "2026-02-12",
    publicationDate: "2026-03-08",
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "notice_admin",
    sortOrder: 1,
    createdAt: "2026-02-03T14:20:00.000Z",
    lastActivityAt: "2026-03-12T16:45:00.000Z",
    stageEnteredAt: "2026-03-01T09:00:00.000Z",
    interactionCount: 2,
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_002",
    boardId: "probate",
    decedentName: "Harold McIntyre",
    clientName: "Olivia McIntyre",
    fileNumber: "PR-2026-0018",
    deadlineTemplateKey: "standard_estate_administration",
    qualificationDate: "2026-02-18",
    publicationDate: "2026-02-28",
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "inventory_collection",
    sortOrder: 1,
    createdAt: "2026-02-10T10:05:00.000Z",
    lastActivityAt: "2026-03-14T11:10:00.000Z",
    stageEnteredAt: "2026-03-08T09:00:00.000Z",
    interactionCount: 1,
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_003",
    boardId: "probate",
    decedentName: "Lucille Carver",
    clientName: "Daniel Carver",
    fileNumber: "PR-2026-0021",
    deadlineTemplateKey: "standard_estate_administration",
    qualificationDate: "2025-12-15",
    publicationDate: "2025-12-28",
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "accounting_closing",
    sortOrder: 1,
    createdAt: "2026-02-18T08:30:00.000Z",
    lastActivityAt: "2026-03-15T15:00:00.000Z",
    stageEnteredAt: "2026-03-11T09:00:00.000Z",
    interactionCount: 1,
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_004",
    boardId: "probate",
    decedentName: "John Doe",
    clientName: "Jane Doe",
    fileNumber: "26 E 000321-950",
    deadlineTemplateKey: "custom_manual_only",
    qualificationDate: null,
    publicationDate: null,
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "intake",
    sortOrder: 1,
    createdAt: "2026-03-01T13:40:00.000Z",
    lastActivityAt: "2026-03-16T09:20:00.000Z",
    stageEnteredAt: "2026-03-01T13:40:00.000Z",
    interactionCount: 0,
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_005",
    boardId: "probate",
    decedentName: "Florence Avery",
    clientName: "Jon Avery",
    fileNumber: "PR-2025-0119",
    deadlineTemplateKey: "standard_estate_administration",
    qualificationDate: "2025-11-15",
    publicationDate: "2025-11-23",
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "accounting_closing",
    sortOrder: 2,
    createdAt: "2025-11-12T11:00:00.000Z",
    lastActivityAt: "2026-03-10T12:30:00.000Z",
    stageEnteredAt: "2026-02-20T10:00:00.000Z",
    interactionCount: 1,
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_006",
    boardId: "probate",
    decedentName: "Margaret Sloan",
    clientName: "Thomas Sloan",
    fileNumber: "PR-2025-0084",
    deadlineTemplateKey: "standard_estate_administration",
    qualificationDate: "2025-07-15",
    publicationDate: "2025-07-22",
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: "accounting_closing",
    sortOrder: 3,
    createdAt: "2025-07-08T09:15:00.000Z",
    lastActivityAt: "2026-01-18T14:30:00.000Z",
    stageEnteredAt: "2025-12-15T09:00:00.000Z",
    interactionCount: 1,
    archived: true,
    archivedAt: "2026-01-18T14:30:00.000Z"
  }
];

export const demoNotes: Record<string, MatterNote[]> = {
  matter_seed_001: [
    {
      id: "note_seed_001",
      matterId: "matter_seed_001",
      body: "Published notice to creditors and logged publication dates.",
      createdAt: "2026-03-12T16:45:00.000Z",
      createdBy: "Probate Team"
    },
    {
      id: "note_seed_002",
      matterId: "matter_seed_001",
      body: "Letters testamentary issued by the clerk.",
      createdAt: "2026-03-05T10:15:00.000Z",
      createdBy: "Probate Team"
    }
  ],
  matter_seed_002: [
    {
      id: "note_seed_003",
      matterId: "matter_seed_002",
      body: "Requested updated account statements from First National.",
      createdAt: "2026-03-14T11:10:00.000Z",
      createdBy: "CaseFlow Demo"
    }
  ],
  matter_seed_003: [
    {
      id: "note_seed_004",
      matterId: "matter_seed_003",
      body: "Draft final accounting circulated for internal review.",
      createdAt: "2026-03-15T15:00:00.000Z",
      createdBy: "CaseFlow Demo"
    }
  ],
  matter_seed_004: [],
  matter_seed_005: [
    {
      id: "note_seed_005",
      matterId: "matter_seed_005",
      body: "Order approving final report entered. File ready for archive.",
      createdAt: "2026-03-10T12:30:00.000Z",
      createdBy: "Probate Team"
    }
  ],
  matter_seed_006: [
    {
      id: "note_seed_006",
      matterId: "matter_seed_006",
      body: "Matter archived after approved final accounting and discharge order.",
      createdAt: "2026-01-18T14:30:00.000Z",
      createdBy: "Probate Team"
    }
  ]
};

export const demoStatus: AppStatus = {
  appName: "CaseFlow v1.0",
  runtime: "Demo fallback",
  timestamp: now,
  authMode: "Not configured"
};

export const demoBoardSettings: BoardSettings = {
  columnCount: 5,
  stageLabels: { ...DEFAULT_STAGE_LABELS }
};

export const demoDeadlineTemplateSettings: DeadlineTemplateSettings = structuredClone(
  DEFAULT_DEADLINE_TEMPLATE_SETTINGS
);

export const demoBoards: PracticeBoard[] = [
  {
    id: "probate",
    name: "Probate",
    columnCount: 5,
    stageLabels: { ...DEFAULT_STAGE_LABELS }
  }
];

export const demoTasks: MatterTask[] = [
  {
    id: "task_seed_001",
    matterId: "matter_seed_003",
    matterName: "Lucille Carver",
    clientName: "Daniel Carver",
    fileNumber: "PR-2026-0021",
    body: "Prepare final accounting exhibits for attorney review.",
    createdAt: "2026-03-15T15:10:00.000Z",
    completedAt: null
  },
  {
    id: "task_seed_002",
    matterId: "matter_seed_004",
    matterName: "John Doe",
    clientName: "Jane Doe",
    fileNumber: "26 E 000321-950",
    body: "Collect intake packet signatures and confirm venue details.",
    createdAt: "2026-03-16T09:30:00.000Z",
    completedAt: null
  }
];

export const demoDeadlines: Deadline[] = [
  {
    id: "deadline_seed_001",
    matterId: "matter_seed_001",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Eleanor Whitfield",
    clientName: "Marcus Whitfield",
    fileNumber: "PR-2026-0014",
    title: "Publication follow-up",
    category: "Notice to creditors",
    dueDate: "2026-04-07",
    assignee: "Probate Team",
    status: "upcoming",
    reminderState: "none",
    priority: "medium",
    sourceType: "template",
    notes: null,
    createdAt: "2026-03-08T09:00:00.000Z",
    updatedAt: "2026-03-08T09:00:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "publication_follow_up",
    isOverridden: false
  },
  {
    id: "deadline_seed_002",
    matterId: "matter_seed_001",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Eleanor Whitfield",
    clientName: "Marcus Whitfield",
    fileNumber: "PR-2026-0014",
    title: "Inventory due",
    category: "Inventory",
    dueDate: "2026-05-13",
    assignee: "Marcus Whitfield",
    status: "upcoming",
    reminderState: "none",
    priority: "high",
    sourceType: "template",
    notes: null,
    createdAt: "2026-02-12T14:20:00.000Z",
    updatedAt: "2026-02-12T14:20:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "inventory_due",
    isOverridden: false
  },
  {
    id: "deadline_seed_003",
    matterId: "matter_seed_002",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Harold McIntyre",
    clientName: "Olivia McIntyre",
    fileNumber: "PR-2026-0018",
    title: "Inventory due",
    category: "Inventory",
    dueDate: "2026-05-19",
    assignee: "Olivia McIntyre",
    status: "upcoming",
    reminderState: "none",
    priority: "high",
    sourceType: "template",
    notes: "Draft is in progress.",
    createdAt: "2026-02-18T10:05:00.000Z",
    updatedAt: "2026-03-14T11:10:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "inventory_due",
    isOverridden: true
  },
  {
    id: "deadline_seed_004",
    matterId: "matter_seed_002",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Harold McIntyre",
    clientName: "Olivia McIntyre",
    fileNumber: "PR-2026-0018",
    title: "Accounting due",
    category: "Accounting",
    dueDate: "2027-02-18",
    assignee: "Probate Team",
    status: "upcoming",
    reminderState: "none",
    priority: "medium",
    sourceType: "template",
    notes: null,
    createdAt: "2026-02-18T10:05:00.000Z",
    updatedAt: "2026-02-18T10:05:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "accounting_due",
    isOverridden: false
  },
  {
    id: "deadline_seed_005",
    matterId: "matter_seed_003",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Lucille Carver",
    clientName: "Daniel Carver",
    fileNumber: "PR-2026-0021",
    title: "Closing review target",
    category: "Closing",
    dueDate: "2026-03-10",
    assignee: "CaseFlow Demo",
    status: "overdue",
    reminderState: "none",
    priority: "low",
    sourceType: "template",
    notes: "Waiting on one final receipt.",
    createdAt: "2025-12-15T08:30:00.000Z",
    updatedAt: "2026-03-15T15:00:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "closing_review_target",
    isOverridden: false
  },
  {
    id: "deadline_seed_006",
    matterId: "matter_seed_003",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Lucille Carver",
    clientName: "Daniel Carver",
    fileNumber: "PR-2026-0021",
    title: "Draft final accounting exhibits",
    category: "Accounting",
    dueDate: "2026-03-17",
    assignee: "CaseFlow Demo",
    status: "due_today",
    reminderState: "none",
    priority: "high",
    sourceType: "manual",
    notes: "Coordinate with attorney before filing.",
    createdAt: "2026-03-15T15:10:00.000Z",
    updatedAt: "2026-03-15T15:10:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: null,
    templateItemKey: null,
    isOverridden: false
  },
  {
    id: "deadline_seed_007",
    matterId: "matter_seed_005",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Florence Avery",
    clientName: "Jon Avery",
    fileNumber: "PR-2025-0119",
    title: "Closing review target",
    category: "Closing",
    dueDate: "2026-02-10",
    assignee: "Probate Team",
    status: "completed",
    reminderState: "none",
    priority: "low",
    sourceType: "template",
    notes: null,
    createdAt: "2025-11-15T11:00:00.000Z",
    updatedAt: "2026-02-12T09:30:00.000Z",
    completedAt: "2026-02-12T09:30:00.000Z",
    completedBy: "Probate Team",
    completionNote: "Reviewed and approved for closing packet.",
    dismissedAt: null,
    dismissedBy: null,
    templateKey: "standard_estate_administration",
    templateItemKey: "closing_review_target",
    isOverridden: false
  },
  {
    id: "deadline_seed_008",
    matterId: "matter_seed_004",
    boardId: "probate",
    boardName: "Probate",
    matterName: "John Doe",
    clientName: "Jane Doe",
    fileNumber: "26 E 000321-950",
    title: "Collect qualification documents",
    category: "Intake",
    dueDate: "2026-03-24",
    assignee: "Jane Doe",
    status: "upcoming",
    reminderState: "none",
    priority: "medium",
    sourceType: "manual",
    notes: "Need original will and death certificate.",
    createdAt: "2026-03-16T09:20:00.000Z",
    updatedAt: "2026-03-16T09:20:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: null,
    templateItemKey: null,
    isOverridden: false
  }
];

export function createDemoMatter(input: {
  boardId: string;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
}): Matter {
  return {
    id: crypto.randomUUID(),
    boardId: input.boardId,
    decedentName: input.decedentName,
    clientName: input.clientName,
    fileNumber: input.fileNumber,
    deadlineTemplateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
    qualificationDate: null,
    publicationDate: null,
    deadlineSummary: { ...emptyDeadlineSummary },
    stage: input.stage,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    stageEnteredAt: new Date().toISOString(),
    interactionCount: 0,
    archived: false,
    archivedAt: null
  };
}
