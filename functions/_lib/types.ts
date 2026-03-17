export type Env = {
  DB: D1Database;
  APP_NAME?: string;
};

export type MatterStage =
  | "intake"
  | "qualified_opened"
  | "notice_admin"
  | "inventory_collection"
  | "accounting_closing"
  | "closed";

export type MatterRecord = {
  id: string;
  decedent_name: string;
  client_name: string;
  file_number: string;
  stage: MatterStage;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  archived: number;
  archived_at: string | null;
};

export type MatterNoteRecord = {
  id: string;
  matter_id: string;
  body: string;
  created_at: string;
  created_by: string | null;
};

export type MatterInput = {
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
};

export type MatterNoteInput = {
  matterId: string;
  body: string;
};

