import type { AppStatus, BoardSettings } from "@/types/api";
import type { Matter, MatterNote, MatterStage, MatterTask, PracticeBoard } from "@/types/matter";
import { DEFAULT_STAGE_LABELS } from "@/utils/stages";

const now = "2026-03-17T09:00:00.000Z";

export const demoMatters: Matter[] = [
  {
    id: "matter_seed_001",
    boardId: "probate",
    decedentName: "Eleanor Whitfield",
    clientName: "Marcus Whitfield",
    fileNumber: "PR-2026-0014",
    stage: "notice_admin",
    createdAt: "2026-02-03T14:20:00.000Z",
    lastActivityAt: "2026-03-12T16:45:00.000Z",
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_002",
    boardId: "probate",
    decedentName: "Harold McIntyre",
    clientName: "Olivia McIntyre",
    fileNumber: "PR-2026-0018",
    stage: "inventory_collection",
    createdAt: "2026-02-10T10:05:00.000Z",
    lastActivityAt: "2026-03-14T11:10:00.000Z",
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_003",
    boardId: "probate",
    decedentName: "Lucille Carver",
    clientName: "Daniel Carver",
    fileNumber: "PR-2026-0021",
    stage: "accounting_closing",
    createdAt: "2026-02-18T08:30:00.000Z",
    lastActivityAt: "2026-03-15T15:00:00.000Z",
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_004",
    boardId: "probate",
    decedentName: "John Doe",
    clientName: "Jane Doe",
    fileNumber: "26 E 000321-950",
    stage: "intake",
    createdAt: "2026-03-01T13:40:00.000Z",
    lastActivityAt: "2026-03-16T09:20:00.000Z",
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_005",
    boardId: "probate",
    decedentName: "Florence Avery",
    clientName: "Jon Avery",
    fileNumber: "PR-2025-0119",
    stage: "accounting_closing",
    createdAt: "2025-11-12T11:00:00.000Z",
    lastActivityAt: "2026-03-10T12:30:00.000Z",
    archived: false,
    archivedAt: null
  },
  {
    id: "matter_seed_006",
    boardId: "probate",
    decedentName: "Margaret Sloan",
    clientName: "Thomas Sloan",
    fileNumber: "PR-2025-0084",
    stage: "accounting_closing",
    createdAt: "2025-07-08T09:15:00.000Z",
    lastActivityAt: "2026-01-18T14:30:00.000Z",
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
    stage: input.stage,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    archived: false,
    archivedAt: null
  };
}
