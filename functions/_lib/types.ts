import type {
  Identity as CloudflareAccessIdentity,
  JWTPayload as CloudflareAccessJWTPayload,
  PluginData as CloudflareAccessPluginData
} from "@cloudflare/pages-plugin-cloudflare-access";
import type {
  AccountingPeriodInput,
  AccountingPeriodUpdateInput,
  HeldAssetInput,
  HeldAssetUpdateInput,
  LedgerEntryInput,
  LedgerEntryUpdateInput,
  ProofLinkInput,
  ProofLinkUpdateInput
} from "../../src/types/accounting";
import type {
  DeadlineDashboardData,
  DeadlineInput,
  DeadlineReminderState,
  DeadlineStatus,
  DeadlineTemplateKey,
  DeadlineTemplateItemKey,
  DeadlineTemplateSettings,
  DeadlineUpdateInput,
  MatterAnchorAlert,
  MatterDeadlineSettings
} from "../../src/types/deadlines";

export type Env = {
  DB: D1Database;
  APP_NAME?: string;
  CLOUDFLARE_ACCESS_DOMAIN?: string;
  CLOUDFLARE_ACCESS_AUD?: string;
  CASEFLOW_ACCOUNT_ID?: string;
  ACCESS_DEV_BYPASS?: string;
  ACCESS_DEV_USER_EMAIL?: string;
  ACCESS_DEV_USER_NAME?: string;
  ACCESS_DEV_USER_ID?: string;
};

export type AuthSource = "cloudflare-access" | "local-dev-bypass";

export type AuthenticatedUser = {
  email: string;
  displayName: string | null;
  id: string | null;
  subject: string | null;
  authenticated: true;
  authSource: AuthSource;
};

export type AccessIdentityState = {
  getIdentity?: () => Promise<CloudflareAccessIdentity | undefined>;
  jwtPayload: CloudflareAccessJWTPayload;
  loaded: boolean;
  value: CloudflareAccessIdentity | null;
  pending?: Promise<CloudflareAccessIdentity | null>;
};

export type RequestAuthState = {
  accountId: string;
  user: AuthenticatedUser;
  accessIdentity?: AccessIdentityState;
};

export type RequestContextData = Partial<CloudflareAccessPluginData> & {
  auth?: RequestAuthState;
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
  board_name?: string | null;
  decedent_name: string;
  client_name: string;
  file_number: string;
  deadline_template_key: DeadlineTemplateKey | null;
  qualification_date: string | null;
  publication_date: string | null;
  stage: MatterStage;
  sort_order: number;
  created_at: string;
  created_by_email?: string | null;
  created_by_id?: string | null;
  updated_at: string;
  last_updated_by_email?: string | null;
  last_updated_by_id?: string | null;
  last_activity_at: string;
  stage_entered_at?: string | null;
  interaction_count?: number | null;
  deadline_overdue_count?: number | null;
  deadline_due_today_count?: number | null;
  deadline_due_tomorrow_count?: number | null;
  deadline_active_count?: number | null;
  next_deadline_title?: string | null;
  next_deadline_due_date?: string | null;
  archived: number;
  archived_at: string | null;
};

export type MatterNoteRecord = {
  id: string;
  matter_id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  created_by_email?: string | null;
  created_by_id?: string | null;
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

export type MatterDeadlineRecord = {
  id: string;
  matter_id: string;
  title: string;
  category: string;
  due_date: string;
  assignee: string | null;
  priority: "low" | "medium" | "high";
  source_type: "manual" | "template";
  notes: string | null;
  template_key: DeadlineTemplateKey | null;
  template_item_key:
    | DeadlineTemplateItemKey
    | null;
  is_overridden: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_email: string | null;
  completed_by_id: string | null;
  completion_note: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  dismissed_by_email: string | null;
  dismissed_by_id: string | null;
  board_id: string;
  board_name: string | null;
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

export type MatterMoveInput = {
  stage: MatterStage;
  beforeMatterId?: string | null;
};

export type MatterImportRowInput = {
  rowNumber: number;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
  createdAt?: string;
  lastActivityAt?: string;
};

export type MatterImportIssue = {
  rowNumber: number;
  fileNumber: string;
  message: string;
};

export type MatterImportSummary = {
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  importedFileNumbers: string[];
  skippedRows: MatterImportIssue[];
  invalidRows: MatterImportIssue[];
};

export type MatterNoteInput = {
  matterId: string;
  body: string;
  addToTaskList?: boolean;
};

export type MatterDeadlineInput = DeadlineInput;

export type MatterDeadlineUpdateInput = DeadlineUpdateInput;

export type MatterDeadlineSettingsInput = MatterDeadlineSettings;

export type MatterDeadlineCompleteInput = {
  deadlineId: string;
  completionNote?: string;
};

export type MatterDeadlineDismissInput = {
  deadlineId: string;
};

export type AccountingPeriodRecord = {
  id: string;
  matter_id: string;
  decedent_name?: string | null;
  account_type: "annual" | "final";
  accounting_period_start: string | null;
  accounting_period_end: string | null;
  date_of_death: string | null;
  county: string | null;
  file_number: string | null;
  estate_type: "decedent" | "minor" | "adult_ward" | "trust" | null;
  form_version_label: string | null;
  beginning_personal_property_value_cents: number | null;
  loss_from_sale_amount_cents: number | null;
  loss_explanation: string | null;
  is_locked: number;
  created_by_email: string | null;
  created_by_id: string | null;
  locked_at: string | null;
  locked_by_email: string | null;
  locked_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountingLedgerEntryRecord = {
  id: string;
  accounting_period_id: string;
  entry_type: "receipt" | "disbursement" | "distribution";
  entry_date: string | null;
  party_name: string | null;
  description: string | null;
  amount_cents: number | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountingHeldAssetRecord = {
  id: string;
  accounting_period_id: string;
  asset_type:
    | "bank_deposit"
    | "security"
    | "tangible_personal_property"
    | "real_estate"
    | "other";
  institution_or_description: string | null;
  value_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountingProofLinkRecord = {
  id: string;
  accounting_period_id: string;
  ledger_entry_id: string | null;
  label: string | null;
  reference_url: string | null;
  status: "pending" | "received" | "not_required" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountingPeriodCreateInput = AccountingPeriodInput;

export type AccountingPeriodPatchInput = AccountingPeriodUpdateInput;

export type AccountingEntryCreateInput = LedgerEntryInput;

export type AccountingEntryPatchInput = LedgerEntryUpdateInput;

export type AccountingHeldAssetCreateInput = HeldAssetInput;

export type AccountingHeldAssetPatchInput = HeldAssetUpdateInput;

export type AccountingProofLinkCreateInput = ProofLinkInput;

export type AccountingProofLinkPatchInput = ProofLinkUpdateInput;

export type AccountingFinalizeInput = {
  accountingPeriodId: string;
};

export type MatterDeadlineDashboardQuery = {
  assignee?: string;
  matterId?: string;
  status?: DeadlineStatus | "all";
};

export type MatterDeadlineReminderState = DeadlineReminderState;

export type MatterAnchorAlertRecord = MatterAnchorAlert;

export type BoardSettings = {
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};

export type SettingsOverview = {
  boardSettings: BoardSettings;
  deadlineTemplateSettings: DeadlineTemplateSettings;
};

export type MatterStatsMonth = {
  monthStart: string;
  openedCount: number;
  archivedCount: number;
};

export type MatterStats = {
  totalCasesOpened: number;
  totalCasesArchived: number;
  averageCasesOpenedPerYear: number;
  averageCasesArchivedPerYear: number;
  averageCaseLengthDays: number | null;
  openedCasesByMonthLast12Months: MatterStatsMonth[];
};

export type PracticeBoard = {
  id: string;
  name: string;
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};

export type DeadlineDashboardOverview = DeadlineDashboardData;
