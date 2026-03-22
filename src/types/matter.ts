export type MatterStage =
  | "intake"
  | "qualified_opened"
  | "notice_admin"
  | "inventory_collection"
  | "accounting_closing";

export type Matter = {
  id: string;
  boardId: string;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  inventoryDueDate: string | null;
  ntcExpirationDate: string | null;
  stage: MatterStage;
  sortOrder: number;
  createdAt: string;
  lastActivityAt: string;
  stageEnteredAt: string;
  interactionCount: number;
  archived: boolean;
  archivedAt: string | null;
};

export type BoardSortField =
  | "manual"
  | "name"
  | "days_in_stage"
  | "inactive_days"
  | "interactions";

export type BoardSortDirection = "asc" | "desc";

export type MatterNote = {
  id: string;
  matterId: string;
  body: string;
  createdAt: string;
  createdBy: string | null;
};

export type MatterTask = {
  id: string;
  matterId: string;
  matterName: string;
  clientName: string;
  fileNumber: string;
  body: string;
  createdAt: string;
  completedAt: string | null;
};

export type MatterFormInput = {
  boardId: string;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  inventoryDueDate: string;
  ntcExpirationDate: string;
  stage: MatterStage;
};

export type PracticeBoard = {
  id: string;
  name: string;
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};
