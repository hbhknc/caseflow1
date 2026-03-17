export type MatterStage =
  | "intake"
  | "qualified_opened"
  | "notice_admin"
  | "inventory_collection"
  | "accounting_closing"
  | "closed";

export type Matter = {
  id: string;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
  createdAt: string;
  lastActivityAt: string;
  archived: boolean;
  archivedAt: string | null;
};

export type MatterNote = {
  id: string;
  matterId: string;
  body: string;
  createdAt: string;
  createdBy: string | null;
};

export type MatterFormInput = {
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
};

