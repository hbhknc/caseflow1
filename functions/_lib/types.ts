export type Env = {
  DB: D1Database;
  APP_NAME?: string;
  AUTH_USERNAME?: string;
  AUTH_PASSWORD?: string;
  SESSION_SECRET?: string;
};

export type AuthSession = {
  accountId: string;
  username: string;
  expiresAt: number;
};

export type AccountRecord = {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
};

export type MatterStage =
  | "intake"
  | "qualified_opened"
  | "notice_admin"
  | "inventory_collection"
  | "accounting_closing";

export type MatterRecord = {
  id: string;
  board_id: string;
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

export type AppSettingRecord = {
  key: string;
  value: string;
  updated_at: string;
};

export type PracticeBoardRecord = {
  id: string;
  account_id: string;
  name: string;
  column_count: number;
  stage_labels_json: string;
  created_at: string;
  updated_at: string;
};

export type MatterTaskRecord = {
  id: string;
  matter_id: string;
  body: string;
  created_at: string;
  completed_at: string | null;
  source_note_id: string | null;
  decedent_name: string;
  client_name: string;
  file_number: string;
};

export type MatterInput = {
  boardId: string;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
};

export type MatterNoteInput = {
  matterId: string;
  body: string;
  addToTaskList?: boolean;
};

export type BoardSettings = {
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};

export type PracticeBoard = {
  id: string;
  name: string;
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};
